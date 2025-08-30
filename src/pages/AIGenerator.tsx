import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { 
  Sparkles, 
  Wand2, 
  Bot, 
  FileText, 
  Plus, 
  Settings, 
  Download,
  Copy,
  Star,
  Clock,
  Users,
  TrendingUp,
  Lightbulb,
  Target,
  MessageSquare,
  Zap,
  ArrowRight,
  CheckCircle,
  Play,
  Pause,
  RotateCcw,
  Save,
  Share2,
  Eye,
  Edit3,
  Type,
  Image,
  Code,
  List,
  Quote,
  Calendar,
  BarChart3,
  PieChart,
  LineChart
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: any;
  popularity: number;
  estimatedTime: string;
  tags: string[];
}

interface GeneratedDocument {
  id: string;
  title: string;
  content: string;
  template: string;
  createdAt: string;
  status: "generating" | "completed" | "failed";
  aiScore: number;
}

const templates: Template[] = [
  {
    id: "1",
    name: "Business Plan",
    description: "Comprehensive business plan with market analysis, financial projections, and strategy",
    category: "Business",
    icon: Target,
    popularity: 95,
    estimatedTime: "10-15 min",
    tags: ["Business", "Strategy", "Financial"]
  },
  {
    id: "2",
    name: "Technical Documentation",
    description: "Detailed technical documentation for software, APIs, or systems",
    category: "Technical",
    icon: Code,
    popularity: 88,
    estimatedTime: "8-12 min",
    tags: ["Technical", "API", "Documentation"]
  },
  {
    id: "3",
    name: "Marketing Strategy",
    description: "Complete marketing strategy with campaign planning and ROI analysis",
    category: "Marketing",
    icon: TrendingUp,
    popularity: 92,
    estimatedTime: "12-18 min",
    tags: ["Marketing", "Campaign", "ROI"]
  },
  {
    id: "4",
    name: "Research Report",
    description: "Academic or business research report with data analysis and conclusions",
    category: "Research",
    icon: BarChart3,
    popularity: 85,
    estimatedTime: "15-20 min",
    tags: ["Research", "Analysis", "Data"]
  },
  {
    id: "5",
    name: "Product Requirements",
    description: "Detailed product requirements document with user stories and specifications",
    category: "Product",
    icon: FileText,
    popularity: 90,
    estimatedTime: "10-15 min",
    tags: ["Product", "Requirements", "Specifications"]
  },
  {
    id: "6",
    name: "Content Calendar",
    description: "Social media and content marketing calendar with post ideas",
    category: "Content",
    icon: Calendar,
    popularity: 87,
    estimatedTime: "5-8 min",
    tags: ["Content", "Social Media", "Calendar"]
  }
];

const mockGeneratedDocuments: GeneratedDocument[] = [
  {
    id: "1",
    title: "Q4 Marketing Strategy 2024",
    content: "Generated content for Q4 marketing strategy...",
    template: "Marketing Strategy",
    createdAt: "2 hours ago",
    status: "completed",
    aiScore: 94
  },
  {
    id: "2",
    title: "API Documentation v2.1",
    content: "Technical documentation for API v2.1...",
    template: "Technical Documentation",
    createdAt: "1 day ago",
    status: "completed",
    aiScore: 91
  },
  {
    id: "3",
    title: "Startup Business Plan",
    content: "Comprehensive business plan for tech startup...",
    template: "Business Plan",
    createdAt: "3 days ago",
    status: "completed",
    aiScore: 89
  }
];

export default function AIGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [activeTab, setActiveTab] = useState("templates");
  const [customPrompt, setCustomPrompt] = useState("");

  const handleGenerate = () => {
    if (!selectedTemplate) return;
    
    setIsGenerating(true);
    setGenerationProgress(0);
    
    const interval = setInterval(() => {
      setGenerationProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsGenerating(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "generating": return "bg-blue-100 text-blue-800";
      case "failed": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Sparkles className="w-8 h-8 mr-3 text-purple-600" />
              AI Document Generator
            </h1>
            <p className="text-gray-600 mt-1">Create professional documents with AI assistance</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Plus className="w-4 h-4 mr-2" />
              Custom Prompt
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documents Generated</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">156</div>
              <p className="text-xs text-muted-foreground">
                +23 this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average AI Score</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">92.4</div>
              <p className="text-xs text-muted-foreground">
                +2.1 from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">47h</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Popular Template</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Business Plan</div>
              <p className="text-xs text-muted-foreground">
                95% usage rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Templates & Generation */}
          <div className="lg:col-span-2 space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="templates">Templates</TabsTrigger>
                <TabsTrigger value="custom">Custom Prompt</TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
              </TabsList>

              <TabsContent value="templates" className="space-y-6">
                {/* Template Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {templates.map((template) => (
                    <HoverCard key={template.id}>
                      <HoverCardTrigger asChild>
                        <Card 
                          className={`cursor-pointer transition-all hover:shadow-lg ${
                            selectedTemplate?.id === template.id 
                              ? 'ring-2 ring-purple-500 bg-purple-50' 
                              : ''
                          }`}
                          onClick={() => setSelectedTemplate(template)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <template.icon className="w-8 h-8 text-purple-600" />
                              <Badge variant="secondary" className="bg-green-100 text-green-800">
                                {template.popularity}% popular
                              </Badge>
                            </div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            <CardDescription>{template.description}</CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <span>Est. time: {template.estimatedTime}</span>
                              <div className="flex space-x-1">
                                {template.tags.slice(0, 2).map((tag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </HoverCardTrigger>
                      <HoverCardContent className="w-80">
                        <div className="space-y-2">
                          <h4 className="font-semibold">{template.name}</h4>
                          <p className="text-sm text-gray-600">{template.description}</p>
                          <div className="flex items-center space-x-2 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>{template.estimatedTime}</span>
                            <Users className="w-4 h-4 ml-2" />
                            <span>{template.popularity}% popular</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {template.tags.map((tag, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  ))}
                </div>

                {/* Generation Panel */}
                {selectedTemplate && (
                  <Card className="border-2 border-purple-200 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Wand2 className="w-5 h-5 mr-2 text-purple-600" />
                        Generate: {selectedTemplate.name}
                      </CardTitle>
                      <CardDescription>
                        Configure your document generation settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Document Title</label>
                          <input
                            type="text"
                            placeholder="Enter document title..."
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Industry/Sector</label>
                          <input
                            type="text"
                            placeholder="e.g., Technology, Healthcare..."
                            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Additional Context</label>
                        <textarea
                          placeholder="Provide any additional context or specific requirements..."
                          rows={3}
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            <Sparkles className="w-3 h-3 mr-1" />
                            AI Enhanced
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Estimated time: {selectedTemplate.estimatedTime}
                          </span>
                        </div>
                        <Button 
                          onClick={handleGenerate}
                          disabled={isGenerating}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isGenerating ? (
                            <div className="flex items-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Generating...
                            </div>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4 mr-2" />
                              Generate Document
                            </>
                          )}
                        </Button>
                      </div>
                      {isGenerating && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Generation Progress</span>
                            <span>{generationProgress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${generationProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="custom" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Custom AI Prompt</CardTitle>
                    <CardDescription>
                      Create a document from scratch using your own prompt
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Document Type</label>
                      <input
                        type="text"
                        placeholder="e.g., Technical Manual, Business Proposal, Research Paper..."
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Detailed Prompt</label>
                      <textarea
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Describe the document you want to create in detail..."
                        rows={6}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button 
                        disabled={!customPrompt.trim()}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate from Prompt
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="recent" className="space-y-6">
                <div className="space-y-4">
                  {mockGeneratedDocuments.map((doc) => (
                    <Card key={doc.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <FileText className="w-8 h-8 text-blue-600" />
                            <div>
                              <h3 className="font-medium text-gray-900">{doc.title}</h3>
                              <p className="text-sm text-gray-500">
                                Template: {doc.template} • {doc.createdAt}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className={getStatusColor(doc.status)}>
                              {doc.status}
                            </Badge>
                            <Badge variant="outline" className="bg-green-50 text-green-700">
                              AI Score: {doc.aiScore}
                            </Badge>
                            <div className="flex space-x-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit3 className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bot className="w-5 h-5 mr-2 text-blue-600" />
                  AI Features
                </CardTitle>
                <CardDescription>Advanced AI capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Zap className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Smart Templates</p>
                    <p className="text-xs text-blue-600">AI-optimized document structures</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Lightbulb className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Content Enhancement</p>
                    <p className="text-xs text-green-600">Improve writing quality automatically</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <Target className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Audience Targeting</p>
                    <p className="text-xs text-purple-600">Tailor content for specific audiences</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Generation Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Today</span>
                  <span className="font-medium">12 documents</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">This Week</span>
                  <span className="font-medium">47 documents</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Success Rate</span>
                  <span className="font-medium text-green-600">98.5%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Avg. Generation Time</span>
                  <span className="font-medium">8.2 min</span>
                </div>
              </CardContent>
            </Card>

            {/* Popular Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Popular Templates</CardTitle>
                <CardDescription>Most used by your team</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates
                  .sort((a, b) => b.popularity - a.popularity)
                  .slice(0, 3)
                  .map((template) => (
                    <div key={template.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <template.icon className="w-6 h-6 text-purple-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{template.name}</p>
                        <p className="text-xs text-gray-500">{template.popularity}% usage</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* AI Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Lightbulb className="w-5 h-5 mr-2 text-yellow-600" />
                  AI Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Provide specific context for better AI-generated content
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Use industry-specific keywords for more relevant results
                  </p>
                </div>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    Review and edit AI-generated content for accuracy
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
