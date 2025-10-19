import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { loadToolsPreferences } from '@/utils/documentToolsPreferences';

interface DocumentContextType {
    documentTitle: string;
    setDocumentTitle: (title: string) => void;
    documentContent: string;
    setDocumentContent: (content: string) => void;
    summaryContent: string;
    setSummaryContent: (content: string) => void;
    currentEditor: any;
    setCurrentEditor: (editor: any) => void;
    isDocumentModified: boolean;
    setIsDocumentModified: (modified: boolean) => void;
    documentId?: string;
    setDocumentId: (id: string) => void;
    projectId?: string;
    setProjectId: (id: string) => void;
    repositoryInfo?: { owner: string; repo: string };
    setRepositoryInfo: (info: { owner: string; repo: string } | undefined) => void;
    onOpenChat?: (message?: string) => void;
    setOnOpenChat: (fn: (message?: string) => void) => void;
    showAIActions?: (content: string, beforeContent: string) => void;
    setShowAIActions: (fn: (content: string, beforeContent: string) => void) => void;
    chatSidebarOpen: boolean;
    setChatSidebarOpen: (open: boolean) => void;
    showToolbar: boolean;
    setShowToolbar: (show: boolean) => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

interface DocumentProviderProps {
    children: ReactNode;
}

export function DocumentProvider({ children }: DocumentProviderProps) {
    const [documentTitle, setDocumentTitle] = useState<string>('Untitled Document');
    const [documentContent, setDocumentContent] = useState<string>('');
    const [summaryContent, setSummaryContent] = useState<string>('');
    const [currentEditor, setCurrentEditor] = useState<any>(null);
    const [isDocumentModified, setIsDocumentModified] = useState<boolean>(false);
    const [documentId, setDocumentId] = useState<string>('');
    const [projectId, setProjectId] = useState<string>('');
    const [repositoryInfo, setRepositoryInfo] = useState<{ owner: string; repo: string } | undefined>(undefined);
    const [onOpenChat, setOnOpenChat] = useState<((message?: string) => void) | undefined>(undefined);
    const [showAIActions, setShowAIActions] = useState<((content: string, beforeContent: string) => void) | undefined>(undefined);
    const [chatSidebarOpen, setChatSidebarOpen] = useState<boolean>(false);
    const [showToolbar, setShowToolbar] = useState<boolean>(true);

    // Load tool preferences from cookies on mount
    useEffect(() => {
        const prefs = loadToolsPreferences();
        setShowToolbar(prefs.showToolbar);
    }, []);

    const handleTitleChange = (title: string) => {
        setDocumentTitle(title);
        setIsDocumentModified(true);
    };

    const handleContentChange = (content: string) => {
        setDocumentContent(content);
        setIsDocumentModified(true);
    };

    const handleSummaryChange = (content: string) => {
        setSummaryContent(content);
        setIsDocumentModified(true);
    };

    const value: DocumentContextType = {
        documentTitle,
        setDocumentTitle: handleTitleChange,
        documentContent,
        setDocumentContent: handleContentChange,
        summaryContent,
        setSummaryContent: handleSummaryChange,
        currentEditor,
        setCurrentEditor,
        isDocumentModified,
        setIsDocumentModified,
        documentId,
        setDocumentId,
        projectId,
        setProjectId,
        repositoryInfo,
        setRepositoryInfo,
        onOpenChat,
        setOnOpenChat,
        showAIActions,
        setShowAIActions,
        chatSidebarOpen,
        setChatSidebarOpen,
        showToolbar,
        setShowToolbar,
    };

    return (
        <DocumentContext.Provider value={value}>
            {children}
        </DocumentContext.Provider>
    );
}

export function useDocument() {
    const context = useContext(DocumentContext);
    if (context === undefined) {
        throw new Error('useDocument must be used within a DocumentProvider');
    }
    return context;
}

export default DocumentContext;