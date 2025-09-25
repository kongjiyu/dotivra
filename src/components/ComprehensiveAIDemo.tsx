import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { Plus, Trash2, RotateCw, XCircle, Sparkles, Wand2 } from 'lucide-react';
import { EnhancedAIContentWriter } from '../utils/enhancedAIContentWriter';
import AIActionContainer from '@/components/document/AIActionContainer';
import ToolBar from '@/components/document/ToolBar';
import type { ContentPosition } from '../utils/enhancedAIContentWriter';

interface AIOperation {
    type: 'addition' | 'removal' | 'replacement';
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    targetText?: string;
    newContent?: string;
    position?: ContentPosition;
}

const ComprehensiveAIDemo: React.FC = () => {
    const [showAIAction, setShowAIAction] = useState(false);
    const [operationType, setOperationType] = useState<'addition' | 'removal' | 'replacement' | null>(null);
    const [currentOperation, setCurrentOperation] = useState<AIOperation | null>(null);
    const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);
    const [activeOperations, setActiveOperations] = useState<string[]>([]);

    // AI Writer state
    const [aiWriter, setAiWriter] = useState<EnhancedAIContentWriter | null>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
        ],
        content: `
            <h1>🤖 Comprehensive AI Editing Demo</h1>
            <p>This demo combine all requirements from users.</p>
            <p>Features include:</p>
            <ul>
                <li>AI Content Addition with visual highlights</li>
                <li>AI Content Removal with confirmation</li>
                <li>AI Content Replacement with diff view</li>
                <li>Accept/Reject functionality with AIActionContainer</li>
                <li>Hover effects and animations</li>
            </ul>
            <p>Try the buttons below to see AI operations in action!</p>
            <p>Each operation will show visual effects and require your confirmation.</p>
        `,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-6',
            },
        },
    });

    // Initialize AI Writer when editor is ready
    useEffect(() => {
        if (editor) {
            const writer = new EnhancedAIContentWriter(editor);
            setAiWriter(writer);

            return () => {
                // Cleanup if needed
            };
        }
    }, [editor]);

    // Handle keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowAIAction(false);
                setCurrentOperationId(null);
                setCurrentOperation(null);
                aiWriter?.clearAllOverlays();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [aiWriter]);

    const handleAccept = () => {
        if (currentOperationId && aiWriter) {
            aiWriter.acceptChange(currentOperationId);
            setActiveOperations(prev => prev.filter(id => id !== currentOperationId));
            setShowAIAction(false);
            setCurrentOperationId(null);
            setCurrentOperation(null);
        }
    };

    const handleReject = () => {
        if (currentOperationId && aiWriter) {
            aiWriter.rejectChange(currentOperationId);
            setActiveOperations(prev => prev.filter(id => id !== currentOperationId));
            setShowAIAction(false);
            setCurrentOperationId(null);
            setCurrentOperation(null);
        }
    };

    const handleRegenerate = () => {
        if (currentOperationId && aiWriter && currentOperation) {
            // First reject the current change
            aiWriter.rejectChange(currentOperationId);
            setActiveOperations(prev => prev.filter(id => id !== currentOperationId));

            // Then execute the operation again
            setTimeout(() => {
                executeOperation(currentOperation);
            }, 500);
        }
    };

    const operations: AIOperation[] = [
        {
            type: 'addition',
            title: 'Add AI Content',
            description: 'Insert AI-generated content at cursor position',
            icon: <Plus className="w-5 h-5" />,
            color: 'bg-green-500',
            newContent: 'This content was added by AI with enhanced visual effects! ✨'
        },
        {
            type: 'removal',
            title: 'Remove Content',
            description: 'Mark content for AI removal with confirmation',
            icon: <Trash2 className="w-5 h-5" />,
            color: 'bg-red-500',
            targetText: 'This demo combine all requirements from users.'
        },
        {
            type: 'replacement',
            title: 'Replace Content',
            description: 'Replace existing content with AI suggestions',
            icon: <RotateCw className="w-5 h-5" />,
            color: 'bg-blue-500',
            targetText: 'This demo combine all requirements from users.',
            newContent: 'This enhanced demo showcases all advanced AI editing capabilities with modern UX! 🚀'
        }
    ];

    const executeOperation = async (operation: AIOperation) => {
        if (!aiWriter || !editor) return;

        try {
            let operationId: string | null = null;

            switch (operation.type) {
                case 'addition':
                    if (!operation.newContent) break;

                    const addPosition: ContentPosition = {
                        from: editor.view.state.selection.from,
                        to: editor.view.state.selection.from,
                        length: 0
                    };

                    operationId = await aiWriter.addContentAtPosition(
                        addPosition,
                        operation.newContent || '',
                        {
                            label: '✨ AI Added Content - Click to Review',
                            animate: true
                        }
                    );
                    console.log('➕ Addition operation created:', operationId);
                    break;

                case 'removal':
                    if (!operation.targetText) break;

                    // Find the text position in the editor
                    const currentText = editor.getText();
                    const startPos = currentText.indexOf(operation.targetText);
                    if (startPos === -1) {
                        console.error('❌ Target text not found:', operation.targetText);
                        return;
                    }

                    const removePosition: ContentPosition = {
                        from: startPos,
                        to: startPos + operation.targetText.length,
                        length: operation.targetText.length
                    };

                    operationId = await aiWriter.markContentForRemoval(
                        removePosition,
                        { label: '🗑️ AI Marked for Removal - Click to Review' }
                    );
                    console.log('🗑️ Removal operation created:', operationId);
                    break;

                case 'replacement':
                    if (!operation.targetText) break;

                    // Find the text to replace in the editor
                    const replaceText = editor.getText();
                    const replaceStartPos = replaceText.indexOf(operation.targetText);
                    if (replaceStartPos === -1) {
                        console.error('❌ Target text not found for replacement:', operation.targetText);
                        return;
                    }

                    const replacePosition: ContentPosition = {
                        from: replaceStartPos,
                        to: replaceStartPos + operation.targetText.length,
                        length: operation.targetText.length
                    };

                    operationId = await aiWriter.replaceContentWithHighlights(
                        replacePosition,
                        operation.newContent || '',
                        { label: '🔄 AI Replacement - Click to Review' }
                    );
                    console.log('🔄 Replacement operation created:', operationId);
                    break;

                default:
                    console.error('❌ Unknown operation type:', operation.type);
                    return;
            }

            // Track active operation if operationId was created
            if (operationId) {
                setActiveOperations(prev => [...prev, operationId]);
                setCurrentOperationId(operationId);
                setCurrentOperation(operation);

                // Show AI Action Container
                setShowAIAction(true);
                setOperationType(operation.type);
            }
        } catch (error) {
            console.error('❌ Error executing operation:', error);
        }
    };

    const clearAllOperations = () => {
        if (aiWriter) {
            aiWriter.clearAllOverlays();
        }
        setActiveOperations([]);
        setShowAIAction(false);
        setCurrentOperationId(null);
        setCurrentOperation(null);
    };

    if (!editor) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading AI Editor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 relative">
            <div className="max-w-6xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                                    <div className="p-2 bg-blue-500 rounded-lg">
                                        <Wand2 className="w-6 h-6 text-white" />
                                    </div>
                                    Comprehensive AI Editor Demo
                                </h2>
                                <p className="text-gray-600 mt-2">
                                    Experience all AI editing features with enhanced visual feedback and AIActionContainer
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    AI Ready
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex">
                        {/* Main Editor Area */}
                        <div className="flex-1 p-8">
                            <div className="bg-white border border-gray-200 rounded-xl">
                                <ToolBar editor={editor} />
                                <div className="border-t border-gray-200">
                                    <EditorContent
                                        editor={editor}
                                        className="min-h-[500px] bg-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Operations Sidebar */}
                        <div className="w-80 border-l border-gray-200 bg-gray-50 p-6">
                            <div className="sticky top-6">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-blue-500" />
                                    AI Operations
                                </h3>

                                <div className="space-y-3 mb-6">
                                    {operations.map((operation, index) => (
                                        <button
                                            key={index}
                                            onClick={() => executeOperation(operation)}
                                            className={`w-full text-left p-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 transition-all group`}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 ${operation.color} rounded-lg text-white group-hover:scale-110 transition-transform`}>
                                                    {operation.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-semibold text-gray-800 group-hover:text-gray-900">
                                                        {operation.title}
                                                    </h4>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {operation.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>

                                {/* Demo Effects */}
                                <div className="border-t border-gray-200 pt-6">
                                    <h4 className="text-md font-semibold text-gray-800 mb-3">Demo Effects</h4>
                                    <button
                                        onClick={() => {
                                            if (aiWriter && editor) {
                                                aiWriter.addContentAtPosition(
                                                    {
                                                        from: editor.view.state.selection.from,
                                                        to: editor.view.state.selection.from,
                                                        length: 0
                                                    },
                                                    " (AI Demo) ",
                                                    { animate: true }
                                                );
                                            }
                                        }}
                                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 shadow-md"
                                    >
                                        <Sparkles className="w-5 h-5" />
                                        Demo AI Effects
                                    </button>

                                    <button
                                        onClick={clearAllOperations}
                                        className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Stats */}
                    <div className="border-t border-gray-200 bg-gray-50 px-8 py-4">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <div className="flex items-center gap-6">
                                <span>Characters: {editor.storage.characterCount?.characters() || 0}</span>
                                <span>Words: {editor.storage.characterCount?.words() || 0}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span>Active Operations: {activeOperations.length}</span>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${showAIAction ? 'bg-orange-500 animate-pulse' : 'bg-gray-300'}`}></div>
                                    <span>{showAIAction ? 'Pending Review' : 'Ready'}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* AI Action Container */}
            <AIActionContainer
                show={showAIAction}
                onAccept={handleAccept}
                onReject={handleReject}
                onRegenerate={handleRegenerate}
                operationType={operationType || 'editing'}
            />
        </div>
    );
};

export default ComprehensiveAIDemo;