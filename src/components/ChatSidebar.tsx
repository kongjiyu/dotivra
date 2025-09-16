import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

    // Combine external messages (if any) with internal state
    const messages = useMemo(() => externalMessages ?? internalMessages, [externalMessages, internalMessages]);

    // Seed suggestions as assistant messages on first open
    useEffect(() => {
        if (open && !externalMessages && internalMessages.length === 0 && initialSuggestions.length > 0) {
            setInternalMessages(
                initialSuggestions.map((s, idx) => ({
                    id: `suggestion-${idx}`,
                    role: "assistant",
                    content: s,
                    timestamp: Date.now(),
                }))
            );
        }
    }, [open, externalMessages, internalMessages.length, initialSuggestions]);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages.length, open]);

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
                <CardContent className="flex-1 flex flex-col p-0">
                    {/* Messages */}
                    <div ref={listRef} className="flex-1 overflow-auto px-4 py-3 space-y-3">
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
                    </div>

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
