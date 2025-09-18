import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

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