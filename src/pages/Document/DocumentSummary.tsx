import { useEffect } from "react";
import DocumentLayout from "./DocumentLayout";
import TipTap from "@/components/Document/TipTap";
import { useDocument } from "../../context/DocumentContext";

export default function DocumentSummary() {
    const {
        documentContent,
        documentTitle,
        summaryContent,
        setSummaryContent,
        setCurrentEditor
    } = useDocument();

    useEffect(() => {
        if (!summaryContent && documentContent) {
            generateDocumentSummary();
        }
    }, [documentContent]);

    const generateDocumentSummary = () => {
        if (documentContent) {
            const words = documentContent.split(" ").length;
            const sentences = documentContent.split(/[.!?]+/).length;
            const paragraphs = documentContent.split("\n\n").length;

            const summaryText = `Document Summary for "${documentTitle}":
        
Word Count: ${words} words
Sentences: ${sentences}
Paragraphs: ${paragraphs}

Content Preview:
${documentContent.substring(0, 300)}${documentContent.length > 300 ? "..." : ""}
      `;
            setSummaryContent(summaryText);
        } else {
            setSummaryContent("No content available to summarize.");
        }
    };

    const handleSummaryUpdate = (content: string) => {
        setSummaryContent(content);
    };

    const handleSummaryEditorReady = (editor: any) => {
        // Set the current editor in context so the toolbar can use it
        setCurrentEditor(editor);
    };

    return (
        <DocumentLayout showDocumentMenu={true}>
            {/* Summary Content - TipTap includes its own toolbar */}
            <TipTap
                initialContent={summaryContent || "Click 'Generate Summary' to create a document summary."}
                onUpdate={handleSummaryUpdate}
                onEditorReady={handleSummaryEditorReady}
            />
        </DocumentLayout>
    );
}
