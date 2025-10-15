import { useState, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    History,
    Cloud,
    MessageCircle,
    FileText,
    FolderOpen,
    Dock,
    Folder
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DocumentMenu from "@/components/Document/DocumentMenu";
import ChatSidebar from "@/components/Document/ChatSidebar";
import SimpleShare from "@/components/Document/SimpleShare";
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
        repositoryInfo
    } = useDocument();
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [isAIGenerating, setIsAIGenerating] = useState(false);
    const [initialChatMessage, setInitialChatMessage] = useState<string>('');
    const navigate = useNavigate();

    // Remove the local chatOpen state and use context instead

    useEffect(() => {
        const chatFunction = (message?: string) => {
            console.log('DocumentLayout onOpenChat called with:', message);
            if (message) {
                setInitialChatMessage(message);
            }
            setChatSidebarOpen(true);
            console.log('Chat should now be open, chatSidebarOpen state:', true);
        };

        console.log('Setting up onOpenChat function in DocumentLayout');
        setOnOpenChat(chatFunction);
    }, [setOnOpenChat, setChatSidebarOpen]);

    const handleTabChange = (tab: string) => {
        const basePath = '/document';
        switch (tab) {
            case 'editor':
                navigate(`${basePath}/editor`);
                break;
            case 'summary':
                navigate(`${basePath}/summary`);
                break;
            case 'project':
                navigate(`${basePath}/project`);
                break;
            case 'history':
                navigate(`${basePath}/history`);
                break;
            case 'share':
                navigate(`${basePath}/share`);
                break;
            default:
                navigate(`${basePath}/editor`);
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

    const handleSaveAsTemplate = () => {
        console.log("Saving document as template...");
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
                            className="text-gray-900"
                            onClick={() => handleTabChange("editor")}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Editor
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-900"
                            onClick={() => handleTabChange("summary")}
                        >
                            <Dock className="w-4 h-4 mr-2" />
                            Summary
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-900"
                            onClick={() => handleTabChange("project")}
                        >
                            <Folder className="w-4 h-4 mr-2" />
                            Projects
                        </Button>
                        <div className="w-px h-5 bg-gray-300 mx-1 border-b"></div>

                        <Button
                            variant="outline"
                            size="sm"
                            className="text-gray-900"
                            onClick={() => handleTabChange("history")}
                        >
                            <History className="w-4 h-4 mr-2" />
                            History
                        </Button>
                        <SimpleShare
                            documentTitle={documentTitle}
                            documentId="main-doc-123"
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
                            documentTitle={documentTitle}
                            editor={currentEditor}
                            documentContent={documentContent}
                            context="main"
                        />
                    </div>
                )}

                {/* Spacer for fixed menu */}
                <div className="h-[56px]"></div>

                {/* Page Content */}

                <div
                    className={
                        showDocumentMenu ? "fixed left-0 right-0 bottom-0 overflow-auto p-4 custom-scrollbar top-[192px]" : "fixed left-0 right-0 bottom-0 overflow-auto p-4 custom-scrollbar top-[100px]"
                    }>
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

            {/* Fixed AI Chat Icon */}
            {!chatSidebarOpen && (
                <Button
                    onClick={handleAIGenerate}
                    disabled={isAIGenerating}
                    className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg transition-all duration-200 bg-purple-500 hover:bg-purple-600 text-white"
                    title="AI Assistant"
                >
                    {isAIGenerating ? (
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    ) : (
                        <MessageCircle className="w-6 h-6" />
                    )}
                </Button>
            )}
        </div>
    );
}