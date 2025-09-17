import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Sparkles, SendHorizonal } from "lucide-react";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: number;
};

interface ChatSidebarProps {
    open: boolean;
    onClose: () => void;
    initialSuggestions?: string[];
    messages?: ChatMessage[];
    onSend?: (message: string) => void;
}

export default function ChatSidebar({
    open,
    onClose,
    initialSuggestions = [],
    messages: externalMessages,
    onSend,
}: ChatSidebarProps) {
    const [input, setInput] = useState("");
    const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
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
                content: 'Hello! I\'m your AI writing assistant. I can help you improve your document, create summaries, or answer questions about your content. How can I assist you today?',
                timestamp: Date.now(),
            };
            setInternalMessages([helloMsg]);
        }
    }, [open, externalMessages, internalMessages.length]);

    const handleSuggestionClick = (suggestion: string) => {
        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: suggestion, timestamp: Date.now() };
        const assistantMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: generateMockResponse(suggestion),
            timestamp: Date.now(),
        };
        setInternalMessages((prev) => [...prev, userMsg, assistantMsg]);
    };

    const generateMockResponse = (suggestion: string): string => {
        if (suggestion.toLowerCase().includes('metrics')) {
            return 'I suggest adding specific KPIs like conversion rates, customer acquisition cost, and user retention metrics. You could also include quarterly targets and measurement methodologies.';
        }
        if (suggestion.toLowerCase().includes('executive summary')) {
            return 'The executive summary is well-structured. Consider adding a brief competitive analysis section and highlighting your unique value proposition more prominently.';
        }
        if (suggestion.toLowerCase().includes('competitor')) {
            return 'For competitor analysis, I recommend including market positioning, pricing strategies, and feature comparisons. You might also want to add a SWOT analysis matrix.';
        }
        return `Great suggestion! Based on "${suggestion}", I recommend focusing on actionable insights and measurable outcomes. Would you like me to help you develop this further?`;
    };

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

    const handleSend = () => {
        const text = input.trim();
        if (!text) return;

        if (onSend) {
            onSend(text);
        } else {
            // Local echo with a mocked assistant reply
            const userMsg: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text, timestamp: Date.now() };
            const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `Got it. Here's an improvement suggestion based on your input: "${text}". You can ask for a rewrite, summary, or outline.`,
                timestamp: Date.now(),
            };
            setInternalMessages((prev) => [...prev, userMsg, assistantMsg]);
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
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                    {/* Messages */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full px-4 py-3">
                            <div ref={listRef} className="space-y-3">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`${m.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-900 border border-gray-200"
                                                } rounded-lg px-3 py-2 max-w-[85%] text-[0.95rem] leading-relaxed`}
                                        >
                                            {m.content}
                                        </div>
                                    </div>
                                ))}
                                {messages.length === 0 && (
                                    <div className="text-sm text-gray-500">Ask for a summary, rewrite a section, or request suggestions.</div>
                                )}
                                {/* Scroll anchor */}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </div>                    {/* Quick Suggestions - now above chat input with animations */}
                    {messages.length === 1 && messages[0].role === 'assistant' && initialSuggestions.length > 0 && (
                        <div className="border-t border-gray-100 p-4 bg-purple-50/30 animate-in slide-in-from-bottom-4 duration-500">
                            <p className="text-xs text-gray-600 mb-3 font-medium">Quick suggestions:</p>
                            <div className="space-y-2">
                                {initialSuggestions.map((suggestion, idx) => (
                                    <div
                                        key={idx}
                                        className="animate-in slide-in-from-left-2 duration-300"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full justify-start text-left h-auto py-3 px-4 bg-white border-purple-200 hover:bg-purple-50 hover:border-purple-300 text-sm shadow-sm transition-all duration-200 hover:shadow-md transform hover:scale-[1.02]"
                                            onClick={() => handleSuggestionClick(suggestion)}
                                        >
                                            {suggestion}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Composer */}
                    <div className="p-3 border-t border-gray-200">
                        <div className="flex items-center gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Type your request..."
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                            />
                            <Button onClick={handleSend} className="bg-purple-600 hover:bg-purple-700">
                                <SendHorizonal className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
