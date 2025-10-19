import { useEffect, useMemo } from "react";
import DocumentLayout from "./DocumentLayout";
import TipTap from "@/components/document/TipTap";
import { useDocument } from "@/context/DocumentContext";

export default function DocumentSummary() {
    const {
        documentContent,
        documentTitle,
        summaryContent,
        setSummaryContent,
        setCurrentEditor
    } = useDocument();

    // Generate document statistics
    const documentStats = useMemo(() => {
        if (!documentContent) return null;

        const plainText = documentContent.replace(/<[^>]*>/g, '');
        const words = plainText.trim().split(/\s+/).filter(word => word.length > 0);
        const sentences = plainText.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const paragraphs = documentContent.split(/<\/p>|<\/h[1-6]>|<\/li>/).filter(p =>
            p.trim().replace(/<[^>]*>/g, '').length > 0
        );

        return {
            wordCount: words.length,
            sentenceCount: sentences.length,
            paragraphCount: paragraphs.length,
            charactersWithSpaces: plainText.length,
            charactersWithoutSpaces: plainText.replace(/\s/g, '').length,
            averageWordsPerSentence: sentences.length > 0 ? Math.round(words.length / sentences.length) : 0,
            readingTime: Math.ceil(words.length / 200) // Average reading speed: 200 words per minute
        };
    }, [documentContent]);

    // Generate enhanced summary content
    useEffect(() => {
        if (!summaryContent && documentContent && documentStats) {
            const enhancedSummary = generateEnhancedSummary();
            setSummaryContent(enhancedSummary);
        }
    }, [documentContent, documentStats, summaryContent, setSummaryContent]);

    const generateEnhancedSummary = () => {
        if (!documentStats || !documentContent) return '';

        const plainText = documentContent.replace(/<[^>]*>/g, '');
        const preview = plainText.substring(0, 300) + (plainText.length > 300 ? "..." : "");

        return `<h1>Document Summary: ${documentTitle}</h1>

<h2>📊 Document Statistics</h2>
<ul>
<li><strong>Word Count:</strong> ${documentStats.wordCount} words</li>
<li><strong>Reading Time:</strong> ~${documentStats.readingTime} minutes</li>
<li><strong>Sentences:</strong> ${documentStats.sentenceCount}</li>
<li><strong>Paragraphs:</strong> ${documentStats.paragraphCount}</li>
<li><strong>Characters:</strong> ${documentStats.charactersWithSpaces} (with spaces)</li>
<li><strong>Average Words/Sentence:</strong> ${documentStats.averageWordsPerSentence}</li>
</ul>

<h2>📝 Content Overview</h2>
<p>This document contains ${documentStats.wordCount} words organized across ${documentStats.paragraphCount} paragraphs. The estimated reading time is approximately ${documentStats.readingTime} minute${documentStats.readingTime !== 1 ? 's' : ''}.</p>

<h3>Content Preview</h3>
<blockquote>${preview}</blockquote>

<h3>Last Updated</h3>
<p>${new Date().toLocaleString()}</p>`;
    };

    const handleSummaryUpdate = (content: string) => {
        setSummaryContent(content);
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
