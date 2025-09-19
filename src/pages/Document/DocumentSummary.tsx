import { useState, useEffect } from "react";
import DocumentLayout from "./DocumentLayout";
import ToolBar from "@/components/document/ToolBar";
import TipTap from "@/components/document/TipTap";
import { Button } from "@/components/ui/button";
import { useDocument } from "../../context/DocumentContext";

export default function DocumentSummary() {
    const {
        documentContent,
        documentTitle,
        summaryContent,
        setSummaryContent
    } = useDocument();
    const [summaryEditor, setSummaryEditor] = useState(null);

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
        setSummaryEditor(editor);
    };

    return (
        <DocumentLayout showDocumentMenu={true}>
            {/* ToolBar for Summary Editing - only show when editor is ready */}
            {summaryEditor && (
                <div className="fixed left-1/2 -translate-x-1/2 top-[144px] z-20 w-[96vw] max-w-[1680px] min-w-[360px] px-3">
                    <ToolBar editor={summaryEditor} />
                </div>
            )}

            {/* Summary Content */}

            <TipTap
                initialContent={summaryContent || "Click 'Generate Summary' to create a document summary."}
                onUpdate={handleSummaryUpdate}
                onEditorReady={handleSummaryEditorReady}
            />

        </DocumentLayout>
    );
}
