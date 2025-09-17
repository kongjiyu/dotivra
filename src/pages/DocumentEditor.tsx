import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  History,
  Home,
  Cloud,
  Download,
  RefreshCw,
  FileText,
  Plus,
  FolderOpen,
  Edit,
  ArrowLeft,
  MessageCircle
} from "lucide-react";
import { useRef } from "react";
import { Link } from "react-router-dom";
import Tiptap from "@/components/tiptap/TipTap";
import DocumentMenu from "@/components/tiptap/DocumentMenu";
import ChatSidebar from "@/components/ChatSidebar";
import VersionHistory from "@/components/VersionHistory";
import ShareSettings from "@/components/ShareSettings";
import SimpleShare from "@/components/SimpleShare";

// Comments UI removed; using project view instead

export default function DocumentEditor() {
  const [activeTab, setActiveTab] = useState("editor");
  const [currentEditor, setCurrentEditor] = useState<any>(null);
  const documentContentRef = useRef<HTMLDivElement>(null);
  const [summaryContent, setSummaryContent] = useState("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [documentContent, setDocumentContent] = useState(`<h1>Product Strategy 2024</h1>

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

<p>This strategy provides a clear roadmap for achieving our 2024 objectives. Success depends on execution excellence, team collaboration, and customer-centric decision making.</p>`);

  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const handleAIGenerate = () => {
    // Toggle the chat sidebar and simulate a brief loading state for button feedback
    setChatOpen(!chatOpen);
    setIsAIGenerating(true);
    setTimeout(() => setIsAIGenerating(false), 600);
  };

  const handleDocumentUpdate = (content: string) => {
    setDocumentContent(content);
  };

  const generateDocumentSummary = (content: string): string => {
    // Simple mock summarization based on content
    const hasStrategy = content.toLowerCase().includes('strategy');
    const hasMetrics = content.toLowerCase().includes('metrics') || content.toLowerCase().includes('kpi');
    const hasTimeline = content.toLowerCase().includes('timeline') || content.toLowerCase().includes('quarter');
    const hasRisk = content.toLowerCase().includes('risk');

    let summary = '<h2>Document Summary</h2>\n\n';

    if (hasStrategy) {
      summary += '<p><strong>Strategic Focus:</strong> This document outlines a comprehensive business strategy focusing on innovation, user experience, and market expansion.</p>\n\n';
    }

    if (hasMetrics) {
      summary += '<p><strong>Key Metrics:</strong> The strategy includes specific performance indicators such as revenue growth targets, user engagement improvements, and customer retention goals.</p>\n\n';
    }

    if (hasTimeline) {
      summary += '<p><strong>Implementation Timeline:</strong> The plan is structured across quarterly milestones with clearly defined focus areas and deliverables.</p>\n\n';
    }

    if (hasRisk) {
      summary += '<p><strong>Risk Management:</strong> The document addresses potential challenges including competitive threats, technological changes, and regulatory considerations.</p>\n\n';
    }

    summary += '<p><strong>Overall Assessment:</strong> This is a well-structured strategic document that provides clear direction, measurable objectives, and actionable implementation steps.</p>';

    return summary;
  };

  const handleSaveAsTemplate = () => {
    console.log("Saving document as template...");
    // Implement template saving functionality
  };

  const regenerateSummary = () => {
    // Enhanced summary generation
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = documentContent;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';

    // Generate a more sophisticated summary
    const summary = `
      <h2>Executive Summary</h2>
      <p>This document contains ${textContent.length} characters and covers the key aspects of our strategic planning initiative.</p>
      
      <h3>Key Topics</h3>
      <ul>
        <li>Strategic objectives and market positioning</li>
        <li>Implementation timeline and milestones</li>
        <li>Success metrics and performance indicators</li>
        <li>Resource allocation and budget considerations</li>
      </ul>
      
      <h3>Next Steps</h3>
      <p>The document outlines a comprehensive roadmap for achieving our strategic goals through focused execution and continuous monitoring of key performance indicators.</p>
    `;

    setSummaryContent(summary);
  };

  // Initialize summary content
  const getSummaryContent = () => {
    if (summaryContent) return summaryContent;
    return generateDocumentSummary(documentContent);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (fixed) */}
      <div className="fixed top-0 left-0 right-0 z-40 h-20 bg-white border-b border-gray-200 px-6 flex items-center">
        <div className="flex items-center w-full">
          <div className="flex items-center space-x-4">
            <div className="flex items-center gap-3">
              {/* Home button to go back (larger, no border) */}
              <Button asChild variant="ghost" size="icon" className="h-12 w-12">
                <Link to="/">
                  <Home className="w-6 h-6" />
                </Link>
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">Product Strategy 2024</h1>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Cloud className="w-4 h-4 text-green-600" />
                <span>Synced</span>
              </div>
            </div>

          </div>
          <div className="flex items-center space-x-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-900"
              onClick={() => setActiveTab("history")}
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            <SimpleShare
              documentTitle="Product Strategy 2024"
              documentId="main-doc-123"
            />
          </div>
        </div>
      </div>

      {/* Main content under fixed header */}
      <div className="pt-20">
        {/* Main Editor (window scroll for header/menu), fixed content area owns scrollbar */}
        <div className="flex flex-col">
          {/* Document Menu (fixed under header) - Hidden for history tab */}
          {activeTab !== "history" && (
            <div className="fixed top-20 left-0 right-0 z-30 bg-white border-b border-gray-200">
              <DocumentMenu
                onUpdate={handleDocumentUpdate}
                onSaveAsTemplate={handleSaveAsTemplate}
                documentTitle="Product Strategy 2024"
                activeTab={activeTab}
                onTabChange={setActiveTab}
                editor={currentEditor}
                documentContent={documentContent}
              />
            </div>
          )}

          {/* History Tab Back Button */}
          {activeTab === "history" && (
            <div className="fixed top-20 left-0 right-0 z-30 bg-white border-b border-gray-200 px-6 py-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab("editor")}
                  className="flex items-center gap-2 text-gray-700 hover:text-gray-900"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
              </div>
            </div>
          )}

          {/* Spacer for fixed menu */}
          <div className="h-[56px]"></div>

          {/* Editor Content (fixed container + scroll) */}
          <div className="fixed left-0 right-0 top-[192px] bottom-0 overflow-auto p-4 custom-scrollbar">
            <Tabs value={activeTab} onValueChange={setActiveTab}>

              <TabsContent value="editor" className="mt-2">
                <div ref={documentContentRef}>
                  <Tiptap
                    initialContent={documentContent}
                    onUpdate={handleDocumentUpdate}
                    onEditorReady={setCurrentEditor}
                    className=""
                  />
                </div>
              </TabsContent>

              <TabsContent value="summary" className="h-full mt-4">
                <div className="h-full flex flex-col">
                  {/* Summary Toolbar */}
                  <div className="border-b border-gray-200 p-3 bg-white">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={regenerateSummary}
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Regenerate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingSummary(!isEditingSummary)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        {isEditingSummary ? 'View' : 'Edit'}
                      </Button>
                      <SimpleShare
                        documentTitle="Product Strategy 2024"
                        documentId="summary-doc-123"
                      />
                    </div>
                  </div>

                  {/* Summary Content with same width as editor */}
                  <div className="flex-1 overflow-auto p-6 bg-gray-50">
                    <div className="max-w-[75vw] mx-auto bg-white rounded-lg shadow-sm border">
                      <div className="p-8">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800">Document Summary</h2>
                        {isEditingSummary ? (
                          <div className="space-y-4">
                            <Tiptap
                              initialContent={summaryContent || getSummaryContent()}
                              onUpdate={(content) => setSummaryContent(content)}
                              onEditorReady={(editor) => console.log('Summary editor ready:', editor)}
                              className="min-h-[400px] border rounded-lg"
                            />
                            <div className="flex gap-2">
                              <Button onClick={() => setIsEditingSummary(false)}>
                                Save Changes
                              </Button>
                              <Button variant="outline" onClick={() => setIsEditingSummary(false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="prose prose-lg max-w-none"
                            dangerouslySetInnerHTML={{ __html: getSummaryContent() }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="project" className="h-full mt-4">
                <div className="h-full flex flex-col">
                  {/* Project Header */}
                  <Card className="mb-4">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Project: Aurora Analytics
                      </CardTitle>
                      <CardDescription>All documents and resources for the Aurora Analytics initiative</CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Documents List */}
                  <Card className="flex-1 overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-lg">Documents</CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          New Document
                        </Button>
                        <Button variant="outline" size="sm">
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Import
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-auto space-y-3">
                      {/* Current Document */}
                      <div className="p-4 border-2 border-blue-200 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-900">Strategic Roadmap Q4 2024</h4>
                            <p className="text-sm text-blue-700">Currently editing • Last saved 2 mins ago</p>
                          </div>
                          <div className="flex gap-2">
                            <SimpleShare
                              documentTitle="Strategic Roadmap Q4 2024"
                              documentId="current-doc-123"
                            />
                            <Button variant="ghost" size="sm" title="Export document">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Other Documents */}
                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Market Research Notes</h4>
                            <p className="text-sm text-gray-600">Updated 3 days ago</p>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Release Plan v1.2</h4>
                            <p className="text-sm text-gray-600">Updated 1 week ago</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="history" className="h-full mt-4">
                <VersionHistory
                  currentContent={documentContent}
                  onRestoreVersion={setDocumentContent}
                  onPreviewVersion={(content) => {
                    // Could implement preview functionality
                    console.log("Preview version:", content.slice(0, 100) + "...");
                  }}
                />
              </TabsContent>

              <TabsContent value="share" className="h-full mt-4">
                <ShareSettings
                  documentTitle="Product Strategy 2024"
                  documentContent={documentContent}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Fixed Chat Sidebar overlay (does not affect layout) */}
        <div className={`fixed top-[136px] right-0 h-[calc(100vh-136px)] w-[28rem] border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 z-20 ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="h-full p-4">
            <ChatSidebar
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              initialSuggestions={[
                "Consider adding more specific metrics to the 'Success Metrics' section.",
                "The executive summary is well-structured and clear.",
                "Add more details about competitor analysis.",
              ]}
            />
          </div>
        </div>

        {/* Fixed AI Chat Icon - Bottom Right (hidden when chat is open) */}
        {!chatOpen && (
          <Button
            onClick={handleAIGenerate}
            disabled={isAIGenerating}
            className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg transition-all duration-200 bg-purple-500 hover:bg-purple-600 text-white"
            title="AI Assistant"
          >
            {isAIGenerating ? (
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            ) : (
              <MessageCircle className="w-6 h-6" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
