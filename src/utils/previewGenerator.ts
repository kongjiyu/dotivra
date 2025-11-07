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

type SegmentType = 'unchanged' | 'addition' | 'deletion';

interface PreviewSegment {
    content: string;
    type: SegmentType;
    visible: boolean;
}

interface ChangeDetail {
    type: 'addition' | 'deletion';
    tool: string;
    description: string;
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
    finalHtml: string;
    removedHtml: string;
    changes: {
        additions: number;
        deletions: number;
        modifications: number;
        replacements?: number;
        totalChanges?: number;
        details?: ChangeDetail[];
    }
} {
    const sortedExecutions = [...toolExecutions]
        .filter(exec => exec.success && isContentModifyingTool(exec.tool))
        .sort((a, b) => a.timestamp - b.timestamp);

    // Deduplicate executions to avoid applying the same operation multiple times
    const seen = new Set<string>();
    const uniqueExecutions: ToolExecution[] = [];
    for (const exec of sortedExecutions) {
        try {
            const sig = `${exec.tool}|${exec.timestamp}|${JSON.stringify(exec.args || {})}`;
            if (seen.has(sig)) continue;
            seen.add(sig);
            uniqueExecutions.push(exec);
        } catch (e) {
            // Fall back to including the execution if signature generation fails
            uniqueExecutions.push(exec);
        }
    }

    // Ensure we operate on a copy of the original content (pass-by-value semantics)
    // so callers' strings are never mutated by this function.
    const workingContentInitial = (typeof originalContent === 'string') ? originalContent.slice(0) : String(originalContent || '');
    let workingContent = workingContentInitial;

    const segments: PreviewSegment[] = workingContent
        ? [{ content: workingContent.slice(0), type: 'unchanged', visible: true }]
        : [];

    const clamp = (value: number, min: number, max: number): number => {
        return Math.min(Math.max(value, min), max);
    };

    const getVisibleLength = (): number => workingContent.length;

    const splitAt = (offset: number): number => {
        if (segments.length === 0) {
            return 0;
        }

        const safeOffset = clamp(offset, 0, getVisibleLength());

        let accumulated = 0;

        for (let index = 0; index < segments.length; index++) {
            const segment = segments[index];

            if (!segment.visible) {
                continue;
            }

            const segmentLength = segment.content.length;

            if (safeOffset === accumulated) {
                return index;
            }

            if (safeOffset > accumulated + segmentLength) {
                accumulated += segmentLength;
                continue;
            }

            if (safeOffset === accumulated + segmentLength) {
                return index + 1;
            }

            const splitPoint = safeOffset - accumulated;
            const beforeContent = segment.content.slice(0, splitPoint);
            const afterContent = segment.content.slice(splitPoint);

            const beforeSegment: PreviewSegment = {
                content: beforeContent,
                type: segment.type,
                visible: segment.visible
            };

            const afterSegment: PreviewSegment = {
                content: afterContent,
                type: segment.type,
                visible: segment.visible
            };

            segments.splice(index, 1, beforeSegment, afterSegment);
            return index + 1;
        }

        return segments.length;
    };

    const insertSegmentAt = (position: number, content: string): number | null => {
        if (!content) {
            return null;
        }

        const safePosition = clamp(position, 0, workingContent.length);
        const insertIndex = splitAt(safePosition);
        const additionSegment: PreviewSegment = {
            content,
            type: 'addition',
            visible: true
        };

        segments.splice(insertIndex, 0, additionSegment);

        const before = workingContent.slice(0, safePosition);
        const after = workingContent.slice(safePosition);
        workingContent = `${before}${content}${after}`;

        return safePosition;
    };

    const removeRange = (from: number, to: number, removedContent?: string): { content: string; from: number; to: number } | null => {
        const totalLength = workingContent.length;
        if (totalLength === 0) {
            return null;
        }

        const safeFrom = clamp(from, 0, totalLength);
        const safeTo = clamp(to, safeFrom, totalLength);

        if (safeTo <= safeFrom) {
            return null;
        }

        const fallbackContent = workingContent.slice(safeFrom, safeTo);
        const contentToMark = removedContent ?? fallbackContent;

        const startIndex = splitAt(safeFrom);
        const endIndex = splitAt(safeTo);

        const deletionSegment: PreviewSegment = {
            content: contentToMark,
            type: 'deletion',
            visible: false
        };

        segments.splice(startIndex, endIndex - startIndex, deletionSegment);

        workingContent = `${workingContent.slice(0, safeFrom)}${workingContent.slice(safeTo)}`;

        return { content: contentToMark, from: safeFrom, to: safeTo };
    };

    let additionsCount = 0;
    let deletionsCount = 0;
    const changeDetails: ChangeDetail[] = [];

    for (const execution of uniqueExecutions) {
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

                const insertPosition = metadata.range?.before?.from ?? metadata.position?.from ?? args?.position ?? workingContent.length;
                const actualPosition = insertSegmentAt(insertPosition, insertedContent);
                const { preview, textLength, rawLength } = buildContentPreview(insertedContent);
                const changeLength = textLength > 0 ? textLength : rawLength;

                if (actualPosition !== null && changeLength > 0) {
                    additionsCount += 1;
                    const previewLabel = preview || '[non-text content]';
                    changeDetails.push({
                        type: 'addition',
                        tool,
                        description: `Added ${changeLength} characters at position ${actualPosition}${previewLabel ? `: "${previewLabel}"` : ''}`
                    });
                }
                break;
            }
            case 'replace_document_content': {
                const removeFrom = metadata.range?.before?.from ?? args?.position?.from ?? 0;
                const removeTo = metadata.range?.before?.to ?? args?.position?.to ?? removeFrom;
                const removedContent = metadata.removedContent ?? workingContent.slice(clamp(removeFrom, 0, workingContent.length), clamp(removeTo, 0, workingContent.length));
                const removalMarked = removeRange(removeFrom, removeTo, removedContent);
                if (removalMarked) {
                    const { preview, textLength, rawLength } = buildContentPreview(removalMarked.content);
                    const changeLength = textLength > 0 ? textLength : rawLength;
                    if (changeLength > 0) {
                        deletionsCount += 1;
                        const previewLabel = preview || '[non-text content]';
                        changeDetails.push({
                            type: 'deletion',
                            tool,
                            description: `Removed ${changeLength} characters from ${removalMarked.from}-${removalMarked.to}${previewLabel ? `: "${previewLabel}"` : ''}`
                        });
                    }
                }

                const replacement = metadata.insertedContent ?? args?.content ?? '';
                if (replacement) {
                    const actualPosition = insertSegmentAt(removeFrom, replacement);
                    const { preview, textLength, rawLength } = buildContentPreview(replacement);
                    const changeLength = textLength > 0 ? textLength : rawLength;
                    if (actualPosition !== null && changeLength > 0) {
                        additionsCount += 1;
                        const previewLabel = preview || '[non-text content]';
                        changeDetails.push({
                            type: 'addition',
                            tool,
                            description: `Added ${changeLength} replacement characters at position ${actualPosition}${previewLabel ? `: "${previewLabel}"` : ''}`
                        });
                    }
                }
                break;
            }
            case 'remove_document_content': {
                const removeFrom = metadata.range?.before?.from ?? args?.position?.from ?? 0;
                const removeTo = metadata.range?.before?.to ?? args?.position?.to ?? removeFrom;
                const removedContent = metadata.removedContent ?? workingContent.slice(clamp(removeFrom, 0, workingContent.length), clamp(removeTo, 0, workingContent.length));
                const removalMarked = removeRange(removeFrom, removeTo, removedContent);
                if (removalMarked) {
                    const { preview, textLength, rawLength } = buildContentPreview(removalMarked.content);
                    const changeLength = textLength > 0 ? textLength : rawLength;
                    if (changeLength > 0) {
                        deletionsCount += 1;
                        const previewLabel = preview || '[non-text content]';
                        changeDetails.push({
                            type: 'deletion',
                            tool,
                            description: `Removed ${changeLength} characters from ${removalMarked.from}-${removalMarked.to}${previewLabel ? `: "${previewLabel}"` : ''}`
                        });
                    }
                }
                break;
            }
        }
    }

    const previewHtml = segments.map(segment => {
        switch (segment.type) {
            case 'addition':
                return renderAdditionHighlight(segment.content);
            case 'deletion':
                return renderDeletionHighlight(segment.content);
            default:
                // Preserve raw HTML for unchanged segments to keep document structure, but ensure it's a string
                return typeof segment.content === 'string' ? segment.content : '';
        }
    }).join('');
    // Wrap previewHtml in a root container to ensure valid HTML
    const wrappedPreviewHtml = `<div class="ai-preview-root">${previewHtml}</div>`;
    const finalHtml = segments
        .filter(segment => segment.visible)
        .map(segment => segment.content)
        .join('');

    const removedHtml = segments
        .filter(segment => segment.type === 'deletion' && segment.content)
        .map(segment => renderDeletionHighlight(segment.content))
        .join('<br /><br />');

    return {
        previewHtml: wrappedPreviewHtml,
        finalHtml,
        removedHtml,
        changes: {
            additions: additionsCount,
            deletions: deletionsCount,
            modifications: 0,
            totalChanges: additionsCount + deletionsCount,
            details: changeDetails
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
const ADDITION_HIGHLIGHT_CLASS = 'ai-preview-addition';
const DELETION_HIGHLIGHT_CLASS = 'ai-preview-deletion';

const PREVIEW_SNIPPET_LIMIT = 80;

function renderAdditionHighlight(content: string): string {
    if (!content) {
        return '';
    }

    if (HTML_TAG_REGEX.test(content)) {
        return `<div class="${ADDITION_HIGHLIGHT_CLASS}" data-ai-preview="addition">${content}</div>`;
    }

    return `<span class="${ADDITION_HIGHLIGHT_CLASS}" data-ai-preview="addition">${escapeHtml(content)}</span>`;
}

function renderDeletionHighlight(content: string): string {
    if (!content) {
        return '';
    }

    if (HTML_TAG_REGEX.test(content)) {
        return `<div class="${DELETION_HIGHLIGHT_CLASS}" data-ai-preview="deletion">${content}</div>`;
    }

    return `<span class="${DELETION_HIGHLIGHT_CLASS}" data-ai-preview="deletion">${escapeHtml(content)}</span>`;
}

function buildContentPreview(content: string): { preview: string; textLength: number; rawLength: number } {
    const textOnly = content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const rawLength = content.length;

    if (!textOnly) {
        return { preview: '', textLength: 0, rawLength };
    }

    const preview = textOnly.length > PREVIEW_SNIPPET_LIMIT
        ? `${textOnly.slice(0, PREVIEW_SNIPPET_LIMIT)}...`
        : textOnly;

    return { preview, textLength: textOnly.length, rawLength };
}

/**
 * Escape HTML special characters to prevent XSS
 */
function escapeHtml(text: string): string {
    if (typeof document !== 'undefined' && document.createElement) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    // Fallback for non-browser environments
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
