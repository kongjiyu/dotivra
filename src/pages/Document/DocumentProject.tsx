import DocumentLayout from "./DocumentLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Download, ExternalLink, Clock, User } from "lucide-react";
import { useDocument } from "@/context/DocumentContext";
import SimpleShare from "@/components/document/SimpleShare";
import ImportModal from "@/components/document/ImportModal";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { fetchDocumentWithProject } from "@/services/apiService";
import type { Document, Project } from "@/types";

export default function DocumentProject() {
    const { setDocumentContent } = useDocument();
    const { documentId } = useParams<{ documentId: string }>();
    const navigate = useNavigate();

    // State for fetched data
    const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
    const [project, setProject] = useState<Project | null>(null);
    const [relatedDocuments, setRelatedDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch document and related project data
    useEffect(() => {
        const loadDocumentData = async () => {
            if (!documentId) {
                setError('No document ID provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                // Always try to fetch real data first, but fall back to mock data immediately on any error
                const data = await fetchDocumentWithProject(documentId);

                setCurrentDocument(data.currentDocument);
                setProject(data.project);
                setRelatedDocuments(data.relatedDocuments);

                // Update document context with current document title
                if (data.currentDocument.DocumentName) {
                    // Note: We don't automatically update the document content here
                    // as this is meant to be a project overview page, not an editor
                }

            } catch (err) {
                console.error('❌ Error loading document project data, falling back to mock data:', err);

                // Import and use mock data as fallback
                try {
                    const { createMockDocument, mockProjects, getMockDocumentsByProject } = await import('@/utils/mockProjectData');

                    const mockDocument = createMockDocument(documentId);
                    const defaultProject = mockProjects[0];
                    const mockRelatedDocuments = getMockDocumentsByProject(defaultProject.id!).filter(doc => doc.id !== documentId);

                    setCurrentDocument(mockDocument);
                    setProject(defaultProject);
                    setRelatedDocuments(mockRelatedDocuments);

                } catch (mockError) {
                    console.error('❌ Failed to load mock data:', mockError);
                    setError('Failed to load document data and mock data is unavailable');
                }
            } finally {
                setLoading(false);
            }
        };

        loadDocumentData();
    }, [documentId]);

    const handleProjectImport = (content: string, title: string) => {
        setDocumentContent(content);
    };

    const handleDocumentClick = (doc: Document) => {
        // Navigate to the document editor
        navigate(`/document/${doc.id}`);
    };

    const formatDate = (dateString: string | Date) => {
        try {
            const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return 'Unknown date';
        }
    };

    // Loading state
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

    // Error state
    if (error) {
        return (
            <DocumentLayout showDocumentMenu={false}>
                <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to load project</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <Button onClick={() => window.history.back()} variant="outline">
                            Go Back
                        </Button>
                    </div>
                </div>
            </DocumentLayout>
        );
    }

    return (
        <DocumentLayout showDocumentMenu={false}>
            <div className="h-full flex flex-col space-y-3">
                {/* Project Header */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="w-5 h-5" />
                            Project: {project?.ProjectName || 'Unknown Project'}
                            {(project?.id?.startsWith('mock-') || currentDocument?.id?.startsWith('mock-doc-')) && (
                                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full ml-2">
                                    Demo Data
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            {project?.Description || 'No description available'}
                            {(project?.id?.startsWith('mock-') || currentDocument?.id?.startsWith('mock-doc-')) && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
                                    💡 This is sample data shown because the requested document was not found in the database.
                                    It demonstrates the structure and features of the documentation system.
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
                                    className="hover:underline"
                                >
                                    View on GitHub
                                </a>
                            </div>
                        )}
                    </CardHeader>
                </Card>

                {/* Documents List */}
                <Card className="flex-1 overflow-hidden">
                    <CardHeader>
                        <CardTitle className="text-lg">
                            Documents ({relatedDocuments.length + 1} total)
                        </CardTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                New Document
                            </Button>
                            <ImportModal onImport={handleProjectImport} />
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-3">
                        {/* Current Document (highlighted) */}
                        {currentDocument && (
                            <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-semibold text-blue-900">
                                                {currentDocument.DocumentName}
                                            </h4>
                                            <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full">
                                                Currently viewing
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-blue-700">
                                            <div className="flex items-center gap-1">
                                                <User className="w-3 h-3" />
                                                <span>{currentDocument.DocumentCategory}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>
                                                    Updated {formatDate(currentDocument.Updated_Time || currentDocument.Created_Time)}
                                                </span>
                                            </div>
                                            {currentDocument.IsDraft && (
                                                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">
                                                    Draft
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <SimpleShare
                                            documentTitle={currentDocument.DocumentName}
                                            documentId={currentDocument.id}
                                        />
                                        <Button variant="ghost" size="sm" title="Export document">
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Related Documents */}
                        {relatedDocuments.length > 0 ? (
                            relatedDocuments.map((doc) => (
                                <div
                                    key={doc.id}
                                    onClick={() => handleDocumentClick(doc)}
                                    className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-medium">{doc.DocumentName}</h4>
                                                {doc.IsDraft && (
                                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-3 h-3" />
                                                    <span>{doc.DocumentCategory}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    <span>
                                                        Updated {formatDate(doc.Updated_Time || doc.Created_Time)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <ExternalLink className="w-4 h-4 text-gray-400" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>No other documents in this project</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DocumentLayout>
    );
}
