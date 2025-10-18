import { useState, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    History,
    Cloud,
    FileText,
    FolderOpen,
    Dock,
    Folder,
    Sparkles
} from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import DocumentMenu from "@/components/document/DocumentMenu";
import ChatSidebar from "@/components/document/ChatSidebar";
import SimpleShare from "@/components/document/SimpleShare";
import { useDocument } from "@/context/DocumentContext";

interface DocumentLayoutProps {
    children: ReactNode;
    showDocumentMenu?: boolean;
}

export default function DocumentLayout({
    children,
    showDocumentMenu = true
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
        documentId
    } = useDocument();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [initialChatMessage, setInitialChatMessage] = useState<string>('');
    const navigate = useNavigate();
    const location = useLocation();

    // Helper function to check if current page should show ChatBot
    const shouldShowChatBot = () => {
        const path = location.pathname;
        return path.includes('/document/editor') ||
            path.includes('/document/summary') ||
            (path.includes('/document/') &&
                !path.includes('/project') &&
                !path.includes('/history'));
    };

    // Close chat sidebar when navigating away from editor/summary pages
    useEffect(() => {
        if (!shouldShowChatBot() && chatSidebarOpen) {
            setChatSidebarOpen(false);
        }
    }, [location.pathname, chatSidebarOpen, setChatSidebarOpen]);

    // Helper function to determine if a tab is active based on current location
    const isTabActive = (tabName: string) => {
        const path = location.pathname;
        switch (tabName) {
            case 'editor':
                return path.includes('/document/editor') || (path.includes('/document/') && !path.includes('/summary') && !path.includes('/project') && !path.includes('/history'));
            case 'summary':
                return path.includes('/summary');
            case 'project':
                return path.includes('/project');
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
        const chatFunction = (message?: string) => {

            if (message && message.trim()) {
                setInitialChatMessage(message);

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
            case 'summary':
                navigate(`${basePath}/summary`);
                break;
            case 'project':
                if (documentId) {
                    navigate(`${basePath}/project/${documentId}`);
                } else {
                    navigate(`${basePath}/project`);
                }
                break;
            case 'history':
                navigate(`${basePath}/history`);
                break;
            default:
                if (documentId) {
                    navigate(`${basePath}/${documentId}`);
                } else {
                    navigate(`${basePath}/editor`);
                }
        }
    };

    const handleTitleChange = (newTitle: string) => {
        setDocumentTitle(newTitle);
    };

    const handleAIGenerate = () => {
        setChatSidebarOpen(!chatSidebarOpen);
        setIsAIGenerating(true);
        setTimeout(() => setIsAIGenerating(false), 600);
    };

    const handleSaveAsTemplate = async () => {
        try {
            const { saveDocumentAsTemplate, showNotification } = await import('@/services/documentService');

            const documentToSave = {
                id: documentId,
                DocumentName: documentTitle,
                Content: documentContent,
                DocumentType: 'Document',
                DocumentCategory: 'general',
                Project_Id: 'current-project',
                User_Id: 'current-user',
                Created_Time: new Date(),
                Updated_Time: new Date(),
                IsDraft: true
            };

            const template = await saveDocumentAsTemplate(documentToSave);
            showNotification(`Template "${template.TemplateName}" created successfully!`, 'success');
        } catch (error) {
            console.error('Error creating template:', error);
        }
    };

    const handleCopyDocument = async () => {
        try {
            const { copyDocument, showNotification } = await import('@/services/documentService');

            const documentToCopy = {
                id: documentId,
                DocumentName: documentTitle,
                Content: documentContent,
                DocumentType: 'Document',
                DocumentCategory: 'general',
                Project_Id: 'current-project',
                User_Id: 'current-user',
                Created_Time: new Date(),
                Updated_Time: new Date(),
                IsDraft: true
            };

            const copiedDoc = await copyDocument(documentToCopy);
            showNotification(`Document copy "${copiedDoc.DocumentName}" created successfully!`, 'success');
        } catch (error) {
            console.error('Error copying document:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header (fixed) */}
            <div className="fixed top-0 left-0 right-0 z-40 h-20 bg-white border-b border-gray-200 px-6 flex items-center">
                <div className="flex items-center w-full">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center gap-3">
                            {/* Home button */}
                            <Button asChild variant="ghost" size="icon" className="h-12 w-12">
                                <Link to="/dashboard">
                                    <FolderOpen className="h-9 w-9 text-blue-600" />
                                </Link>
                            </Button>

                            {/* Editable Document Title */}
                            {isEditingTitle ? (
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
                                    className="!text-xl !font-semibold text-gray-900 cursor-pointer hover:text-gray-700 transition-colors max-w-xl truncate"
                                    onClick={() => setIsEditingTitle(true)}
                                    title="Click to edit title"
                                >
                                    {documentTitle}
                                </h1>
                            )}

                            <div className="flex items-center gap-1 text-sm text-gray-500">
                                <Cloud className="w-4 h-4 text-green-600" />
                                <span>Synced</span>
                            </div>
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
                        <Button
                            variant="outline"
                            size="sm"
                            className={getTabButtonClasses("summary")}
                            onClick={() => handleTabChange("summary")}
                        >
                            <Dock className="w-4 h-4 mr-2" />
                            Summary
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className={getTabButtonClasses("project")}
                            onClick={() => handleTabChange("project")}
                        >
                            <Folder className="w-4 h-4 mr-2" />
                            Projects
                        </Button>
                        <div className="w-px h-5 bg-gray-300 mx-1 border-b"></div>

                        <Button
                            variant="outline"
                            size="sm"
                            className={getTabButtonClasses("history")}
                            onClick={() => handleTabChange("history")}
                        >
                            <History className="w-4 h-4 mr-2" />
                            History
                        </Button>
                        <SimpleShare
                            documentTitle={documentTitle}
                            documentId={documentId}
                        />
                    </div>
                </div>
            </div>

            {/* Main content under fixed header */}
            <div className="pt-20">
                {/* Document Menu (fixed under header) */}
                {showDocumentMenu && (
                    <div className="fixed top-20 left-0 right-0 z-30 bg-white border-b border-gray-200">
                        <DocumentMenu
                            onUpdate={setDocumentContent}
                            onSaveAsTemplate={handleSaveAsTemplate}
                            onCopyDocument={handleCopyDocument}
                            documentTitle={documentTitle}
                            editor={currentEditor}
                            documentContent={documentContent}
                            context="main"
                            currentDocument={{
                                id: documentId,
                                DocumentName: documentTitle,
                                Content: documentContent,
                                DocumentType: 'Document',
                                DocumentCategory: 'general',
                                Project_Id: 'current-project',
                                User_Id: 'current-user',
                                Created_Time: new Date(),
                                Updated_Time: new Date(),
                                IsDraft: true
                            }}
                        />
                    </div>
                )}

                {/* Spacer for fixed menu */}
                <div className="h-[56px]"></div>

                {/* Page Content */}

                <div
                    className={
                        showDocumentMenu ? "fixed left-0 right-0 bottom-0 overflow-auto p-4 custom-scrollbar top-[152px]" : "fixed left-0 right-0 bottom-0 overflow-auto p-4 custom-scrollbar top-[100px]"
                    }
                >
                    {children}
                </div>
            </div>

            {/* Fixed Chat Sidebar overlay */}
            <div className={`fixed top-[136px] right-0 h-[calc(100vh-136px)] w-[28rem] border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 z-20 ${chatSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="h-full p-4">
                    <ChatSidebar
                        open={chatSidebarOpen}
                        onClose={() => {
                            setChatSidebarOpen(false);
                            setInitialChatMessage('');
                        }}
                        editor={currentEditor}
                        initialMessage={initialChatMessage}
                        repositoryInfo={repositoryInfo}
                        suggestions={repositoryInfo ? [
                            "Analyze repository structure",
                            "Explain codebase patterns",
                            "Improve React components",
                            "Debug authentication flow",
                        ] : [
                            "Strengthen success metrics",
                            "Review executive summary",
                            "Add competitor analysis",
                            "Outline next steps",
                        ]}
                    />
                </div>
            </div>

            {/* Fixed AI Chat Icon - Only show on editor and summary pages */}
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