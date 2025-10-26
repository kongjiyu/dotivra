import DocumentLayout from "./DocumentLayout";
import TipTap from "@/components/Document/TipTap";
import AIActionContainer from "@/components/Document/AIActionContainer";
import { useDocument } from "@/context/DocumentContext";
import { useRef, useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { fetchDocument } from "@/services/apiService";
import { useAuth } from "@/context/AuthContext";
import { useDocumentSync } from "@/hooks/useDocumentSync";

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

export default function DocumentEditor() {
    const { documentId } = useParams<{ documentId: string }>();
    const location = useLocation();
    const { user } = useAuth();
    const {
        setDocumentContent,
        setDocumentTitle,
        currentEditor,
        setCurrentEditor,
        showAIActions,
        setShowAIActions,
        documentContent,
        chatSidebarOpen,
        setDocumentId,
        setProjectId,
        setRepositoryInfo,
        onOpenChat,
        showToolbar,
    } = useDocument();
    const documentContainerRef = useRef<HTMLDivElement>(null);
    const latestContentRef = useRef<string>("");
    const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // AI Editing State
    const [showAIAction, setShowAIAction] = useState(false);

    const [operationType, setOperationType] = useState<'addition' | 'removal' | 'replacement' | null>(null);
    const [currentOperation, setCurrentOperation] = useState<AIOperation | null>(null);
    const [currentOperationId, setCurrentOperationId] = useState<string | null>(null);

    const [aiWriter, setAiWriter] = useState<EnhancedAIContentWriter | null>(null);
    const [currentEditorLocal, setCurrentEditorLocal] = useState<any>(null);

    // Legacy AI state (for backward compatibility)
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [beforeAIContent, setBeforeAIContent] = useState<string>("");

    // Loading state for document
    const [isLoadingDocument, setIsLoadingDocument] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Ref to track current content and prevent unnecessary re-renders
    const documentContentRef = useRef(documentContent);

    // Update ref when documentContent changes
    useEffect(() => {
        documentContentRef.current = documentContent;
    }, [documentContent]);

    // WebSocket sync hook for editor content (separate channel from summary)
    const { syncStatus, sendUpdate } = useDocumentSync({
        documentId: documentId || '',
        channel: 'content', // Use 'content' channel
        onUpdate: (content) => {
            // Received update from another client
            // Only update if content is different to prevent re-render loops
            if (content !== documentContentRef.current) {
                setDocumentContent(content);
                latestContentRef.current = content;

                // Update editor content if editor is available
                if (currentEditor && !currentEditor.isDestroyed) {
                    const { from } = currentEditor.state.selection;
                    currentEditor.commands.setContent(content);
                    // Try to restore cursor position
                    currentEditor.commands.focus();
                    currentEditor.commands.setTextSelection(Math.min(from, currentEditor.state.doc.content.size));
                }
            }
        },
    });

    // Load document when documentId changes
    useEffect(() => {
        const loadDocument = async () => {
            if (!documentId) {
                // If no documentId, start with empty content
                setDocumentContent("");
                setDocumentTitle("Untitled Document");
                return;
            }

            // Check if we have document data passed through navigation state (from document creation or version restore)
            const navigationState = location.state as { documentData?: any, skipFetch?: boolean } | null;
            
            // If skipFetch flag is set, use existing content from context (e.g., from version restore)
            if (navigationState?.skipFetch) {
                console.log('📄 Skipping document fetch - using content from context (restored version)');
                setDocumentId(documentId);
                
                // Clear any pending autosave and sync the ref with context content
                if (autoSaveTimeoutRef.current) {
                    clearTimeout(autoSaveTimeoutRef.current);
                }
                latestContentRef.current = documentContent || "";
                
                return;
            }
            
            if (navigationState?.documentData) {
                const documentData = navigationState.documentData;
                console.log('📄 Using document data from navigation state:', {
                    id: documentData.id,
                    contentLength: documentData.Content?.length || 0
                });

                setDocumentId(documentId);
                setDocumentTitle(documentData.DocumentName || documentData.Title || "Untitled Document");
                const content = documentData.Content || "";
                setDocumentContent(content);
                
                // Clear any pending autosave and sync the ref with loaded content
                if (autoSaveTimeoutRef.current) {
                    clearTimeout(autoSaveTimeoutRef.current);
                }
                latestContentRef.current = content;
                
                // Load project info if available
                const projectIdFromDoc = documentData.Project_Id || documentData.ProjectId;
                if (projectIdFromDoc) {
                    setProjectId(projectIdFromDoc);

                    // Skip API call for mock projects
                    if (!projectIdFromDoc.startsWith('mock-')) {
                        try {
                            const projectResponse = await fetch(API_ENDPOINTS.project(projectIdFromDoc));
                            if (projectResponse.ok) {
                                const projectData = await projectResponse.json();
                                const project = projectData.success ? projectData.project : projectData;

                                if (project && project.GitHubRepo) {
                                    const repoMatch = project.GitHubRepo.match(/github\.com\/([^\/]+\/[^\/]+)/) ||
                                        project.GitHubRepo.match(/^([^\/]+\/[^\/]+)$/);

                                    if (repoMatch) {
                                        const fullName = repoMatch[1];
                                        const [owner, repo] = fullName.split('/');
                                        setRepositoryInfo({ owner, repo });
                                    }
                                }
                            }
                        } catch (projectError) {
                            console.warn('Could not load project information:', projectError);
                        }
                    }
                }

                return; // Skip fetching from API since we have fresh data
            }

            setIsLoadingDocument(true);
            try {
                console.log('📄 Loading document from API:', documentId);

                // Use the improved fetchDocument function with fallback logic
                const documentData = await fetchDocument(documentId);

                if (documentData && documentData.id) {
                    setDocumentId(documentId);
                    setDocumentTitle(documentData.DocumentName || "Untitled Document");
                    const content = documentData.Content || "";

                    // Clear any pending autosave and sync the ref with loaded content
                    if (autoSaveTimeoutRef.current) {
                        clearTimeout(autoSaveTimeoutRef.current);
                    }
                    latestContentRef.current = content;
                    
                    setDocumentContent(content); // Use exact content from DB, empty if empty

                    // Load project information if document has a project ID
                    const projectIdFromDoc = documentData.Project_Id;
                    if (projectIdFromDoc) {
                        setProjectId(projectIdFromDoc);

                        // Skip API call for mock projects
                        if (projectIdFromDoc.startsWith('mock-')) {
                            console.log('📋 Skipping API call for mock project:', projectIdFromDoc);
                        } else {
                            // Load project details to get repository information
                            try {
                                const projectResponse = await fetch(API_ENDPOINTS.project(projectIdFromDoc));
                                if (projectResponse.ok) {
                                    const projectData = await projectResponse.json();
                                    const project = projectData.success ? projectData.project : projectData;

                                    if (project && project.GitHubRepo) {

                                        // Parse GitHub repository URL to get owner/repo
                                        const repoMatch = project.GitHubRepo.match(/github\.com\/([^\/]+\/[^\/]+)/) ||
                                            project.GitHubRepo.match(/^([^\/]+\/[^\/]+)$/);

                                        if (repoMatch) {
                                            const fullName = repoMatch[1];
                                            const [owner, repo] = fullName.split('/');
                                            setRepositoryInfo({ owner, repo });
                                        }
                                    }
                                } else {
                                    console.warn('Project API returned error status:', projectResponse.status);
                                }
                            } catch (projectError) {
                                console.warn('Could not load project information:', projectError);
                            }
                        }
                    }
                } else {
                    console.warn('📄 No document data found in response:', documentData);
                    setDocumentContent("");
                    setDocumentTitle("Document Not Found");
                }
            } catch (error) {
                console.error('❌ Error loading document:', error);
                // Show empty editor on error - but this should rarely happen now with fallback logic
                setDocumentContent("");
                setDocumentTitle("Document Load Error");
            } finally {
                setIsLoadingDocument(false);
                // Allow sendUpdate after initial load completes
                setTimeout(() => {
                    isInitialLoadingRef.current = false;
                }, 1000);
            }
        };

        loadDocument();
    }, [documentId]); // Remove state setters from dependencies to prevent infinite loop

    // Track if we're in the initial loading phase
    const isInitialLoadingRef = useRef(true);

    // Optimized onUpdate: avoid re-rendering via context on each keystroke
    const handleDocumentUpdateOptimized = useCallback((content: string) => {
        latestContentRef.current = content;
        documentContentRef.current = content;

        // Skip sendUpdate during initial load
        if (isInitialLoadingRef.current) {
            return;
        }

        // Use useDocumentSync hook to save with Firestore real-time sync
        if (documentId) {
            sendUpdate(content);
            setIsSaving(true);
            setTimeout(() => setIsSaving(false), 1000);
        }
    }, [documentId, sendUpdate]);

    // Cleanup pending autosave on unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, []);

    // Warn user before leaving if there are unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (syncStatus === 'pending' || syncStatus === 'syncing') {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [syncStatus]);

    const handleDocumentUpdate = useCallback((content: string) => {
        latestContentRef.current = content;

        // Auto-save to database if we have a documentId
        if (documentId) {
            // Debounce the save operation
            clearTimeout((window as any).autoSaveTimeout);
            (window as any).autoSaveTimeout = setTimeout(async () => {
                try {
                    setIsSaving(true);
                    const response = await fetch(API_ENDPOINTS.document(documentId), {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            content: content,  // Use lowercase to match API expectation
                            EditedBy: user?.uid || 'anonymous', // Use actual user ID from auth
                        }),
                    });

                    if (response.ok) {
                        const result = await response.json();
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
            chatAIWriter.acceptChange(chatOperationId);
            // Clear the global references
            (window as any).currentChatOperationId = null;
            (window as any).currentChatAIWriter = null;
            setShowAIAction(false);
        } else if (currentOperationId && aiWriter) {
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
            chatAIWriter.rejectChange(chatOperationId);
            // Clear the global references
            (window as any).currentChatOperationId = null;
            (window as any).currentChatAIWriter = null;
            setShowAIAction(false);
        } else if (currentOperationId && aiWriter) {
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
            chatAIWriter.rejectChange(chatOperationId);
            // Clear the global references
            (window as any).currentChatOperationId = null;
            (window as any).currentChatAIWriter = null;
            setShowAIAction(false);
            // Note: Chat regeneration could be implemented by re-running the last chat command
        } else if (currentOperationId && aiWriter && currentOperation) {
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

        // Always show for AI operations from chat (more permissive)
        if (content && content.trim()) {
            setBeforeAIContent(beforeContent || documentContent);

            // Use a more explicit state setting with callback to confirm
            setShowAIAction(prev => {
                return true;
            });
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

        if (setShowAIActions && showAIActionsContainer) {
            setShowAIActions(showAIActionsContainer);

            // Store globally for debugging
            (window as any).currentShowAIActionsFunction = showAIActionsContainer;
        } else {
            console.error('❌ Cannot register showAIActionsContainer - missing functions');
        }
    }, [setShowAIActions, showAIActionsContainer]);

    const effectiveContent = documentContent || "";

    return (
        <DocumentLayout showDocumentMenu={true} syncStatus={syncStatus}>
            {/* Main Editor Area - Full Width */}
            <div ref={documentContainerRef} className="w-full h-full relative">
                <TipTap
                    initialContent={effectiveContent}
                    onUpdate={handleDocumentUpdateOptimized}
                    onEditorReady={handleEditorReady}
                    onOpenChat={onOpenChat}
                    showToolbar={showToolbar}
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
