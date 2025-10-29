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
 * This version creates a complete diff view showing all changes
 */
function applyHighlightsToHtml(htmlContent: string, changes: HighlightedChange[]): string {
    if (changes.length === 0) {
        return htmlContent; // No changes, return original
    }

    // Sort changes by position (start from beginning)
    const sortedChanges = [...changes].sort((a, b) => a.from - b.from);

    let result = '';
    let lastPosition = 0;

    for (const change of sortedChanges) {
        const { type, from, to, content: newContent, originalContent } = change;

        // Add unchanged content before this change
        if (from > lastPosition) {
            result += htmlContent.substring(lastPosition, from);
        }

        // Apply highlighting based on change type
        switch (type) {
            case 'deletion':
                // Show deleted content in red with strikethrough
                const deletedText = originalContent || htmlContent.substring(from, to);
                result += `<span class="deletion-highlight" style="background-color: #ffcccc; text-decoration: line-through; padding: 2px 4px; border-radius: 2px;">${escapeHtml(deletedText)}</span>`;
                lastPosition = to;
                break;

            case 'addition':
                // Show new content in green
                result += `<span class="addition-highlight" style="background-color: #ccffcc; padding: 2px 4px; border-radius: 2px;">${newContent || ''}</span>`;
                lastPosition = from; // Don't advance past the insertion point
                break;

            case 'replacement':
                // Show old content struck through in red, then new content in green
                const replacedText = originalContent || htmlContent.substring(from, to);
                result += `<span class="deletion-highlight" style="background-color: #ffcccc; text-decoration: line-through; padding: 2px 4px; border-radius: 2px;">${escapeHtml(replacedText)}</span>`;
                result += `<span class="addition-highlight" style="background-color: #ccffcc; padding: 2px 4px; border-radius: 2px; margin-left: 4px;">${newContent || ''}</span>`;
                lastPosition = to;
                break;
        }
    }

    // Add remaining unchanged content
    if (lastPosition < htmlContent.length) {
        result += htmlContent.substring(lastPosition);
    }

    return result;
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
