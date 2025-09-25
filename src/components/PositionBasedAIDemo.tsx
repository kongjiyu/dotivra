import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Plus, Trash2, RotateCw, CheckCircle, XCircle } from 'lucide-react';
import { EnhancedAIContentWriter } from '../utils/enhancedAIContentWriter';
import type { ContentPosition } from '../utils/enhancedAIContentWriter';

interface PositionBasedOperation {
    type: 'addition' | 'editing' | 'removal' | 'replacement';
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    targetText?: string;
    newContent?: string;
    position?: ContentPosition;
}

const DEFAULT_CONTENT = `<h1>My Document</h1>

<p>You can add new paragraphs, edit existing ones, or remove unwanted content.</p>

<p><strong>Feature 1:</strong> Document editing</p>
<p><strong>Feature 2:</strong> AI assistance</p>
<p><strong>Feature 3:</strong> Real-time collaboration</p>

<p>This paragraph can be edited by AI with precise position targeting.</p>

<p>This paragraph might need to be updated or removed.</p>

<p>End of document content.</p>`;

export default function PositionBasedAIDemo() {
    const [aiWriter, setAiWriter] = useState<EnhancedAIContentWriter | null>(null);
    const [activeOperations, setActiveOperations] = useState<string[]>([]);
    const [, setSelectedOperation] = useState<PositionBasedOperation | null>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({
                multicolor: true,
            }),
        ],
        content: DEFAULT_CONTENT,
        editable: true, // Ensure editor remains editable during AI previews
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] px-4 py-6',
                contenteditable: 'true', // Explicitly allow content editing
            },
        },
    });

    const operations: PositionBasedOperation[] = [
        {
            type: 'addition',
            title: 'Add Content',
            description: 'Insert new content at specific position with overlay preview',
            icon: <Plus className="w-4 h-4" />,
            color: 'bg-green-600 hover:bg-green-700',
            newContent: '🤖 This is new AI-generated content added at a precise position.'
        },
        {
            type: 'removal',
            title: 'Remove Content',
            description: 'Mark specific content for deletion with overlay confirmation',
            icon: <Trash2 className="w-4 h-4" />,
            color: 'bg-red-600 hover:bg-red-700',
            targetText: 'This paragraph might need to be updated or removed.'
        },
        {
            type: 'replacement',
            title: 'Replace Content',
            description: 'Replace content sections with position-based targeting',
            icon: <RotateCw className="w-4 h-4" />,
            color: 'bg-orange-600 hover:bg-orange-700',
            targetText: 'End of document content.',
            newContent: 'This is the end of the document content'
        }
    ];

    // Initialize AI writer when editor is ready
    useEffect(() => {
        if (editor && !aiWriter) {
            const writer = new EnhancedAIContentWriter(editor);
            setAiWriter(writer);
            console.log('✅ Enhanced AI Writer initialized');
        }
    }, [editor, aiWriter]);

    // Clean up overlays when component unmounts
    useEffect(() => {
        return () => {
            if (aiWriter) {
                aiWriter.clearAllOverlays();
            }
        };
    }, [aiWriter]);

    const executeOperation = async (operation: PositionBasedOperation) => {
        if (!aiWriter || !editor) {
            console.error('❌ AI Writer or Editor not ready');
            return;
        }

        console.log('🚀 Executing position-based operation:', operation.type);
        setSelectedOperation(operation);

        try {
            let operationId: string;

            switch (operation.type) {
                case 'addition':
                    // Add content at cursor position or end of document
                    const cursorPos = editor.state.selection.from;
                    const addPosition: ContentPosition = {
                        from: cursorPos,
                        to: cursorPos,
                        length: 0
                    };

                    operationId = await aiWriter.addContentAtPosition(
                        addPosition,
                        operation.newContent || '',
                        {
                            label: 'AI Added Content - Preview',
                            animate: true
                        }
                    );
                    console.log('➕ Addition operation created:', operationId);
                    break;

                case 'removal':
                    if (!operation.targetText) break;

                    // Find the target text position
                    const removePosition = aiWriter.findContentPosition(operation.targetText);
                    if (!removePosition) {
                        console.error('❌ Target text not found:', operation.targetText);
                        return;
                    }

                    operationId = await aiWriter.markContentForRemoval(
                        removePosition,
                        { label: 'AI Marked for Removal - Preview' }
                    );
                    console.log('🗑️ Removal operation created:', operationId);
                    break;

                case 'replacement':
                    if (!operation.targetText) break;

                    // Find the target text position
                    const replacePosition = aiWriter.findContentPosition(operation.targetText);
                    if (!replacePosition) {
                        console.error('❌ Target text not found:', operation.targetText);
                        return;
                    }

                    operationId = await aiWriter.replaceContentWithHighlights(
                        replacePosition,
                        operation.newContent || operation.targetText,
                        {
                            label: 'AI Replaced Content - Preview'
                        }
                    );
                    console.log('🔄 Replacement operation created:', operationId);
                    break;

                default:
                    console.error('❌ Unknown operation type:', operation.type);
                    return;
            }

            // Track active operation
            setActiveOperations(prev => [...prev, operationId]);

            // Log current active overlays
            setTimeout(() => {
                const overlays = aiWriter.getActiveOverlays();
                console.log('📊 Active overlays:', overlays);
            }, 100);

        } catch (error) {
            console.error('❌ Error executing operation:', error);
        }
    };

    const clearAllOperations = () => {
        if (aiWriter) {
            aiWriter.clearAllOverlays();
            setActiveOperations([]);
            setSelectedOperation(null);
            console.log('🧹 Cleared all AI operations');
        }
    };

    const resetContent = () => {
        if (editor) {
            editor.commands.setContent(DEFAULT_CONTENT);
            clearAllOperations();
            console.log('🔄 Reset content to default');
        }
    };

    if (!editor) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-gray-500">Loading enhanced AI editor...</div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">
                    Position-Based AI Content Editor
                </h1>
                <p className="text-gray-600">
                    Precise content modification using position and length targeting with overlay previews
                </p>
            </div>

            {/* Operation Controls */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold mb-4">AI Operations</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {operations.map((operation, index) => (
                        <button
                            key={index}
                            onClick={() => executeOperation(operation)}
                            className={`${operation.color} text-white px-4 py-3 rounded-lg flex items-center gap-3 transition-all transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2`}
                        >
                            {operation.icon}
                            <div className="text-left">
                                <div className="font-medium">{operation.title}</div>
                                <div className="text-xs opacity-90">{operation.description}</div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={clearAllOperations}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                        <XCircle className="w-4 h-4" />
                        Clear All
                    </button>

                    <button
                        onClick={resetContent}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                    >
                        <RotateCw className="w-4 h-4" />
                        Reset Content
                    </button>
                </div>
            </div>

            {/* Status Display */}
            {activeOperations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-blue-800">
                        <CheckCircle className="w-5 h-5" />
                        <span className="font-medium">
                            {activeOperations.length} Active AI Operation{activeOperations.length !== 1 ? 's' : ''}
                        </span>
                    </div>
                    <p className="text-blue-600 text-sm mt-1">
                        Click on the overlay labels above content to accept or reject changes
                    </p>
                </div>
            )}

            {/* Editor */}
            <div
                ref={containerRef}
                className="relative bg-white rounded-lg border border-gray-200 shadow-sm"
            >
                <div className="border-b border-gray-200 px-4 py-2 bg-gray-50 rounded-t-lg">
                    <h3 className="font-medium text-gray-700">Document Editor</h3>
                </div>

                <div className="relative">
                    <EditorContent
                        editor={editor}
                        className="min-h-[500px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2 rounded-b-lg"
                    />
                </div>
            </div>

            {/* Instructions */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 border border-purple-200">
                <h3 className="font-semibold text-purple-900 mb-3">
                    💡 How Position-Based AI Editing Works
                </h3>
                <div className="space-y-2 text-sm text-purple-800">
                    <p>• <strong>Precise Targeting:</strong> AI operations target specific text positions and lengths</p>
                    <p>• <strong>Overlay Previews:</strong> Temporary labels show above modified content</p>
                    <p>• <strong>Click to Act:</strong> Click overlay labels to see Accept/Reject options</p>
                    <p>• <strong>Visual Feedback:</strong> Different colors for different operation types</p>
                    <p>• <strong>Content Preservation:</strong> Original content is preserved until accepted</p>
                </div>
            </div>
        </div>
    );
}