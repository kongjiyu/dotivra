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
    messages?: ChatMessage[];
    onSend?: (message: string) => void;
    suggestions?: string[];
}

export default function ChatSidebar({
    open,
    onClose,
    messages: externalMessages,
    onSend,
    suggestions,
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
                <CardContent className="flex-1 flex flex-col p-0 overflow-hidden relative">
                    {/* Messages */}
                    <div className="flex-1 overflow-hidden">
                        <ScrollArea className="h-full px-4 py-3">
                            <div ref={listRef} className="space-y-3 relative">
                                {messages.map((m) => (
                                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div
                                            className={`${m.role === "user"
                                                ? "bg-blue-600 text-white"
                                                : "bg-gray-100 text-gray-900 border border-gray-200"
                                                } rounded-lg px-3 py-2 max-w-[85%] text-[0.95rem] leading-relaxed whitespace-pre-wrap break-words`}
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
                                        className="text-xs h-8 px-2 border-purple-200 hover:bg-purple-50 bg-white/95 backdrop-blur"
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
