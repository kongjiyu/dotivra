import { Editor } from '@tiptap/react';

export interface ContentPosition {
  from: number;
  to: number;
  length?: number;
}

interface AIOperation {
  id: string;
  position: ContentPosition;
  type: 'addition' | 'removal' | 'replacement';
  originalContent?: string;
  newContent?: string;
  pending: boolean;
}

export class SimpleCursorAIWriter {
  private editor: Editor;
  private activeOperations = new Map<string, AIOperation>();
  private cursorElement: HTMLElement | null = null;
  private currentPosition: number = 0;
  private currentMode: 'reading' | 'writing' | 'erasing' | 'none' = 'none';

  constructor(editor: Editor) {
    this.editor = editor;
    this.initializeCursor();
  }

  /**
   * Initialize cursor position indicator
   */
  private initializeCursor(): void {
    // Add cursor styles
    const style = document.createElement('style');
    style.id = 'ai-cursor-styles';
    style.textContent = `
      .ai-cursor-position {
        position: absolute;
        width: 2px;
        height: 1.2em;
        pointer-events: none;
        z-index: 1000;
        animation: cursor-blink 1s infinite;
        transition: all 0.1s ease;
        border-radius: 1px;
      }
      
      .ai-cursor-position.reading {
        background-color: #3b82f6;
        box-shadow: 0 0 4px rgba(59, 130, 246, 0.5);
      }
      
      .ai-cursor-position.writing {
        background-color: #22c55e;
        box-shadow: 0 0 4px rgba(34, 197, 94, 0.5);
      }
      
      .ai-cursor-position.erasing {
        background-color: #ef4444;
        box-shadow: 0 0 4px rgba(239, 68, 68, 0.5);
      }
      
      @keyframes cursor-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0.3; }
      }
    `;

    // Remove existing styles if present
    const existing = document.getElementById('ai-cursor-styles');
    if (existing) {
      existing.remove();
    }

    document.head.appendChild(style);

    // Create cursor element
    this.createCursorElement();
  }

  /**
   * Create the cursor DOM element
   */
  private createCursorElement(): void {
    this.cursorElement = document.createElement('div');
    this.cursorElement.className = 'ai-cursor-position';
    this.cursorElement.style.display = 'none';
    document.body.appendChild(this.cursorElement);
  }

  /**
   * Show cursor at specific position
   */
  private showCursorAtPosition(position: number, mode: 'reading' | 'writing' | 'erasing'): void {
    if (!this.cursorElement) return;

    this.currentPosition = position;
    this.currentMode = mode;

    // Get the DOM position for the text position
    const resolved = this.editor.view.state.doc.resolve(position);
    const coords = this.editor.view.coordsAtPos(position);
    
    if (coords) {
      // Update cursor appearance
      this.cursorElement.className = `ai-cursor-position ${mode}`;
      
      // Position the cursor
      this.cursorElement.style.display = 'block';
      this.cursorElement.style.left = `${coords.left}px`;
      this.cursorElement.style.top = `${coords.top}px`;
    }
  }

  /**
   * Hide the AI cursor
   */
  private hideCursor(): void {
    if (this.cursorElement) {
      this.cursorElement.style.display = 'none';
    }
    this.currentMode = 'none';
  }

  /**
   * Animate cursor through a range of positions
   */
  private async animateCursorThroughRange(
    startPos: number, 
    endPos: number, 
    mode: 'reading' | 'writing' | 'erasing',
    speed: number = 100
  ): Promise<void> {
    for (let pos = startPos; pos <= endPos; pos++) {
      this.showCursorAtPosition(pos, mode);
      await new Promise(resolve => setTimeout(resolve, speed));
    }
  }

  /**
   * Add content at position with cursor indication
   */
  public async addContentAtPosition(
    position: ContentPosition,
    newContent: string,
    options: { label?: string; animate?: boolean } = {}
  ): Promise<string> {
    const operationId = `add-${Date.now()}`;
    
    // Show reading cursor at position
    this.showCursorAtPosition(position.from, 'reading');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Switch to writing cursor and animate through new content
    this.showCursorAtPosition(position.from, 'writing');
    
    // Insert content
    this.editor.commands.setTextSelection({ from: position.from, to: position.from });
    this.editor.commands.insertContent(newContent);
    
    // Animate cursor through the new content
    if (options.animate !== false) {
      await this.animateCursorThroughRange(
        position.from, 
        position.from + newContent.length,
        'writing',
        50
      );
    }
    
    // Store operation state
    this.activeOperations.set(operationId, {
      id: operationId,
      position: { ...position, to: position.from + newContent.length },
      type: 'addition',
      newContent,
      pending: true
    });
    
    this.hideCursor();
    return operationId;
  }

  /**
   * Mark content for removal with cursor indication
   */
  public async markContentForRemoval(
    position: ContentPosition,
    options: { label?: string } = {}
  ): Promise<string> {
    const operationId = `remove-${Date.now()}`;
    
    // Show reading cursor through the content to be removed
    if (position.to > position.from) {
      await this.animateCursorThroughRange(position.from, position.to, 'reading', 80);
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Switch to erasing cursor and animate back through content
      await this.animateCursorThroughRange(position.to, position.from, 'erasing', 60);
    } else {
      this.showCursorAtPosition(position.from, 'erasing');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Store original content
    const originalContent = this.editor.state.doc.textBetween(position.from, position.to);
    
    // Store operation state
    this.activeOperations.set(operationId, {
      id: operationId,
      position,
      type: 'removal',
      originalContent,
      pending: true
    });
    
    this.hideCursor();
    return operationId;
  }

  /**
   * Replace content with cursor indication
   */
  public async replaceContentWithHighlights(
    position: ContentPosition,
    newContent: string,
    options: { label?: string } = {}
  ): Promise<string> {
    const operationId = `replace-${Date.now()}`;
    
    // Show reading cursor through original content
    if (position.to > position.from) {
      await this.animateCursorThroughRange(position.from, position.to, 'reading', 80);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Show erasing cursor
      this.showCursorAtPosition(position.from, 'erasing');
      await new Promise(resolve => setTimeout(resolve, 400));
    }
    
    // Store original content
    const originalContent = this.editor.state.doc.textBetween(position.from, position.to);
    
    // Replace content
    this.editor.commands.setTextSelection({ from: position.from, to: position.to });
    this.editor.commands.deleteSelection();
    this.editor.commands.insertContent(newContent);
    
    // Show writing cursor through new content
    this.showCursorAtPosition(position.from, 'writing');
    await this.animateCursorThroughRange(
      position.from, 
      position.from + newContent.length,
      'writing',
      50
    );
    
    // Store operation state
    this.activeOperations.set(operationId, {
      id: operationId,
      position: { from: position.from, to: position.from + newContent.length },
      type: 'replacement',
      originalContent,
      newContent,
      pending: true
    });
    
    this.hideCursor();
    return operationId;
  }

  /**
   * Accept a pending operation
   */
  public acceptOperation(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      operation.pending = false;
      this.activeOperations.delete(operationId);
    }
  }

  /**
   * Reject a pending operation
   */
  public rejectOperation(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    // Restore original content if it was a replacement or removal
    if (operation.type === 'replacement' && operation.originalContent) {
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.to 
      });
      this.editor.commands.deleteSelection();
      this.editor.commands.insertContent(operation.originalContent);
    } else if (operation.type === 'addition') {
      // Remove the added content
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.to 
      });
      this.editor.commands.deleteSelection();
    }

    this.activeOperations.delete(operationId);
  }

  /**
   * Get all pending operations
   */
  public getPendingOperations(): AIOperation[] {
    return Array.from(this.activeOperations.values()).filter(op => op.pending);
  }

  /**
   * Clear all operations and hide cursor
   */
  public cleanup(): void {
    this.activeOperations.clear();
    this.hideCursor();
  }

  /**
   * Destroy the AI writer and clean up resources
   */
  public destroy(): void {
    this.cleanup();
    
    if (this.cursorElement) {
      this.cursorElement.remove();
      this.cursorElement = null;
    }
    
    const styles = document.getElementById('ai-cursor-styles');
    if (styles) {
      styles.remove();
    }
  }
}