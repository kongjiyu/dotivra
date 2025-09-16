import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
  Share2,
  Sparkles,
  History,
  Home,
  RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import Tiptap from "@/components/tiptap/TipTap";
import DocumentMenu from "@/components/tiptap/DocumentMenu";
import ChatSidebar from "@/components/ChatSidebar";

// Comments UI removed; using project view instead

export default function DocumentEditor() {
  const [activeTab, setActiveTab] = useState("editor");
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
    setChatOpen(true);
    setIsAIGenerating(true);
    setTimeout(() => setIsAIGenerating(false), 600);
  };

  const handleDocumentUpdate = (content: string) => {
    setDocumentContent(content);
  };

  const handleSaveAsTemplate = () => {
    console.log("Saving document as template...");
    // Implement template saving functionality
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
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Autosave</span>
              </div>
            </div>

          </div>
          <div className="flex items-center space-x-2 ml-auto">
            <Button variant="outline" size="sm" className="text-gray-900">
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            <Button variant="outline" size="sm" className="text-gray-900">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>

            {/* AI Assistant opens chat sidebar */}
            <Button
              variant="default"
              size="sm"
              onClick={handleAIGenerate}
              disabled={isAIGenerating}
              className="bg-purple-50 border border-purple-200 text-purple-700 hover:bg-purple-100 h-8"
              title="AI Assistant"
            >
              {isAIGenerating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-700 mr-2"></div>
                  <span className="text-xs">Generating...</span>
                </div>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span className="text-xs font-medium">AI Assistant</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Main content under fixed header */}
      <div className="pt-20">
        {/* Main Editor (window scroll for header/menu), fixed content area owns scrollbar */}
        <div className="flex flex-col">
          {/* Document Menu (fixed under header) */}
          <div className="fixed top-20 left-0 right-0 z-30 bg-white border-b border-gray-200">
            <DocumentMenu
              onUpdate={handleDocumentUpdate}
              onSaveAsTemplate={handleSaveAsTemplate}
              documentTitle="Product Strategy 2024"
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
          {/* Spacer for fixed menu */}
          <div className="h-[56px]"></div>

          {/* Editor Content (fixed container + scroll) */}
          <div className="fixed left-0 right-0 top-[192px] bottom-0 overflow-auto p-4 custom-scrollbar">
            <Tabs value={activeTab} onValueChange={setActiveTab}>

              <TabsContent value="editor" className="mt-2">
                <div>
                  <Tiptap
                    initialContent={documentContent}
                    onUpdate={handleDocumentUpdate}
                    className=""
                  />
                </div>
              </TabsContent>

              <TabsContent value="summary" className="h-full mt-4">
                <Card className="h-full">
                  <CardContent className="p-6 h-full overflow-auto">
                    <div
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: documentContent }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="project" className="h-full mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Project: Aurora Analytics</CardTitle>
                    <CardDescription>Documents organized under the "Aurora Analytics" initiative</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="p-3 border rounded-lg">Roadmap Q4</div>
                    <div className="p-3 border rounded-lg">Market Research Notes</div>
                    <div className="p-3 border rounded-lg">Release Plan v1.2</div>
                  </CardContent>
                </Card>
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
      </div>
    </div>
  );
}
