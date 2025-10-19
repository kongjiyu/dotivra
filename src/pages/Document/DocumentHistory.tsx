import DocumentLayout from "./DocumentLayout";
import VersionHistory from "@/components/document/VersionHistory";
import { useNavigate } from "react-router-dom";
import { useDocument } from "@/context/DocumentContext";

export default function DocumentHistory() {
    const navigate = useNavigate();
    const { documentContent, setDocumentContent } = useDocument();

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
                    currentContent={documentContent || ""}
                    onRestoreVersion={handleRestoreVersion}
                    onPreviewVersion={handlePreviewVersion}
                />
            </div>
        </DocumentLayout>
    );
}