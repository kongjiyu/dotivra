/**
 * Gemini AI with MCP Tools Integration
 * 
 * This module provides a wrapper around Gemini AI that enables
 * automatic tool calling with MCP server integration.
 */

import { createMcpServer, getMcpToolsForGemini, executeMcpTool } from '../MCP/mcpServer.js';

/**
 * Create a Gemini client with MCP integration
 * @param {Object} config - Configuration object
 * @param {Object} config.balancer - Gemini balancer instance (from balancer.js)
 * @param {Object} config.firestore - Firestore instance
 * @returns {Object} Gemini client with MCP capabilities
 */
export function createGeminiWithMcp(config) {
    const { balancer, firestore } = config;

    if (!balancer) {
        throw new Error('Gemini balancer is required');
    }

    if (!firestore) {
        throw new Error('Firestore instance is required');
    }

    // Create embedded MCP server
    const mcpServer = createMcpServer(firestore);

    console.log('🤖 Gemini AI with MCP integration initialized (using balancer)');

    return {
        balancer,
        mcpServer,

        /**
         * Generate content with automatic MCP tool calling
         * @param {Object} params - Generation parameters
         * @returns {Promise<Object>} Generation result with tool calls
         */
        async generateWithTools(params) {
            const {
                model = 'gemini-2.0-flash-exp',
                contents,
                systemInstruction,
                generationConfig = {},
                enableMcpTools = true
            } = params;

            // Get MCP tools in Gemini format
            const tools = enableMcpTools ? await getMcpToolsForGemini(mcpServer) : [];

            console.log(`🎯 Generating with ${tools.length} MCP tools available`);

            // Prepare tools in the format expected by Google GenAI SDK
            const toolsConfig = tools.length > 0 ? [{
                functionDeclarations: tools
            }] : undefined;

            // First API call - model may request tool use
            const result = await balancer.generate({
                model,
                contents,
                systemInstruction,
                tools: toolsConfig,
                toolConfig: tools.length > 0 ? {
                    functionCallingConfig: { mode: 'AUTO' }
                } : undefined,
                generationConfig
            });

            // Check if model wants to use tools (check response.functionCalls directly)
            const functionCalls = result.functionCalls || [];

            if (functionCalls.length === 0) {
                // No tool calls, return response directly
                return {
                    text: result.text,
                    response: result.raw,
                    toolCalls: [],
                    rawResponse: result.raw
                };
            }

            console.log(`🔧 Model requested ${functionCalls.length} tool call(s)`);

            // Execute all tool calls
            const toolResults = [];
            for (const call of functionCalls) {
                try {
                    console.log(`⚡ Executing tool: ${call.name}`);
                    const toolResult = await executeMcpTool(mcpServer, call.name, call.args);

                    toolResults.push({
                        name: call.name,
                        args: call.args,
                        result: toolResult.structuredContent || toolResult,
                        success: true
                    });
                } catch (error) {
                    console.error(`❌ Tool execution failed: ${call.name}`, error);
                    toolResults.push({
                        name: call.name,
                        args: call.args,
                        error: error.message,
                        success: false
                    });
                }
            }

            // Build conversation with tool results
            const conversationHistory = [
                ...contents,
                {
                    role: 'model',
                    parts: functionCalls.map(call => ({
                        functionCall: {
                            name: call.name,
                            args: call.args
                        }
                    }))
                },
                {
                    role: 'function',
                    parts: toolResults.map(result => ({
                        functionResponse: {
                            name: result.name,
                            response: result.result || { error: result.error }
                        }
                    }))
                }
            ];

            // Second API call - get final response after tool use
            const finalResult = await balancer.generate({
                model,
                contents: conversationHistory,
                systemInstruction,
                generationConfig
            });

            const finalResponse = finalResult.raw;

            return {
                text: finalResult.text,
                response: finalResponse,
                toolCalls: toolResults,
                rawResponse: result.raw,  // First response with function calls
                finalResponse
            };
        },

        /**
         * Stream content generation with progressive reasoning and tool use
         * Note: Balancer doesn't support streaming yet, so we use non-streaming approach
         * @param {Object} params - Generation parameters
         * @returns {AsyncGenerator} Stream of chunks
         */
        async* streamWithTools(params) {
            const {
                model = 'gemini-2.0-flash-exp',
                contents,
                systemInstruction,
                generationConfig = {},
                enableMcpTools = true
            } = params;

            // Get MCP tools
            const tools = enableMcpTools ? await getMcpToolsForGemini(mcpServer) : [];

            console.log(`🎯 Streaming with ${tools.length} MCP tools available (simulated via balancer)`);

            // First call - check for tool calls
            const result = await balancer.generate({
                model,
                contents,
                systemInstruction,
                tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
                toolConfig: tools.length > 0 ? {
                    functionCallingConfig: { mode: 'AUTO' }
                } : undefined,
                generationConfig
            });

            const functionCalls = result.functionCalls || [];

            // If there's text, yield it as chunks (simulate streaming)
            if (result.text) {
                const words = result.text.split(' ');
                for (const word of words) {
                    yield {
                        type: 'chunk',
                        text: word + ' ',
                        timestamp: Date.now()
                    };
                    await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to simulate streaming
                }
            }

            // If there were tool calls, execute them and get final response
            if (functionCalls.length > 0) {
                yield {
                    type: 'tool_calls_detected',
                    count: functionCalls.length,
                    timestamp: Date.now()
                };

                // Execute tools
                const toolResults = [];
                for (const call of functionCalls) {
                    yield {
                        type: 'tool_executing',
                        toolName: call.name,
                        args: call.args,
                        timestamp: Date.now()
                    };

                    try {
                        const toolResult = await executeMcpTool(mcpServer, call.name, call.args);
                        toolResults.push({
                            name: call.name,
                            args: call.args,
                            result: toolResult.structuredContent || toolResult,
                            success: true
                        });

                        yield {
                            type: 'tool_result',
                            toolName: call.name,
                            result: toolResult.structuredContent || toolResult,
                            timestamp: Date.now()
                        };
                    } catch (error) {
                        toolResults.push({
                            name: call.name,
                            args: call.args,
                            error: error.message,
                            success: false
                        });

                        yield {
                            type: 'tool_error',
                            toolName: call.name,
                            error: error.message,
                            timestamp: Date.now()
                        };
                    }
                }

                // Get final response after tools
                const conversationHistory = [
                    ...contents,
                    {
                        role: 'model',
                        parts: functionCalls.map(call => ({
                            functionCall: {
                                name: call.name,
                                args: call.args
                            }
                        }))
                    },
                    {
                        role: 'function',
                        parts: toolResults.map(result => ({
                            functionResponse: {
                                name: result.name,
                                response: result.result || { error: result.error }
                            }
                        }))
                    }
                ];

                const finalResult = await balancer.generate({
                    model,
                    contents: conversationHistory,
                    systemInstruction,
                    generationConfig
                });

                yield {
                    type: 'final_response_start',
                    timestamp: Date.now()
                };

                // Simulate streaming of final response
                if (finalResult.text) {
                    const words = finalResult.text.split(' ');
                    for (const word of words) {
                        yield {
                            type: 'final_chunk',
                            text: word + ' ',
                            timestamp: Date.now()
                        };
                        await new Promise(resolve => setTimeout(resolve, 10));
                    }
                }
            }

            yield {
                type: 'done',
                timestamp: Date.now()
            };
        },

        /**
         * Get all available MCP tools
         * @returns {Promise<Array>} List of available tools
         */
        async getAvailableTools() {
            return await getMcpToolsForGemini(mcpServer);
        },

        /**
         * Set current document for MCP tools
         * @param {string} documentId - Firestore document ID
         */
        async setDocument(documentId) {
            const { setCurrentDocument } = await import('../services/toolService.js');
            return await setCurrentDocument(documentId);
        }
    };
}

/**
 * Create a reasoning agent with MCP tools
 * Provides step-by-step reasoning with tool access
 */
export function createReasoningAgent(config) {
    const geminiMcp = createGeminiWithMcp(config);

    const reasoningSystemInstruction = `You are an advanced AI reasoning agent with access to document manipulation tools.

Your workflow:
1. THINK 🧠 - Analyze the user's request and understand what needs to be done
2. PLAN 🧩 - Break down the task into concrete steps
3. EXECUTE ⚙️ - Use available tools to perform the necessary operations
4. REVIEW ✅ - Verify the results and provide a summary

Available Tools:
- get_document_content: Retrieve document content
- scan_document_content: Analyze document structure
- search_document_content: Search for specific content
- append_document_content: Add content to end
- insert_document_content: Insert at specific position
- replace_document_content: Replace content in range
- remove_document_content: Delete content in range

Response Format:
Always structure your response as JSON with these phases:

{
  "message": {
    "type": "thinking|planning|executing|reviewing|complete",
    "description": "What you're currently doing"
  },
  "operation": {
    "toolUsed": "name of tool if any",
    "values": { /* tool parameters and results */ }
  }
}

Guidelines:
- Think step by step
- Use tools when needed for document operations
- Provide clear explanations of your reasoning
- Always validate results before completing`;

    return {
        ...geminiMcp,

        /**
         * Process a request with full reasoning workflow
         */
        async* reason(params) {
            const { prompt, documentId, context = {} } = params;

            // Set document context if provided
            if (documentId) {
                yield {
                    type: 'context_setting',
                    message: { type: 'setup', description: 'Setting document context' },
                    timestamp: Date.now()
                };

                await geminiMcp.setDocument(documentId);
            }

            // Build the full prompt with context
            const fullPrompt = `Document Context:
${documentId ? `Document ID: ${documentId}` : 'No document set'}
${context.content ? `Current content length: ${context.content.length} characters` : ''}
${context.selection ? `Selected text: "${context.selection}"` : ''}

User Request: ${prompt}

Process this request step by step using the THINK → PLAN → EXECUTE → REVIEW workflow.
Provide responses as JSON chunks.`;

            const contents = [{
                role: 'user',
                parts: [{ text: fullPrompt }]
            }];

            // Stream reasoning process
            for await (const chunk of geminiMcp.streamWithTools({
                model: 'gemini-2.0-flash-exp',
                contents,
                systemInstruction: { parts: [{ text: reasoningSystemInstruction }] },
                generationConfig: {
                    temperature: 0.7,
                    topP: 0.95,
                    maxOutputTokens: 8192
                },
                enableMcpTools: true
            })) {
                yield chunk;
            }
        }
    };
}
