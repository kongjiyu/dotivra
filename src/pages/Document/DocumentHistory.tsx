import DocumentLayout from "./DocumentLayout";
import VersionHistory from "@/components/Document/VersionHistory";
import { useNavigate, useParams } from "react-router-dom";
import { useDocument } from "@/context/DocumentContext";
import { useState } from "react";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { useAuth } from "@/context/AuthContext";

export default function DocumentHistory() {
    const navigate = useNavigate();
    const { documentId: urlDocId } = useParams<{ documentId: string }>();
    const { documentContent, setDocumentContent, documentId: contextDocId } = useDocument();
    const { user } = useAuth();
    const [isRestoring, setIsRestoring] = useState(false);
    
    // Use URL documentId first, fallback to context
    const documentId = urlDocId || contextDocId;

    const handleRestoreVersion = async (content: string) => {
        if (!documentId) {
            console.error('No document ID available for restore');
            return;
        }

        try {
            setIsRestoring(true);
            console.log('🔄 Restoring version for document:', documentId);

            // Update document in database
            const response = await fetch(API_ENDPOINTS.document(documentId), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: content,
                    EditedBy: user?.uid || 'anonymous',
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to restore version: ${response.status}`);
            }

            console.log('✅ Version restored successfully');

            // Update context with restored content
            setDocumentContent(content);
            
            // Navigate back to editor with skipFetch flag to prevent overwriting
            navigate(`/document/${documentId}`, {
                state: { skipFetch: true }
            });
        } catch (error) {
            console.error('❌ Error restoring version:', error);
            alert('Failed to restore version. Please try again.');
        } finally {
            setIsRestoring(false);
        }
    };

    const handlePreviewVersion = (_content: string) => {
        // Could implement preview functionality
    };

    return (
        <DocumentLayout showDocumentMenu={false}>
            <div className="h-full">
                {isRestoring && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 shadow-xl">
                            <div className="flex items-center gap-3">
                                <div className="h-6 w-6 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                                <p className="text-lg font-medium">Restoring version...</p>
                            </div>
                        </div>
                    </div>
                )}
                <VersionHistory
                    currentContent={documentContent || ""}
                    onRestoreVersion={handleRestoreVersion}
                    onPreviewVersion={handlePreviewVersion}
                />
            </div>
        </DocumentLayout>
    );
}