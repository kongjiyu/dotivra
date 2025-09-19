import DocumentLayout from "./DocumentLayout";
import TipTap from "@/components/document/TipTap";
import { useDocument } from "@/context/DocumentContext";
import { useRef, useEffect } from "react";

const DEFAULT_DOC = `<h1>Product Strategy 2024</h1>

<h3>Executive Summary</h3>

<p>Our product strategy for 2024 focuses on three key pillars: innovation, user experience, and market expansion. This document outlines our approach to achieving sustainable growth while maintaining our commitment to quality and customer satisfaction.</p>

<h2>Market Analysis</h2>

<p>The current market landscape presents both opportunities and challenges. We've identified several key trends:</p>

<ul>
<li><strong>AI Integration</strong>: Increasing demand for AI-powered solutions</li>
<li><strong>Mobile-First</strong>: Continued shift towards mobile platforms</li>
<li><strong>Sustainability</strong>: Growing emphasis on eco-friendly products</li>
</ul>

<h2>Strategic Objectives</h2>

<h3>1. Product Innovation</h3>
<ul>
<li>Launch 3 new AI-powered features</li>
<li>Improve existing functionality by 40%</li>
<li>Reduce development cycle time by 25%</li>
</ul>

<h3>2. User Experience Enhancement</h3>
<ul>
<li>Achieve 95% user satisfaction score</li>
<li>Reduce customer support tickets by 30%</li>
<li>Implement personalized user journeys</li>
</ul>

<h3>3. Market Expansion</h3>
<ul>
<li>Enter 2 new geographic markets</li>
<li>Partner with 5 strategic alliances</li>
<li>Increase market share by 15%</li>
</ul>

<h2>Implementation Timeline</h2>

<table>
<thead>
<tr>
<th>Quarter</th>
<th>Focus Area</th>
<th>Key Milestones</th>
</tr>
</thead>
<tbody>
<tr>
<td>Q1 2024</td>
<td>Foundation</td>
<td>Core platform updates</td>
</tr>
<tr>
<td>Q2 2024</td>
<td>Innovation</td>
<td>AI features launch</td>
</tr>
<tr>
<td>Q3 2024</td>
<td>Expansion</td>
<td>New market entry</td>
</tr>
<tr>
<td>Q4 2024</td>
<td>Optimization</td>
<td>Performance improvements</td>
</tr>
</tbody>
</table>

<h2>Success Metrics</h2>

<p>We will measure success through the following KPIs:</p>

<ul>
<li><strong>Revenue Growth</strong>: 25% year-over-year increase</li>
<li><strong>User Engagement</strong>: 40% improvement in daily active users</li>
<li><strong>Customer Retention</strong>: 90% annual retention rate</li>
<li><strong>Market Position</strong>: Top 3 in our category</li>
</ul>

<h2>Risk Assessment</h2>

<h3>High Priority Risks</h3>
<ol>
<li><strong>Competition</strong>: New entrants with similar offerings</li>
<li><strong>Technology</strong>: Rapid pace of AI advancement</li>
<li><strong>Regulation</strong>: Changing data privacy laws</li>
</ol>

<h3>Mitigation Strategies</h3>
<ul>
<li>Continuous market monitoring</li>
<li>Agile development methodology</li>
<li>Compliance-first approach</li>
</ul>

<h2>Conclusion</h2>

<p>This strategy provides a clear roadmap for achieving our 2024 objectives. Success depends on execution excellence, team collaboration, and customer-centric decision making.</p>`;

export default function DocumentEditor() {
    const {
        documentContent,
        setDocumentContent,
        setCurrentEditor
    } = useDocument();
    const documentContentRef = useRef<HTMLDivElement>(null);

    const handleDocumentUpdate = (content: string) => {
        setDocumentContent(content);
    };

    const handleEditorReady = (editor: any) => {
        setCurrentEditor(editor);
    };

    // Initialize with default content if empty
    useEffect(() => {
        if (!documentContent) {
            setDocumentContent(DEFAULT_DOC);
        }
    }, [documentContent, setDocumentContent]);

    const effectiveContent = documentContent || DEFAULT_DOC;

    return (
        <DocumentLayout showDocumentMenu={true}>
            <div ref={documentContentRef} className="h-full">
                <TipTap
                    initialContent={effectiveContent}
                    onUpdate={handleDocumentUpdate}
                    onEditorReady={handleEditorReady}
                    className=""
                />
            </div>
        </DocumentLayout>
    );
}