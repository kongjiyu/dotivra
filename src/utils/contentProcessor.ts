/**
 * Content Processor - Converts Markdown and HTML to TipTap-compatible HTML
 */

/**
 * Converts markdown to HTML with proper TipTap formatting
 */
export function markdownToHTML(markdown: string): string {
  let html = markdown;

  // Headers
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Lists - Unordered
  html = html.replace(/^\s*[-*+]\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');

  // Lists - Ordered
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/s, function(match) {
    // Only convert to <ol> if it wasn't already wrapped in <ul>
    if (!match.includes('<ul>')) {
      return '<ol>' + match + '</ol>';
    }
    return match;
  });

  // Tables
  html = processMarkdownTables(html);

  // Blockquotes
  html = html.replace(/^>\s+(.*)$/gm, '<blockquote><p>$1</p></blockquote>');

  // Line breaks and paragraphs
  html = html.replace(/\n\n+/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');

  // Wrap in paragraph if not already wrapped
  if (!html.startsWith('<')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}

/**
 * Process markdown tables and convert to HTML
 */
function processMarkdownTables(text: string): string {
  const tableRegex = /^\|(.+)\|\s*\n\|[-:\s|]+\|\s*\n((?:\|.+\|\s*\n)*)/gm;
  
  return text.replace(tableRegex, (_, header, body) => {
    const headerCells = header.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
    const headerRow = '<tr>' + headerCells.map((cell: string) => `<th>${cell}</th>`).join('') + '</tr>';
    
    const bodyRows = body.trim().split('\n').map((row: string) => {
      const cells = row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell);
      return '<tr>' + cells.map((cell: string) => `<td>${cell}</td>`).join('') + '</tr>';
    }).join('');
    
    return `<table><thead>${headerRow}</thead><tbody>${bodyRows}</tbody></table>`;
  });
}

/**
 * Sanitizes and ensures HTML is TipTap compatible
 */
export function sanitizeHTML(html: string): string {
  let sanitized = html;

  // Ensure proper paragraph structure
  sanitized = sanitized.replace(/<br\s*\/?>\s*<br\s*\/?>/g, '</p><p>');
  
  // Fix nested lists
  sanitized = sanitized.replace(/<\/ul>\s*<ul>/g, '');
  sanitized = sanitized.replace(/<\/ol>\s*<ol>/g, '');
  
  // Ensure list items are properly nested
  sanitized = sanitized.replace(/(<li>.*?<\/li>)(?!\s*<\/[uo]l>)(?!\s*<li>)/g, '$1</ul>');
  
  // Fix empty paragraphs
  sanitized = sanitized.replace(/<p>\s*<\/p>/g, '');
  
  // Ensure tables have proper structure
  sanitized = sanitized.replace(/<table>/g, '<table>');
  sanitized = sanitized.replace(/<\/table>/g, '</table>');
  
  // Clean up excessive whitespace
  sanitized = sanitized.replace(/\s+/g, ' ');
  sanitized = sanitized.replace(/>\s+</g, '><');
  
  return sanitized.trim();
}

/**
 * Main content processor function - converts any content to TipTap-compatible HTML
 */
export function processContentForTipTap(content: string): string {
  // First, check if content is already HTML
  const hasHTMLTags = /<[^>]+>/g.test(content);
  
  let processedContent = content;
  
  if (!hasHTMLTags) {
    // Content appears to be markdown, convert it
    processedContent = markdownToHTML(content);
  }
  
  // Always sanitize the HTML to ensure TipTap compatibility
  processedContent = sanitizeHTML(processedContent);
  
  return processedContent;
}

/**
 * Enhanced content processor with better markdown detection and conversion
 */
export function enhancedContentProcessor(content: string): string {
  // Handle mixed content (both markdown and HTML)
  let processed = content;
  
  // Convert markdown elements even if HTML is present
  
  // Headers (only if not already HTML headers)
  if (!processed.includes('<h1>') && !processed.includes('<h2>') && !processed.includes('<h3>')) {
    processed = processed.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    processed = processed.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    processed = processed.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  }
  
  // Bold and italic (convert markdown to HTML)
  processed = processed.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  processed = processed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  
  // Code (convert markdown to HTML)
  processed = processed.replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  processed = processed.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  
  // Links (convert markdown to HTML)
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Lists - handle both markdown and improve existing HTML
  processed = processListsEnhanced(processed);
  
  // Tables
  processed = processMarkdownTables(processed);
  
  // Blockquotes
  processed = processed.replace(/^>\s+(.*)$/gm, '<blockquote><p>$1</p></blockquote>');
  
  // Handle line breaks and paragraphs properly
  processed = processParagraphsEnhanced(processed);
  
  // Final sanitization
  processed = sanitizeHTML(processed);
  
  return processed;
}

/**
 * Enhanced list processing that handles both markdown and existing HTML
 */
function processListsEnhanced(content: string): string {
  let processed = content;
  
  // Convert markdown lists to HTML
  const lines = processed.split('\n');
  const processedLines: string[] = [];
  let inList = false;
  let listType: 'ul' | 'ol' | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for unordered list
    if (/^[-*+]\s+/.test(line)) {
      if (!inList || listType !== 'ul') {
        if (inList && listType) {
          processedLines.push(`</${listType}>`);
        }
        processedLines.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      const content = line.replace(/^[-*+]\s+/, '');
      processedLines.push(`<li>${content}</li>`);
    }
    // Check for ordered list
    else if (/^\d+\.\s+/.test(line)) {
      if (!inList || listType !== 'ol') {
        if (inList && listType) {
          processedLines.push(`</${listType}>`);
        }
        processedLines.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      const content = line.replace(/^\d+\.\s+/, '');
      processedLines.push(`<li>${content}</li>`);
    }
    // Regular line
    else {
      if (inList && listType) {
        processedLines.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      processedLines.push(line);
    }
  }
  
  // Close any remaining list
  if (inList && listType) {
    processedLines.push(`</${listType}>`);
  }
  
  return processedLines.join('\n');
}

/**
 * Enhanced paragraph processing
 */
function processParagraphsEnhanced(content: string): string {
  let processed = content;
  
  // Split by double line breaks to identify paragraphs
  const sections = processed.split(/\n\s*\n/);
  const processedSections: string[] = [];
  
  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;
    
    // Skip if already wrapped in block elements
    if (/^<(h[1-6]|div|table|ul|ol|blockquote|pre|hr)[\s>]/.test(trimmed)) {
      processedSections.push(trimmed);
    }
    // Skip if it's a list item or table row
    else if (/^<(li|tr|td|th)[\s>]/.test(trimmed)) {
      processedSections.push(trimmed);
    }
    // Wrap in paragraph
    else {
      // Convert single line breaks to <br> within paragraphs
      const withBreaks = trimmed.replace(/\n/g, '<br>');
      processedSections.push(`<p>${withBreaks}</p>`);
    }
  }
  
  return processedSections.join('\n\n');
}

export default {
  markdownToHTML,
  sanitizeHTML,
  processContentForTipTap,
  enhancedContentProcessor
};