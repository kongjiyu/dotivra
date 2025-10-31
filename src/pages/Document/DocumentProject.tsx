import DocumentLayout from "./DocumentLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Download, ExternalLink, Clock, User, FolderOpen, Copy } from "lucide-react";
import { useDocument } from "@/context/DocumentContext";
import ImportModal from "@/components/Document/ImportModal";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { fetchDocumentWithProject } from "@/services/apiService";
import type { Document, Project } from "@/types";

// Types for better type safety
interface DocumentProjectData {
    currentDocument: Document;
    project: Project;
    relatedDocuments: Document[];
}

// Custom hooks for data fetching
const useDocumentProjectData = (documentId: string | undefined) => {
    const [data, setData] = useState<DocumentProjectData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadData = useCallback(async () => {
        if (!documentId) {
            setError('No document ID provided');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const result = await fetchDocumentWithProject(documentId);
            setData(result);
        } catch (err) {
            console.error('❌ Error loading document project data:', err);
            const error = err as Error;
            console.error('❌ Error details:', {
                message: error?.message,
                stack: error?.stack,
                cause: error?.cause
            });

            // Client-side fallback handling
            try {
                const { createMockDocument, mockProjects, getMockDocumentsByProject } = await import('@/utils/mockProjectData');
                const mockDocument = createMockDocument(documentId);
                const defaultProject = mockProjects[0];
                const mockRelatedDocuments = getMockDocumentsByProject(defaultProject.id!).filter(doc => doc.id !== documentId);
                setData({
                    currentDocument: mockDocument,
                    project: defaultProject,
                    relatedDocuments: mockRelatedDocuments
                });
                setError(null); // Clear error since we have fallback data
            } catch (mockError) {
                console.error('❌ Failed to load fallback data:', mockError);
                const error = err as Error;
                setError(`Failed to load document data: ${error?.message || 'Unknown error'}`);
            }
        } finally {
            setLoading(false);
        }
    }, [documentId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    return { data, loading, error, refetch: loadData };
};

// Component for project header
const ProjectHeader = ({ project, currentDocument }: { project: Project; currentDocument: Document }) => {
    const isMockData = project?.id?.startsWith('mock-') || currentDocument?.id?.startsWith('mock-doc-');

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FolderOpen className="w-5 h-5 text-blue-600" />
                    {project?.ProjectName || 'Unknown Project'}
                    {isMockData && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Demo Data
                        </span>
                    )}
                </CardTitle>
                <CardDescription>
                    {project?.Description || 'No description available'}
                    {isMockData && (
                        <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                            💡 This is sample data shown for demonstration purposes.
                        </div>
                    )}
                </CardDescription>
                {project?.GitHubRepo && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 mt-2">
                        <ExternalLink className="w-4 h-4" />
                        <a
                            href={project.GitHubRepo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline font-medium"
                        >
                            View on GitHub
                        </a>
                    </div>
                )}
            </CardHeader>
        </Card>
    );
};

export default function DocumentProject() {
    const { setDocumentContent } = useDocument();
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();

    const { data, loading, error } = useDocumentProjectData(documentId);

    const handleProjectImport = useCallback((content: string) => {
        setDocumentContent(content);
    }, [setDocumentContent]);

    const handleDocumentClick = useCallback((doc: Document) => {
        navigate(`/document/${doc.id}`);
    }, [navigate]);

    const handleNewDocument = useCallback(() => {
        navigate('/document/editor');
    }, [navigate]);

    const handleCopyUrl = useCallback(async (doc: Document) => {
        const url = `${window.location.origin}/document/${doc.id}`;
        try {
            await navigator.clipboard.writeText(url);
            // You could add a toast notification here
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    }, []);

    const handleExportDocument = useCallback((doc: Document) => {
        try {
            // Create a blob with the document content
            const content = doc.Content || '';
            const plainText = content.replace(/<[^>]*>/g, ''); // Remove HTML tags
            const blob = new Blob([plainText], { type: 'text/plain' });

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${doc.DocumentName || 'document'}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export document:', err);
        }
    }, []);

    if (loading) {
        return (
            <DocumentLayout showDocumentMenu={false}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading project documents...</p>
                    </div>
                </div>
            </DocumentLayout>
        );
    }

    if (error) {
        return (
            <DocumentLayout showDocumentMenu={false}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-md">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load project</h3>
                        <p className="text-gray-600 mb-2">{error}</p>
                        <p className="text-sm text-gray-500 mb-4">Document ID: {documentId}</p>
                        <div className="space-x-2">
                            <Button onClick={() => window.location.reload()} variant="outline">
                                Retry
                            </Button>
                            <Button onClick={() => window.history.back()} variant="outline">
                                Go Back
                            </Button>
                        </div>
                    </div>
                </div>
            </DocumentLayout>
        );
    }

    if (!data) {
        return (
            <DocumentLayout showDocumentMenu={false}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">No data available</h3>
                        <Button onClick={() => window.history.back()} variant="outline">
                            Go Back
                        </Button>
                    </div>
                </div>
            </DocumentLayout>
        );
    }

    const { currentDocument, project, relatedDocuments } = data;
    const totalDocuments = relatedDocuments.length + 1;

    return (
        <DocumentLayout showDocumentMenu={false}>
            <div className="h-full flex flex-col space-y-4">
                <ProjectHeader project={project} currentDocument={currentDocument} />

                <Card className="flex-1 overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center justify-between">
                            <span>Documents ({totalDocuments} total)</span>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={handleNewDocument}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Document
                                </Button>
                                <ImportModal onImport={handleProjectImport} />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-3">
                        {/* Current Document */}
                        <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                            onClick={() => handleDocumentClick(currentDocument)}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText className="w-4 h-4 text-gray-600" />
                                        <h4 className="font-semibold text-blue-900">
                                            {currentDocument.DocumentName}
                                        </h4>
                                        <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                                            Currently viewing
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                        {currentDocument.Content?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                    </p>
                                    <div className="flex items-center gap-4 text-xs text-gray-500">
                                        <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>Updated {new Date(currentDocument.Updated_Time).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            <span>{currentDocument.User_Id || 'Unknown'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2 ml-4">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleCopyUrl(currentDocument);
                                        }}
                                        title="Copy URL"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleExportDocument(currentDocument);
                                        }}
                                        title="Export Document"
                                    >
                                        <Download className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Related Documents */}
                        {relatedDocuments.map((doc) => (
                            <div key={doc.id}
                                className="p-4 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                                onClick={() => handleDocumentClick(doc)}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-gray-600" />
                                            <h4 className="font-semibold text-gray-900">
                                                {doc.DocumentName}
                                            </h4>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                            {doc.Content?.replace(/<[^>]*>/g, '').substring(0, 100)}...
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-gray-500">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>Updated {new Date(doc.Updated_Time).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                <span>{doc.User_Id || 'Unknown'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleCopyUrl(doc);
                                            }}
                                            title="Copy URL"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleExportDocument(doc);
                                            }}
                                            title="Export Document"
                                        >
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {relatedDocuments.length === 0 && (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                <p>No other documents in this project yet.</p>
                                <Button variant="outline" className="mt-4" onClick={handleNewDocument}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Document
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DocumentLayout>
    );
}