import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
// HoverCard components not used on Home page after cleanup
import {
  FileText,
  Brain,

  Users,
  Sparkles,

  Target,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  Play,
  MessageSquare,
  Shield,
  BarChart3,


  Edit3,
  Github,

} from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Generation",
      description: "Create professional documents instantly with advanced AI that understands context and industry standards.",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: FileText,
      title: "Smart Document Editor",
      description: "Rich text editor with AI assistance, real-time collaboration, and intelligent formatting suggestions.",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Work together seamlessly with real-time editing, comments, and version control for your entire team.",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      icon: Target,
      title: "Template Library",
      description: "Access hundreds of pre-built templates for business plans, technical docs, and more.",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      icon: TrendingUp,
      title: "Analytics & Insights",
      description: "Track document performance, engagement metrics, and AI-generated improvement suggestions.",
      color: "text-red-600",
      bgColor: "bg-red-50"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "Bank-level security with encryption, access controls, and compliance with industry standards.",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Product Manager",
      company: "TechCorp",
      avatar: "SC",
      content: "This platform has revolutionized how we create documentation. The AI suggestions are incredibly accurate.",
      rating: 5
    },
    {
      name: "Mike Johnson",
      role: "Technical Lead",
      company: "DevStudio",
      avatar: "MJ",
      content: "The collaboration features are game-changing. Our team productivity has increased by 40%.",
      rating: 5
    },
    {
      name: "Emma Davis",
      role: "Marketing Director",
      company: "GrowthCo",
      avatar: "ED",
      content: "AI-generated content saves us hours every week. The quality is consistently excellent.",
      rating: 5
    }
  ];

  const stats = [
    { label: "Documents Generated", value: "50K+", icon: FileText },
    { label: "Active Users", value: "10K+", icon: Users },
    { label: "AI Score", value: "94%", icon: Star },
    { label: "Time Saved", value: "500K+ hrs", icon: Clock }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      {/* Hero Section */}
      <div className="container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <Badge className="bg-purple-100 text-purple-800 border-purple-200 px-4 py-2">
              <Sparkles className="w-4 h-4 mr-2" />
              AI-Powered Platform
            </Badge>
          </div>
          <h1 className="text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Create Documents with
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> AI Intelligence</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
            Transform how you create, edit, and collaborate on documents. Our AI-powered platform
            generates professional content, provides smart suggestions, and enables seamless team collaboration.
          </p>
          <div className="flex gap-4 justify-center mb-8">
            <Link to="/dashboard">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 px-8 py-3">
                <Play className="w-5 h-5 mr-2" />
                Try Dashboard
              </Button>
            </Link>
            <Link to="/ai-generator">
              <Button size="lg" variant="outline" className="px-8 py-3">
                <Sparkles className="w-5 h-5 mr-2" />
                AI Generator
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <stat.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 border-0 shadow-md">
              <CardHeader>
                <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Demo Section */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">See It In Action</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Explore our demo pages to experience the full power of AI-driven document creation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <CardTitle>Dashboard Overview</CardTitle>
                <CardDescription>
                  Comprehensive dashboard with document analytics, AI insights, and team collaboration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/dashboard">
                  <Button className="w-full group-hover:bg-blue-600 transition-colors">
                    Explore Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-100 transition-colors">
                  <Edit3 className="w-6 h-6 text-green-600" />
                </div>
                <CardTitle>Document Editor</CardTitle>
                <CardDescription>
                  Advanced editor with AI assistance, real-time collaboration, and smart formatting
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/editor">
                  <Button className="w-full group-hover:bg-green-600 transition-colors">
                    Try Editor
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-100 transition-colors">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <CardTitle>AI Generator</CardTitle>
                <CardDescription>
                  Create documents from templates or custom prompts with AI-powered generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/ai-generator">
                  <Button className="w-full group-hover:bg-purple-600 transition-colors">
                    Generate Content
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group">
              <CardHeader>
                <div className="w-12 h-12 bg-gray-50 rounded-lg flex items-center justify-center mb-4 group-hover:bg-gray-100 transition-colors">
                  <Github className="w-6 h-6 text-gray-600" />
                </div>
                <CardTitle>GitHub Connect</CardTitle>
                <CardDescription>
                  Connect your GitHub repositories to fetch files and generate documentation with AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/github-connect">
                  <Button className="w-full group-hover:bg-gray-600 transition-colors">
                    Connect GitHub
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Testimonials */}
        <div className="mb-16">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Loved by Teams Worldwide</h2>
            <p className="text-xl text-gray-600">
              See what our users have to say about their experience
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center mb-4">
                    <Avatar className="w-12 h-12 mr-4">
                      <AvatarImage src="" />
                      <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{testimonial.name}</h4>
                      <p className="text-sm text-gray-600">{testimonial.role} at {testimonial.company}</p>
                      <div className="flex items-center mt-1">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 text-yellow-400 fill-current" />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 italic">"{testimonial.content}"</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Your Workflow?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of teams who are already creating better documents faster with AI assistance.
          </p>
          <div className="flex gap-4 justify-center">
            <Link to="/dashboard">
              <Button size="lg" variant="secondary" className="px-8 py-3">
                <Play className="w-5 h-5 mr-2" />
                Start Free Trial
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="px-8 py-3 border-white text-white hover:bg-white hover:text-blue-600">
              <MessageSquare className="w-5 h-5 mr-2" />
              Schedule Demo
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
