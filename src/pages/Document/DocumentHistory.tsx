import DocumentLayout from "./DocumentLayout";
import VersionHistory from "@/components/Document/VersionHistory";
import { useNavigate } from "react-router-dom";
import { useDocument } from "@/context/DocumentContext";

export default function DocumentHistory() {
    const navigate = useNavigate();
    const { documentContent, setDocumentContent, documentId } = useDocument();

    const handleRestoreVersion = (content: string) => {
        setDocumentContent(content);
        // Navigate back to editor after restoring
        navigate('/document/editor');
    };

    const handlePreviewVersion = (_content: string) => {
        // Could implement preview functionality
    };

    return (
        <DocumentLayout showDocumentMenu={false}>
            <div className="h-full pt-2">
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