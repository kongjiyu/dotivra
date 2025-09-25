import type { Editor } from '@tiptap/react';

/**
 * Types for AI content writing functionality
 */
export interface AIContentOptions {
  /** Position to insert content ('current' | 'end' | 'start' | { line: number, ch: number }) */
  position?: 'current' | 'end' | 'start' | { line: number; ch: number };
  /** Whether to animate the content insertion */
  animate?: boolean;
  /** Animation    // Generate unique preview ID
    this.previewContentId = `ai-remove-${Date.now()}`;
    
    const { from, to } = this.editor.state.selection;
    
    if (from !== to) {
      // Use current selection
      this.affectedRange = { from, to };
      
      // Set global variables for UI integration
      (window as any).currentAIContentId = this.previewContentId;
      (window as any).currentAIOperationType = 'removal';
      (window as any).currentAIContentSummary = `Removing: "${contentToRemove.substring(0, 50)}${contentToRemove.length > 50 ? '...' : ''}"`;
      
      // Mark selected content for removal (red highlighting)
      this.markContentForRemoval(from, to, this.previewContentId);illiseconds per character */
  animationSpeed?: number;
  /** Whether to focus the editor after insertion */
  focus?: boolean;
  /** Callback when content insertion is complete */
  onComplete?: () => void;
  /** Callback for each character during animation */
  onProgress?: (progress: number, totalLength: number) => void;
  /** Whether this is preview content that should be highlighted */
  isPreview?: boolean;
  /** Unique ID for preview content tracking */
  previewId?: string;
  /** Type of AI operation being performed */
  operationType?: 'addition' | 'editing' | 'removal' | 'replacement';
  /** Original content being modified (for editing/removal operations) */
  originalContent?: string;
}

export interface StreamingOptions extends AIContentOptions {
  /** Whether to stream content character by character */
  streaming?: boolean;
  /** Delay between characters in streaming mode */
  streamDelay?: number;
}

export interface ContentParseOptions {
  /** Whether to parse markdown to HTML */
  parseMarkdown?: boolean;
  /** Whether to preserve line breaks */
  preserveLineBreaks?: boolean;
  /** Whether to trim whitespace */
  trim?: boolean;
}

/**
 * Main AI Content Writer utility class
 */
export class AIContentWriter {
  private editor: Editor;
  private isAnimating: boolean = false;
  private animationController?: AbortController;
  private originalContent: string = '';
  private previewContentId: string | null = null;
  private operationType: 'addition' | 'editing' | 'removal' | 'replacement' = 'addition';
  private affectedRange: { from: number; to: number } | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
  }

  /**
   * Write AI content to the editor with various options
   */
  async writeContent(
    content: string,
    options: AIContentOptions & ContentParseOptions = {}
  ): Promise<void> {
    const {
      position = 'current',
      animate = false,
      animationSpeed = 50,
      focus = true,
      parseMarkdown = true, // Default to true for markdown parsing
      trim = true,
      onComplete,
      onProgress
    } = options;

    // Stop any existing animation
    this.stopAnimation();

    // Process content
    let processedContent = content;
    if (trim) {
      processedContent = processedContent.trim();
    }

    if (!processedContent) {
      onComplete?.();
      return;
    }

    // Focus editor if requested
    if (focus) {
      this.editor.commands.focus();
    }

    // Set position
    this.setPosition(position);

    if (animate) {
      if (parseMarkdown) {
        await this.animateMarkdownContent(processedContent, animationSpeed, onProgress);
      } else {
        await this.animateContent(processedContent, animationSpeed, onProgress);
      }
    } else {
      this.insertContent(processedContent, parseMarkdown);
    }

    onComplete?.();
  }

  /**
   * Stream AI content to the editor with typing animation
   */
  async streamContent(
    content: string,
    options: StreamingOptions & ContentParseOptions = {}
  ): Promise<void> {
    const {
      streaming = true,
      streamDelay = 30,
      parseMarkdown = true, // Default to true
      ...otherOptions
    } = options;

    if (!streaming) {
      return this.writeContent(content, otherOptions);
    }

    // For streaming, we'll animate character by character
    return this.writeContent(content, {
      ...otherOptions,
      animate: true,
      animationSpeed: streamDelay,
      parseMarkdown
    });
  }

  /**
   * Insert structured content (headings, lists, etc.)
   */
  async insertStructuredContent(
    contentType: 'heading' | 'list' | 'table' | 'mermaid' | 'quote',
    data: any,
    options: AIContentOptions = {}
  ): Promise<void> {
    let content = '';

    switch (contentType) {
      case 'heading':
        const { level = 2, text } = data;
        content = `<h${level}>${text}</h${level}>`;
        break;

      case 'list':
        const { items, ordered = false } = data;
        const tag = ordered ? 'ol' : 'ul';
        const listItems = items.map((item: string) => `<li>${item}</li>`).join('');
        content = `<${tag}>${listItems}</${tag}>`;
        break;

      case 'table':
        const { headers, rows } = data;
        const headerRow = headers.map((h: string) => `<th>${h}</th>`).join('');
        const bodyRows = rows.map((row: string[]) => 
          `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
        ).join('');
        content = `<table><thead><tr>${headerRow}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        break;

      case 'mermaid':
        const { chart, theme = 'default' } = data;
        // Use the mermaid command from our extension
        this.editor.commands.insertMermaidDiagram({ chart, theme });
        options.onComplete?.();
        return;

      case 'quote':
        content = `<blockquote>${data.text}</blockquote>`;
        break;

      default:
        throw new Error(`Unsupported content type: ${contentType}`);
    }

    return this.writeContent(content, options);
  }

  /**
   * Replace selected text with AI content
   */
  async replaceSelection(
    content: string,
    options: AIContentOptions & ContentParseOptions = {}
  ): Promise<void> {
    const { from, to } = this.editor.state.selection;
    
    if (from === to) {
      // No selection, just insert at cursor
      return this.writeContent(content, options);
    }

    // Delete selection first
    this.editor.commands.deleteRange({ from, to });
    
    // Insert new content
    return this.writeContent(content, options);
  }

  /**
   * Append content to the end of the document
   */
  async appendContent(
    content: string,
    options: AIContentOptions & ContentParseOptions = {}
  ): Promise<void> {
    return this.writeContent(content, {
      ...options,
      position: 'end'
    });
  }

  /**
   * Insert content at the beginning of the document
   */
  async prependContent(
    content: string,
    options: AIContentOptions & ContentParseOptions = {}
  ): Promise<void> {
    return this.writeContent(content, {
      ...options,
      position: 'start'
    });
  }

  /**
   * Stop any ongoing animation
   */
  stopAnimation(): void {
    if (this.animationController) {
      this.animationController.abort();
      this.animationController = undefined;
    }
    this.isAnimating = false;
  }

  /**
   * Check if content is currently being animated
   */
  isContentAnimating(): boolean {
    return this.isAnimating;
  }

  /**
   * Create a preview version with highlighted AI content
   */
  async createPreviewWithAIContent(
    aiContent: string,
    options: AIContentOptions & ContentParseOptions = {}
  ): Promise<{ originalContent: string; previewId: string }> {
    // Store original content
    this.originalContent = this.editor.getHTML();
    
    // Generate unique preview ID
    this.previewContentId = `ai-preview-${Date.now()}`;
    
    // Insert AI content with preview highlighting
    await this.writeContent(aiContent, {
      ...options,
      isPreview: true,
      previewId: this.previewContentId,
      parseMarkdown: true,
      animate: true
    });

    return {
      originalContent: this.originalContent,
      previewId: this.previewContentId
    };
  }

  /**
   * Accept preview changes - remove highlighting and make permanent
   */
  acceptPreviewChanges(): void {
    if (!this.previewContentId) return;

    const previewElements = document.querySelectorAll(`[data-ai-content-id="${this.previewContentId}"]`);
    previewElements.forEach(element => {
      element.classList.remove('ai-preview-content');
      element.classList.add('ai-generated-content');
      element.removeAttribute('data-ai-content-id');

      // Remove highlighting after brief moment
      setTimeout(() => {
        element.classList.remove('ai-generated-content');
      }, 2000);
    });

    this.originalContent = '';
    this.previewContentId = null;
  }

  /**
   * Reject preview changes - restore original content
   */
  rejectPreviewChanges(): void {
    if (!this.originalContent) return;

    // Remove preview highlighting
    if (this.previewContentId) {
      const previewElements = document.querySelectorAll(`[data-ai-content-id="${this.previewContentId}"]`);
      previewElements.forEach(element => {
        element.remove();
      });
    }

    // Restore original content based on operation type
    if (this.operationType === 'removal' && this.affectedRange) {
      // For removal operations, we need to restore the removed content
      this.editor.commands.focus();
      this.editor.commands.setTextSelection(this.affectedRange.from);
      this.insertContent(this.originalContent, true);
    } else {
      // For other operations, restore full content
      this.editor.commands.setContent(this.originalContent, { emitUpdate: false });
    }
    
    this.originalContent = '';
    this.previewContentId = null;
    this.operationType = 'addition';
    this.affectedRange = null;
  }

  /**
   * AI Edit Content - Modify existing content with highlighting
   */
  async editContent(
    originalText: string,
    newText: string,
    options: AIContentOptions & ContentParseOptions = {}
  ): Promise<{ originalContent: string; previewId: string }> {
    this.operationType = 'editing';
    
    // Store the full document content before editing
    this.originalContent = this.editor.getHTML();
    
    // Find and replace the original text with highlighted new text
    const { from, to } = this.editor.state.selection;
    
    if (from !== to) {
      // Use selection if available
      this.affectedRange = { from, to };
      this.editor.commands.deleteRange({ from, to });
    } else {
      // Try to find the original text in the document
      const doc = this.editor.state.doc;
      const foundPos = this.findTextInDocument(doc, originalText);
      if (foundPos) {
        this.affectedRange = foundPos;
        this.editor.commands.deleteRange(foundPos);
      }
    }

    // Generate unique preview ID
    this.previewContentId = `ai-edit-${Date.now()}`;
    
    // Set global variables for UI integration
    (window as any).currentAIContentId = this.previewContentId;
    (window as any).currentAIOperationType = 'editing';
    (window as any).currentAIContentSummary = `Edited: "${originalText.substring(0, 50)}${originalText.length > 50 ? '...' : ''}"`;
    
    // Insert the new content with editing highlighting
    await this.writeContent(newText, {
      ...options,
      isPreview: true,
      previewId: this.previewContentId,
      operationType: 'editing',
      parseMarkdown: true,
      animate: true
    });

    return {
      originalContent: this.originalContent,
      previewId: this.previewContentId
    };
  }

  /**
   * AI Remove Content - Mark content for removal with highlighting
   */
  async removeContent(
    contentToRemove: string,
    _options: AIContentOptions & ContentParseOptions = {}
  ): Promise<{ originalContent: string; previewId: string }> {
    this.operationType = 'removal';
    
    // Store the full document content before removal
    this.originalContent = this.editor.getHTML();
    
    // Generate unique preview ID
    this.previewContentId = `ai-remove-${Date.now()}`;
    
    const { from, to } = this.editor.state.selection;
    
    if (from !== to) {
      // Use selection if available
      this.affectedRange = { from, to };
      
      // Mark selected content for removal (red highlighting)
      this.markContentForRemoval(from, to, this.previewContentId);
    } else {
      // Try to find the content to remove in the document
      const doc = this.editor.state.doc;
      const foundPos = this.findTextInDocument(doc, contentToRemove);
      if (foundPos) {
        this.affectedRange = foundPos;
        this.markContentForRemoval(foundPos.from, foundPos.to, this.previewContentId);
      }
    }

    return {
      originalContent: this.originalContent,
      previewId: this.previewContentId
    };
  }

  /**
   * AI Add Content - Insert new content with highlighting
   */
  async addContent(
    newContent: string,
    options: AIContentOptions & ContentParseOptions = {}
  ): Promise<{ originalContent: string; previewId: string }> {
    this.operationType = 'addition';
    
    // Store the full document content before addition
    this.originalContent = this.editor.getHTML();
    
    // Generate unique preview ID
    this.previewContentId = `ai-add-${Date.now()}`;
    
    // Set global variables for UI integration
    (window as any).currentAIContentId = this.previewContentId;
    (window as any).currentAIOperationType = 'addition';
    (window as any).currentAIContentSummary = `Adding: "${newContent.substring(0, 50)}${newContent.length > 50 ? '...' : ''}"`;
    
    // Insert the new content with addition highlighting
    await this.writeContent(newContent, {
      ...options,
      isPreview: true,
      previewId: this.previewContentId,
      operationType: 'addition',
      parseMarkdown: true,
      animate: true
    });

    return {
      originalContent: this.originalContent,
      previewId: this.previewContentId
    };
  }

  /**
   * Find text in document and return its position
   */
  private findTextInDocument(doc: any, text: string): { from: number; to: number } | null {
    const docText = doc.textBetween(0, doc.content.size, ' ');
    const index = docText.indexOf(text);
    
    if (index !== -1) {
      return {
        from: index,
        to: index + text.length
      };
    }
    
    return null;
  }

  /**
   * Mark content for removal with red highlighting
   */
  private markContentForRemoval(from: number, to: number, previewId: string): void {
    // Add removal highlighting to the selected range
    setTimeout(() => {
      const proseMirrorElement = this.editor.options.element?.querySelector('.ProseMirror');
      if (!proseMirrorElement) return;

      // Find elements in the range and mark them for removal
      const walker = document.createTreeWalker(
        proseMirrorElement,
        NodeFilter.SHOW_ELEMENT,
        null
      );

      let node;
      while (node = walker.nextNode()) {
        const element = node as HTMLElement;
        if (element.tagName && (
          element.tagName.match(/^H[1-6]$/) ||
          element.tagName === 'P' ||
          element.tagName === 'LI' ||
          element.tagName === 'UL' ||
          element.tagName === 'OL' ||
          element.tagName === 'BLOCKQUOTE'
        )) {
          try {
            const elementPos = this.editor.view.posAtDOM(element, 0);
            if (elementPos >= from && elementPos <= to) {
              element.classList.add('ai-removal-content');
              element.setAttribute('data-ai-content-id', previewId);
            }
          } catch (e) {
            // Ignore positioning errors
          }
        }
      }
    }, 100);
  }

  /**
   * Private method to set cursor position
   */
  private setPosition(position: AIContentOptions['position']): void {
    if (!position || position === 'current') {
      return; // Keep current position
    }

    if (position === 'end') {
      this.editor.commands.focus('end');
    } else if (position === 'start') {
      this.editor.commands.focus('start');
    } else if (typeof position === 'object') {
      // Custom position - for now we'll just focus at end
      // TODO: Implement precise positioning if needed
      this.editor.commands.focus('end');
    }
  }

  /**
   * Private method to insert content without animation
   */
  private insertContent(content: string, parseMarkdown: boolean = true): void {
    if (parseMarkdown) {
      this.insertMarkdownContent(content);
    } else {
      this.editor.commands.insertContent(content);
    }

    // Apply preview highlighting if needed
    this.applyPreviewHighlighting();
  }

  /**
   * Get CSS class based on operation type
   */
  private getOperationCSSClass(): string {
    switch (this.operationType) {
      case 'editing':
        return 'ai-editing-content';
      case 'removal':
        return 'ai-removal-content';
      case 'addition':
        return 'ai-addition-content';
      case 'replacement':
        return 'ai-replacement-content';
      default:
        return 'ai-preview-content';
    }
  }

  /**
   * Apply preview highlighting to recently inserted content
   */
  private applyPreviewHighlighting(): void {
    if (!this.previewContentId) {
      console.error('No preview content ID available for highlighting');
      return;
    }

    console.log('🎨 Applying preview highlighting:', {
      operation: this.operationType,
      contentId: this.previewContentId
    });

    // Find recently inserted elements and apply highlighting
    setTimeout(() => {
      // Try multiple selectors to find the editor DOM
      let editorElement = this.editor.options.element?.querySelector('.ProseMirror') ||
                         this.editor.view?.dom ||
                         this.editor.options.element;

      if (!editorElement) {
        console.error('❌ Could not find editor DOM element');
        return;
      }

      console.log('✅ Found editor element:', editorElement.tagName, editorElement.className);

      const walker = document.createTreeWalker(
        editorElement,
        NodeFilter.SHOW_ELEMENT,
        {
          acceptNode: (node: Node) => {
            const element = node as HTMLElement;
            if (element.tagName && (
              element.tagName.match(/^H[1-6]$/) ||
              element.tagName === 'P' ||
              element.tagName === 'LI' ||
              element.tagName === 'UL' ||
              element.tagName === 'OL' ||
              element.tagName === 'BLOCKQUOTE'
            ) && !element.hasAttribute('data-ai-content-id')) {
              return NodeFilter.FILTER_ACCEPT;
            }
            return NodeFilter.FILTER_SKIP;
          }
        }
      );

      let node;
      const elementsToHighlight: HTMLElement[] = [];

      while (node = walker.nextNode()) {
        const element = node as HTMLElement;
        elementsToHighlight.push(element);
        console.log('🔍 Found element to highlight:', {
          tag: element.tagName,
          text: element.textContent?.substring(0, 50) + '...',
          classes: Array.from(element.classList)
        });
      }

      console.log(`📝 Found ${elementsToHighlight.length} elements to highlight`);

      if (elementsToHighlight.length === 0) {
        console.warn('⚠️ No new elements found to highlight - content may have been processed already');
        return;
      }

      // Apply highlighting to new elements based on operation type
      const cssClass = this.getOperationCSSClass();
      console.log('🎯 Applying CSS class:', cssClass);
      
      elementsToHighlight.forEach((element, index) => {
        // Add operation-specific CSS class
        element.classList.add(cssClass);
        element.classList.add('ai-preview-content'); // Generic preview class
        element.setAttribute('data-ai-content-id', this.previewContentId!);
        element.setAttribute('data-ai-operation', this.operationType || 'unknown');
        
        console.log(`✨ Applied highlighting ${index + 1}:`, {
          element: element.tagName,
          classes: Array.from(element.classList),
          contentId: element.getAttribute('data-ai-content-id'),
          operation: element.getAttribute('data-ai-operation')
        });
      });

      // Force style recalculation to ensure highlighting appears
      if (elementsToHighlight.length > 0) {
        elementsToHighlight.forEach(el => el.offsetHeight); // Trigger reflow
        console.log('🔄 Forced style recalculation for highlighting');
      }
    }, 150); // Increased timeout for DOM stability
  }

  /**
   * Private method to insert markdown content as formatted text
   */
  private insertMarkdownContent(markdown: string): void {
    // Parse markdown content line by line and insert appropriate TipTap commands
    const lines = markdown.split('\n');
    let inList = false;
    let listType = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();
      
      if (!trimmedLine) {
        // Empty line - close any open lists and add paragraph break
        if (inList) {
          inList = false;
          listType = '';
        }
        this.editor.commands.insertContent('<p></p>');
        continue;
      }
      
      // Handle headings
      if (trimmedLine.startsWith('#')) {
        if (inList) {
          inList = false;
          listType = '';
        }
        const level = trimmedLine.match(/^#+/)?.[0].length || 1;
        const text = trimmedLine.replace(/^#+\s*/, '');
        this.editor.commands.setNode('heading', { level: Math.min(level, 6) });
        this.editor.commands.insertContent(this.parseInlineMarkdown(text));
        this.editor.commands.enter();
      }
      // Handle unordered lists
      else if (trimmedLine.match(/^[\*\-\+]\s/)) {
        const text = trimmedLine.replace(/^[\*\-\+]\s*/, '');
        if (!inList || listType !== 'bullet') {
          this.editor.commands.toggleBulletList();
          inList = true;
          listType = 'bullet';
        } else {
          this.editor.commands.splitListItem('listItem');
        }
        this.editor.commands.insertContent(this.parseInlineMarkdown(text));
      }
      // Handle ordered lists
      else if (trimmedLine.match(/^\d+\.\s/)) {
        const text = trimmedLine.replace(/^\d+\.\s*/, '');
        if (!inList || listType !== 'ordered') {
          this.editor.commands.toggleOrderedList();
          inList = true;
          listType = 'ordered';
        } else {
          this.editor.commands.splitListItem('listItem');
        }
        this.editor.commands.insertContent(this.parseInlineMarkdown(text));
      }
      // Handle blockquotes
      else if (trimmedLine.startsWith('>')) {
        if (inList) {
          inList = false;
          listType = '';
        }
        const text = trimmedLine.replace(/^>\s*/, '');
        this.editor.commands.setBlockquote();
        this.editor.commands.insertContent(this.parseInlineMarkdown(text));
        this.editor.commands.enter();
      }
      // Handle code blocks
      else if (trimmedLine.startsWith('```')) {
        if (inList) {
          inList = false;
          listType = '';
        }
        // Skip for now, we'll handle in future
        continue;
      }
      // Regular paragraph
      else {
        if (inList) {
          inList = false;
          listType = '';
        }
        this.editor.commands.insertContent(this.parseInlineMarkdown(trimmedLine));
        this.editor.commands.enter();
      }
    }
  }

  /**
   * Private method to parse inline markdown (bold, italic, etc.)
   */
  private parseInlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')  // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>')              // Italic
      .replace(/`(.*?)`/g, '<code>$1</code>')            // Inline code
      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>'); // Links
  }

  /**
   * Private method to animate content insertion
   */
  private async animateContent(
    content: string,
    speed: number,
    onProgress?: (progress: number, total: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isAnimating = true;
      this.animationController = new AbortController();
      
      const signal = this.animationController.signal;
      let index = 0;
      const totalLength = content.length;

      const animate = () => {
        if (signal.aborted) {
          this.isAnimating = false;
          reject(new Error('Animation aborted'));
          return;
        }

        if (index < totalLength) {
          const char = content[index];
          this.editor.commands.insertContent(char);
          index++;
          
          onProgress?.(index, totalLength);
          
          setTimeout(animate, speed);
        } else {
          this.isAnimating = false;
          this.animationController = undefined;
          resolve();
        }
      };

      animate();
    });
  }

  /**
   * Private method to animate markdown content insertion
   */
  private async animateMarkdownContent(
    markdown: string,
    speed: number,
    onProgress?: (progress: number, total: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.isAnimating = true;
      this.animationController = new AbortController();
      
      const signal = this.animationController.signal;
      const lines = markdown.split('\n');
      let lineIndex = 0;
      let inList = false;
      let listType = '';

      const animateLine = () => {
        if (signal.aborted) {
          this.isAnimating = false;
          reject(new Error('Animation aborted'));
          return;
        }

        if (lineIndex < lines.length) {
          const line = lines[lineIndex];
          const trimmedLine = line.trim();
          
          if (!trimmedLine) {
            // Empty line
            if (inList) {
              inList = false;
              listType = '';
            }
            this.editor.commands.insertContent('<p></p>');
          }
          // Handle headings
          else if (trimmedLine.startsWith('#')) {
            if (inList) {
              inList = false;
              listType = '';
            }
            const level = trimmedLine.match(/^#+/)?.[0].length || 1;
            const text = trimmedLine.replace(/^#+\s*/, '');
            this.editor.commands.setNode('heading', { level: Math.min(level, 6) });
            this.editor.commands.insertContent(this.parseInlineMarkdown(text));
            this.editor.commands.enter();
          }
          // Handle unordered lists
          else if (trimmedLine.match(/^[\*\-\+]\s/)) {
            const text = trimmedLine.replace(/^[\*\-\+]\s*/, '');
            if (!inList || listType !== 'bullet') {
              this.editor.commands.toggleBulletList();
              inList = true;
              listType = 'bullet';
            } else {
              this.editor.commands.splitListItem('listItem');
            }
            this.editor.commands.insertContent(this.parseInlineMarkdown(text));
          }
          // Handle ordered lists
          else if (trimmedLine.match(/^\d+\.\s/)) {
            const text = trimmedLine.replace(/^\d+\.\s*/, '');
            if (!inList || listType !== 'ordered') {
              this.editor.commands.toggleOrderedList();
              inList = true;
              listType = 'ordered';
            } else {
              this.editor.commands.splitListItem('listItem');
            }
            this.editor.commands.insertContent(this.parseInlineMarkdown(text));
          }
          // Handle blockquotes
          else if (trimmedLine.startsWith('>')) {
            if (inList) {
              inList = false;
              listType = '';
            }
            const text = trimmedLine.replace(/^>\s*/, '');
            this.editor.commands.setBlockquote();
            this.editor.commands.insertContent(this.parseInlineMarkdown(text));
            this.editor.commands.enter();
          }
          // Regular paragraph
          else {
            if (inList) {
              inList = false;
              listType = '';
            }
            this.editor.commands.insertContent(this.parseInlineMarkdown(trimmedLine));
            this.editor.commands.enter();
          }
          
          lineIndex++;
          onProgress?.(lineIndex, lines.length);
          setTimeout(animateLine, speed * 10); // Slower for lines vs characters
        } else {
          this.isAnimating = false;
          this.animationController = undefined;
          resolve();
        }
      };

      animateLine();
    });
  }
}

/**
 * Utility functions for common AI content operations
 */

/**
 * Create an AI content writer instance for an editor
 */
export function createAIContentWriter(editor: Editor): AIContentWriter {
  return new AIContentWriter(editor);
}

/**
 * Quick function to write AI content to editor
 */
export async function writeAIContent(
  editor: Editor,
  content: string,
  options: AIContentOptions & ContentParseOptions = {}
): Promise<void> {
  const writer = new AIContentWriter(editor);
  return writer.writeContent(content, options);
}

/**
 * Quick function to stream AI content to editor
 */
export async function streamAIContent(
  editor: Editor,
  content: string,
  options: StreamingOptions & ContentParseOptions = {}
): Promise<void> {
  const writer = new AIContentWriter(editor);
  return writer.streamContent(content, options);
}

/**
 * Insert AI-generated structured content
 */
export async function insertAIStructuredContent(
  editor: Editor,
  contentType: 'heading' | 'list' | 'table' | 'mermaid' | 'quote',
  data: any,
  options: AIContentOptions = {}
): Promise<void> {
  const writer = new AIContentWriter(editor);
  return writer.insertStructuredContent(contentType, data, options);
}

/**
 * Parse and format AI response for different content types
 */
export function parseAIResponse(response: string): {
  type: 'text' | 'markdown' | 'structured';
  content: string;
  metadata?: any;
} {
  const trimmed = response.trim();
  
  // Check if it's markdown
  if (trimmed.includes('##') || trimmed.includes('**') || trimmed.includes('```')) {
    return {
      type: 'markdown',
      content: trimmed
    };
  }
  
  // Check if it's structured (JSON)
  try {
    const parsed = JSON.parse(trimmed);
    return {
      type: 'structured',
      content: '',
      metadata: parsed
    };
  } catch {
    // Plain text
    return {
      type: 'text',
      content: trimmed
    };
  }
}

export default AIContentWriter;