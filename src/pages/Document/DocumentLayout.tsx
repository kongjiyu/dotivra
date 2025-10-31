import { useState, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    History,
    Cloud,
    CloudUpload,
    CloudOff,
    FileText,
    Sparkles,
    AlignJustify
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DocumentMenu from "@/components/Document/DocumentMenu";
import NavigationPane from "@/components/Document/NavigationPane";
import ChatSidebar from "@/components/Document/ChatSidebar";
import ProjectDocumentsDropdown from "@/components/Document/ProjectDocumentsDropdown";
import { useDocument } from "@/context/DocumentContext";
import { updateToolPreference } from "@/utils/documentToolsPreferences";
import { FirestoreService } from "../../../firestoreService";

interface DocumentLayoutProps {
    children: ReactNode;
    showDocumentMenu?: boolean;
    syncStatus?: 'synced' | 'syncing' | 'pending' | 'error';
    versionCount?: number; // Number of versions in history
}

export default function DocumentLayout({
    children,
    showDocumentMenu = true,
    syncStatus = 'synced',
    versionCount = 0
}: DocumentLayoutProps) {
    const {
        documentTitle,
        setDocumentTitle,
        documentContent,
        setDocumentContent,
        currentEditor,
        setOnOpenChat,
        chatSidebarOpen,
        setChatSidebarOpen,
        repositoryInfo,
        documentId,
        projectId,
        setShowToolbar,
        showNavigationPane,
        setShowNavigationPane,
    } = useDocument();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [initialChatMessage, setInitialChatMessage] = useState<string>('');
    const [selectedTextForChat, setSelectedTextForChat] = useState<string>('');

    const navigate = useNavigate();
    const location = useLocation();

    // Helper function to check if current page should show ChatBot
    const shouldShowChatBot = () => {
        const path = location.pathname;
        return path.includes('/document/editor') ||
            (path.includes('/document/') &&
                !path.includes('/project') &&
                !path.includes('/history'));
    };

    // Helper function to check if we should show sync status
    const shouldShowSyncStatus = () => {
        const path = location.pathname;
        return path.includes('/document/editor') ||
            (path.includes('/document/') &&
                !path.includes('/project') &&
                !path.includes('/history'));
    };

    // Helper function to check if title editing is allowed (only on editor tab)
    const shouldAllowTitleEdit = () => {
        const path = location.pathname;
        // Allow title editing on:
        // 1. /document/editor
        // 2. /document/:documentId (main document editor route)
        // Exclude history and project pages
        const isEditor = path === '/document/editor' || path.endsWith('/document/editor');
        const isDocumentWithId = /\/document\/[a-zA-Z0-9\-_]+$/.test(path);
        const isHistory = path.includes('/history');
        const isProject = path.includes('/project');

        const allowed = isEditor || (isDocumentWithId && !isHistory && !isProject);
        return allowed;
    };

    // Note: Chat sidebar state now persists across tab navigation
    // Users can manually close/open the chat sidebar as needed
    // (Removed auto-close when navigating away from editor/summary pages)

    // Helper function to determine if a tab is active based on current location
    const isTabActive = (tabName: string) => {
        const path = location.pathname;
        switch (tabName) {
            case 'editor':
                return path.includes('/document/editor') || (path.includes('/document/') && !path.includes('/history'));
            case 'history':
                return path.includes('/history');
            default:
                return false;
        }
    };

    // Helper function to get tab button classes
    const getTabButtonClasses = (tabName: string) => {
        const isActive = isTabActive(tabName);
        return isActive
            ? "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200"
            : "text-gray-900 hover:bg-gray-50";
    };

    // Remove the local chatOpen state and use context instead

    useEffect(() => {
        const chatFunction = (message?: string, isReply: boolean = false) => {
            if (isReply) {
                // If it's a reply, store the selected text and open chat sidebar
                if (message && message.trim()) {
                    setSelectedTextForChat(message);
                    setInitialChatMessage(''); // Don't set initial message for replies
                }
                setChatSidebarOpen(true);
                return;
            }

            if (message && message.trim()) {
                setInitialChatMessage(message);
                setSelectedTextForChat(''); // Clear selected text for regular messages

                // Clear the initial message after a delay to prevent re-sending
                setTimeout(() => {
                    setInitialChatMessage('');
                }, 2000); // Increased timeout to ensure it's processed
            }

            setChatSidebarOpen(true);
        };

        setOnOpenChat(() => chatFunction); // Wrap in function to ensure correct reference
    }, [setOnOpenChat, setChatSidebarOpen, chatSidebarOpen]);

    const handleTabChange = (tab: string) => {
        const basePath = '/document';

        switch (tab) {
            case 'editor':
                if (documentId) {
                    navigate(`${basePath}/${documentId}`);
                } else {
                    navigate(`${basePath}/editor`);
                }
                break;
            case 'history':
                if (documentId) {
                    navigate(`${basePath}/history/${documentId}`);
                } else {
                    navigate(`${basePath}/history`);
                }
                break;
            default:
                if (documentId) {
                    navigate(`${basePath}/${documentId}`);
                } else {
                    navigate(`${basePath}/editor`);
                }
        }
    };

    const handleTitleChange = async (newTitle: string) => {
        setDocumentTitle(newTitle);
        // Save title to Firebase if we have a documentId
        if (documentId) {
            try {
                await FirestoreService.updateDocument(documentId, {
                    Title: newTitle,
                    Updated_Time: new Date()
                });
            } catch (error) {
                console.error('Error updating document title:', error);
            }
        }
    };

    const handleAIGenerate = () => {
        setChatSidebarOpen(!chatSidebarOpen);
        setIsAIGenerating(true);
        setTimeout(() => setIsAIGenerating(false), 600);
    };

    return (
        <div className="m-h-screen bg-gray-50">
            {/* Header (fixed) */}
            <div className="fixed top-0 left-0 right-0 z-40 h-20 bg-white border-b border-gray-200 px-6 flex items-center">
                <div className="flex items-center w-full">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center gap-3">
                            {/* Home button with Dotivra logo */}
                            <Link to="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
                                <img src="/logo-icon.png" alt="Dotivra Home" className="h-12 w-12 object-contain" />
                            </Link>

                            {/* Editable Document Title */}
                            {isEditingTitle && shouldAllowTitleEdit() ? (
                                <Input
                                    value={documentTitle}
                                    onChange={(e) => handleTitleChange(e.target.value)}
                                    onBlur={() => setIsEditingTitle(false)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setIsEditingTitle(false);
                                        }
                                    }}
                                    className="!text-xl !font-semibold bg-transparent border-none p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                                    autoFocus
                                />
                            ) : (
                                <h1
                                    className={`!text-xl !font-semibold text-gray-900 max-w-xl truncate ${shouldAllowTitleEdit() ? 'cursor-pointer hover:text-gray-700 transition-colors' : 'cursor-default'
                                        }`}
                                    onClick={() => shouldAllowTitleEdit() && setIsEditingTitle(true)}
                                    title={shouldAllowTitleEdit() ? "Click to edit title" : documentTitle}
                                >
                                    {documentTitle}
                                </h1>
                            )}

                            {shouldShowSyncStatus() && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                    {syncStatus === 'pending' && (
                                        <>
                                            <CloudUpload className="w-4 h-4 text-yellow-600" />
                                            <span className="text-yellow-600">Saving in 2s...</span>
                                        </>
                                    )}
                                    {syncStatus === 'syncing' && (
                                        <>
                                            <CloudUpload className="w-4 h-4 text-blue-600 animate-pulse" />
                                            <span>Syncing...</span>
                                        </>
                                    )}
                                    {syncStatus === 'synced' && (
                                        <>
                                            <Cloud className="w-4 h-4 text-green-600" />
                                            <span>Synced</span>
                                        </>
                                    )}
                                    {syncStatus === 'error' && (
                                        <>
                                            <CloudOff className="w-4 h-4 text-red-600" />
                                            <span>Error</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-auto">
                        <Button
                            variant="outline"
                            size="sm"
                            className={getTabButtonClasses("editor")}
                            onClick={() => handleTabChange("editor")}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Editor
                        </Button>

                        {/* Project Documents Dropdown - Replaces Project Tab */}
                        <ProjectDocumentsDropdown
                            projectId={projectId}
                            currentDocumentId={documentId}
                        />

                        <Button
                            variant="outline"
                            size="sm"
                            className={getTabButtonClasses("history")}
                            onClick={() => handleTabChange("history")}
                        >
                            <History className="w-4 h-4 mr-2" />
                            History
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main content under fixed header */}
            <div className=" pt-20">
                {/* Document Menu (fixed under header) */}
                {showDocumentMenu && (
                    <div className="fixed top-20 left-0 right-0 z-30 bg-white border-b border-gray-200">
                        <DocumentMenu
                            onUpdate={setDocumentContent}
                            documentTitle={documentTitle}
                            editor={currentEditor}
                            documentContent={documentContent}
                            versionCount={versionCount}
                            context="main"
                            currentDocument={{
                                id: documentId,
                                Title: documentTitle,
                                Content: documentContent,
                                DocumentType: 'Document',
                                DocumentCategory: 'general',
                                Project_Id: 'current-project',
                                User_Id: 'current-user',
                                Created_Time: new Date(),
                                Updated_Time: new Date(),
                                IsDraft: true
                            }}
                            onToolbarToggle={setShowToolbar}
                            onNavigationPaneToggle={setShowNavigationPane}
                            documentId={documentId}
                        />
                    </div>
                )}

                {/* Spacer for fixed menu */}
                <div className="h-[56px]"></div>

                {/* 3-Column Layout Container - NavigationPane | DocumentEditor | ChatSidebar */}
                <div
                    className={
                        showDocumentMenu
                            ? "fixed left-0 right-0 bottom-0 top-[142px] flex"
                            : "fixed left-0 right-0 bottom-0 top-[90px] flex"
                    }
                >
                    {/* Navigation Pane Column - 15% width - Conditionally Rendered */}
                    {/* Only show NavigationPane on editor pages, not on history tab */}
                    {showNavigationPane && !isTabActive('history') && (
                        <div className="w-[15%] min-w-[200px] border-r border-gray-200 bg-gray-50/50 relative">
                            <NavigationPane
                                editor={currentEditor}
                                isOpen={true}
                                onClose={() => { }}
                            />
                            {/* Collapse button - Top right of NavigationPane */}
                            <button
                                onClick={() => {
                                    const newValue = !showNavigationPane;
                                    setShowNavigationPane(newValue);
                                    updateToolPreference('showNavigationPane', newValue);
                                }}
                                className={`absolute z-40 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-50 transition-all duration-200 flex items-center justify-center ${showDocumentMenu ? 'top-2' : 'top-2'} right-2`}
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    minWidth: '32px',
                                }}
                                title="Hide navigation pane"
                            >
                                <AlignJustify className="w-4 h-4 text-indigo-600" />
                            </button>
                        </div>
                    )}

                    {/* Expand button - Top left when collapsed (chatbar style) */}
                    {/* Only show expand button on editor pages, not on history tab */}
                    {!showNavigationPane && !isTabActive('history') && (
                        <button
                            onClick={() => {
                                const newValue = !showNavigationPane;
                                setShowNavigationPane(newValue);
                                updateToolPreference('showNavigationPane', newValue);
                            }}
                            className={`fixed z-40 bg-white border border-gray-300 rounded-lg shadow-md hover:bg-gray-50 transition-all duration-200 flex items-center justify-center left-2 ${showDocumentMenu ? 'top-[160px]' : 'top-[108px]'}`}
                            style={{
                                width: '32px',
                                height: '32px',
                                minWidth: '32px',
                            }}
                            title="Show navigation pane"
                        >
                            <AlignJustify className="w-4 h-4 text-indigo-600" />
                        </button>
                    )}

                    {/* Document Editor Column - Adjusts width based on NavigationPane and ChatSidebar */}
                    <div className="flex-1 overflow-auto custom-scrollbar bg-white pl-4">
                        {children}
                    </div>

                    {/* ChatSidebar Column - Same level as Document Editor - Conditionally Rendered */}
                    {/* Only show ChatSidebar on editor pages when open */}
                    {chatSidebarOpen && shouldShowChatBot() && (
                        <div className="w-[27%] border-l border-gray-200 bg-white flex-shrink-0 relative">
                            <div className="h-full">
                                <ChatSidebar
                                    open={chatSidebarOpen}
                                    onClose={() => {
                                        setChatSidebarOpen(false);
                                        setInitialChatMessage('');
                                        setSelectedTextForChat('');
                                    }}
                                    editor={currentEditor}
                                    initialMessage={initialChatMessage}
                                    repositoryInfo={repositoryInfo}
                                    selectedText={selectedTextForChat}
                                    onClearSelection={() => setSelectedTextForChat('')}
                                    suggestions={repositoryInfo ? [
                                        "Analyze repository structure",
                                        "Improve Document Structure",
                                        "Summarize my Document",
                                    ] : [
                                        "Improve document structure",
                                        "Review and enhance content",
                                        "Add supporting details",
                                    ]}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Fixed AI Chat Icon - Only show when chat sidebar is closed */}
            {!chatSidebarOpen && shouldShowChatBot() && (
                <Button
                    onClick={handleAIGenerate}
                    disabled={isAIGenerating}
                    className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg transition-all duration-200 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white flex items-center justify-center"
                    title="AI Assistant"
                >
                    {isAIGenerating ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                        <Sparkles className="w-6 h-6 text-white" />
                    )}
                </Button>
            )}
        </div>
    );
}