import type { Editor } from "@tiptap/react";

export interface DocumentAction {
  type: 'append' | 'insert' | 'replace' | 'delete' | 'read';
  content?: string;
  position?: { from: number; to: number } | number; // Can be range or single position
  reason?: string;
}

export interface AgentResponse {
  actions: DocumentAction[];
  reasoning: string;
  rawResponse?: string;
}

/**
 * Document Agent Service using Gemini Pro 2.5
 * The agent can reason about document operations and take various actions
 */
export class DocumentAgentService {
  private apiBaseUrl: string;

  constructor() {
    this.apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Execute document actions determined by the agent
   * Acts as an MCP server with tools for document manipulation
   */
  executeActions(actions: DocumentAction[], editor: Editor): void {
    actions.forEach(action => {
      switch (action.type) {
        case 'append':
          // Tool: Append content to the end of document
          if (action.content) {
            const endPos = editor.state.doc.content.size;
            editor.chain().focus().setTextSelection(endPos).insertContent(action.content).run();
          }
          break;

        case 'insert':
          // Tool: Insert content at a specific position
          if (action.content && typeof action.position === 'number') {
            editor.chain()
              .focus()
              .setTextSelection(action.position)
              .insertContent(action.content)
              .run();
          } else if (action.content && action.position && typeof action.position === 'object') {
            // If position is a range, insert at the start
            editor.chain()
              .focus()
              .setTextSelection(action.position.from)
              .insertContent(action.content)
              .run();
          }
          break;

        case 'replace':
          // Tool: Replace content at a specific range
          if (action.position && typeof action.position === 'object' && action.content !== undefined) {
            editor.chain()
              .focus()
              .setTextSelection({ from: action.position.from, to: action.position.to })
              .insertContent(action.content)
              .run();
          }
          break;

        case 'delete':
          // Tool: Delete content at a specific range
          if (action.position && typeof action.position === 'object') {
            editor.chain()
              .focus()
              .deleteRange({ from: action.position.from, to: action.position.to })
              .run();
          } else if (typeof action.position === 'number' && action.content) {
            // Delete a specific number of characters from position
            const length = parseInt(action.content);
            editor.chain()
              .focus()
              .deleteRange({ from: action.position, to: action.position + length })
              .run();
          }
          break;

        case 'read':
          // Tool: Read action doesn't modify the document
          // Agent has already read the content to make decisions
          break;

        default:
      }
    });
  }

}

export const documentAgentService = new DocumentAgentService();
