/**
 * AI Changes Preview Modal
 * Shows highlighted preview of changes made by AI agent
 */

import React from 'react';
import { X, Check, RotateCcw } from 'lucide-react';
import type { HighlightedChange } from '@/utils/previewGenerator';
import { getChangeStatistics } from '@/utils/previewGenerator';
import '@/styles/tiptap.css'; // Import TipTap editor styles

interface AIChangesPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    previewHtml: string;
    changes: HighlightedChange[] | {
        additions: number;
        deletions: number;
        modifications?: number;
        replacements?: number;
        totalChanges?: number;
    };
    onAccept: () => void;
    onReject: () => void;
    onRegenerate: () => void;
}

export const AIChangesPreviewModal: React.FC<AIChangesPreviewModalProps> = ({
    isOpen,
    onClose,
    previewHtml,
    changes,
    onAccept,
    onReject,
    onRegenerate
}) => {
    if (!isOpen) return null;

    // Handle both array and statistics object format
    const stats = Array.isArray(changes)
        ? getChangeStatistics(changes)
        : {
            additions: changes.additions || 0,
            deletions: changes.deletions || 0,
            replacements: changes.replacements || changes.modifications || 0,
            totalChanges: changes.totalChanges || ((changes.additions || 0) + (changes.deletions || 0) + (changes.replacements || changes.modifications || 0))
        };

    return (
        <div className="fixed inset-0 z-100 mt-[120px] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
            <div className="relative w-[60vw] h-[75vh] max-w-7xl bg-white dark:bg-gray-900 rounded-lg shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Preview AI Changes
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Review the changes before applying them to your document
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Close preview"
                    >
                        <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                </div>

                {/* Statistics Panel */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-green-200"></span>
                            <span className="text-gray-700 dark:text-gray-300">
                                {stats.additions} Addition{stats.additions !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-red-200"></span>
                            <span className="text-gray-700 dark:text-gray-300">
                                {stats.deletions} Deletion{stats.deletions !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-sm bg-yellow-200"></span>
                            <span className="text-gray-700 dark:text-gray-300">
                                {stats.replacements} Replacement{stats.replacements !== 1 ? 's' : ''}
                            </span>
                        </div>
                        <div className="ml-auto font-medium text-gray-900 dark:text-white">
                            Total: {stats.totalChanges} change{stats.totalChanges !== 1 ? 's' : ''}
                        </div>
                    </div>
                </div>

                {/* Preview Content */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full px-6 py-4">
                        <div className="w-full h-full">
                            <div
                                className="preview-content tiptap custom-scrollbar h-full overflow-auto p-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg prose prose-lg dark:prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: previewHtml }}
                                style={{
                                    fontFamily: 'system-ui, -apple-system, sans-serif',
                                    lineHeight: '1.75',
                                    fontSize: '16px'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Legend */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-6 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-2">
                            <mark style={{ backgroundColor: '#ccffcc', padding: '2px 4px' }}>green</mark>
                            <span>= Added content</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <mark style={{ backgroundColor: '#ffcccc', textDecoration: 'line-through', padding: '2px 4px' }}>red strikethrough</mark>
                            <span>= Removed content</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <mark style={{ backgroundColor: '#ffcccc', textDecoration: 'line-through', padding: '2px 4px', marginRight: '2px' }}>old</mark>
                            <mark style={{ backgroundColor: '#ccffcc', padding: '2px 4px' }}>new</mark>
                            <span>= Replacement</span>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
                    <button
                        onClick={onReject}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Reject Changes
                    </button>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onRegenerate}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                            <RotateCcw className="w-4 h-4" />
                            Regenerate
                        </button>
                        <button
                            onClick={onAccept}
                            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <Check className="w-4 h-4" />
                            Accept Changes
                        </button>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .preview-content .deletion-highlight {
                    background-color: #ffcccc;
                    text-decoration: line-through;
                    padding: 2px 4px;
                    border-radius: 2px;
                }
                
                .preview-content .addition-highlight {
                    background-color: #ccffcc;
                    padding: 2px 4px;
                    border-radius: 2px;
                }

                .preview-content {
                    scroll-behavior: smooth;
                }

                .stage-block {
                    margin-bottom: 0.5rem;
                    padding: 0.5rem;
                    background: rgba(0, 0, 0, 0.02);
                    border-radius: 0.25rem;
                }

                .stage-content {
                    margin-bottom: 0.25rem;
                }

                .stage-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }

                .stage-label {
                    font-size: 0.75rem;
                    font-weight: 500;
                    color: #6b7280;
                    text-transform: uppercase;
                }
            `}} />
        </div>
    );
};
