import { useEffect, useState, useRef } from "react";
import { useParams, useLocation } from "react-router-dom";
import DocumentLayout from "./DocumentLayout";
import TipTap from "@/components/document/TipTap";
import { useDocument } from "@/context/DocumentContext";
import { fetchDocument } from "@/services/apiService";
import { useDocumentSync } from "@/hooks/useDocumentSync";

export default function DocumentSummary() {
    const { documentId: urlDocumentId } = useParams<{ documentId: string }>();
    const location = useLocation();
    const {
        summaryContent,
        setSummaryContent,
        setCurrentEditor,
        documentId: contextDocumentId,
        setDocumentId,
        showToolbar,
        onOpenChat
    } = useDocument();
    const [, setIsLoadingSummary] = useState(false);

    // Ref to track current content and prevent unnecessary re-renders
    const summaryContentRef = useRef(summaryContent);

    // Use URL documentId if available, otherwise use context
    const activeDocumentId = urlDocumentId || contextDocumentId;

    // Update ref when summaryContent changes
    useEffect(() => {
        summaryContentRef.current = summaryContent;
    }, [summaryContent]);

    // Update context documentId if URL has one
    useEffect(() => {
        if (urlDocumentId && urlDocumentId !== contextDocumentId) {
            setDocumentId(urlDocumentId);
        }
    }, [urlDocumentId, contextDocumentId, setDocumentId]);

    // WebSocket sync hook for summary (separate channel from editor)
    const { syncStatus, sendUpdate } = useDocumentSync({
        documentId: activeDocumentId || '',
        channel: 'summary', // Use 'summary' channel
        onUpdate: (content) => {
            // Received summary update from another client
            // Only update if content is different to prevent re-render loops
            if (content !== summaryContentRef.current) {
                setSummaryContent(content);
            }
        },
    });

    // Load summary when documentId changes
    useEffect(() => {
        const loadSummary = async () => {
            if (!activeDocumentId) {
                return;
            }

            // Check if we have document data passed through navigation state
            const navigationState = location.state as { documentData?: any } | null;
            if (navigationState?.documentData) {
                const documentData = navigationState.documentData;
                if (documentData.Summary) {
                    setSummaryContent(documentData.Summary);
                }
                return;
            }

            // Otherwise fetch from Firebase
            setIsLoadingSummary(true);
            try {
                const documentData = await fetchDocument(activeDocumentId);
                if (documentData && documentData.Summary) {
                    setSummaryContent(documentData.Summary);
                }
            } catch (error) {
                console.error('Error loading summary from Firebase:', error);
            } finally {
                setIsLoadingSummary(false);
            }
        };

        loadSummary();
    }, [activeDocumentId, location.state, setSummaryContent]);

    const handleSummaryUpdate = async (content: string) => {
        // Update the ref immediately for comparison purposes
        // Note: We don't call setSummaryContent here because:
        // 1. TipTap already has the content (user is typing)
        // 2. Calling setSummaryContent would change initialContent prop
        // 3. Which would trigger TipTap's useEffect and call setContent()
        // 4. Which would interrupt the user's typing
        summaryContentRef.current = content;

        // Send update via WebSocket with debouncing
        // Channel is already set to 'summary' in useDocumentSync options
        if (activeDocumentId) {
            sendUpdate(content);
        }
    };

    const handleSummaryEditorReady = (editor: any) => {
        setCurrentEditor(editor);
    };

    return (
        <DocumentLayout showDocumentMenu={true} syncStatus={syncStatus}>

            {/* Summary Editor */}
            <TipTap
                initialContent={summaryContent || "Document summary will appear here..."}
                onUpdate={handleSummaryUpdate}
                onEditorReady={handleSummaryEditorReady}
                onOpenChat={onOpenChat}
                showToolbar={showToolbar}
                className="min-h-[500px]"
            />
        </DocumentLayout>
    );
}
