import type { Editor } from '@tiptap/react';
import { enhancedContentProcessor } from './contentProcessor';

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
 * Simplified Enhanced AI Content Writer - No Overlay System
 */
export class EnhancedAIContentWriter {
  private editor: Editor;
  private activeChanges: Map<string, { 
    position: ContentPosition; 
    type: string; 
    originalContent?: string; 
    newContent?: string 
  }> = new Map();

  constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * Calculate the actual text length of HTML content when rendered in the editor
   */
  private calculateContentLength(htmlContent: string): number {
    // Create a temporary div to parse HTML and get text length
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    return tempDiv.textContent?.length || htmlContent.length;
  }

  /**
   * Add content at specific position with highlight
   */
  public async addContentAtPosition(
    position: ContentPosition,
    newContent: string
  ): Promise<string> {
    const changeId = `add-${Date.now()}`;
    
    console.log('➕ Adding content (before processing):', { changeId, position, original: newContent });

    // Process content to convert markdown/HTML to TipTap-compatible format
    const processedContent = enhancedContentProcessor(newContent);
    
    console.log('✨ Processed content:', { processedContent });

    // Insert processed content at position
    this.editor.commands.insertContentAt(position.from, processedContent);
    
    // Calculate the actual length after processing (HTML may be different length than original)
    const actualLength = this.calculateContentLength(processedContent);
    const newTo = position.from + actualLength;
    
    // Select and highlight the newly inserted content
    this.editor.commands.setTextSelection({ from: position.from, to: newTo });
    this.editor.commands.setMark('highlight', { 
      color: 'rgba(34, 197, 94, 0.3)' // Green highlight for additions
    });

    // Store the change for later accept/reject (store both original and processed)
    this.activeChanges.set(changeId, {
      position: { ...position, to: newTo },
      type: 'addition',
      newContent: processedContent
    });

    return changeId;
  }

  /**
   * Mark content for removal with highlight
   */
  public async markContentForRemoval(
    position: ContentPosition
  ): Promise<string> {
    const changeId = `remove-${Date.now()}`;
    
    console.log('🗑️ Marking for removal:', { changeId, position });

    // Store original content
    const originalContent = this.editor.state.doc.textBetween(position.from, position.to);

    // Select and highlight the content for removal
    this.editor.commands.setTextSelection({ from: position.from, to: position.to });
    this.editor.commands.setMark('highlight', { 
      color: 'rgba(239, 68, 68, 0.3)' // Red highlight for removals
    });

    // Store the change for later accept/reject
    this.activeChanges.set(changeId, {
      position,
      type: 'removal',
      originalContent
    });

    return changeId;
  }

  /**
   * Replace content with dual highlighting
   */
  public async replaceContentWithHighlights(
    position: ContentPosition,
    newContent: string
  ): Promise<string> {
    const changeId = `replace-${Date.now()}`;
    
    console.log('🔄 Replacing content (before processing):', { changeId, position, original: newContent });

    // Store original content
    const originalContent = this.editor.state.doc.textBetween(position.from, position.to);

    // Process the new content to convert markdown/HTML to TipTap-compatible format
    const processedNewContent = enhancedContentProcessor(newContent);
    
    console.log('✨ Processed replacement content:', { processedNewContent });

    // Create combined content showing replacement
    const combinedContent = `${originalContent} → ${processedNewContent}`;

    // Replace content with combined version
    this.editor.commands.setTextSelection({ from: position.from, to: position.to });
    this.editor.commands.deleteSelection();
    this.editor.commands.insertContent(combinedContent);

    // Calculate highlighting positions
    const oldContentEnd = position.from + originalContent.length;
    const newContentStart = oldContentEnd + 3; // " → "
    const processedNewContentLength = this.calculateContentLength(processedNewContent);
    const newContentEnd = newContentStart + processedNewContentLength;

    // Highlight old content in red
    this.editor.commands.setTextSelection({ from: position.from, to: oldContentEnd });
    this.editor.commands.setMark('highlight', { color: 'rgba(239, 68, 68, 0.3)' });

    // Highlight new content in green
    this.editor.commands.setTextSelection({ from: newContentStart, to: newContentEnd });
    this.editor.commands.setMark('highlight', { color: 'rgba(34, 197, 94, 0.3)' });

    // Store the change for later accept/reject (store processed content)
    this.activeChanges.set(changeId, {
      position: { ...position, to: position.from + this.calculateContentLength(combinedContent) },
      type: 'replacement',
      originalContent,
      newContent: processedNewContent
    });

    return changeId;
  }

  /**
   * Accept a change and finalize it
   */
  public acceptChange(changeId: string): void {
    const change = this.activeChanges.get(changeId);
    if (!change) return;

    console.log(`✅ Accepting ${change.type}:`, change);

    switch (change.type) {
      case 'removal':
        // Delete the highlighted content
        this.editor.commands.setTextSelection({ from: change.position.from, to: change.position.to });
        this.editor.commands.deleteSelection();
        break;

      case 'replacement':
        // Replace with just the new content
        const originalLength = change.originalContent?.length || 0;
        const newContentLength = change.newContent?.length || 0;
        const totalLength = originalLength + 3 + newContentLength; // includes " → "
        
        this.editor.commands.setTextSelection({ 
          from: change.position.from, 
          to: change.position.from + totalLength 
        });
        this.editor.commands.deleteSelection();
        this.editor.commands.insertContent(change.newContent || '');
        
        // Remove highlights from final content
        const finalLength = (change.newContent || '').length;
        this.editor.commands.setTextSelection({
          from: change.position.from,
          to: change.position.from + finalLength
        });
        this.editor.commands.unsetMark('highlight');
        break;

      case 'addition':
        // Just remove the highlight, keep the content
        this.editor.commands.setTextSelection({ from: change.position.from, to: change.position.to });
        this.editor.commands.unsetMark('highlight');
        break;
    }

    this.activeChanges.delete(changeId);
  }

  /**
   * Reject a change and revert it
   */
  public rejectChange(changeId: string): void {
    const change = this.activeChanges.get(changeId);
    if (!change) return;

    console.log(`❌ Rejecting ${change.type}:`, change);

    switch (change.type) {
      case 'addition':
        // Remove the added content entirely
        const addedLength = change.newContent?.length || 0;
        this.editor.commands.setTextSelection({ 
          from: change.position.from, 
          to: change.position.from + addedLength 
        });
        this.editor.commands.deleteSelection();
        break;

      case 'removal':
        // Just remove the highlight, keep the content
        this.editor.commands.setTextSelection({ from: change.position.from, to: change.position.to });
        this.editor.commands.unsetMark('highlight');
        break;

      case 'replacement':
        // Restore original content only
        const originalLength = change.originalContent?.length || 0;
        const newContentLength = change.newContent?.length || 0;
        const totalLength = originalLength + 3 + newContentLength; // includes " → "
        
        this.editor.commands.setTextSelection({ 
          from: change.position.from, 
          to: change.position.from + totalLength 
        });
        this.editor.commands.deleteSelection();
        this.editor.commands.insertContent(change.originalContent || '');
        break;
    }

    this.activeChanges.delete(changeId);
  }

  /**
   * Clear all active changes
   */
  public clearAllOverlays(): void {
    // Remove all highlights from the document
    const doc = this.editor.state.doc;
    doc.descendants((node, pos) => {
      if (node.marks) {
        const hasHighlight = node.marks.some(mark => mark.type.name === 'highlight');
        if (hasHighlight) {
          this.editor.commands.setTextSelection({ 
            from: pos, 
            to: pos + (node.textContent?.length || 0) 
          });
          this.editor.commands.unsetMark('highlight');
        }
      }
    });

    this.activeChanges.clear();
  }
}

export default EnhancedAIContentWriter;