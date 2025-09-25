import type { Editor } from '@tiptap/react';

/**
 * Enhanced AI Content Position Interface for precise targeting
 */
export interface ContentPosition {
  /** Start position in the document */
  from: number;
  /** End position in the document */
  to: number;
  /** Length of content to modify */
  length: number;
  /** Specific text content at this position */
  text?: string;
}

/**
 * AI Operation State for tracking active changes
 */
export interface AIOperationState {
  /** Unique identifier for this operation */
  id: string;
  /** Position of the operation */
  position: ContentPosition;
  /** Type of AI operation */
  type: 'addition' | 'editing' | 'removal' | 'replacement';
  /** Original content before modification */
  originalContent?: string;
  /** New content after modification */
  newContent?: string;
  /** Whether the operation is pending user action */
  pending: boolean;
}

/**
 * Enhanced AI Content Writer with Hover Effects and AI Cursor
 */
export class EnhancedAIContentWriter {
  private editor: Editor;
  private activeOperations: Map<string, AIOperationState> = new Map();

  constructor(editor: Editor) {
    this.editor = editor;
    this.initializeStyles();
    this.addHoverStyles();
  }

  /**
   * Initialize AI indicator styles and animations
   */
  private initializeStyles(): void {
    // Add AI indicator styles to document head
    const style = document.createElement('style');
    style.id = 'ai-indicator-styles';
    style.textContent = `
      
      .ai-reading {
        position: relative;
      }
      
      .ai-reading::before {
        content: '🤖 AI Reading...';
        position: absolute;
        top: -30px;
        left: 0;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        z-index: 1000;
        animation: ai-reading 1.5s infinite;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      .ai-writing {
        position: relative;
      }
      
      .ai-writing::before {
        content: '✍️ AI Writing...';
        position: absolute;
        top: -30px;
        left: 0;
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 600;
        z-index: 1000;
        animation: ai-writing 1.5s infinite;
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      .ai-pending-hover {
        position: relative;
        transition: all 0.3s ease;
        border-radius: 4px;
        cursor: pointer;
      }
      
      .ai-pending-hover:hover {
        background: rgba(124, 58, 237, 0.1);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(124, 58, 237, 0.2);
      }
      
      .ai-pending-hover:hover::after {
        content: 'Click to Accept/Reject';
        position: absolute;
        bottom: -35px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 500;
        white-space: nowrap;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
      }
      
      @keyframes ai-reading-pulse {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
        50% { transform: scale(1.1) rotate(2deg); opacity: 0.8; }
      }
      
      @keyframes ai-writing-pulse {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
        25% { transform: scale(1.15) rotate(-1deg); opacity: 0.9; }
        50% { transform: scale(1.05) rotate(1deg); opacity: 0.7; }
        75% { transform: scale(1.1) rotate(-0.5deg); opacity: 0.8; }
      }
      
      @keyframes ai-erasing-pulse {
        0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
        33% { transform: scale(1.2) rotate(5deg); opacity: 0.8; }
        66% { transform: scale(1.1) rotate(-5deg); opacity: 0.9; }
      }
      
      @keyframes ai-reading {
        0%, 100% { opacity: 1; transform: translateX(0); }
        50% { opacity: 0.7; transform: translateX(5px); }
      }
      
      @keyframes ai-writing {
        0%, 100% { opacity: 1; transform: scale(1); }
        25% { opacity: 0.8; transform: scale(1.05); }
        75% { opacity: 0.9; transform: scale(0.95); }
      }
      
      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(-50%) translateY(5px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
      }
    `;
    
    // Remove existing styles if present
    const existing = document.getElementById('ai-cursor-styles');
    if (existing) {
      existing.remove();
    }
    
    document.head.appendChild(style);
  }

  /**
   * Add hover styles for pending content
   */
  private addHoverStyles(): void {
    const editorElement = this.editor.view.dom;
    editorElement.addEventListener('mouseover', this.handleHover.bind(this));
    editorElement.addEventListener('mouseout', this.handleHoverOut.bind(this));
  }

  /**
   * Handle hover events on highlighted content
   */
  private handleHover(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'MARK' && target.style.backgroundColor) {
      target.classList.add('ai-pending-hover');
    }
  }

  /**
   * Handle hover out events
   */
  private handleHoverOut(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'MARK') {
      target.classList.remove('ai-pending-hover');
    }
  }

  /**
   * Show AI reading indicator
   */
  public showAIReading(): void {
    const editorElement = this.editor.view.dom;
    editorElement.classList.add('ai-reading');
  }

  /**
   * Show AI writing indicator
   */
  public showAIWriting(): void {
    const editorElement = this.editor.view.dom;
    editorElement.classList.remove('ai-reading');
    editorElement.classList.add('ai-writing');
  }

  /**
   * Show AI erasing indicator
   */
  public showAIErasing(): void {
    const editorElement = this.editor.view.dom;
    editorElement.classList.remove('ai-reading', 'ai-writing');
  }

  /**
   * Hide AI indicators
   */
  public hideAIIndicators(): void {
    const editorElement = this.editor.view.dom;
    editorElement.classList.remove('ai-reading', 'ai-writing');
  }



  /**
   * Find content position by text search
   */
  public findContentPosition(targetText: string): ContentPosition | null {
    const doc = this.editor.state.doc;
    const fullText = doc.textBetween(0, doc.content.size);
    
    const index = fullText.indexOf(targetText);
    if (index === -1) return null;
    
    return {
      from: index,
      to: index + targetText.length,
      length: targetText.length,
      text: targetText
    };
  }

  /**
   * Add content at position with AI effects
   */
  public async addContentAtPosition(
    position: ContentPosition,
    newContent: string,
    options: { label?: string; animate?: boolean } = {}
  ): Promise<string> {
    const operationId = `add-${Date.now()}`;
    
    // Show AI activity: reading -> writing
    this.showAIReading();
    await new Promise(resolve => setTimeout(resolve, 600));
    
    this.showAIWriting();
    await new Promise(resolve => setTimeout(resolve, 900));
    
    // Insert content with highlighting
    this.editor.commands.setTextSelection({ from: position.from, to: position.from });
    this.editor.commands.insertContent(newContent);
    
    // Highlight the new content
    this.editor.commands.setTextSelection({
      from: position.from,
      to: position.from + newContent.length
    });
    this.editor.commands.setMark('highlight', { color: 'rgba(34, 197, 94, 0.3)' });
    
    // Store operation state
    this.activeOperations.set(operationId, {
      id: operationId,
      position: { ...position, to: position.from + newContent.length },
      type: 'addition',
      newContent,
      pending: true
    });
    
    this.hideAIIndicators();
    return operationId;
  }

  /**
   * Mark content for removal with AI effects
   */
  public async markContentForRemoval(
    position: ContentPosition,
    options: { label?: string } = {}
  ): Promise<string> {
    const operationId = `remove-${Date.now()}`;
    
    // Show AI reading then erasing
    this.showAIReading();
    await new Promise(resolve => setTimeout(resolve, 800));
    
    this.showAIErasing();
    await new Promise(resolve => setTimeout(resolve, 700));
    
    const originalContent = this.editor.state.doc.textBetween(position.from, position.to);
    
    // Highlight content for removal
    this.editor.commands.setTextSelection({ from: position.from, to: position.to });
    this.editor.commands.setMark('highlight', { color: 'rgba(239, 68, 68, 0.3)' });
    
    // Store operation state
    this.activeOperations.set(operationId, {
      id: operationId,
      position,
      type: 'removal',
      originalContent,
      pending: true
    });
    
    this.hideAIIndicators();
    return operationId;
  }

  /**
   * Replace content with highlights and AI effects
   */
  public async replaceContentWithHighlights(
    position: ContentPosition,
    newContent: string,
    options: { label?: string } = {}
  ): Promise<string> {
    const operationId = `replace-${Date.now()}`;
    
    // Show AI activity sequence: reading -> erasing -> writing
    this.showAIReading();
    await new Promise(resolve => setTimeout(resolve, 600));
    
    this.showAIErasing();
    await new Promise(resolve => setTimeout(resolve, 400));
    
    this.showAIWriting();
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Store original content
    const originalContent = this.editor.state.doc.textBetween(position.from, position.to);
    
    // Create combined content for preview
    const combinedContent = `${originalContent} → ${newContent}`;
    
    // Replace with combined content
    this.editor.commands.setTextSelection({ from: position.from, to: position.to });
    this.editor.commands.deleteSelection();
    this.editor.commands.insertContent(combinedContent);
    
    // Calculate highlighting positions
    const oldContentEnd = position.from + originalContent.length;
    const newContentStart = oldContentEnd + 3; // " → "
    const newContentEnd = newContentStart + newContent.length;
    
    // Highlight original content in red
    this.editor.commands.setTextSelection({ from: position.from, to: oldContentEnd });
    this.editor.commands.setMark('highlight', { color: 'rgba(239, 68, 68, 0.3)' });
    
    // Highlight new content in green
    this.editor.commands.setTextSelection({ from: newContentStart, to: newContentEnd });
    this.editor.commands.setMark('highlight', { color: 'rgba(34, 197, 94, 0.3)' });
    
    // Store operation state
    this.activeOperations.set(operationId, {
      id: operationId,
      position: {
        ...position,
        to: position.from + combinedContent.length,
        length: combinedContent.length
      },
      type: 'replacement',
      originalContent,
      newContent,
      pending: true
    });
    
    this.hideAIIndicators();
    return operationId;
  }

  /**
   * Accept a change and finalize it
   */
  public acceptChange(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    console.log(`✅ Accepted ${operation.type} operation:`, operation);

    if (operation.type === 'removal') {
      // For removal, delete the highlighted content entirely
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.to 
      });
      this.editor.commands.deleteSelection();
      
    } else if (operation.type === 'replacement') {
      // For replacement, keep only the new content and remove all highlights
      const originalLength = operation.originalContent?.length || 0;
      const newContentLength = operation.newContent?.length || 0;
      const arrowLength = 3; // " → "
      const totalLength = originalLength + arrowLength + newContentLength;
      
      // Select the entire replacement range and replace with just the new content
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.from + totalLength 
      });
      this.editor.commands.deleteSelection();
      this.editor.commands.insertContent(operation.newContent || '');
      
      // Remove any remaining highlights
      const finalContentLength = (operation.newContent || '').length;
      this.editor.commands.setTextSelection({
        from: operation.position.from,
        to: operation.position.from + finalContentLength
      });
      this.editor.commands.unsetMark('highlight');
      
    } else {
      // For addition, just remove highlighting but keep content
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.to 
      });
      this.editor.commands.unsetMark('highlight');
    }

    // Clean up
    this.activeOperations.delete(operationId);
  }

  /**
   * Reject a change and revert it
   */
  public rejectChange(operationId: string): void {
    const operation = this.activeOperations.get(operationId);
    if (!operation) return;

    console.log(`❌ Rejected ${operation.type} operation:`, operation);

    if (operation.type === 'addition') {
      // For addition, remove the added content
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.to 
      });
      this.editor.commands.deleteSelection();
      
    } else if (operation.type === 'replacement') {
      // For replacement, restore original content
      const originalLength = operation.originalContent?.length || 0;
      const newContentLength = operation.newContent?.length || 0;
      const arrowLength = 3; // " → "
      const totalLength = originalLength + arrowLength + newContentLength;
      
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.from + totalLength 
      });
      this.editor.commands.deleteSelection();
      this.editor.commands.insertContent(operation.originalContent || '');
      
    } else if (operation.type === 'removal') {
      // For removal, just remove the highlighting
      this.editor.commands.setTextSelection({ 
        from: operation.position.from, 
        to: operation.position.to 
      });
      this.editor.commands.unsetMark('highlight');
    }

    // Clean up
    this.activeOperations.delete(operationId);
  }

  /**
   * Clear all operations
   */
  public clearAllOverlays(): void {
    this.activeOperations.forEach((_, id) => this.rejectChange(id));
    this.activeOperations.clear();
    this.hideAIIndicators();
  }
}