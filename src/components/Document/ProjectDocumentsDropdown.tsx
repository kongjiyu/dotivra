import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Folder, FileText, AlertCircle } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/apiConfig';
import { useDocument } from '@/context/DocumentContext';
import type { Document } from '@/types';

interface ProjectDocumentsDropdownProps {
    projectId?: string;
    currentDocumentId?: string;
}

export default function ProjectDocumentsDropdown({
    projectId,
    currentDocumentId
}: ProjectDocumentsDropdownProps) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const { setDocumentContent, setDocumentTitle, setCurrentEditor } = useDocument();

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!projectId) {
                setDocuments([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const response = await fetch(API_ENDPOINTS.projectDocuments(projectId));

                if (!response.ok) {
                    throw new Error('Failed to fetch documents');
                }

                const data = await response.json();
                const rawDocuments = Array.isArray(data) ? data : (data.documents || []);

                // Transform and filter out current document
                const transformedDocuments = rawDocuments
                    .map((doc: any) => ({
                        id: doc.id,
                        DocumentName: doc.Title || doc.DocumentName || 'Untitled Document',
                        DocumentType: doc.DocumentType || 'Document',
                        DocumentCategory: doc.DocumentCategory || 'General',
                        Project_Id: doc.ProjectId || doc.Project_Id,
                        Template_Id: doc.TemplateId || doc.Template_Id,
                        User_Id: doc.UserId || doc.User_Id,
                        Content: doc.Content || '',
                        Created_Time: doc.CreatedAt || doc.Created_Time,
                        Updated_Time: doc.UpdatedAt || doc.Updated_Time,
                        IsDraft: doc.IsDraft !== undefined ? doc.IsDraft : true,
                    }))
                    .filter((doc: Document) => doc.id !== currentDocumentId); // Exclude current document

                setDocuments(transformedDocuments);
            } catch (err) {
                console.error('Error fetching project documents:', err);
                setError(err instanceof Error ? err.message : 'Failed to fetch documents');
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [projectId, currentDocumentId]);

    const handleDocumentClick = (documentId: string) => {
        // Clear all document-related state before navigation
        setDocumentContent('');
        setDocumentTitle('Untitled Document');
        setCurrentEditor(null);

        // Navigate to new document
        navigate(`/document/${documentId}`);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-gray-900 hover:bg-gray-50"
                >
                    <Folder className="w-4 h-4 mr-2" />
                    Project Documents
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-96">
                <ScrollArea className="max-h-96">
                    {loading && (
                        <div className="p-4 text-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mx-auto"></div>
                            <p className="text-sm text-gray-500 mt-2">Loading documents...</p>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 text-center">
                            <AlertCircle className="w-5 h-5 text-red-500 mx-auto mb-2" />
                            <p className="text-sm text-red-600">Failed to fetch documents</p>
                        </div>
                    )}

                    {!loading && !error && !projectId && (
                        <div className="p-4 text-center">
                            <FileText className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No document associated with this project</p>
                        </div>
                    )}

                    {!loading && !error && projectId && documents.length === 0 && (
                        <div className="p-4 text-center">
                            <FileText className="w-5 h-5 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No other related document</p>
                        </div>
                    )}

                    {!loading && !error && documents.length > 0 && (
                        <>
                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                                Project Documents
                            </div>
                            <DropdownMenuSeparator />
                            {documents.map((doc) => (
                                <DropdownMenuItem
                                    key={doc.id}
                                    onClick={() => doc.id && handleDocumentClick(doc.id)}
                                    className="cursor-pointer flex items-start gap-2 p-3"
                                >
                                    <FileText className="w-4 h-4 mt-0.5 text-blue-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900 truncate">
                                            {doc.DocumentName}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {doc.DocumentCategory}
                                        </div>
                                    </div>
                                </DropdownMenuItem>
                            ))}
                        </>
                    )}
                </ScrollArea>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
