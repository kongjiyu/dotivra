/**
 * Embedded MCP Server for Document Operations
 * 
 * This module creates an in-process MCP server that exposes
 * document manipulation tools to Gemini AI via the MCP protocol.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Type } from '@google/genai';
import {
    get_document_content,
    scan_document_content,
    search_document_content,
    append_document_content,
    insert_document_content,
    replace_document_content,
    remove_document_content,
    setCurrentDocument
} from '../services/toolService.js';

/**
 * Convert Zod schema to Google GenAI parameters format
 * @param {Object} zodSchema - Zod schema object
 * @returns {Object} Google GenAI parameters object with Type enums
 */
function convertZodToGenAIParams(zodSchema) {
    const properties = {};
    const required = [];

    for (const [key, value] of Object.entries(zodSchema)) {
        // Determine the type
        let type = Type.STRING; // default
        let description = '';

        // Check if it's an object with _def property (Zod schema)
        if (value && value._def) {
            const typeName = value._def.typeName;

            if (typeName === 'ZodString') {
                type = Type.STRING;
            } else if (typeName === 'ZodNumber') {
                type = Type.NUMBER;
            } else if (typeName === 'ZodBoolean') {
                type = Type.BOOLEAN;
            } else if (typeName === 'ZodArray') {
                type = Type.ARRAY;
            } else if (typeName === 'ZodObject') {
                type = Type.OBJECT;
            }

            // Check if field is optional
            if (!value.isOptional()) {
                required.push(key);
            }

            // Get description if available
            description = value.description || '';
        }

        properties[key] = { type, description };
    }

    return {
        type: Type.OBJECT,
        properties,
        required
    };
}


/**
 * Create and configure the embedded MCP server
 * @param {Object} firestore - Firestore instance for document operations
 * @returns {McpServer} Configured MCP server instance
 */
export function createMcpServer(firestore) {
    const server = new McpServer({
        name: 'dotivra-document-server',
        version: '1.0.0'
    });

    // Track registered tools manually since McpServer doesn't expose listTools()
    server._registeredTools = [];

    // Helper to register tool and track it
    const registerAndTrack = (name, schema, handler) => {
        server.registerTool(name, schema, handler);
        server._registeredTools.push({
            name,
            description: schema.description || schema.title || name,
            title: schema.title,
            inputSchema: schema.inputSchema
        });
    };

    console.log('🔧 Initializing MCP Server with document tools...');

    // Tool 1: Get Document Content
    registerAndTrack(
        'get_document_content',
        {
            title: 'Get Document Content',
            description: 'Retrieve the full content of a document from Firestore',
            inputSchema: {
                documentId: z.string().describe('The Firestore document ID to retrieve')
            },
            outputSchema: {
                success: z.boolean(),
                documentId: z.string().optional(),
                content: z.string().optional(),
                length: z.number().optional(),
                error: z.string().optional()
            }
        },
        async ({ documentId }) => {
            try {
                console.log(`🔍 MCP Tool: get_document_content (${documentId})`);
                const result = await get_document_content({ documentId });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error) {
                console.error('❌ get_document_content error:', error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ success: false, error: error.message })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool 2: Scan Document Content
    registerAndTrack(
        'scan_document_content',
        {
            title: 'Scan Document',
            description: 'Analyze the current document structure, including line count, word count, headings, etc.',
            inputSchema: {
                reason: z.string().describe('Purpose of scanning (e.g., "analyzing document structure")')
            },
            outputSchema: {
                success: z.boolean(),
                reason: z.string(),
                analysis: z.object({
                    total_lines: z.number(),
                    total_words: z.number(),
                    total_characters: z.number(),
                    headings_count: z.number(),
                    has_content: z.boolean()
                }),
                preview: z.string().optional()
            }
        },
        async ({ reason }) => {
            try {
                console.log(`📊 MCP Tool: scan_document_content (${reason})`);
                const result = await scan_document_content({ reason });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error) {
                console.error('❌ scan_document_content error:', error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ success: false, error: error.message })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool 3: Search Document Content
    registerAndTrack(
        'search_document_content',
        {
            title: 'Search Document',
            description: 'Search for specific text or patterns within the current document',
            inputSchema: {
                query: z.string().describe('Text to search for'),
                reason: z.string().optional().describe('Purpose of the search')
            },
            outputSchema: {
                success: z.boolean(),
                query: z.string(),
                matches_count: z.number(),
                matches: z.array(z.object({
                    line_number: z.number(),
                    line_content: z.string(),
                    match_position: z.number()
                }))
            }
        },
        async ({ query, reason }) => {
            try {
                console.log(`🔎 MCP Tool: search_document_content ("${query}")`);
                const result = await search_document_content({ query, reason });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify(result, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error) {
                console.error('❌ search_document_content error:', error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ success: false, error: error.message })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool 4: Append to Document
    registerAndTrack(
        'append_document_content',
        {
            title: 'Append Text',
            description: 'Add new content to the end of the current document',
            inputSchema: {
                content: z.string().describe('Text content to append'),
                reason: z.string().describe('Reason for appending (e.g., "adding conclusion")')
            },
            outputSchema: {
                success: z.boolean(),
                operation: z.string(),
                appended_length: z.number(),
                new_total_length: z.number()
            }
        },
        async ({ content, reason }) => {
            try {
                console.log(`➕ MCP Tool: append_document_content (${content.length} chars)`);
                const result = await append_document_content({ content, reason });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            operation: result.operation,
                            appended_length: result.appended_length,
                            new_total_length: result.new_total_length
                        }, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error) {
                console.error('❌ append_document_content error:', error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ success: false, error: error.message })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool 5: Insert into Document
    registerAndTrack(
        'insert_document_content',
        {
            title: 'Insert Text',
            description: 'Insert text at a specific character position in the document',
            inputSchema: {
                position: z.number().describe('Character position to insert at (0-based index)'),
                content: z.string().describe('Text content to insert'),
                reason: z.string().describe('Reason for insertion')
            },
            outputSchema: {
                success: z.boolean(),
                operation: z.string(),
                position: z.number(),
                inserted_length: z.number(),
                new_total_length: z.number()
            }
        },
        async ({ position, content, reason }) => {
            try {
                console.log(`📝 MCP Tool: insert_document_content at position ${position}`);
                const result = await insert_document_content({ position, content, reason });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            operation: result.operation,
                            position: result.position,
                            inserted_length: result.inserted_length,
                            new_total_length: result.new_total_length
                        }, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error) {
                console.error('❌ insert_document_content error:', error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ success: false, error: error.message })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool 6: Replace Content in Document
    registerAndTrack(
        'replace_document_content',
        {
            title: 'Replace Text',
            description: 'Replace text in a specific range with new content',
            inputSchema: {
                position: z.object({
                    from: z.number().describe('Start position (0-based)'),
                    to: z.number().describe('End position (0-based)')
                }).describe('Range to replace'),
                content: z.string().describe('New content to insert'),
                reason: z.string().describe('Reason for replacement')
            },
            outputSchema: {
                success: z.boolean(),
                operation: z.string(),
                removed_length: z.number(),
                inserted_length: z.number(),
                new_total_length: z.number()
            }
        },
        async ({ position, content, reason }) => {
            try {
                console.log(`🔄 MCP Tool: replace_document_content [${position.from}-${position.to}]`);
                const result = await replace_document_content({ position, content, reason });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            operation: result.operation,
                            position: result.position,
                            removed_length: result.removed_length,
                            inserted_length: result.inserted_length,
                            new_total_length: result.new_total_length
                        }, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error) {
                console.error('❌ replace_document_content error:', error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ success: false, error: error.message })
                    }],
                    isError: true
                };
            }
        }
    );

    // Tool 7: Remove Content from Document
    registerAndTrack(
        'remove_document_content',
        {
            title: 'Delete Text',
            description: 'Remove text from the document in a specified range',
            inputSchema: {
                position: z.object({
                    from: z.number().describe('Start position (0-based)'),
                    to: z.number().describe('End position (0-based)')
                }).describe('Range to delete'),
                reason: z.string().describe('Reason for deletion')
            },
            outputSchema: {
                success: z.boolean(),
                operation: z.string(),
                removed_length: z.number(),
                new_total_length: z.number()
            }
        },
        async ({ position, reason }) => {
            try {
                console.log(`🗑️ MCP Tool: remove_document_content [${position.from}-${position.to}]`);
                const result = await remove_document_content({ position, reason });

                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({
                            success: result.success,
                            operation: result.operation,
                            position: result.position,
                            removed_length: result.removed_length,
                            new_total_length: result.new_total_length
                        }, null, 2)
                    }],
                    structuredContent: result
                };
            } catch (error) {
                console.error('❌ remove_document_content error:', error);
                return {
                    content: [{
                        type: 'text',
                        text: JSON.stringify({ success: false, error: error.message })
                    }],
                    isError: true
                };
            }
        }
    );

    console.log('✅ MCP Server initialized with 7 document tools');

    return server;
}

/**
 * Get MCP tools in Gemini-compatible format
 * This converts MCP tool declarations to the format expected by Gemini's function calling API
 * @param {McpServer} mcpServer - The MCP server instance
 * @returns {Promise<Array>} Array of tool declarations for Gemini
 */
export async function getMcpToolsForGemini(mcpServer) {
    try {
        // Use our manually tracked tools
        const toolsList = mcpServer._registeredTools || [];

        if (toolsList.length === 0) {
            console.warn('⚠️ No tools registered in MCP server');
            return [];
        }

        // Convert MCP tool schema to Gemini function declaration format
        const geminiTools = toolsList.map(tool => {
            try {
                // Convert Zod schema to Google GenAI parameters format
                const parameters = convertZodToGenAIParams(tool.inputSchema);

                console.log(`📋 Converted tool ${tool.name}: ${Object.keys(parameters.properties || {}).length} params`);

                // Use the official Google GenAI SDK format
                return {
                    name: tool.name,
                    description: tool.description || tool.title || tool.name,
                    parameters: parameters
                };
            } catch (err) {
                console.error(`❌ Error converting tool ${tool.name}:`, err.message);
                return {
                    name: tool.name,
                    description: tool.description || tool.name,
                    parameters: {
                        type: Type.OBJECT,
                        properties: {},
                        required: []
                    }
                };
            }
        });

        console.log(`✅ Successfully converted ${geminiTools.length} MCP tools to Gemini format`);
        return geminiTools;
    } catch (error) {
        console.error('❌ Error converting MCP tools for Gemini:', error);
        return [];
    }
}

/**
 * Execute an MCP tool
 * @param {Object} mcpServer - MCP server instance
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} args - Tool arguments
 * @returns {Promise<Object>} Tool execution result
 */
export async function executeMcpTool(mcpServer, toolName, args) {
    try {
        console.log(`⚡ Executing MCP tool: ${toolName}`, args);

        // Map tool names to their handler functions
        const toolHandlers = {
            'get_document_content': get_document_content,
            'scan_document_content': scan_document_content,
            'search_document_content': search_document_content,
            'append_document_content': append_document_content,
            'insert_document_content': insert_document_content,
            'replace_document_content': replace_document_content,
            'remove_document_content': remove_document_content
        };

        const handler = toolHandlers[toolName];
        if (!handler) {
            throw new Error(`Unknown tool: ${toolName}`);
        }

        // Execute the tool handler directly
        const result = await handler(args);

        console.log(`✅ MCP tool ${toolName} completed successfully`);
        return result;
    } catch (error) {
        console.error(`❌ Error executing MCP tool ${toolName}:`, error);
        throw error;
    }
}
