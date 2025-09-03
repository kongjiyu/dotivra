import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Save, 
  Share2, 
  Sparkles, 
  Wand2, 
  Bot, 
  Type,
  Code,
  List,
  Download,
  History,
  Zap
} from "lucide-react";
import Tiptap from "@/components/tiptap/TipTap";
import DocumentMenu from "@/components/tiptap/DocumentMenu";

interface Comment {
  id: string;
  user: string;
  avatar: string;
  content: string;
  timestamp: string;
  line: number;
}

const mockComments: Comment[] = [
  {
    id: "1",
    user: "Sarah Chen",
    avatar: "SC",
    content: "Great analysis! Consider adding more data points here.",
    timestamp: "2 hours ago",
    line: 15
  },
  {
    id: "2",
    user: "Mike Johnson",
    avatar: "MJ",
    content: "This section needs technical clarification.",
    timestamp: "1 hour ago",
    line: 23
  }
];

export default function DocumentEditor() {
  const [activeTab, setActiveTab] = useState("editor");
  const [documentContent, setDocumentContent] = useState(`<h1>Product Strategy 2024</h1>

<h2>Executive Summary</h2>

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

  const handleAIGenerate = () => {
    setIsAIGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setIsAIGenerating(false);
    }, 2000);
  };

  const handleDocumentUpdate = (content: string) => {
    setDocumentContent(content);
  };

  const handleSave = () => {
    console.log("Saving document...");
    // Implement actual save functionality
  };

  const handleSaveAsTemplate = () => {
    console.log("Saving document as template...");
    // Implement template saving functionality
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Product Strategy 2024</h1>
              <p className="text-sm text-gray-500">Last saved 2 minutes ago</p>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Enhanced
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="text-white">
              <History className="w-4 h-4 mr-2" />
              Version History
            </Button>
            <Button variant="outline" size="sm" className="text-white">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" size="sm" className="text-white">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Main Editor */}
        <div className="flex-1 flex flex-col">
          {/* Document Menu */}
          <DocumentMenu 
            onUpdate={handleDocumentUpdate}
            isAIGenerating={isAIGenerating}
            onAIGenerate={handleAIGenerate}
            onSaveAsTemplate={handleSaveAsTemplate}
            documentTitle="Product Strategy 2024"
          />

          {/* Editor Content */}
          <div className="flex-1 p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="editor">Editor</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="comments">Comments ({mockComments.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="editor" className="h-full mt-4">
                <div className="h-full">
                  <Tiptap
                    initialContent={documentContent}
                    onUpdate={handleDocumentUpdate}
                    className="h-full"
                  />
                </div>
              </TabsContent>

              <TabsContent value="preview" className="h-full mt-4">
                <Card className="h-full">
                  <CardContent className="p-6 h-full overflow-auto">
                    <div 
                      className="prose prose-lg max-w-none"
                      dangerouslySetInnerHTML={{ __html: documentContent }}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comments" className="h-full mt-4">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle>Comments & Feedback</CardTitle>
                    <CardDescription>Collaborative feedback on this document</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockComments.map((comment) => (
                      <div key={comment.id} className="flex space-x-3 p-4 border border-gray-200 rounded-lg">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="text-xs">{comment.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm">{comment.user}</span>
                            <span className="text-xs text-gray-500">{comment.timestamp}</span>
                            <Badge variant="outline" className="text-xs">Line {comment.line}</Badge>
                          </div>
                          <p className="text-sm text-gray-700 mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Add a comment..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <Button className="text-white" size="sm">Comment</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-gray-200 p-6 space-y-6">
          {/* AI Assistant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="w-5 h-5 mr-2 text-blue-600" />
                AI Assistant
              </CardTitle>
              <CardDescription>Get help with your document</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button className="w-full justify-start text-white" variant="outline" size="sm">
                <Wand2 className="w-4 h-4 mr-2" />
                Improve Writing
              </Button>
              <Button className="w-full justify-start text-white" variant="outline" size="sm">
                <Type className="w-4 h-4 mr-2" />
                Generate Summary
              </Button>
              <Button className="w-full justify-start text-white" variant="outline" size="sm">
                <Code className="w-4 h-4 mr-2" />
                Add Code Examples
              </Button>
              <Button className="w-full justify-start text-white" variant="outline" size="sm">
                <List className="w-4 h-4 mr-2" />
                Create Outline
              </Button>
            </CardContent>
          </Card>

          {/* Document Info */}
          <Card>
            <CardHeader>
              <CardTitle>Document Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Words</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Characters</span>
                <span className="font-medium">7,892</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Reading Time</span>
                <span className="font-medium">5 min</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">AI Score</span>
                <span className="font-medium text-green-600">92/100</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { user: "Sarah Chen", action: "commented", time: "2 hours ago" },
                { user: "Mike Johnson", action: "edited", time: "3 hours ago" },
                { user: "You", action: "saved", time: "5 hours ago" },
                { user: "AI Assistant", action: "enhanced", time: "1 day ago" }
              ].map((activity, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <Avatar className="w-6 h-6">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs">
                      {activity.user === "You" ? "U" : activity.user.split(" ").map(n => n[0]).join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{activity.user}</span>
                    <span className="text-gray-500"> {activity.action}</span>
                  </div>
                  <span className="text-xs text-gray-400">{activity.time}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Suggestions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                AI Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Consider adding more specific metrics to the "Success Metrics" section
                </p>
              </div>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  The executive summary is well-structured and clear
                </p>
              </div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  Add more details about competitor analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
