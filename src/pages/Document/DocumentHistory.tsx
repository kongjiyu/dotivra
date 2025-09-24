import DocumentLayout from "./DocumentLayout";
import VersionHistory from "@/components/document/VersionHistory";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
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

    const handlePreviewVersion = (content: string) => {
        // Could implement preview functionality
        console.log("Preview version:", content.slice(0, 100) + "...");
    };

    return (
        <DocumentLayout showDocumentMenu={false}>
            {/* History Tab Back Button */}
            <div className="fixed top-20 left-0 right-0 z-30 bg-white border-b border-gray-200 px-6 py-3">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/document/editor')}
                        className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>
                </div>
            </div>

            {/* Spacer for back button */}
            <div className="h-[56px]"></div>

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