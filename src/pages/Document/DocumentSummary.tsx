import { useEffect, useState } from "react";
import DocumentLayout from "./DocumentLayout";
import TipTap from "@/components/document/TipTap";
import { useDocument } from "@/context/DocumentContext";
import { fetchDocument } from "@/services/apiService";

export default function DocumentSummary() {
    const {
        summaryContent,
        setSummaryContent,
        setCurrentEditor,
        documentId
    } = useDocument();
    const [, setIsLoadingSummary] = useState(false);

    // Fetch summary from Firebase
    useEffect(() => {
        const loadSummary = async () => {
            if (!documentId || summaryContent) {
                return; // Skip if no document ID or summary already loaded
            }

            setIsLoadingSummary(true);
            try {
                const documentData = await fetchDocument(documentId);
                if (documentData && documentData.Summary) {
                    setSummaryContent(documentData.Summary);
                }
                // If Summary is empty/undefined, remain empty (per user requirement)
            } catch (error) {
                console.error('Error loading summary from Firebase:', error);
                // Remain empty on error (per user requirement: "if unable to fetch remain empty")
            } finally {
                setIsLoadingSummary(false);
            }
        };

        loadSummary();
    }, [documentId, summaryContent, setSummaryContent]);

    const handleSummaryUpdate = async (content: string) => {
        setSummaryContent(content);

        // Auto-save summary to Firebase
        if (documentId) {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/documents/${documentId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        Summary: content,
                    }),
                });

                if (!response.ok) {
                    console.error('Failed to save summary:', response.status, await response.text());
                }
            } catch (error) {
                console.error('Error saving summary to Firebase:', error);
            }
        }
    };

    const handleSummaryEditorReady = (editor: any) => {
        setCurrentEditor(editor);
    };

    return (
        <DocumentLayout showDocumentMenu={true}>

            {/* Summary Editor */}
            <TipTap
                initialContent={summaryContent || "Document summary will appear here..."}
                onUpdate={handleSummaryUpdate}
                onEditorReady={handleSummaryEditorReady}
                className="min-h-[500px]"
            />
        </DocumentLayout>
    );
}
