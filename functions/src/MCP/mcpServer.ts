/**
 * MCP Server - Registers document manipulation tools
 * Converts Zod schemas to Google GenAI parameter format
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as logger from 'firebase-functions/logger';
import * as toolService from '../services/toolService';

// SchemaType enum from @google/genai
enum SchemaType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  INTEGER = 'INTEGER',
  BOOLEAN = 'BOOLEAN',
  ARRAY = 'ARRAY',
  OBJECT = 'OBJECT'
}

// Tool type for Google GenAI
interface GenAITool {
  name: string;
  description: string;
  parameters: any;
}

// Create MCP server with 7 document tools
export const createMcpServer = (): McpServer => {
  const server = new McpServer({
    name: 'dotivra-document-editor',
    version: '1.0.0'
  });

  logger.info('🚀 Creating MCP Server with 7 document tools...');

  // Tool 1: Get Document Content

  // Tool 2: Scan Document Content
  server.tool(
    'scan_document_content',
    'Get high-level metadata about the document (line count, word count, headings, structure) without retrieving full content',
    {
      reason: z.string().describe('Brief explanation of why you need this information (e.g., "need to understand document structure before editing")')
    },
    async ({ reason }: { reason: string }) => {
      return await toolService.scan_document_content({ reason });
    }
  );

  // Tool 3: Search Document Content
  server.tool(
    'search_document_content',
    'Search for specific text or patterns within the document and get line numbers and context',
    {
      query: z.string().describe('The text or pattern to search for'),
      reason: z.string().optional().describe('Brief explanation of why you need to search (e.g., "looking for section headings to insert new content")')
    },
    async ({ query, reason }: { query: string; reason?: string }) => {
      return await toolService.search_document_content({ query, reason });
    }
  );

  // Tool 4: Append Document Content
  server.tool(
    'append_document_content',
    'Add new content to the end of the document',
    {
      content: z.string().describe('The content to append to the document'),
      reason: z.string().describe('Brief explanation of what you are adding and why (e.g., "adding new conclusion section")')
    },
    async ({ content, reason }: { content: string; reason: string }) => {
      return await toolService.append_document_content({ content, reason });
    }
  );

  // Tool 5: Insert Document Content
  server.tool(
    'insert_document_content',
    'Insert new content at a specific position in the document (requires exact character position)',
    {
      position: z.number().describe('The character position where content should be inserted (0-based index)'),
      content: z.string().describe('The content to insert'),
      reason: z.string().describe('Brief explanation of what you are inserting and why (e.g., "inserting code example after introduction")')
    },
    async ({ position, content, reason }: { position: number; content: string; reason: string }) => {
      return await toolService.insert_document_content({ position, content, reason });
    }
  );

  // Tool 6: Replace Document Content
  server.tool(
    'replace_document_content',
    'Replace a specific range of content in the document (requires exact character positions)',
    {
      position: z.object({
        from: z.number().describe('Starting character position (0-based index)'),
        to: z.number().describe('Ending character position (0-based index)')
      }).describe('The range of content to replace'),
      content: z.string().describe('The new content to replace with'),
      reason: z.string().describe('Brief explanation of what you are replacing and why (e.g., "updating outdated information in section 2")')
    },
    async ({ position, content, reason }: { position: { from: number; to: number }; content: string; reason: string }) => {
      return await toolService.replace_document_content({ position, content, reason });
    }
  );

  // Tool 7: Remove Document Content
  server.tool(
    'remove_document_content',
    'Remove a specific range of content from the document (requires exact character positions)',
    {
      position: z.object({
        from: z.number().describe('Starting character position (0-based index)'),
        to: z.number().describe('Ending character position (0-based index)')
      }).describe('The range of content to remove'),
      reason: z.string().describe('Brief explanation of what you are removing and why (e.g., "removing duplicate section")')
    },
    async ({ position, reason }: { position: { from: number; to: number }; reason: string }) => {
      return await toolService.remove_document_content({ position, reason });
    }
  );

  

  logger.info('✅ MCP Server created with 7 tools');
  return server;
};

// Get MCP tools in Google GenAI format
export const getMcpToolsForGemini = (server: McpServer): GenAITool[] => {
  // Manually define the 7 tools in Google GenAI format
  const tools: GenAITool[] = [
    {
      name: 'scan_document_content',
      description: 'Get high-level metadata about the document (line count, word count, headings, structure) without retrieving full content',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          reason: {
            type: SchemaType.STRING,
            description: 'Brief explanation of why you need this information (e.g., "need to understand document structure before editing")'
          }
        },
        required: ['reason']
      }
    },
    {
      name: 'search_document_content',
      description: 'Search for specific text or patterns within the document and get line numbers and context',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          query: {
            type: SchemaType.STRING,
            description: 'The text or pattern to search for'
          },
          reason: {
            type: SchemaType.STRING,
            description: 'Brief explanation of why you need to search (e.g., "looking for section headings to insert new content")'
          }
        },
        required: ['query']
      }
    },
    {
      name: 'append_document_content',
      description: 'Add new content to the end of the document',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          content: {
            type: SchemaType.STRING,
            description: 'The content to append to the document'
          },
          reason: {
            type: SchemaType.STRING,
            description: 'Brief explanation of what you are adding and why (e.g., "adding new conclusion section")'
          }
        },
        required: ['content', 'reason']
      }
    },
    {
      name: 'insert_document_content',
      description: 'Insert new content at a specific position in the document (requires exact character position)',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          position: {
            type: SchemaType.NUMBER,
            description: 'The character position where content should be inserted (0-based index)'
          },
          content: {
            type: SchemaType.STRING,
            description: 'The content to insert'
          },
          reason: {
            type: SchemaType.STRING,
            description: 'Brief explanation of what you are inserting and why (e.g., "inserting code example after introduction")'
          }
        },
        required: ['position', 'content', 'reason']
      }
    },
    {
      name: 'replace_document_content',
      description: 'Replace a specific range of content in the document (requires exact character positions)',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          position: {
            type: SchemaType.OBJECT,
            description: 'The range of content to replace',
            properties: {
              from: {
                type: SchemaType.NUMBER,
                description: 'Starting character position (0-based index)'
              },
              to: {
                type: SchemaType.NUMBER,
                description: 'Ending character position (0-based index)'
              }
            },
            required: ['from', 'to']
          },
          content: {
            type: SchemaType.STRING,
            description: 'The new content to replace with'
          },
          reason: {
            type: SchemaType.STRING,
            description: 'Brief explanation of what you are replacing and why (e.g., "updating outdated information in section 2")'
          }
        },
        required: ['position', 'content', 'reason']
      }
    },
    {
      name: 'remove_document_content',
      description: 'Remove a specific range of content from the document (requires exact character positions)',
      parameters: {
        type: SchemaType.OBJECT,
        properties: {
          position: {
            type: SchemaType.OBJECT,
            description: 'The range of content to remove',
            properties: {
              from: {
                type: SchemaType.NUMBER,
                description: 'Starting character position (0-based index)'
              },
              to: {
                type: SchemaType.NUMBER,
                description: 'Ending character position (0-based index)'
              }
            },
            required: ['from', 'to']
          },
          reason: {
            type: SchemaType.STRING,
            description: 'Brief explanation of what you are removing and why (e.g., "removing duplicate section")'
          }
        },
        required: ['position', 'reason']
      }
    }
  ];

  logger.info(`📋 Providing ${tools.length} MCP tools in Google GenAI format`);
  return tools;
};

// Execute MCP tool
export const executeMcpTool = async (toolName: string, args: Record<string, any>): Promise<any> => {
  logger.info(`🔧 Executing MCP tool: ${toolName}`, args);

  switch (toolName) {
    case 'scan_document_content':
      return await toolService.scan_document_content(args as { reason: string });

    case 'search_document_content':
      return await toolService.search_document_content(args as { query: string; reason?: string });

    case 'append_document_content':
      return await toolService.append_document_content(args as { content: string; reason: string });

    case 'insert_document_content':
      return await toolService.insert_document_content(args as { position: number; content: string; reason: string });

    case 'replace_document_content':
      return await toolService.replace_document_content(args as { position: { from: number; to: number }; content: string; reason: string });

    case 'remove_document_content':
      return await toolService.remove_document_content(args as { position: { from: number; to: number }; reason: string });

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};
