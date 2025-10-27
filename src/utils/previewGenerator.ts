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
    let previewContent = originalContent;
    const changes: HighlightedChange[] = [];
    let offset = 0; // Track cumulative offset from insertions/deletions

    // Sort tool executions by timestamp to maintain order
    const sortedExecutions = [...toolExecutions]
        .filter(exec => exec.success && isContentModifyingTool(exec.tool))
        .sort((a, b) => a.timestamp - b.timestamp);

    console.log('🎨 Generating preview with', sortedExecutions.length, 'tool executions');

    // Apply each tool execution and track changes
    for (const execution of sortedExecutions) {
        const { tool, args } = execution;

        switch (tool) {
            case 'append_document_content':
                const appendPos = previewContent.length + offset;
                const appendContent = args.content || '';
                
                changes.push({
                    type: 'addition',
                    from: appendPos,
                    to: appendPos,
                    content: appendContent
                });

                previewContent = previewContent + appendContent;
                offset += appendContent.length;
                break;

            case 'insert_document_content':
                const insertPos = (args.position || 0) + offset;
                const insertContent = args.content || '';
                
                changes.push({
                    type: 'addition',
                    from: insertPos,
                    to: insertPos,
                    content: insertContent
                });

                previewContent = 
                    previewContent.slice(0, insertPos) + 
                    insertContent + 
                    previewContent.slice(insertPos);
                offset += insertContent.length;
                break;

            case 'replace_document_content':
                const replaceFrom = (args.position?.from || 0) + offset;
                const replaceTo = (args.position?.to || 0) + offset;
                const replaceContent = args.content || '';
                const originalText = previewContent.slice(replaceFrom, replaceTo);
                
                changes.push({
                    type: 'replacement',
                    from: replaceFrom,
                    to: replaceTo,
                    content: replaceContent,
                    originalContent: originalText
                });

                previewContent = 
                    previewContent.slice(0, replaceFrom) + 
                    replaceContent + 
                    previewContent.slice(replaceTo);
                offset += replaceContent.length - (replaceTo - replaceFrom);
                break;

            case 'remove_document_content':
                const removeFrom = (args.position?.from || 0) + offset;
                const removeTo = (args.position?.to || 0) + offset;
                const removedText = previewContent.slice(removeFrom, removeTo);
                
                changes.push({
                    type: 'deletion',
                    from: removeFrom,
                    to: removeTo,
                    originalContent: removedText
                });

                previewContent = 
                    previewContent.slice(0, removeFrom) + 
                    previewContent.slice(removeTo);
                offset -= (removeTo - removeFrom);
                break;
        }
    }

    // Apply highlights to preview content
    const highlightedHtml = applyHighlights(previewContent, changes);

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
        'replace_document_content',
        'remove_document_content'
    ];
    return modifyingTools.includes(tool);
}

/**
 * Apply color-coded highlights to content based on changes
 */
function applyHighlights(content: string, changes: HighlightedChange[]): string {
    // Sort changes by position (reverse order to apply from end to start)
    const sortedChanges = [...changes].sort((a, b) => b.from - a.from);

    let highlightedContent = content;

    for (const change of sortedChanges) {
        const { type, from, to, content: newContent, originalContent } = change;

        switch (type) {
            case 'deletion':
                // Highlight deleted content in light red
                const deletedHtml = `<mark class="deletion-highlight" style="background-color: #ffcccc; text-decoration: line-through;">${escapeHtml(originalContent || '')}</mark>`;
                highlightedContent = 
                    highlightedContent.slice(0, from) + 
                    deletedHtml + 
                    highlightedContent.slice(to);
                break;

            case 'addition':
                // Highlight added content in light green
                const addedHtml = `<mark class="addition-highlight" style="background-color: #ccffcc;">${escapeHtml(newContent || '')}</mark>`;
                highlightedContent = 
                    highlightedContent.slice(0, from) + 
                    addedHtml + 
                    highlightedContent.slice(from);
                break;

            case 'replacement':
                // Show deleted content in red, then new content in green
                const replacedHtml = 
                    `<mark class="deletion-highlight" style="background-color: #ffcccc; text-decoration: line-through;">${escapeHtml(originalContent || '')}</mark>` +
                    `<mark class="addition-highlight" style="background-color: #ccffcc;">${escapeHtml(newContent || '')}</mark>`;
                highlightedContent = 
                    highlightedContent.slice(0, from) + 
                    replacedHtml + 
                    highlightedContent.slice(to);
                break;
        }
    }

    return highlightedContent;
}

/**
 * Escape HTML special characters
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
