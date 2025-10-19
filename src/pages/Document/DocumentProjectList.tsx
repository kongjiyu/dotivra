import DocumentLayout from "./DocumentLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Plus, Copy, CheckCircle, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Simplified mock document data
const mockDocuments = [
    {
        id: 'doc-1',
        DocumentName: 'Project Requirements',
        Description: 'Comprehensive requirements and specifications for the AI content generation platform.',
        RoleType: 'Technical Specification',
        lastUpdated: new Date('2024-03-10')
    },
    {
        id: 'doc-2',
        DocumentName: 'API Documentation',
        Description: 'Complete API reference and integration guide for developers.',
        RoleType: 'Developer Guide',
        lastUpdated: new Date('2024-03-08')
    },
    {
        id: 'doc-3',
        DocumentName: 'User Interface Design',
        Description: 'UI/UX design specifications and component library documentation.',
        RoleType: 'Design Document',
        lastUpdated: new Date('2024-03-05')
    },
    {
        id: 'doc-4',
        DocumentName: 'Database Schema',
        Description: 'Database design, relationships, and data model specifications.',
        RoleType: 'Technical Architecture',
        lastUpdated: new Date('2024-03-01')
    },
    {
        id: 'doc-5',
        DocumentName: 'Deployment Guide',
        Description: 'Step-by-step deployment instructions and environment setup.',
        RoleType: 'Operations Manual',
        lastUpdated: new Date('2024-02-28')
    },
    {
        id: 'doc-6',
        DocumentName: 'Business Requirements',
        Description: 'Business objectives, user stories, and functional requirements.',
        RoleType: 'Business Document',
        lastUpdated: new Date('2024-03-05')
    },
    {
        id: 'doc-7',
        DocumentName: 'Testing Strategy',
        Description: 'Test plans, automation strategies, and quality assurance procedures.',
        RoleType: 'QA Documentation',
        lastUpdated: new Date('2024-03-03')
    },
    {
        id: 'doc-8',
        DocumentName: 'Security Guidelines',
        Description: 'Security best practices, authentication, and data protection measures.',
        RoleType: 'Security Policy',
        lastUpdated: new Date('2024-03-01')
    }
];

interface DocumentCardProps {
    document: typeof mockDocuments[0];
    onDocumentClick: (documentId: string) => void;
}

const DocumentCard = ({ document, onDocumentClick }: DocumentCardProps) => {
    const [copySuccess, setCopySuccess] = useState(false);

    const handleCopyUrl = useCallback(async (e: React.MouseEvent) => {
        e.stopPropagation();
        const url = `${window.location.origin}/document/${document.id}`;
        try {
            await navigator.clipboard.writeText(url);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    }, [document.id]);

    const handleExportMd = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // Create markdown content
            const content = `# ${document.DocumentName}\n\n**Role Type:** ${document.RoleType}\n\n**Description:** ${document.Description}\n\n**Last Updated:** ${document.lastUpdated.toLocaleDateString()}\n\n---\n\n*Document content would appear here in a real application.*`;
            const blob = new Blob([content], { type: 'text/markdown' });

            // Create download link
            const url = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${document.DocumentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export as Markdown:', err);
        }
    }, [document]);

    const handleExportPdf = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            // For demo purposes, create a text file since PDF generation requires additional libraries
            const content = `${document.DocumentName}\n\nRole Type: ${document.RoleType}\n\nDescription: ${document.Description}\n\nLast Updated: ${document.lastUpdated.toLocaleDateString()}\n\n---\n\nDocument content would appear here in a real application.`;
            const blob = new Blob([content], { type: 'text/plain' });

            const url = URL.createObjectURL(blob);
            const a = window.document.createElement('a');
            a.href = url;
            a.download = `${document.DocumentName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf.txt`;
            window.document.body.appendChild(a);
            a.click();
            window.document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Failed to export as PDF:', err);
        }
    }, [document]);

    return (
        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer" onClick={() => onDocumentClick(document.id)}>
            <CardHeader className="">
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="flex-1 truncate">{document.DocumentName}</span>
                </CardTitle>
                <CardDescription className="text-sm text-gray-600">
                    {document.Description}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                {/* Role Type and Actions on same line */}
                <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        {document.RoleType}
                    </span>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        {/* Share Button - Icon Only */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyUrl}
                            title="Share document"
                            className="h-8 w-8 p-0"
                        >
                            {copySuccess ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                                <Copy className="w-4 h-4" />
                            )}
                        </Button>

                        {/* Export Dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    title="Export document"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Download className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                                <DropdownMenuItem onClick={handleExportMd}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Markdown
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleExportPdf}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    PDF
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default function DocumentProjectList() {
    const navigate = useNavigate();

    const handleDocumentClick = useCallback((documentId: string) => {
        navigate(`/document/${documentId}`);
    }, [navigate]);

    const handleNewDocument = useCallback(() => {
        navigate('/document/editor');
    }, [navigate]);

    return (
        <DocumentLayout showDocumentMenu={false}>
            <div className="h-full flex flex-col space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Project Name Here</h1>
                    </div>
                    <Button onClick={handleNewDocument}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Document
                    </Button>
                </div>

                {/* Demo Notice */}
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-700">
                        <FileText className="w-5 h-5" />
                        <h3 className="font-medium">Demo Documents</h3>
                    </div>
                    <p className="text-sm text-blue-600 mt-1">
                        These are sample documents for demonstration. Each card shows the document name, description, role type, and export actions.
                    </p>
                </div>

                {/* Documents Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
                    {mockDocuments.map((document) => (
                        <DocumentCard
                            key={document.id}
                            document={document}
                            onDocumentClick={handleDocumentClick}
                        />
                    ))}
                </div>

                {/* Empty State (fallback) */}
                {mockDocuments.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center max-w-md">
                            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">No documents found</h3>
                            <p className="text-gray-600 mb-6">
                                Create your first document to get started with your project.
                            </p>
                            <Button onClick={handleNewDocument}>
                                <Plus className="w-4 h-4 mr-2" />
                                Create First Document
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </DocumentLayout>
    );
}