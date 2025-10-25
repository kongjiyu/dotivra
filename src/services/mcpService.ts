/**
 * MCP (Model Context Protocol) Service
 * Provides AI assistant with document manipulation tools
 */

//TEMP：CHANGE TO LOCAL URL FOR TESTING
const API_BASE = 'http://localhost:3001';

export interface MCPToolCall {
  name: string;
  args: Record<string, any>;
  result?: any;
  success: boolean;
}

export interface MCPResponse {
  success: boolean;
  text: string;
  toolCalls: MCPToolCall[];
  toolsUsed: number;
  error?: string;
}

export interface MCPDocumentResponse {
  success: boolean;
  documentId: string;
  content: string;
  metadata?: Record<string, any>;
  error?: string;
}

export interface MCPMessage {
  role: 'user' | 'assistant';
  content: string;
}

class MCPService {
  /**
   * Load a document by ID and set context for MCP tools
   */
  async loadDocument(documentId: string): Promise<MCPDocumentResponse> {
    try {
      const response = await fetch(`${API_BASE}/api/mcp-test/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'Failed to load document');
      }

      return await response.json();
    } catch (error) {
      console.error('MCP loadDocument error:', error);
      throw error;
    }
  }

  /**
   * Send a prompt to AI with MCP tools enabled
   * The AI will automatically call appropriate document manipulation functions
   */
  async chat(prompt: string, documentId?: string, conversationHistory?: MCPMessage[]): Promise<MCPResponse> {
    console.log('MCP chat prompt:', prompt, 'documentId:', documentId);
    try {
      const response = await fetch(`${API_BASE}/api/mcp-test/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          documentId,
          conversationHistory,
          model: 'gemini-2.0-flash-exp'
        })
      });
      console.log("response", response);
      console.log('MCP chat response status:', response.status);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || error.error || 'AI request failed');
      }

      const data = await response.json();
      return {
        success: data.success,
        text: data.text || '',
        toolCalls: data.toolCalls || [],
        toolsUsed: data.toolsUsed || 0
      };
    } catch (error) {
      console.error('MCP chat error:', error);
      throw error;
    }
  }

  /**
   * Get list of available MCP tools
   */
  async getAvailableTools() {
    try {
      const response = await fetch(`${API_BASE}/api/mcp-test/tools`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch tools');
      }

      return await response.json();
    } catch (error) {
      console.error('MCP getAvailableTools error:', error);
      throw error;
    }
  }
}

export const mcpService = new MCPService();
export default mcpService;
