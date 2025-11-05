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
    type: 'deletion' | 'addition';
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
): { 
    previewHtml: string; 
    changes: {
        additions: number;
        deletions: number;
        modifications: number;
        replacements?: number;
        totalChanges?: number;
    }
} {
    const additions: Array<{ from: number; to: number }> = [];
    const deletions: Array<{ position: number; content: string }> = [];

    const sortedExecutions = [...toolExecutions]
        .filter(exec => exec.success && isContentModifyingTool(exec.tool))
        .sort((a, b) => a.timestamp - b.timestamp);

    let simulatedContent = originalContent || '';

    const clamp = (value: number, min: number, max: number): number => {
        return Math.min(Math.max(value, min), max);
    };

    const shiftAdditionsForInsertion = (position: number, length: number) => {
        if (length <= 0) return;
        additions.forEach(range => {
            if (range.from >= position) {
                range.from += length;
            }
            if (range.to >= position) {
                range.to += length;
            }
        });
        deletions.forEach(marker => {
            if (marker.position >= position) {
                marker.position += length;
            }
        });
    };

    const shiftAdditionsForRemoval = (from: number, to: number) => {
        const length = to - from;
        if (length <= 0) return;
        additions.forEach(range => {
            if (range.to <= from) {
                return;
            }
            if (range.from >= to) {
                range.from -= length;
                range.to -= length;
                return;
            }
            // Overlap - clamp to the remaining visible portion
            range.from = Math.min(range.from, from);
            range.to = Math.max(range.from, Math.max(from, range.to - length));
        });
        // Drop zero-length ranges
        for (let i = additions.length - 1; i >= 0; i--) {
            if (additions[i].to <= additions[i].from) {
                additions.splice(i, 1);
            }
        }
        deletions.forEach(marker => {
            if (marker.position >= to) {
                marker.position -= length;
            } else if (marker.position > from) {
                marker.position = from;
            }
        });
    };

    const applyInsertion = (position: number, content: string) => {
        if (!content) return;
        const safePosition = clamp(position, 0, simulatedContent.length);
        shiftAdditionsForInsertion(safePosition, content.length);
        simulatedContent = simulatedContent.slice(0, safePosition) + content + simulatedContent.slice(safePosition);
        additions.push({ from: safePosition, to: safePosition + content.length });
    };

    const applyRemoval = (from: number, to: number, removedContent?: string) => {
        const safeFrom = clamp(from, 0, simulatedContent.length);
        const safeTo = clamp(to, safeFrom, simulatedContent.length);
        if (safeTo <= safeFrom) {
            return;
        }
        const removedSegment = removedContent ?? simulatedContent.slice(safeFrom, safeTo);
        shiftAdditionsForRemoval(safeFrom, safeTo);
        simulatedContent = simulatedContent.slice(0, safeFrom) + simulatedContent.slice(safeTo);
        if (removedSegment && removedSegment.length > 0) {
            deletions.push({ position: safeFrom, content: removedSegment });
        }
    };

    for (const execution of sortedExecutions) {
        const { tool, args, result } = execution;
        const metadata = result || {};

        switch (tool) {
            case 'append_document_content':
            case 'insert_document_content':
            case 'insert_document_content_at_location': {
                const insertedContent: string = metadata.insertedContent ?? args?.content ?? '';
                if (!insertedContent) {
                    break;
                }
                const insertPosition = metadata.range?.before?.from ?? metadata.position?.from ?? args?.position ?? simulatedContent.length;
                applyInsertion(insertPosition, insertedContent);
                break;
            }
            case 'replace_document_content': {
                const removeFrom = metadata.range?.before?.from ?? args?.position?.from ?? 0;
                const removeTo = metadata.range?.before?.to ?? args?.position?.to ?? removeFrom;
                const removedContent = metadata.removedContent ?? simulatedContent.slice(clamp(removeFrom, 0, simulatedContent.length), clamp(removeTo, 0, simulatedContent.length));
                applyRemoval(removeFrom, removeTo, removedContent);

                const replacement = metadata.insertedContent ?? args?.content ?? '';
                if (replacement) {
                    applyInsertion(removeFrom, replacement);
                }
                break;
            }
            case 'remove_document_content': {
                const removeFrom = metadata.range?.before?.from ?? args?.position?.from ?? 0;
                const removeTo = metadata.range?.before?.to ?? args?.position?.to ?? removeFrom;
                const removedContent = metadata.removedContent ?? simulatedContent.slice(clamp(removeFrom, 0, simulatedContent.length), clamp(removeTo, 0, simulatedContent.length));
                applyRemoval(removeFrom, removeTo, removedContent);
                break;
            }
        }
    }

    const filteredAdditions = additions.filter(range => range.to > range.from);
    const filteredDeletions = deletions.filter(marker => marker.content && marker.content.length > 0);

    const events = [
        ...filteredDeletions.map((marker, index) => ({ type: 'deletion' as const, start: marker.position, content: marker.content, order: index })),
        ...filteredAdditions.map((range, index) => ({ type: 'addition' as const, start: range.from, end: range.to, order: index }))
    ].sort((a, b) => {
        if (a.start !== b.start) {
            return a.start - b.start;
        }
        // Show deletions before additions at the same point
        if (a.type !== b.type) {
            return a.type === 'deletion' ? -1 : 1;
        }
        return a.order - b.order;
    });

    let cursor = 0;
    let previewHtml = '';

    for (const event of events) {
        const start = clamp(event.start, 0, simulatedContent.length);

        if (cursor < start) {
            previewHtml += simulatedContent.slice(cursor, start);
            cursor = start;
        }

        if (event.type === 'deletion') {
            previewHtml += renderDeletionHighlight(event.content);
        } else {
            const end = clamp(event.end ?? start, start, simulatedContent.length);
            const additionSegment = simulatedContent.slice(start, end);
            previewHtml += renderAdditionHighlight(additionSegment);
            cursor = end;
        }
    }

    if (cursor < simulatedContent.length) {
        previewHtml += simulatedContent.slice(cursor);
    }

    const additionsCount = filteredAdditions.length;
    const deletionsCount = filteredDeletions.length;

    return {
        previewHtml,
        changes: {
            additions: additionsCount,
            deletions: deletionsCount,
            modifications: 0,
            totalChanges: additionsCount + deletionsCount
        }
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
 * Preserves HTML structure including Mermaid diagrams
 */
const HTML_TAG_REGEX = /<[a-z][\s\S]*>/i;

function renderAdditionHighlight(content: string): string {
    if (!content) {
        return '';
    }

    if (HTML_TAG_REGEX.test(content)) {
        return `<div class="addition-highlight" style="background-color: #ccffcc; padding: 2px 4px; border-radius: 2px;">${content}</div>`;
    }

    return `<span class="addition-highlight" style="background-color: #ccffcc; padding: 2px 4px; border-radius: 2px;">${escapeHtml(content)}</span>`;
}

function renderDeletionHighlight(content: string): string {
    if (!content) {
        return '';
    }

    if (HTML_TAG_REGEX.test(content)) {
        return `<div class="deletion-highlight" style="background-color: #ffcccc; text-decoration: line-through; padding: 2px 4px; border-radius: 2px; opacity: 0.7;">${content}</div>`;
    }

    return `<span class="deletion-highlight" style="background-color: #ffcccc; text-decoration: line-through; padding: 2px 4px; border-radius: 2px;">${escapeHtml(content)}</span>`;
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
    totalChanges: number;
} {
    let additions = 0;
    let deletions = 0;

    for (const change of changes) {
        switch (change.type) {
            case 'addition':
                additions++;
                break;
            case 'deletion':
                deletions++;
                break;
        }
    }

    return {
        additions,
        deletions,
        totalChanges: changes.length
    };
}
