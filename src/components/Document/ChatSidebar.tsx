import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Sparkles, SendHorizonal, Wand2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { writeAIContent, streamAIContent } from "@/utils/aiContentWriter";
import AIPreviewModal from "./AIPreviewModal";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: number;
};

interface ChatSidebarProps {
    open: boolean;
    onClose: () => void;
    messages?: ChatMessage[];
    onSend?: (message: string) => void;
    suggestions?: string[];
    editor?: Editor; // Add editor prop for AI content integration
    initialMessage?: string; // Add initial message prop
}

export default function ChatSidebar({
    open,
    onClose,
    messages: externalMessages,
    onSend,
    suggestions,
    editor,
    initialMessage,
}: ChatSidebarProps) {
    const [input, setInput] = useState("");
    const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewContent, setPreviewContent] = useState("");
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [lastPrompt, setLastPrompt] = useState("");
    const listRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Combine external messages (if any) with internal state
    const messages = useMemo(() => externalMessages ?? internalMessages, [externalMessages, internalMessages]);

    // Add initial hello message when chat opens
    useEffect(() => {
        if (open && !externalMessages && internalMessages.length === 0) {
            const helloMsg: ChatMessage = {
                id: 'hello-msg',
                role: 'assistant',
                content: 'Hello! I\'m your AI writing assistant. I can help you improve your document, create summaries, or answer questions about your content. When I generate content, it will appear directly in your document for you to review and accept. How can I assist you today?',
                timestamp: Date.now(),
            };
            setInternalMessages([helloMsg]);
        }
    }, [open, externalMessages, internalMessages.length]);

    // Handle initial message from context menu
    useEffect(() => {
        if (open && initialMessage && initialMessage.trim()) {
            setInput(initialMessage);
        }
    }, [open, initialMessage]);

    // Suggestions UI removed per request; associated helpers removed.

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        };

        // Small delay to ensure DOM is updated
        const timeoutId = setTimeout(scrollToBottom, 100);

        return () => clearTimeout(timeoutId);
    }, [messages.length, messages, open]);

    // AI Content Generation Functions
    const generateAIContent = async (prompt: string): Promise<string> => {
        // Simulate AI response for now - replace with actual AI API call
        return new Promise((resolve) => {
            setTimeout(() => {
                const responses = {
                    'summary': `## Summary\n\nThis document provides a comprehensive overview of the key points discussed. The main themes include strategic planning, implementation guidelines, and success metrics.\n\n### Key Points:\n- Strategic alignment with business objectives\n- Clear implementation roadmap\n- Measurable success criteria\n- Risk mitigation strategies`,
                    'improve': `**Enhanced Structure:**\n1. **Clear Introduction** - Set the context and objectives\n2. **Main Content** - Develop your ideas with supporting evidence\n3. **Actionable Conclusion** - Provide clear next steps\n\n**Writing Improvements:**\n- Use active voice for clarity\n- Include specific examples\n- Add transition sentences between sections\n- Strengthen your conclusion with concrete recommendations`,
                    'outline': `# Document Outline\n\n## I. Executive Summary\n   - Key objectives\n   - Main recommendations\n   - Expected outcomes\n\n## II. Background & Context\n   - Current situation analysis\n   - Problem statement\n   - Scope and limitations\n\n## III. Main Content\n   A. Analysis and findings\n   B. Proposed solutions\n   C. Implementation plan\n\n## IV. Conclusion & Next Steps\n   - Summary of recommendations\n   - Action items\n   - Timeline and milestones`,
                    'default': `**Content Enhancement:**\n- Add more specific examples to support your points\n- Include relevant data or statistics\n- Consider adding visual elements like charts or diagrams\n\n**Structure Improvements:**\n- Use clear headings to organize content\n- Add transition sentences between sections\n- Include a strong conclusion\n\n**Style Suggestions:**\n- Write in active voice\n- Use concise, clear language\n- Vary sentence length for better flow`
                };

                const key = Object.keys(responses).find(k => prompt.toLowerCase().includes(k)) || 'default';
                resolve(responses[key as keyof typeof responses]);
            }, 1500);
        });
    };

    const showPreviewInEditor = async (content: string) => {
        if (!editor) return;

        try {
            // Insert the content into the editor with animation
            await insertContentToEditor(content, {
                animate: true,
                parseMarkdown: true,
                position: 'current'
            });

            // Store the content and show the modal
            setPreviewContent(content);
            setShowPreviewModal(true);
        } catch (error) {
            console.error('Error showing preview in editor:', error);
        }
    };

    const handleAcceptPreview = () => {
        // Content is already in the editor, just close the modal
        setShowPreviewModal(false);
        setPreviewContent("");

        // Update chat to show acceptance
        const confirmMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "✅ AI content accepted and added to your document.",
            timestamp: Date.now(),
        };
        setInternalMessages(prev => [...prev, confirmMsg]);
    };

    const handleRejectPreview = () => {
        // Undo the content insertion
        if (editor) {
            editor.commands.undo();
        }

        setShowPreviewModal(false);
        setPreviewContent("");

        // Update chat to show rejection
        const rejectMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "❌ AI content rejected. No changes made to your document.",
            timestamp: Date.now(),
        };
        setInternalMessages(prev => [...prev, rejectMsg]);
    };

    const handleRegenerateContent = async () => {
        if (!lastPrompt || !editor) return;

        setIsRegenerating(true);

        try {
            // Undo the current content first
            editor.commands.undo();

            // Generate new content with the same prompt
            const newContent = await generateAIContent(lastPrompt);

            // Insert the new content
            await insertContentToEditor(newContent, {
                animate: true,
                parseMarkdown: true,
                position: 'current'
            });

            // Update the preview content
            setPreviewContent(newContent);

        } catch (error) {
            console.error('Error regenerating content:', error);
        } finally {
            setIsRegenerating(false);
        }
    };

    const insertContentToEditor = async (content: string, options: {
        animate?: boolean;
        position?: 'current' | 'end' | 'start';
        parseMarkdown?: boolean;
    } = {}) => {
        if (!editor) return;

        const { animate = true, position = 'current', parseMarkdown = true } = options;

        try {
            if (animate) {
                await streamAIContent(editor, content, {
                    position,
                    parseMarkdown,
                    streamDelay: 20,
                    focus: true
                });
            } else {
                await writeAIContent(editor, content, {
                    position,
                    parseMarkdown,
                    focus: true
                });
            }
        } catch (error) {
            console.error('Error inserting content to editor:', error);
        }
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

        // Store the prompt for potential regeneration
        setLastPrompt(text);

        // Add user message
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: text,
            timestamp: Date.now()
        };

        if (onSend) {
            onSend(text);
        } else {
            setInternalMessages(prev => [...prev, userMsg]);
            setIsGenerating(true);

            try {
                // Generate AI response
                const aiResponse = await generateAIContent(text);

                // Trigger preview in the document editor instead of showing in chat
                if (editor && aiResponse) {
                    await showPreviewInEditor(aiResponse);
                }

                // Add confirmation message 
                const assistantMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "✨ AI content preview shown in document. Review and choose your action in the modal above.",
                    timestamp: Date.now(),
                };

                setInternalMessages(prev => [...prev, assistantMsg]);
            } catch (error) {
                console.error('Error generating AI content:', error);
                const errorMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "I'm sorry, I encountered an error while generating content. Please try again.",
                    timestamp: Date.now(),
                };
                setInternalMessages(prev => [...prev, errorMsg]);
            } finally {
                setIsGenerating(false);
            }
        }
        setInput("");
    };

    if (!open) return null;

    return (
        <div className="h-full flex flex-col">
            <Card className="h-full flex flex-col">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                        AI Assistant
                    </CardTitle>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                        <X className="w-4 h-4" />
                    </Button>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                    {/* Messages */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full px-4 py-3">
                            <div ref={listRef} className="space-y-3 relative">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`${m.role === "user" ? "max-w-[85%]" : "max-w-[95%]"} space-y-2`}>
                                            <div
                                                className={`${m.role === "user"
                                                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg"
                                                    : m.content.includes("✅")
                                                        ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-200 shadow-sm"
                                                        : m.content.includes("❌")
                                                            ? "bg-gradient-to-r from-red-50 to-pink-50 text-red-800 border-2 border-red-200 shadow-sm"
                                                            : m.content.includes("✨")
                                                                ? "bg-gradient-to-r from-purple-50 to-blue-50 text-purple-800 border-2 border-purple-200 shadow-sm"
                                                                : "bg-gray-100 text-gray-900 border border-gray-200"
                                                    } rounded-lg px-3 py-2 text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words transition-all duration-200 hover:scale-[1.02]`}
                                            >
                                                {m.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && (
                                    <div className="text-sm text-gray-500">Ask for a summary, rewrite a section, or request suggestions.</div>
                                )}

                                {/* Scroll anchor */}
                                <div ref={messagesEndRef} />

                                {/* Loading indicator */}
                                {(isGenerating || isRegenerating) && (
                                    <div className="flex justify-start">
                                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900 border-2 border-purple-200 rounded-lg px-4 py-3 max-w-[85%] text-[0.95rem] leading-relaxed">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                </div>
                                                <span className="text-sm font-medium text-purple-700">
                                                    {isRegenerating ? 'AI is regenerating content...' : 'AI is thinking...'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Floating Quick Suggestions - positioned just above the composer */}
                    {(suggestions?.length ?? 0) > 0 && input.length === 0 && !messages.some(m => m.role === 'user') && (
                        <div className="px-3 pb-2">
                            <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                {(suggestions ?? [
                                    "Strengthen success metrics",
                                    "Review executive summary",
                                    "Add competitor analysis",
                                ]).slice(0, 4).map((s, idx) => (
                                    <Button
                                        key={`${idx}-${s.slice(0, 12)}`}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-8 px-3 border-2 border-purple-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-300 bg-white/95 backdrop-blur transition-all duration-200 hover:scale-105 hover:shadow-md"
                                        onClick={() => {
                                            setInput(s);
                                            setTimeout(() => handleSend(), 0);
                                        }}
                                    >
                                        {s}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    )}


                    {/* Composer */}
                    <div className="p-3 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                        <div className="flex items-center gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isGenerating ? "AI is generating..." : "Type your request..."}
                                disabled={isGenerating}
                                className="flex-1 border-2 focus:border-purple-300 focus:ring-purple-200 transition-all duration-200"
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey && !isGenerating) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={isGenerating || !input.trim()}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-300 shadow-lg transition-all duration-200 hover:scale-105"
                            >
                                {isGenerating ? (
                                    <Wand2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <SendHorizonal className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* AI Preview Modal */}
            <AIPreviewModal
                open={showPreviewModal}
                onAccept={handleAcceptPreview}
                onReject={handleRejectPreview}
                onRegenerate={handleRegenerateContent}
                contentPreview={previewContent}
                isRegenerating={isRegenerating}
            />
        </div>
    );
}
