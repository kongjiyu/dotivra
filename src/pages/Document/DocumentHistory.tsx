import DocumentLayout from "./DocumentLayout";
import VersionHistory from "@/components/Document/VersionHistory";
import { useParams } from "react-router-dom";
import { useDocument } from "@/context/DocumentContext";
import { useState } from "react";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { useAuth } from "@/context/AuthContext";

/**
 * DocumentHistory Component
 * 
 * ⚠️ IMPORTANT: Version history only tracks the Editor content (Content field),
 * NOT the Summary tab content (Summary field). This component is only accessible
 * from the Editor tab and is hidden when viewing the Summary tab.
 * 
 * Version history saves snapshots of document.Content field to the DocumentHistory
 * collection via the backend saveVersion function.
 */
export default function DocumentHistory() {
    const { documentId: urlDocId } = useParams<{ documentId: string }>();
    const { documentContent, documentId: contextDocId } = useDocument();
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
            // Force a full page reload to ensure all data (title, content, project docs) is fresh
            // Using window.location.href instead of navigate ensures complete remount
            window.location.href = `/document/${documentId}`;
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
                    documentId={documentId}
                    currentContent={documentContent || ""}
                    onRestoreVersion={handleRestoreVersion}
                    onPreviewVersion={handlePreviewVersion}
                />
            </div>
        </DocumentLayout>
    );
}