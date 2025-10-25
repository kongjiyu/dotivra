/**
 * Gemini MCP Integration
 * Wraps Gemini API with MCP tool calling capabilities
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import * as mcpServer from '../MCP/mcpServer';
import * as toolService from '../services/toolService';
// Types
interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

interface Message {
  role: string;
  parts: Array<{ text?: string; functionCall?: any; functionResponse?: any }>;
}

interface GenerateOptions {
  prompt: string;
  history?: Message[];
  systemInstruction?: string;
  generationConfig?: GenerationConfig;
  documentId?: string;
}

interface StreamOptions extends GenerateOptions {
  onChunk: (chunk: string) => void;
}

interface ToolResult {
  name: string;
  args: Record<string, any>;
  result: any;
}

interface GeminiWithMcp {
  generateWithTools: (options: GenerateOptions) => Promise<string>;
  streamWithTools: (options: StreamOptions) => Promise<string>;
  getAvailableTools: () => any[];
  setDocument: (documentId: string) => Promise<any>;
}

// GeminiBalancer interface (from index.ts)
interface GeminiBalancer {
  generate: (params: {
    model: string;
    contents: any[];
    systemInstruction?: any;
    generationConfig?: any;
    tools?: any[];
    safetySettings?: any;
    toolConfig?: any;
  }) => Promise<any>;
}

/**
 * Convert prompt + history to contents format
 */
const convertToContents = (prompt: string, history?: Message[]): any[] => {
  const contents: any[] = [];

  // Add history messages
  if (history && history.length > 0) {
    for (const msg of history) {
      contents.push({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: msg.parts
      });
    }
  }

  // Add current prompt
  if (prompt) {
    contents.push({
      role: 'user',
      parts: [{ text: prompt }]
    });
  }

  return contents;
};

/**
 * Create Gemini client with MCP tool calling
 */
export const createGeminiWithMcp = (
  balancer: GeminiBalancer,
  firestore: admin.firestore.Firestore
): GeminiWithMcp => {
  
  // Initialize toolService with Firestore
  toolService.initFirestore(firestore);

  // Create MCP server
  const mcpServerInstance: McpServer = mcpServer.createMcpServer();
  const mcpTools = mcpServer.getMcpToolsForGemini(mcpServerInstance);

  logger.info(`🔧 Gemini MCP Integration initialized with ${mcpTools.length} tools`);

  /**
   * Generate response with automatic tool calling loop
   */
  const generateWithTools = async (options: GenerateOptions): Promise<string> => {
    const {
      prompt,
      history = [],
      systemInstruction,
      generationConfig = {},
      documentId
    } = options;

    // Set document context if provided
    if (documentId) {
      logger.info(`📄 Setting document context: ${documentId}`);
      await toolService.setCurrentDocument(documentId);
    }

    let conversationHistory = [...history];
    let currentPrompt = prompt;
    let maxIterations = 10;
    let iteration = 0;

    while (iteration < maxIterations) {
      iteration++;
      logger.info(`🔄 Tool calling iteration ${iteration}/${maxIterations}`);

      // Generate with tools
      const result = await balancer.generate({
        model: 'gemini-2.0-flash-exp',
        contents: convertToContents(currentPrompt, conversationHistory),
        systemInstruction,
        generationConfig,
        tools: mcpTools
      });

      // Check if response contains function calls
      const response = result.response || result;
      if (!response) {
        return result.text || '';
      }

      const candidates = response.candidates || [];
      if (candidates.length === 0) {
        return result.text;
      }

      const firstCandidate = candidates[0];
      const content = firstCandidate.content;

      if (!content || !content.parts) {
        return result.text;
      }

      // Check for function calls
      const functionCalls = content.parts.filter((part: any) => part.functionCall);

      if (functionCalls.length === 0) {
        // No function calls, return final text
        logger.info('✅ No function calls, returning final response');
        return result.text;
      }

      // Execute function calls
      logger.info(`🔧 Executing ${functionCalls.length} function call(s)`);

      const toolResults: ToolResult[] = [];

      for (const part of functionCalls) {
        const functionCall = part.functionCall;
        const toolName = functionCall.name;
        const toolArgs = functionCall.args || {};

        try {
          logger.info(`🔧 Calling tool: ${toolName}`, toolArgs);
          const toolResult = await mcpServer.executeMcpTool(toolName, toolArgs);

          toolResults.push({
            name: toolName,
            args: toolArgs,
            result: toolResult
          });

          logger.info(`✅ Tool result:`, toolResult);
        } catch (error) {
          logger.error(`❌ Tool execution error for ${toolName}:`, error);
          toolResults.push({
            name: toolName,
            args: toolArgs,
            result: {
              success: false,
              error: (error as Error).message
            }
          });
        }
      }

      // Add AI's function call to history
      conversationHistory.push({
        role: 'model',
        parts: functionCalls.map((fc: any) => ({ functionCall: fc.functionCall }))
      });

      // Add function responses to history
      conversationHistory.push({
        role: 'user',
        parts: toolResults.map(tr => ({
          functionResponse: {
            name: tr.name,
            response: tr.result
          }
        }))
      });

      // Continue with empty prompt to let AI process tool results
      currentPrompt = '';
    }

    throw new Error(`Maximum tool calling iterations (${maxIterations}) reached`);
  };

  /**
   * Stream response with automatic tool calling
   */
  const streamWithTools = async (options: StreamOptions): Promise<string> => {
    const {
      prompt,
      history = [],
      systemInstruction,
      generationConfig = {},
      documentId,
      onChunk
    } = options;

    // Set document context if provided
    if (documentId) {
      logger.info(`📄 Setting document context: ${documentId}`);
      await toolService.setCurrentDocument(documentId);
    }

    let conversationHistory = [...history];
    let currentPrompt = prompt;
    let maxIterations = 10;
    let iteration = 0;
    let fullResponse = '';

    while (iteration < maxIterations) {
      iteration++;
      logger.info(`🔄 Streaming tool calling iteration ${iteration}/${maxIterations}`);

      // For streaming, we'll use regular generate and manually send chunks
      const result = await balancer.generate({
        model: 'gemini-2.0-flash-exp',
        contents: convertToContents(currentPrompt, conversationHistory),
        systemInstruction,
        generationConfig,
        tools: mcpTools
      });

      // Check if response contains function calls
      const response = result.response || result;
      if (!response) {
        onChunk(result.text || '');
        fullResponse += result.text || '';
        return fullResponse;
      }

      const candidates = response.candidates || [];
      if (candidates.length === 0) {
        onChunk(result.text);
        fullResponse += result.text;
        return fullResponse;
      }

      const firstCandidate = candidates[0];
      const content = firstCandidate.content;

      if (!content || !content.parts) {
        onChunk(result.text);
        fullResponse += result.text;
        return fullResponse;
      }

      // Check for function calls
      const functionCalls = content.parts.filter((part: any) => part.functionCall);

      if (functionCalls.length === 0) {
        // No function calls, return final text
        logger.info('✅ No function calls, returning final response');
        onChunk(result.text);
        fullResponse += result.text;
        return fullResponse;
      }

      // Execute function calls (same as generateWithTools)
      logger.info(`🔧 Executing ${functionCalls.length} function call(s)`);

      const toolResults: ToolResult[] = [];

      for (const part of functionCalls) {
        const functionCall = part.functionCall;
        const toolName = functionCall.name;
        const toolArgs = functionCall.args || {};

        try {
          logger.info(`🔧 Calling tool: ${toolName}`, toolArgs);
          const toolResult = await mcpServer.executeMcpTool(toolName, toolArgs);

          toolResults.push({
            name: toolName,
            args: toolArgs,
            result: toolResult
          });

          // Send tool execution status as chunk
          onChunk(`\n[🔧 Executed: ${toolName}]\n`);

          logger.info(`✅ Tool result:`, toolResult);
        } catch (error) {
          logger.error(`❌ Tool execution error for ${toolName}:`, error);
          toolResults.push({
            name: toolName,
            args: toolArgs,
            result: {
              success: false,
              error: (error as Error).message
            }
          });
          onChunk(`\n[❌ Tool error: ${toolName}]\n`);
        }
      }

      // Add AI's function call to history
      conversationHistory.push({
        role: 'model',
        parts: functionCalls.map((fc: any) => ({ functionCall: fc.functionCall }))
      });

      // Add function responses to history
      conversationHistory.push({
        role: 'user',
        parts: toolResults.map(tr => ({
          functionResponse: {
            name: tr.name,
            response: tr.result
          }
        }))
      });

      // Continue with empty prompt
      currentPrompt = '';
    }

    throw new Error(`Maximum tool calling iterations (${maxIterations}) reached`);
  };

  /**
   * Get available tools
   */
  const getAvailableTools = (): any[] => {
    return mcpTools;
  };

  /**
   * Set document for tool operations
   */
  const setDocument = async (documentId: string): Promise<any> => {
    return await toolService.setCurrentDocument(documentId);
  };

  return {
    generateWithTools,
    streamWithTools,
    getAvailableTools,
    setDocument
  };
};
