import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import AIActionContainer from '@/components/document/AIActionContainer';
import TipTap from '@/components/document/TipTap';
import { AIContentWriter } from '@/utils/aiContentWriter';
import { Editor } from '@tiptap/react';
import { DocumentProvider } from '@/context/DocumentContext';
import { Plus, Edit3, Trash2, RotateCw, FileText } from 'lucide-react';
import ErrorBoundary from './ErrorBoundary';

type OperationType = 'addition' | 'editing' | 'removal' | 'replacement';

interface TestOperation {
    type: OperationType;
    title: string;
    description: string;
    icon: React.ReactNode;
    color: string;
}

const DEFAULT_CONTENT = `<h1>Enhanced AI Editing Demo</h1>

<p>This is a sample document where you can test the AI editing functionality with a real TipTap editor. The editor supports rich text editing, and you can see how AI operations work in a real environment.</p>

<h2>Sample Content for Testing</h2>

<p>This paragraph can be edited by the AI. Try selecting it and using the "Edit Content" button to see how the AI editing system works with blue highlighting.</p>

<p>This is another paragraph that demonstrates the AI addition capability. New content will be added after this section.</p>

<ul>
<li><strong>Feature 1</strong>: Real-time AI editing with visual feedback</li>
<li><strong>Feature 2</strong>: Accept/reject controls for user approval</li>
<li><strong>Feature 3</strong>: Multiple operation types (add, edit, remove, replace)</li>
</ul>

<p>This paragraph is marked for potential removal. Use the "Remove Content" button to see how content removal works with red highlighting.</p>

<h3>Testing Instructions</h3>

<ol>
<li>Use the buttons below to test different AI operations</li>
<li>Observe the visual feedback with color-coded highlighting</li>
<li>Test the accept/reject functionality</li>
<li>Try the keyboard shortcuts (Enter to accept, Escape to reject)</li>
</ol>

<blockquote>
<p>💡 <strong>Pro Tip:</strong> This demo integrates with the actual TipTap editor used in the application, so you're seeing exactly how the AI editing will work in production!</p>
</blockquote>`;

export default function IntegratedAIEditingDemo() {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [aiWriter, setAiWriter] = useState<AIContentWriter | null>(null);
    const [showAI, setShowAI] = useState(false);
    const [currentOperation, setCurrentOperation] = useState<OperationType>('addition');
    const [operationSummary, setOperationSummary] = useState<string>('');
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [originalContent, setOriginalContent] = useState(DEFAULT_CONTENT);

    const containerRef = useRef<HTMLDivElement>(null);

    const testOperations: TestOperation[] = [
        {
            type: 'addition',
            title: 'Add Content',
            description: 'Insert new AI-generated content with green highlighting',
            icon: <Plus className="w-4 h-4" />,
            color: 'bg-green-600 hover:bg-green-700'
        },
        {
            type: 'editing',
            title: 'Edit Content',
            description: 'Modify selected text with AI improvements and blue highlighting',
            icon: <Edit3 className="w-4 h-4" />,
            color: 'bg-blue-600 hover:bg-blue-700'
        },
        {
            type: 'removal',
            title: 'Remove Content',
            description: 'Mark content for deletion with red highlighting',
            icon: <Trash2 className="w-4 h-4" />,
            color: 'bg-red-600 hover:bg-red-700'
        },
        {
            type: 'replacement',
            title: 'Replace Content',
            description: 'Replace entire sections with orange highlighting',
            icon: <RotateCw className="w-4 h-4" />,
            color: 'bg-orange-600 hover:bg-orange-700'
        }
    ];

    // Initialize AI writer when editor is ready
    const handleEditorReady = useCallback((editorInstance: Editor) => {
        setEditor(editorInstance);
        const writer = new AIContentWriter(editorInstance);
        setAiWriter(writer);
        console.log('Editor and AI Writer ready:', { editor: editorInstance, writer });
    }, []);

    // Handle document content updates - simplified to prevent infinite loops
    const handleDocumentUpdate = useCallback((content: string) => {
        // Content updates are handled by the editor itself, no state updates needed
        console.log('Document updated:', content.length, 'characters');
    }, []);

    // Test AI operations
    const testOperation = async (operation: OperationType) => {
        if (!aiWriter || !editor) {
            console.error('❌ AI Writer or Editor not ready:', { aiWriter: !!aiWriter, editor: !!editor });
            return;
        }

        console.log('🚀 Starting AI operation:', operation);

        // Store current content before making changes
        const currentContent = editor.getHTML();
        setOriginalContent(currentContent);
        setCurrentOperation(operation);

        try {
            console.log('📝 Current editor content length:', currentContent.length);

            switch (operation) {
                case 'addition':
                    console.log('➕ Performing addition operation');
                    setOperationSummary('Adding new AI-generated paragraph with helpful information');
                    await aiWriter.addContent(
                        `<p>🤖 This is new AI-generated content that has been intelligently added to enhance your document. It provides additional context and valuable information while maintaining the document's coherent structure and flow. This content should appear with GREEN highlighting.</p>`,
                        { animate: true, parseMarkdown: false }
                    );
                    break;

                case 'editing':
                    console.log('✏️ Performing editing operation');
                    // Find and edit the first paragraph
                    const firstParagraph = 'This paragraph can be edited by the AI. Try selecting it and using the "Edit Content" button to see how the AI editing system works with blue highlighting.';
                    setOperationSummary('Editing paragraph to improve clarity and engagement');
                    await aiWriter.editContent(
                        firstParagraph,
                        `<p>✨ This paragraph has been intelligently enhanced by AI to provide clearer, more engaging content. The AI editing system demonstrates real-time improvements with intuitive visual feedback and user control. This should appear with BLUE highlighting.</p>`,
                        { animate: true, parseMarkdown: false }
                    );
                    break;

                case 'removal':
                    console.log('🗑️ Performing removal operation');
                    const removalTarget = 'This paragraph is marked for potential removal. Use the "Remove Content" button to see how content removal works with red highlighting.';
                    setOperationSummary('Removing outdated paragraph content');
                    await aiWriter.removeContent(removalTarget);
                    break;

                case 'replacement':
                    console.log('🔄 Performing replacement operation');
                    const targetHeading = '<h3>Testing Instructions</h3>';
                    setOperationSummary('Replacing section with updated content');
                    await aiWriter.editContent(
                        targetHeading,
                        `<h3>🚀 Enhanced Testing Features (ORANGE highlighting)</h3>`,
                        { animate: true, parseMarkdown: false }
                    );
                    break;

                default:
                    console.error('❌ Unknown operation type:', operation);
                    return;
            }

            console.log('✅ AI operation completed, showing UI');
            setShowAI(true);

            // Log the final content to verify changes were applied
            setTimeout(() => {
                const newContent = editor.getHTML();
                console.log('📊 Content comparison:', {
                    originalLength: currentContent.length,
                    newLength: newContent.length,
                    changed: currentContent !== newContent
                });
            }, 200);

        } catch (error) {
            console.error('❌ Error performing AI operation:', error);
        }
    };

    // Handle accept action
    const handleAccept = () => {
        if (!aiWriter) return;

        // Clean up any temporary highlighting classes and accept the changes
        const editorElement = editor?.view.dom;
        if (editorElement) {
            // Remove all AI preview classes to finalize the content
            const previewElements = editorElement.querySelectorAll('[data-ai-content-id]');
            previewElements.forEach(element => {
                element.classList.remove('ai-preview-content', 'ai-addition-content', 'ai-editing-content', 'ai-removal-content', 'ai-replacement-content');
                element.removeAttribute('data-ai-content-id');
            });
        }

        console.log(`✅ ${currentOperation} operation accepted`);
        setShowAI(false);
        setCurrentOperation('addition');
        setOperationSummary('');
    };

    // Handle reject action
    const handleReject = () => {
        if (!aiWriter || !editor) return;

        // Revert to original content stored before the operation
        editor.commands.setContent(originalContent);

        console.log(`❌ ${currentOperation} operation rejected`);
        setShowAI(false);
        setCurrentOperation('addition');
        setOperationSummary('');
    };

    // Handle regenerate action
    const handleRegenerate = () => {
        setIsRegenerating(true);

        // Simulate regeneration delay
        setTimeout(() => {
            setIsRegenerating(false);
            console.log(`🔄 ${currentOperation} operation regenerated`);

            // Re-run the same operation with different content
            testOperation(currentOperation);
        }, 2000);
    };

    return (
        <ErrorBoundary>
            <DocumentProvider>
                <div className="h-screen bg-gray-50 overflow-hidden">
                    {/* Header */}
                    <div className="bg-white border-b border-gray-200 p-4">
                        <div className="max-w-7xl mx-auto">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
                                        <FileText className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h1 className="text-xl font-semibold text-gray-900">
                                            Integrated AI Editing Demo
                                        </h1>
                                        <p className="text-sm text-gray-600">
                                            Real TipTap editor with AI editing capabilities
                                        </p>
                                        {/* Status Indicator */}
                                        <div className="flex items-center gap-2 mt-1">
                                            <div className={`w-2 h-2 rounded-full ${aiWriter ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                            <span className="text-xs text-gray-500">
                                                {aiWriter ? 'AI Writer Ready' : 'Loading...'}
                                            </span>
                                            {showAI && (
                                                <>
                                                    <span className="text-gray-300">•</span>
                                                    <span className="text-xs text-blue-600 font-medium">
                                                        {currentOperation.charAt(0).toUpperCase() + currentOperation.slice(1)} Operation Active
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Operation Buttons */}
                                <div className="flex gap-2">
                                    {testOperations.map((op) => (
                                        <Button
                                            key={op.type}
                                            onClick={() => testOperation(op.type)}
                                            disabled={!aiWriter || showAI}
                                            className={`${op.color} text-white transition-all duration-200 ${!aiWriter || showAI ? 'opacity-50' : ''}`}
                                            size="sm"
                                            title={op.description}
                                        >
                                            {op.icon}
                                            {op.title}
                                        </Button>
                                    ))}

                                    {/* Reset Button */}
                                    <Button
                                        onClick={() => {
                                            if (editor) {
                                                editor.commands.setContent(DEFAULT_CONTENT);
                                                setShowAI(false);
                                            }
                                        }}
                                        disabled={!editor}
                                        variant="outline"
                                        size="sm"
                                        title="Reset document to original content"
                                    >
                                        <RotateCw className="w-4 h-4" />
                                        Reset
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="h-full flex">
                        {/* Editor Container */}
                        <div className="flex-1 relative" ref={containerRef}>
                            <TipTap
                                initialContent={DEFAULT_CONTENT}
                                onEditorReady={handleEditorReady}
                                onUpdate={handleDocumentUpdate}
                                className="h-full"
                                key="integrated-demo-editor"
                            />

                            {/* AI Action Container */}
                            <AIActionContainer
                                show={showAI}
                                onAccept={handleAccept}
                                onReject={handleReject}
                                onRegenerate={handleRegenerate}
                                isRegenerating={isRegenerating}
                                chatSidebarOpen={false}
                                operationType={currentOperation}
                                affectedContentSummary={operationSummary}
                            />
                        </div>

                        {/* Side Panel with Instructions */}
                        <div className="w-80 bg-white border-l border-gray-200 p-4 overflow-y-auto">
                            <Card className="p-4">
                                <h3 className="font-semibold text-gray-900 mb-3">
                                    🧪 Testing Instructions
                                </h3>

                                <div className="space-y-4 text-sm">
                                    {testOperations.map((op, index) => (
                                        <div key={op.type} className="border rounded-lg p-3 bg-gray-50">
                                            <div className="flex items-start gap-2">
                                                <div className={`p-1 rounded ${op.color} text-white`}>
                                                    {op.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="font-medium text-gray-900">
                                                        {index + 1}. {op.title}
                                                    </h4>
                                                    <p className="text-gray-600 text-xs mt-1">
                                                        {op.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-3 bg-blue-50 rounded-lg">
                                    <h4 className="font-medium text-blue-900 mb-2">
                                        🎮 Interactive Features
                                    </h4>
                                    <ul className="text-xs text-blue-800 space-y-1">
                                        <li>• Real TipTap editor integration</li>
                                        <li>• Live visual feedback with highlighting</li>
                                        <li>• Accept/reject controls</li>
                                        <li>• Keyboard shortcuts (Enter/Escape)</li>
                                        <li>• Content regeneration</li>
                                        <li>• Undo/redo functionality</li>
                                    </ul>
                                </div>

                                <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                                    <h4 className="font-medium text-yellow-900 mb-2">
                                        💡 Pro Tips
                                    </h4>
                                    <ul className="text-xs text-yellow-800 space-y-1">
                                        <li>• Watch the document update in real-time</li>
                                        <li>• Try multiple operations in sequence</li>
                                        <li>• Test keyboard shortcuts for quick acceptance</li>
                                        <li>• Observe the different color coding systems</li>
                                    </ul>
                                </div>
                            </Card>
                        </div>
                    </div>
                </div>
            </DocumentProvider>
        </ErrorBoundary>
    );
}