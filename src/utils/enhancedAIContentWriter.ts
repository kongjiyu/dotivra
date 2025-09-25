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
  private aiCursorActive: boolean = false;

  constructor(editor: Editor) {
    this.editor = editor;
    this.initializeAICursor();
  }

  /**
   * Initialize the overlay container for temporary highlight divs
   */
  private initializeOverlayContainer(): void {
    // Create overlay container if it doesn't exist
    let container = document.getElementById('ai-overlay-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'ai-overlay-container';
      container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 1000;
      `;
      document.body.appendChild(container);
    }
    this.overlayContainer = container;
  }

  /**
   * Find content position by text search and context
   */
  public findContentPosition(searchText: string, context?: string): ContentPosition | null {
    console.log('🔍 Searching for content:', { searchText, context });
    
    const docContent = this.editor.getText();
    console.log('📄 Document content preview:', docContent.substring(0, 200) + '...');
    
    // Find text position in the document
    let searchIndex = -1;
    
    if (context) {
      // Find within context first, then get global position
      const contextIndex = docContent.indexOf(context);
      if (contextIndex !== -1) {
        const relativeIndex = context.indexOf(searchText);
        if (relativeIndex !== -1) {
          searchIndex = contextIndex + relativeIndex;
        }
      }
    } else {
      // Direct search
      searchIndex = docContent.indexOf(searchText);
    }

    console.log('📊 Search result:', { searchIndex, searchText: `"${searchText}"` });

    if (searchIndex === -1) {
      console.warn('❌ Content not found:', searchText);
      console.log('Available content options:', docContent.split('\n').map((line, i) => `${i}: "${line}"`));
      return null;
    }

    // Convert text position to ProseMirror position
    const proseMirrorPos = this.textPositionToProseMirror(searchIndex, searchText.length);
    
    console.log('✅ Found position:', {
      textIndex: searchIndex,
      proseMirrorFrom: proseMirrorPos.from,
      proseMirrorTo: proseMirrorPos.to,
      searchText: `"${searchText}"`
    });
    
    return {
      from: proseMirrorPos.from,
      to: proseMirrorPos.to,
      length: searchText.length,
      text: searchText
    };
  }

  /**
   * Convert text position to ProseMirror document position
   */
  private textPositionToProseMirror(textIndex: number, contentLength: number): { from: number; to: number } {
    const doc = this.editor.state.doc;
    let currentTextPos = 0;
    let proseMirrorFrom = 1; // Start at 1 (after doc node)
    let proseMirrorTo = 1;

    console.log('🔄 Converting text position to ProseMirror:', { textIndex, contentLength });

    doc.descendants((node, pos) => {
      if (node.isText) {
        const nodeText = node.text || '';
        console.log('📝 Examining text node:', { 
          nodeText: `"${nodeText}"`, 
          currentTextPos, 
          pos,
          targetIndex: textIndex 
        });
        
        if (currentTextPos <= textIndex && textIndex < currentTextPos + nodeText.length) {
          const offset = textIndex - currentTextPos;
          proseMirrorFrom = pos + offset;
          proseMirrorTo = proseMirrorFrom + contentLength;
          
          console.log('✅ Found position in text node:', {
            offset,
            proseMirrorFrom,
            proseMirrorTo,
            nodeText: `"${nodeText}"`
          });
          
          return false; // Stop traversal
        }
        currentTextPos += nodeText.length;
      } else if (node.isBlock && node.content.size === 0) {
        // Empty block nodes (like empty paragraphs)
        if (currentTextPos === textIndex) {
          proseMirrorFrom = pos + 1; // Inside the block
          proseMirrorTo = proseMirrorFrom + contentLength;
          console.log('✅ Found position in empty block:', { proseMirrorFrom, proseMirrorTo });
          return false;
        }
        currentTextPos += 1; // Account for block separators in text representation
      }
      return true;
    });

    console.log('🎯 Final position mapping:', { 
      textIndex, 
      contentLength, 
      proseMirrorFrom, 
      proseMirrorTo 
    });

    return { from: proseMirrorFrom, to: proseMirrorTo };
  }

  /**
   * Create temporary overlay div for AI operation preview
   */
  private createOverlay(config: AIOverlayConfig): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = `ai-overlay-${config.id}`;
    overlay.className = `ai-overlay ai-overlay-${config.type}`;
    
    // Get the DOM position of the content to overlay
    const coords = this.editor.view.coordsAtPos(config.position.from);
    
    overlay.style.cssText = `
      position: absolute;
      left: ${coords.left}px;
      top: ${coords.top - 25}px;
      background: ${this.getOverlayColor(config.type)};
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      pointer-events: auto;
      z-index: 1001;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      animation: ai-overlay-appear 0.3s ease-out;
    `;
    
    overlay.textContent = config.label;
    
    // Add click handlers for accept/reject
    overlay.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showOverlayActions(config.id, overlay);
    });

    return overlay;
  }

  /**
   * Get color based on operation type
   */
  private getOverlayColor(type: string): string {
    switch (type) {
      case 'addition': return '#10b981'; // Green
      case 'editing': return '#3b82f6';  // Blue
      case 'removal': return '#ef4444';  // Red  
      case 'replacement': return '#f97316'; // Orange
      default: return '#6b7280'; // Gray
    }
  }

  /**
   * Show accept/reject actions for an overlay
   */
  private showOverlayActions(overlayId: string, overlayElement: HTMLElement): void {
    const config = this.activeOverlays.get(overlayId);
    if (!config) return;

    // Create action buttons
    const actionsContainer = document.createElement('div');
    actionsContainer.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: flex;
      gap: 8px;
      margin-top: 4px;
      z-index: 1002;
    `;

    const acceptBtn = document.createElement('button');
    acceptBtn.textContent = '✓ Accept';
    acceptBtn.style.cssText = `
      background: #10b981;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    `;
    acceptBtn.onclick = () => this.acceptChange(overlayId);

    const rejectBtn = document.createElement('button');
    rejectBtn.textContent = '✗ Reject';
    rejectBtn.style.cssText = `
      background: #ef4444;
      color: white;
      border: none;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
    `;
    rejectBtn.onclick = () => this.rejectChange(overlayId);

    actionsContainer.appendChild(acceptBtn);
    actionsContainer.appendChild(rejectBtn);
    overlayElement.appendChild(actionsContainer);

    // Auto-hide actions after 10 seconds
    setTimeout(() => {
      if (actionsContainer.parentNode) {
        actionsContainer.remove();
      }
    }, 10000);
  }

  /**
   * Add content at specific position with overlay - shows green highlight
   */
  public async addContentAtPosition(
    position: ContentPosition,
    newContent: string,
    options: { animate?: boolean; label?: string } = {}
  ): Promise<string> {
    const overlayId = `add-${Date.now()}`;
    
    // Create overlay configuration
    const overlayConfig: AIOverlayConfig = {
      id: overlayId,
      position,
      type: 'addition',
      label: options.label || 'AI Added Content - Preview',
      newContent,
      visible: true
    };

    // Insert content at position and highlight it
    this.editor.commands.insertContentAt(position.from, newContent);
    
    // Select the newly inserted content
    const newTo = position.from + newContent.length;
    this.editor.commands.setTextSelection({ from: position.from, to: newTo });
    
    // Apply green highlight for addition
    this.editor.commands.setMark('highlight', { 
      color: 'rgba(34, 197, 94, 0.3)'
    });

    // Create and show overlay
    this.activeOverlays.set(overlayId, overlayConfig);
    const overlay = this.createOverlay(overlayConfig);
    this.overlayContainer?.appendChild(overlay);

    return overlayId;
  }

  /**
   * Edit content at specific position with overlay - shows blue highlight
   */
  public async editContentAtPosition(
    position: ContentPosition,
    newContent: string,
    options: { animate?: boolean; label?: string } = {}
  ): Promise<string> {
    const overlayId = `edit-${Date.now()}`;
    
    // Create overlay configuration
    const overlayConfig: AIOverlayConfig = {
      id: overlayId,
      position,
      type: 'editing',
      label: options.label || 'AI Edited Content - Preview',
      originalContent: position.text || '',
      newContent,
      visible: true
    };

    // Replace content and highlight it
    this.editor.commands.setTextSelection({ from: position.from, to: position.to });
    this.editor.commands.deleteSelection();
    this.editor.commands.insertContent(newContent);
    
    // Select the newly inserted content
    const newTo = position.from + newContent.length;
    this.editor.commands.setTextSelection({ from: position.from, to: newTo });
    
    // Apply blue highlight for editing
    this.editor.commands.setMark('highlight', { 
      color: 'rgba(59, 130, 246, 0.3)'
    });

    // Create and show overlay
    this.activeOverlays.set(overlayId, overlayConfig);
    const overlay = this.createOverlay(overlayConfig);
    this.overlayContainer?.appendChild(overlay);

    return overlayId;
  }

  /**
   * Mark content for removal with overlay - shows red highlight with strikethrough
   */
  public async markContentForRemoval(
    position: ContentPosition,
    options: { label?: string } = {}
  ): Promise<string> {
    const overlayId = `remove-${Date.now()}`;
    
    // Create overlay configuration
    const overlayConfig: AIOverlayConfig = {
      id: overlayId,
      position,
      type: 'removal',
      label: options.label || 'AI Marked for Removal - Preview',
      originalContent: position.text || '',
      visible: true
    };

    // Select and highlight the content for removal
    this.editor.commands.setTextSelection({ from: position.from, to: position.to });
    
    // Apply red highlight for removal (no strikethrough)
    this.editor.commands.setMark('highlight', { 
      color: 'rgba(239, 68, 68, 0.3)'
    });

    // Create and show overlay
    this.activeOverlays.set(overlayId, overlayConfig);
    const overlay = this.createOverlay(overlayConfig);
    this.overlayContainer?.appendChild(overlay);

    return overlayId;
  }



  /**
   * Enhanced replacement that shows both removal and addition
   */
    public async replaceContentWithHighlights(
        position: ContentPosition,
        newContent: string,
        options: { label?: string } = {}
    ): Promise<string> {
        const overlayId = `replace-${Date.now()}`;
    
        // Store original content
        const originalContent = this.editor.state.doc.textBetween(position.from, position.to);
    
        console.log('🔄 Replace operation debug:', {
            overlayId,
            originalContent: `"${originalContent}"`,
            newContent: `"${newContent}"`,
            position
        });
    
        // Create overlay configuration with both original and new content
        const overlayConfig: AIOverlayConfig = {
            id: overlayId,
            position,
            type: 'replacement',
            label: options.label || 'AI Replaced Content - Preview',
            originalContent,
            newContent,
            visible: true
        };

        // Simplified replacement approach
        console.log('🔄 Starting replacement operation...');
    
        // First, replace the content with a combined version showing both old and new
        const combinedContent = `${originalContent} → ${newContent}`;
    
        // Select and replace the original content
        this.editor.commands.setTextSelection({ from: position.from, to: position.to });
        this.editor.commands.deleteSelection();
        this.editor.commands.insertContent(combinedContent);
    
        // Calculate positions for highlighting
        const oldContentEnd = position.from + originalContent.length;
        const arrowStart = oldContentEnd;
        const arrowEnd = arrowStart + 3; // " → "
        const newContentStart = arrowEnd;
        const newContentEnd = newContentStart + newContent.length;
    
        console.log('🔄 Highlighting positions:', {
            originalContent,
            newContent,
            oldStart: position.from,
            oldEnd: oldContentEnd,
            newStart: newContentStart,
            newEnd: newContentEnd
        });
    
        // Highlight the original content in red
        this.editor.commands.setTextSelection({ from: position.from, to: oldContentEnd });
        this.editor.commands.setMark('highlight', { color: 'rgba(239, 68, 68, 0.3)' });
    
        // Highlight the new content in green
        this.editor.commands.setTextSelection({ from: newContentStart, to: newContentEnd });
        this.editor.commands.setMark('highlight', { color: 'rgba(34, 197, 94, 0.3)' });
    
        // Update overlay config with the new total length
        const totalLength = combinedContent.length;
        overlayConfig.position = {
            ...position,
            to: position.from + totalLength,
            length: totalLength
        };

        // Create and show overlay
        this.activeOverlays.set(overlayId, overlayConfig);
        const overlay = this.createOverlay(overlayConfig);
        this.overlayContainer?.appendChild(overlay);

        return overlayId;
    }

  /**
   * Accept a change and finalize it
   */
  public acceptChange(overlayId: string): void {
    const config = this.activeOverlays.get(overlayId);
    if (!config) return;

    console.log(`✅ Accepted ${config.type} operation:`, config);

    // Handle different operation types
    if (config.type === 'removal') {
      // For removal, delete the highlighted content entirely
      this.editor.commands.setTextSelection({ from: config.position.from, to: config.position.to });
      this.editor.commands.deleteSelection();
      
    } else if (config.type === 'replacement') {
      // For replacement, keep only the new content and remove all highlights
      const originalLength = config.originalContent?.length || 0;
      const newContentLength = config.newContent?.length || 0;
      const arrowLength = 3; // " → "
      const totalLength = originalLength + arrowLength + newContentLength;
      
      console.log('✅ Accepting replacement:', {
        originalLength,
        newContentLength,
        totalLength,
        newContent: config.newContent
      });
      
      // Select the entire replacement range and replace with just the new content
      this.editor.commands.setTextSelection({ 
        from: config.position.from, 
        to: config.position.from + totalLength 
      });
      this.editor.commands.deleteSelection();
      this.editor.commands.insertContent(config.newContent || '');
      
      // Remove any remaining highlights by selecting the new content and unsetting marks
      const finalContentLength = (config.newContent || '').length;
      this.editor.commands.setTextSelection({
        from: config.position.from,
        to: config.position.from + finalContentLength
      });
      this.editor.commands.unsetMark('highlight');
      
    } else {
      // For addition, just remove highlighting but keep content
      // Find the content range and remove highlights
      const doc = this.editor.state.doc;
      doc.descendants((node, pos) => {
        if (node.marks) {
          const hasHighlight = node.marks.some(mark => mark.type.name === 'highlight');
          if (hasHighlight) {
            this.editor.commands.setTextSelection({ from: pos, to: pos + (node.textContent?.length || 0) });
            this.editor.commands.unsetMark('highlight');
          }
        }
      });
    }

    // Remove overlay
    this.removeOverlay(overlayId);
  }

  /**
   * Reject a change and revert it
   */
  public rejectChange(overlayId: string): void {
    const config = this.activeOverlays.get(overlayId);
    if (!config) return;

    console.log(`❌ Rejected ${config.type} operation:`, config);

    // Revert changes based on operation type
    if (config.type === 'addition') {
      // Remove added content entirely
      this.editor.commands.setTextSelection({ from: config.position.from, to: config.position.from + (config.newContent?.length || 0) });
      this.editor.commands.deleteSelection();
      
    } else if (config.type === 'removal') {
      // Remove highlighting but keep the content
      this.editor.commands.setTextSelection({ from: config.position.from, to: config.position.to });
      this.editor.commands.unsetMark('highlight');
      
    } else if (config.type === 'replacement') {
      // Remove all changes and restore original content only
      const originalLength = config.originalContent?.length || 0;
      const newContentLength = config.newContent?.length || 0;
      const arrowLength = 3; // " → "
      const totalLength = originalLength + arrowLength + newContentLength;
      
      console.log('❌ Rejecting replacement:', {
        originalLength,
        newContentLength,
        totalLength,
        originalContent: config.originalContent
      });
      
      // Select the entire replacement range and restore original content
      this.editor.commands.setTextSelection({ 
        from: config.position.from, 
        to: config.position.from + totalLength 
      });
      this.editor.commands.deleteSelection();
      this.editor.commands.insertContent(config.originalContent || '');
      
    }

    // Remove overlay
    this.removeOverlay(overlayId);
  }

  /**
   * Remove an overlay from display
   */
  private removeOverlay(overlayId: string): void {
    const overlay = document.getElementById(`ai-overlay-${overlayId}`);
    if (overlay) {
      overlay.style.animation = 'ai-overlay-disappear 0.3s ease-in forwards';
      setTimeout(() => overlay.remove(), 300);
    }
    this.activeOverlays.delete(overlayId);
  }

  /**
   * Get all active overlays
   */
  public getActiveOverlays(): AIOverlayConfig[] {
    return Array.from(this.activeOverlays.values());
  }

  /**
   * Clear all overlays
   */
  public clearAllOverlays(): void {
    this.activeOverlays.forEach((_, id) => this.removeOverlay(id));
  }
}

export default EnhancedAIContentWriter;