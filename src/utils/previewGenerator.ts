/**
 * Preview Generator - Applies tool execution changes with highlights
 * Shows what will change in the document with color-coded highlights
 */

export interface ToolExecution {
    tool: string;
    args: any;
    result: any;
    success: boolean;
    timestamp: number;
}

export interface HighlightedChange {
    type: 'deletion' | 'addition' | 'replacement';
    from: number;
    to: number;
    content?: string;
    originalContent?: string;
}

/**
 * Generate preview HTML with highlighted changes
 * @param originalContent - The original document content
 * @param toolExecutions - Array of tool executions to apply
 * @returns HTML string with highlighted changes
 */
export function generatePreviewWithHighlights(
    originalContent: string,
    toolExecutions: ToolExecution[]
): { previewHtml: string; changes: HighlightedChange[] } {
    const changes: HighlightedChange[] = [];

    // Sort tool executions by timestamp to maintain order
    const sortedExecutions = [...toolExecutions]
        .filter(exec => exec.success && isContentModifyingTool(exec.tool))
        .sort((a, b) => a.timestamp - b.timestamp);

    console.log('🎨 Generating preview with', sortedExecutions.length, 'tool executions');

    // First pass: collect all changes without modifying content
    let offset = 0;
    for (const execution of sortedExecutions) {
        const { tool, args } = execution;

        switch (tool) {
            case 'append_document_content':
                const appendPos = originalContent.length + offset;
                const appendContent = args.content || '';
                
                changes.push({
                    type: 'addition',
                    from: appendPos,
                    to: appendPos,
                    content: appendContent
                });
                offset += appendContent.length;
                break;

            case 'insert_document_content':
            case 'insert_document_content_at_location':
                const insertPos = (args.position || 0) + offset;
                const insertContent = args.content || '';
                
                changes.push({
                    type: 'addition',
                    from: insertPos,
                    to: insertPos,
                    content: insertContent
                });
                offset += insertContent.length;
                break;

            case 'replace_document_content':
                const replaceFrom = (args.position?.from || 0) + offset;
                const replaceTo = (args.position?.to || 0) + offset;
                const replaceContent = args.content || '';
                const originalText = originalContent.slice(replaceFrom, replaceTo);
                
                changes.push({
                    type: 'replacement',
                    from: replaceFrom,
                    to: replaceTo,
                    content: replaceContent,
                    originalContent: originalText
                });
                offset += replaceContent.length - (replaceTo - replaceFrom);
                break;

            case 'remove_document_content':
                const removeFrom = (args.position?.from || 0) + offset;
                const removeTo = (args.position?.to || 0) + offset;
                const removedText = originalContent.slice(removeFrom, removeTo);
                
                changes.push({
                    type: 'deletion',
                    from: removeFrom,
                    to: removeTo,
                    originalContent: removedText
                });
                // For deletions, reduce offset since content will be shown but marked
                offset -= (removeTo - removeFrom);
                break;
        }
    }

    // Apply highlights to original content (don't modify structure)
    const highlightedHtml = applyHighlightsToHtml(originalContent, changes);

    return {
        previewHtml: highlightedHtml,
        changes
    };
}

/**
 * Check if tool modifies content
 */
function isContentModifyingTool(tool: string): boolean {
    const modifyingTools = [
        'append_document_content',
        'insert_document_content',
        'insert_document_content_at_location',
        'replace_document_content',
        'remove_document_content'
    ];
    return modifyingTools.includes(tool);
}

/**
 * Apply color-coded highlights to HTML content based on changes
 * This version preserves HTML structure while highlighting changes
 */
function applyHighlightsToHtml(htmlContent: string, changes: HighlightedChange[]): string {
    // Create a temporary div to parse HTML
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    const body = doc.body;

    // Sort changes by position (reverse order to apply from end to start)
    const sortedChanges = [...changes].sort((a, b) => b.from - a.from);

    // Apply highlights by wrapping content at specified positions
    for (const change of sortedChanges) {
        try {
            const { type, from, to, content: newContent } = change;

            // Find the text node and offset at the specified position
            const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
            
            let currentPos = 0;
            let startNode: Node | null = null;
            let startOffset = 0;
            let endNode: Node | null = null;
            let endOffset = 0;

            // Find start position
            let node = walker.nextNode();
            while (node) {
                const textLength = node.textContent?.length || 0;
                if (currentPos + textLength >= from) {
                    startNode = node;
                    startOffset = from - currentPos;
                    break;
                }
                currentPos += textLength;
                node = walker.nextNode();
            }

            // Find end position for deletions and replacements
            if (type === 'deletion' || type === 'replacement') {
                currentPos = 0;
                walker.currentNode = body;
                node = walker.nextNode();
                while (node) {
                    const textLength = node.textContent?.length || 0;
                    if (currentPos + textLength >= to) {
                        endNode = node;
                        endOffset = to - currentPos;
                        break;
                    }
                    currentPos += textLength;
                    node = walker.nextNode();
                }
            }

            // Apply highlighting based on change type
            if (startNode) {
                switch (type) {
                    case 'deletion':
                        // Wrap deleted content in red background (don't remove it)
                        if (endNode && startNode === endNode) {
                            const textNode = startNode as Text;
                            const beforeText = textNode.textContent?.substring(0, startOffset) || '';
                            const deletedText = textNode.textContent?.substring(startOffset, endOffset) || '';
                            const afterText = textNode.textContent?.substring(endOffset) || '';

                            const span = document.createElement('span');
                            span.style.backgroundColor = '#ffcccc';
                            span.style.textDecoration = 'line-through';
                            span.className = 'deletion-highlight';
                            span.textContent = deletedText;

                            const parent = textNode.parentNode;
                            if (parent) {
                                parent.insertBefore(document.createTextNode(beforeText), textNode);
                                parent.insertBefore(span, textNode);
                                parent.insertBefore(document.createTextNode(afterText), textNode);
                                parent.removeChild(textNode);
                            }
                        }
                        break;

                    case 'addition':
                        // Insert new content with green background
                        const textNode = startNode as Text;
                        const beforeText = textNode.textContent?.substring(0, startOffset) || '';
                        const afterText = textNode.textContent?.substring(startOffset) || '';

                        const addSpan = document.createElement('span');
                        addSpan.style.backgroundColor = '#ccffcc';
                        addSpan.className = 'addition-highlight';
                        addSpan.textContent = newContent || '';

                        const parent = textNode.parentNode;
                        if (parent) {
                            parent.insertBefore(document.createTextNode(beforeText), textNode);
                            parent.insertBefore(addSpan, textNode);
                            parent.insertBefore(document.createTextNode(afterText), textNode);
                            parent.removeChild(textNode);
                        }
                        break;

                    case 'replacement':
                        // Show deleted content in red, then new content in green
                        if (endNode && startNode === endNode) {
                            const replaceTextNode = startNode as Text;
                            const beforeText = replaceTextNode.textContent?.substring(0, startOffset) || '';
                            const replacedText = replaceTextNode.textContent?.substring(startOffset, endOffset) || '';
                            const afterText = replaceTextNode.textContent?.substring(endOffset) || '';

                            const delSpan = document.createElement('span');
                            delSpan.style.backgroundColor = '#ffcccc';
                            delSpan.style.textDecoration = 'line-through';
                            delSpan.className = 'deletion-highlight';
                            delSpan.textContent = replacedText;

                            const addSpan = document.createElement('span');
                            addSpan.style.backgroundColor = '#ccffcc';
                            addSpan.className = 'addition-highlight';
                            addSpan.textContent = newContent || '';

                            const parent = replaceTextNode.parentNode;
                            if (parent) {
                                parent.insertBefore(document.createTextNode(beforeText), replaceTextNode);
                                parent.insertBefore(delSpan, replaceTextNode);
                                parent.insertBefore(addSpan, replaceTextNode);
                                parent.insertBefore(document.createTextNode(afterText), replaceTextNode);
                                parent.removeChild(replaceTextNode);
                            }
                        }
                        break;
                }
            }
        } catch (err) {
            console.warn('Failed to apply highlight:', err);
        }
    }

    return body.innerHTML;
}

/**
 * Generate statistics about changes
 */
export function getChangeStatistics(changes: HighlightedChange[]): {
    additions: number;
    deletions: number;
    replacements: number;
    totalChanges: number;
} {
    let additions = 0;
    let deletions = 0;
    let replacements = 0;

    for (const change of changes) {
        switch (change.type) {
            case 'addition':
                additions++;
                break;
            case 'deletion':
                deletions++;
                break;
            case 'replacement':
                replacements++;
                break;
        }
    }

    return {
        additions,
        deletions,
        replacements,
        totalChanges: changes.length
    };
}
