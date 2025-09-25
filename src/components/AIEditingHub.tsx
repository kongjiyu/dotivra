import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Bot, Palette, MessageSquare, FileText } from 'lucide-react';

export default function AIEditingHub() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                        🤖 Enhanced AI Editing System
                    </h1>
                    <p className="text-xl text-gray-600 mb-2">
                        Interactive demonstrations of the new AI content editing capabilities
                    </p>
                    <p className="text-gray-500">
                        Test addition, editing, removal, and replacement operations with visual feedback
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 mb-8">
                    {/* Integrated Editor Demo */}
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate('/integrated-demo')}>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                                <FileText className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Real Editor Integration
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Full TipTap editor with AI editing capabilities. Test real-world scenarios with actual editor functionality.
                                </p>
                                <div className="space-y-1 text-sm text-gray-500 mb-4">
                                    <div>• Real TipTap editor instance</div>
                                    <div>• Live AI editing operations</div>
                                    <div>• Production-ready implementation</div>
                                    <div>• Complete undo/redo support</div>
                                </div>
                                <Button className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
                                    <FileText className="w-4 h-4 mr-2" />
                                    Open Editor Demo
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Chat Simulator */}
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate('/chat-simulator')}>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                                <MessageSquare className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Interactive Chat Simulator
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Simulate real chat interactions with AI editing commands. Type commands to see live document editing.
                                </p>
                                <div className="grid grid-cols-2 gap-1 text-xs text-gray-500 mb-4">
                                    <span>• <code className="bg-gray-100 px-1 py-0.5 rounded">*add</code> - Add</span>
                                    <span>• <code className="bg-gray-100 px-1 py-0.5 rounded">*edit</code> - Edit</span>
                                    <span>• <code className="bg-gray-100 px-1 py-0.5 rounded">*remove</code> - Remove</span>
                                    <span>• <code className="bg-gray-100 px-1 py-0.5 rounded">*test</code> - Test all</span>
                                </div>
                                <Button className="w-full">
                                    <Bot className="w-4 h-4 mr-2" />
                                    Start Chat Simulation
                                </Button>
                            </div>
                        </div>
                    </Card>

                    {/* Visual Demo */}
                    <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
                        onClick={() => navigate('/ai-editing-demo')}>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg">
                                <Palette className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Visual Components Demo
                                </h3>
                                <p className="text-gray-600 mb-4">
                                    Test enhanced UI components and visual feedback system with pre-styled examples.
                                </p>
                                <div className="space-y-1 text-sm text-gray-500 mb-4">
                                    <div>• Color-coded highlighting</div>
                                    <div>• Accept/reject controls</div>
                                    <div>• Operation-specific UI</div>
                                    <div>• Keyboard shortcuts</div>
                                </div>
                                <Button variant="outline" className="w-full">
                                    <Palette className="w-4 h-4 mr-2" />
                                    View Visual Demo
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>                {/* Features Overview */}
                <Card className="p-6 bg-white/50 backdrop-blur-sm">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        System Features Overview
                    </h2>

                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-green-700 font-bold">+</span>
                            </div>
                            <h4 className="font-semibold text-green-800">Addition</h4>
                            <p className="text-sm text-green-600">Green highlighting for new content</p>
                        </div>

                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-blue-700 font-bold">✎</span>
                            </div>
                            <h4 className="font-semibold text-blue-800">Editing</h4>
                            <p className="text-sm text-blue-600">Blue highlighting for modifications</p>
                        </div>

                        <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="w-12 h-12 bg-red-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-red-700 font-bold">−</span>
                            </div>
                            <h4 className="font-semibold text-red-800">Removal</h4>
                            <p className="text-sm text-red-600">Red highlighting for deletions</p>
                        </div>

                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="w-12 h-12 bg-orange-200 rounded-full flex items-center justify-center mx-auto mb-2">
                                <span className="text-orange-700 font-bold">↔</span>
                            </div>
                            <h4 className="font-semibold text-orange-800">Replacement</h4>
                            <p className="text-sm text-orange-600">Orange highlighting for replacements</p>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4">
                        <h3 className="font-semibold mb-2">Technical Implementation:</h3>
                        <ul className="text-sm text-gray-600 space-y-1">
                            <li>• Enhanced <code className="bg-white px-2 py-1 rounded">AIContentWriter</code> class with operation-specific methods</li>
                            <li>• Dynamic CSS class application for visual feedback</li>
                            <li>• Operation-aware UI components with contextual messaging</li>
                            <li>• Accept/reject controls with keyboard shortcuts</li>
                            <li>• Real-time content preview with undo/redo capabilities</li>
                        </ul>
                    </div>
                </Card>

                <div className="text-center mt-8 text-gray-500 text-sm">
                    <p>
                        Enhanced AI Editing System - September 2025
                        <br />
                        Demonstrating next-generation document collaboration with AI assistance
                    </p>
                </div>
            </div>
        </div>
    );
}