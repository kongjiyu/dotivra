import DocumentLayout from "./DocumentLayout";
import TipTap from "@/components/Document/TipTap";
import AIActionContainer from "@/components/Document/AIActionContainer";
import { useDocument } from "@/context/DocumentContext";
import { useRef, useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { API_ENDPOINTS } from "@/lib/apiConfig";

import { EnhancedAIContentWriter } from '@/utils/enhancedAIContentWriter';
import type { ContentPosition } from '@/utils/enhancedAIContentWriter';

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

const DEFAULT_DOC = `<h1>Product Strategy 2024</h1>

<h3>Executive Summary</h3>

<p>Our product strategy for 2024 focuses on three key pillars: innovation, user experience, and market expansion. This document outlines our approach to achieving sustainable growth while maintaining our commitment to quality and customer satisfaction.</p>

<h2>Market Analysis</h2>

<p>The current market landscape presents both opportunities and challenges. We've identified several key trends:</p>

<ul>
<li><strong>AI Integration</strong>: Increasing demand for AI-powered solutions</li>
<li><strong>Mobile-First</strong>: Continued shift towards mobile platforms</li>
<li><strong>Sustainability</strong>: Growing emphasis on eco-friendly products</li>
</ul>

<h2>Strategic Objectives</h2>

<h3>1. Product Innovation</h3>
<ul>
<li>Launch 3 new AI-powered features</li>
<li>Improve existing functionality by 40%</li>
<li>Reduce development cycle time by 25%</li>
</ul>

<h3>2. User Experience Enhancement</h3>
<ul>
<li>Achieve 95% user satisfaction score</li>
<li>Reduce customer support tickets by 30%</li>
<li>Implement personalized user journeys</li>
</ul>

<h3>3. Market Expansion</h3>
<ul>
<li>Enter 2 new geographic markets</li>
<li>Partner with 5 strategic alliances</li>
<li>Increase market share by 15%</li>
</ul>

<h2>Implementation Timeline</h2>

<table>
<thead>
<tr>
<th>Quarter</th>
<th>Focus Area</th>
<th>Key Milestones</th>
</tr>
</thead>
<tbody>
<tr>
<td>Q1 2024</td>
<td>Foundation</td>
<td>Core platform updates</td>
</tr>
<tr>
<td>Q2 2024</td>
<td>Innovation</td>
<td>AI features launch</td>
</tr>
<tr>
<td>Q3 2024</td>
<td>Expansion</td>
<td>New market entry</td>
</tr>
<tr>
<td>Q4 2024</td>
<td>Optimization</td>
<td>Performance improvements</td>
</tr>
</tbody>
</table>

<h2>Success Metrics</h2>

<p>We will measure success through the following KPIs:</p>

<ul>
<li><strong>Revenue Growth</strong>: 25% year-over-year increase</li>
<li><strong>User Engagement</strong>: 40% improvement in daily active users</li>
<li><strong>Customer Retention</strong>: 90% annual retention rate</li>
<li><strong>Market Position</strong>: Top 3 in our category</li>
</ul>

<h2>Risk Assessment</h2>

<h3>High Priority Risks</h3>
<ol>
<li><strong>Competition</strong>: New entrants with similar offerings</li>
<li><strong>Technology</strong>: Rapid pace of AI advancement</li>
<li><strong>Regulation</strong>: Changing data privacy laws</li>
</ol>

<h3>Mitigation Strategies</h3>
<ul>
<li>Continuous market monitoring</li>
<li>Agile development methodology</li>
<li>Compliance-first approach</li>
</ul>

<h2>Conclusion</h2>

<p>This strategy provides a clear roadmap for achieving our 2024 objectives. Success depends on execution excellence, team collaboration, and customer-centric decision making.</p>`;

export default function DocumentEditor() {
    const { documentId } = useParams<{ documentId: string }>();
    const {
        documentContent,
        setDocumentContent,
        setCurrentEditor,
        onOpenChat,
        setShowAIActions,
        chatSidebarOpen,
        documentTitle,
        setDocumentTitle,
        setDocumentId
    } = useDocument();
    const documentContentRef = useRef<HTMLDivElement>(null);

    // AI Editing State
    const [showAIAction, setShowAIAction] = useState(false);

    // Debug showAIAction changes
    useEffect(() => {
        console.log('🔍 DocumentEditor showAIAction state changed to:', showAIAction, 'type:', typeof showAIAction);
    }, [showAIAction]);
    const [operationType, setOperationType] = useState<'addition' | 'removal' | 'replacement' | null>(null);
    const [currentOperation, setCurrentOperation] = useState<AIOperation | null>(null);
    const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);

    const [aiWriter, setAiWriter] = useState<EnhancedAIContentWriter | null>(null);
    const [currentEditor, setCurrentEditorLocal] = useState<any>(null);

    // Legacy AI state (for backward compatibility)
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [beforeAIContent, setBeforeAIContent] = useState<string>("");

    // Loading state for document
    const [isLoadingDocument, setIsLoadingDocument] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Load document when documentId changes
    useEffect(() => {
        const loadDocument = async () => {
            if (!documentId) {
                // If no documentId, start with empty content
                setDocumentContent("");
                setDocumentTitle("Untitled Document");
                return;
            }

            setIsLoadingDocument(true);
            try {
                console.log('📄 Loading document with ID:', documentId);
                
                // Fetch document from API
                const response = await fetch(API_ENDPOINTS.document(documentId));
                if (!response.ok) {
                    throw new Error(`Failed to load document: ${response.status}`);
                }
                
                const data = await response.json();
                console.log('📄 Loaded document data:', data);
                
                // Handle both API response formats: direct document data or wrapped in success/document
                const documentData = data.success ? data.document : data;
                
                if (documentData && documentData.id) {
                    setDocumentId(documentId);
                    setDocumentTitle(documentData.Title || documentData.DocumentName || "Untitled Document");
                    const content = documentData.Content || "";
                    console.log('📄 Document content from DB:', content ? `"${content.substring(0, 100)}..."` : '(empty)');
                    console.log('📄 Using content:', content ? content : '(empty - will show blank editor)');
                    setDocumentContent(content); // Use exact content from DB, empty if empty
                } else {
                    console.warn('📄 No document data found in response:', data);
                    setDocumentContent("");
                    setDocumentTitle("Document Not Found");
                }
            } catch (error) {
                console.error('❌ Error loading document:', error);
                // Show empty editor on error
                setDocumentContent("");
                setDocumentTitle("Document Load Error");
            } finally {
                setIsLoadingDocument(false);
            }
        };

        loadDocument();
    }, [documentId, setDocumentContent, setDocumentTitle, setDocumentId]);

    const handleDocumentUpdate = useCallback((content: string) => {
        setDocumentContent(content);
        
        // Auto-save to database if we have a documentId
        if (documentId) {
            // Debounce the save operation
            clearTimeout((window as any).autoSaveTimeout);
            (window as any).autoSaveTimeout = setTimeout(async () => {
                try {
                    setIsSaving(true);
                    console.log('💾 Auto-saving document...', documentId);
                    console.log('💾 Content to save (first 100 chars):', content.substring(0, 100) + '...');
                    const response = await fetch(API_ENDPOINTS.document(documentId), {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            content: content,  // Use lowercase to match API expectation
                            EditedBy: 'current-user', // TODO: Get actual user ID
                        }),
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        console.log('💾 Document auto-saved successfully:', result.UpdatedAt);
                    } else {
                        console.error('❌ Failed to auto-save document:', response.status, await response.text());
                    }
                } catch (error) {
                    console.error('❌ Auto-save error:', error);
                } finally {
                    setIsSaving(false);
                }
            }, 2000); // Save after 2 seconds of inactivity
        }
    }, [setDocumentContent, documentId]);

    const handleEditorReady = useCallback((editor: any) => {
        setCurrentEditor(editor);
        setCurrentEditorLocal(editor);

        // Initialize AI Writer when editor is ready
        if (editor) {
            const writer = new EnhancedAIContentWriter(editor);
            setAiWriter(writer);
        }
    }, [setCurrentEditor]);

    const handleAcceptAI = useCallback(() => {
        // Check for chat operation first
        const chatOperationId = (window as any).currentChatOperationId;
        const chatAIWriter = (window as any).currentChatAIWriter;

        if (chatOperationId && chatAIWriter) {
            console.log('🎯 Accepting chat operation:', chatOperationId);
            chatAIWriter.acceptChange(chatOperationId);
            // Clear the global references
            (window as any).currentChatOperationId = null;
            (window as any).currentChatAIWriter = null;
            setShowAIAction(false);
        } else if (currentOperationId && aiWriter) {
            console.log('🎯 Accepting sidebar operation:', currentOperationId);
            aiWriter.acceptChange(currentOperationId);
            setShowAIAction(false);
            setCurrentOperationId(null);
            setCurrentOperation(null);
        }

        // Legacy support
        setBeforeAIContent("");
    }, [currentOperationId, aiWriter]);

    const handleRejectAI = useCallback(() => {
        // Check for chat operation first
        const chatOperationId = (window as any).currentChatOperationId;
        const chatAIWriter = (window as any).currentChatAIWriter;

        if (chatOperationId && chatAIWriter) {
            console.log('🎯 Rejecting chat operation:', chatOperationId);
            chatAIWriter.rejectChange(chatOperationId);
            // Clear the global references
            (window as any).currentChatOperationId = null;
            (window as any).currentChatAIWriter = null;
            setShowAIAction(false);
        } else if (currentOperationId && aiWriter) {
            console.log('🎯 Rejecting sidebar operation:', currentOperationId);
            aiWriter.rejectChange(currentOperationId);
            setShowAIAction(false);
            setCurrentOperationId(null);
            setCurrentOperation(null);
        }

        // Legacy support
        if (beforeAIContent) {
            setDocumentContent(beforeAIContent);
        }
        setBeforeAIContent("");
    }, [currentOperationId, aiWriter, beforeAIContent, setDocumentContent]);

    const handleRegenerateAI = useCallback(() => {
        // Check for chat operation first
        const chatOperationId = (window as any).currentChatOperationId;
        const chatAIWriter = (window as any).currentChatAIWriter;

        if (chatOperationId && chatAIWriter) {
            console.log('🎯 Regenerating chat operation:', chatOperationId);
            chatAIWriter.rejectChange(chatOperationId);
            // Clear the global references
            (window as any).currentChatOperationId = null;
            (window as any).currentChatAIWriter = null;
            setShowAIAction(false);
            // Note: Chat regeneration could be implemented by re-running the last chat command
        } else if (currentOperationId && aiWriter && currentOperation) {
            console.log('🎯 Regenerating sidebar operation:', currentOperationId);
            // First reject the current change
            aiWriter.rejectChange(currentOperationId);

            // Store operation to re-execute after rejection
            const operationToRetry = currentOperation;
            setCurrentOperationId(null);
            setCurrentOperation(null);

            // Then execute the operation again
            setTimeout(async () => {
                if (!aiWriter || !currentEditor) return;

                try {
                    let operationId: string | null = null;

                    switch (operationToRetry.type) {
                        case 'addition':
                            if (!operationToRetry.newContent) break;

                            const addPosition: ContentPosition = {
                                from: currentEditor.view.state.selection.from,
                                to: currentEditor.view.state.selection.from,
                                length: 0
                            };

                            operationId = await aiWriter.addContentAtPosition(
                                addPosition,
                                operationToRetry.newContent || ''
                            );
                            break;

                        case 'removal':
                            if (!operationToRetry.targetText) break;

                            const currentText = currentEditor.getText();
                            const startPos = currentText.indexOf(operationToRetry.targetText);
                            if (startPos === -1) return;

                            const removePosition: ContentPosition = {
                                from: startPos,
                                to: startPos + operationToRetry.targetText.length,
                                length: operationToRetry.targetText.length
                            };

                            operationId = await aiWriter.markContentForRemoval(
                                removePosition
                            );
                            break;

                        case 'replacement':
                            if (!operationToRetry.targetText) break;

                            const replaceText = currentEditor.getText();
                            const replaceStartPos = replaceText.indexOf(operationToRetry.targetText);
                            if (replaceStartPos === -1) return;

                            const replacePosition: ContentPosition = {
                                from: replaceStartPos,
                                to: replaceStartPos + operationToRetry.targetText.length,
                                length: operationToRetry.targetText.length
                            };

                            operationId = await aiWriter.replaceContentWithHighlights(
                                replacePosition,
                                operationToRetry.newContent || ''
                            );
                            break;
                    }

                    if (operationId) {
                        setCurrentOperationId(operationId);
                        setCurrentOperation(operationToRetry);
                        setShowAIAction(true);
                        setOperationType(operationToRetry.type);
                    }
                } catch (error) {
                    console.error('❌ Error regenerating operation:', error);
                }
            }, 500);
        } else {
            // Legacy regeneration handling
            setIsRegenerating(true);
            setTimeout(() => {
                setIsRegenerating(false);
            }, 2000);
        }
    }, [currentOperationId, aiWriter, currentOperation, currentEditor]);

    // Execute AI operations (memoized to prevent re-renders)


    // Function to show AI actions - this will be called from ChatSidebar (memoized to prevent re-renders)
    const showAIActionsContainer = useCallback((content: string, beforeContent: string) => {
        console.log('🎯 DocumentEditor showAIActionsContainer called with:', {
            content,
            beforeContent,
            currentShowAIAction: showAIAction,
            showAIActionType: typeof showAIAction,
            setShowAIActionFunction: !!setShowAIAction,
            setShowAIActionType: typeof setShowAIAction
        });

        // Always show for AI operations from chat (more permissive)
        if (content && content.trim()) {
            console.log('✅ About to set showAIAction to true for operation:', content);
            setBeforeAIContent(beforeContent || documentContent);

            // Use a more explicit state setting with callback to confirm
            setShowAIAction(prev => {
                console.log('🔧 setShowAIAction callback - prev:', prev, 'setting to: true');
                return true;
            });

            console.log('🔍 setShowAIAction called - state will be updated on next render');

            // Add visual notification that action container is ready
            (window as any).currentAIContentSummary = content;

            // Add a visual notification to draw attention
            setTimeout(() => {
                // Show a brief notification toast
                const notification = document.createElement('div');
                notification.innerHTML = `
                    <div style="position: fixed; top: 20px; right: 20px; z-index: 9999; 
                                background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                                color: white; padding: 12px 20px; border-radius: 8px; 
                                font-weight: 500; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                                animation: slideInRight 0.3s ease-out;
                                transform-origin: right center;">
                        🤖 AI operation complete! Review changes below ↙️
                    </div>
                `;
                document.body.appendChild(notification);

                // Remove notification after 3 seconds
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 3000);

                // Scroll to show the AI changes first, then the action container
                const aiHighlights = document.querySelector('.ai-highlight, .ai-addition, .ai-removal');
                if (aiHighlights) {
                    aiHighlights.scrollIntoView({ behavior: 'smooth', block: 'center' });

                    // Then scroll to show action container after a brief delay
                    setTimeout(() => {
                        const actionContainer = document.querySelector('[data-ai-action-container]');
                        if (actionContainer) {
                            actionContainer.scrollIntoView({ behavior: 'smooth', block: 'end' });
                        }
                    }, 500);
                } else {
                    // Fallback: scroll to action container if no highlights found
                    const actionContainer = document.querySelector('[data-ai-action-container]');
                    if (actionContainer) {
                        actionContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }, 100);
        } else {
            console.log('❌ Ignoring AI action call - empty content');
        }
    }, [documentContent]);

    // No longer initialize with default content - let documents be empty if they're empty

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

    // Register AI actions function with context (run only once)
    useEffect(() => {
        console.log('🔧 DocumentEditor: Registering showAIActionsContainer with context');
        console.log('🔧 setShowAIActions function:', !!setShowAIActions);
        console.log('🔧 showAIActionsContainer function:', !!showAIActionsContainer);

        if (setShowAIActions && showAIActionsContainer) {
            setShowAIActions(showAIActionsContainer);
            console.log('🔧 DocumentEditor: showAIActionsContainer registered successfully');

            // Store globally for debugging
            (window as any).currentShowAIActionsFunction = showAIActionsContainer;
        } else {
            console.error('❌ Cannot register showAIActionsContainer - missing functions');
        }
    }, [setShowAIActions, showAIActionsContainer]);

    useEffect(() => {
        console.log('DocumentEditor onOpenChat function:', onOpenChat);
    }, [onOpenChat]);

    const effectiveContent = documentContent || "";

    return (
        <DocumentLayout showDocumentMenu={true}>
            {/* Main Editor Area - Full Width */}
            <div ref={documentContentRef} className="w-full h-full relative">
                <TipTap
                    initialContent={effectiveContent}
                    onUpdate={handleDocumentUpdate}
                    onEditorReady={handleEditorReady}
                    onOpenChat={onOpenChat}
                    className=""
                />

                {/* Save Status Indicator */}
                {isSaving && (
                    <div className="fixed top-20 right-6 bg-blue-100 text-blue-800 px-3 py-2 rounded-lg shadow-lg z-50 flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm">Saving...</span>
                    </div>
                )}

                {/* AI Action Container */}
                <div data-ai-action-container="true">
                    <AIActionContainer
                        show={showAIAction}
                        onAccept={handleAcceptAI}
                        onReject={handleRejectAI}
                        onRegenerate={handleRegenerateAI}
                        isRegenerating={isRegenerating}
                        chatSidebarOpen={chatSidebarOpen}
                        operationType={operationType || 'addition'}
                        affectedContentSummary={(window as any).currentAIContentSummary}
                    />
                </div>
            </div>

        </DocumentLayout>
    );
}