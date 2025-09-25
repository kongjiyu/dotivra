import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Sparkles, SendHorizonal, Wand2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useDocument } from "@/context/DocumentContext";
import { EnhancedAIContentWriter } from "@/utils/enhancedAIContentWriter";
import type { ContentPosition } from "@/utils/enhancedAIContentWriter";

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
    const listRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [aiWriter, setAIWriter] = useState<EnhancedAIContentWriter | null>(null);

    // Get AI actions function from document context
    const { showAIActions, documentContent } = useDocument();

    // Store current operation ID for accept/reject functionality
    const [currentChatOperationId, setCurrentChatOperationId] = useState<string | null>(null);

    // Debug context values
    useEffect(() => {
        console.log('🔍 ChatSidebar: showAIActions changed to:', !!showAIActions, 'function:', showAIActions);
        console.log('🔍 ChatSidebar: documentContent available:', !!documentContent);
    }, [showAIActions, documentContent]);

    // Combine external messages (if any) with internal state
    const messages = useMemo(() => externalMessages ?? internalMessages, [externalMessages, internalMessages]);

    // Add initial hello message when chat opens
    useEffect(() => {
        if (open && !externalMessages && internalMessages.length === 0) {
            const helloMsg: ChatMessage = {
                id: 'hello-msg',
                role: 'assistant',
                content: 'Hello! I\'m your AI writing assistant. I can help you improve your document, create summaries, or answer questions about your content.\n\n**Special AI Operations:**\n• Type `*add` to add new content\n• Type `*remove` to mark content for removal\n• Type `*edit` to replace existing content\n\nThese operations will show highlighted changes in your document with accept/reject options. How can I assist you today?',
                timestamp: Date.now(),
            };
            setInternalMessages([helloMsg]);
        }
    }, [open, externalMessages, internalMessages.length]);

    // Initialize AI Writer when editor is available
    useEffect(() => {
        if (editor && !aiWriter) {
            setAIWriter(new EnhancedAIContentWriter(editor));
        }
    }, [editor, aiWriter]);

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

    // AI Operations Functions
    const executeAIAddOperation = async (): Promise<string> => {
        if (!aiWriter || !editor) throw new Error('Editor not available');

        // Get current cursor position
        const { from } = editor.state.selection;
        const position: ContentPosition = {
            from,
            to: from,
            length: 0
        };

        // Generate content to add
        const newContent = `\n\n### New AI-Generated Section\n\nThis section was added through AI operations. It demonstrates how content can be intelligently inserted at specific positions within your document.\n\n**Key Features:**\n- Smart positioning\n- Context awareness\n- Interactive review process\n\n`;

        // Execute the add operation
        const changeId = await aiWriter.addContentAtPosition(position, newContent);
        return changeId;
    };

    const executeAIRemoveOperation = async (): Promise<string> => {
        if (!aiWriter || !editor) throw new Error('Editor not available');

        // Try to find content to remove - look for a heading or paragraph
        const doc = editor.state.doc;
        let targetPosition: ContentPosition | null = null;

        // Find the first non-empty paragraph or heading to remove
        doc.descendants((node, pos) => {
            if (!targetPosition && node.type.name === 'paragraph' && node.textContent.trim().length > 50) {
                targetPosition = {
                    from: pos,
                    to: pos + node.nodeSize,
                    length: node.nodeSize,
                    text: node.textContent
                };
                return false; // Stop iteration
            }
            return true;
        });

        if (!targetPosition) {
            // Fallback: mark current selection or cursor line
            const { from, to } = editor.state.selection;
            targetPosition = { from, to: to || from + 10, length: (to || from + 10) - from };
        }

        // Execute the remove operation
        const changeId = await aiWriter.markContentForRemoval(targetPosition);
        return changeId;
    };

    const executeAIEditOperation = async (): Promise<string> => {
        if (!aiWriter || !editor) throw new Error('Editor not available');

        // Find content to edit - look for the first paragraph
        const doc = editor.state.doc;
        let foundPosition: ContentPosition | null = null;

        doc.descendants((node, pos) => {
            if (!foundPosition && node.type.name === 'paragraph' && node.textContent.trim().length > 20) {
                foundPosition = {
                    from: pos,
                    to: pos + node.nodeSize,
                    length: node.nodeSize
                };
                return false; // Stop iteration
            }
            return true;
        });

        if (!foundPosition) {
            throw new Error('No suitable content found to edit');
        }

        // Type assertion to help TypeScript understand the type
        const position = foundPosition as ContentPosition;

        // Generate improved content
        const originalText = editor.state.doc.textBetween(position.from, position.to);
        const improvedContent = `${originalText.trim()} Additionally, this content has been enhanced with AI-powered improvements, including better structure, clarity, and comprehensive details.`;

        // Execute the replace operation
        const changeId = await aiWriter.replaceContentWithHighlights(position, improvedContent);
        return changeId;
    };

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

    // Regular AI content generation now uses EnhancedAIContentWriter for consistency

    const handleSend = async () => {
        const text = input.trim();
        if (!text) return;

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
                // Check for special AI operation commands
                if (text.toLowerCase() === '*add') {
                    const operationId = await executeAIAddOperation();
                    setCurrentChatOperationId(operationId);

                    // Store operation ID globally so DocumentEditor can access it
                    (window as any).currentChatOperationId = operationId;
                    (window as any).currentChatAIWriter = aiWriter;

                    // Show AI actions for the operation with a slight delay to ensure content is rendered
                    console.log('🎯 About to show AI actions. showAIActions:', showAIActions, 'type:', typeof showAIActions, 'documentContent:', documentContent);
                    setTimeout(() => {
                        let actionFunction = showAIActions;

                        // Fallback to global function if context function is not available
                        if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                            console.log('🔧 Using fallback global showAIActions function');
                            actionFunction = (window as any).currentShowAIActionsFunction;
                        }

                        if (actionFunction && typeof actionFunction === 'function') {
                            console.log('✅ Calling showAIActions for *add operation');
                            try {
                                console.log('🚀 Calling actionFunction with params:', {
                                    content: "New content added via *add command",
                                    beforeContent: documentContent
                                });
                                actionFunction("New content added via *add command", documentContent);
                            } catch (error) {
                                console.error('❌ Error calling showAIActions:', error);
                            }
                        } else {
                            console.error('❌ showAIActions is not available!', {
                                contextFunction: showAIActions,
                                globalFunction: (window as any).currentShowAIActionsFunction,
                                type: typeof showAIActions,
                                isFunction: typeof showAIActions === 'function'
                            });
                        }
                    }, 300);

                    const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "✅ ADD Operation executed! New content has been added to your document with green highlighting. Use the action buttons to accept or reject the changes.",
                        timestamp: Date.now(),
                    };
                    setInternalMessages(prev => [...prev, assistantMsg]);
                } else if (text.toLowerCase() === '*remove') {
                    const operationId = await executeAIRemoveOperation();
                    setCurrentChatOperationId(operationId);

                    // Store operation ID globally so DocumentEditor can access it
                    (window as any).currentChatOperationId = operationId;
                    (window as any).currentChatAIWriter = aiWriter;

                    // Show AI actions for the operation with a slight delay to ensure content is rendered
                    console.log('🎯 About to show AI actions for *remove. showAIActions:', showAIActions, 'type:', typeof showAIActions);
                    setTimeout(() => {
                        let actionFunction = showAIActions;

                        // Fallback to global function if context function is not available
                        if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                            console.log('🔧 Using fallback global showAIActions function for *remove');
                            actionFunction = (window as any).currentShowAIActionsFunction;
                        }

                        if (actionFunction && typeof actionFunction === 'function') {
                            console.log('✅ Calling showAIActions for *remove operation');
                            try {
                                actionFunction("Content marked for removal via *remove command", documentContent);
                            } catch (error) {
                                console.error('❌ Error calling showAIActions for *remove:', error);
                            }
                        } else {
                            console.error('❌ showAIActions is not available for *remove!', {
                                contextFunction: showAIActions,
                                globalFunction: (window as any).currentShowAIActionsFunction,
                                type: typeof showAIActions,
                                isFunction: typeof showAIActions === 'function'
                            });
                        }
                    }, 300);

                    const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "🗑️ REMOVE Operation executed! Content has been marked for removal with red highlighting. Use the action buttons to accept or reject the changes.",
                        timestamp: Date.now(),
                    };
                    setInternalMessages(prev => [...prev, assistantMsg]);
                } else if (text.toLowerCase() === '*edit') {
                    const operationId = await executeAIEditOperation();
                    setCurrentChatOperationId(operationId);

                    // Store operation ID globally so DocumentEditor can access it
                    (window as any).currentChatOperationId = operationId;
                    (window as any).currentChatAIWriter = aiWriter;

                    // Show AI actions for the operation with a slight delay to ensure content is rendered
                    console.log('🎯 About to show AI actions for *edit. showAIActions:', showAIActions, 'type:', typeof showAIActions);
                    setTimeout(() => {
                        let actionFunction = showAIActions;

                        // Fallback to global function if context function is not available
                        if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                            console.log('🔧 Using fallback global showAIActions function for *edit');
                            actionFunction = (window as any).currentShowAIActionsFunction;
                        }

                        if (actionFunction && typeof actionFunction === 'function') {
                            console.log('✅ Calling showAIActions for *edit operation');
                            try {
                                actionFunction("Content edited via *edit command", documentContent);
                            } catch (error) {
                                console.error('❌ Error calling showAIActions for *edit:', error);
                            }
                        } else {
                            console.error('❌ showAIActions is not available for *edit!', {
                                contextFunction: showAIActions,
                                globalFunction: (window as any).currentShowAIActionsFunction,
                                type: typeof showAIActions,
                                isFunction: typeof showAIActions === 'function'
                            });
                        }
                    }, 300);

                    const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "🔄 EDIT Operation executed! Content has been replaced with dual highlighting (red for original, green for new). Use the action buttons to accept or reject the changes.",
                        timestamp: Date.now(),
                    };
                    setInternalMessages(prev => [...prev, assistantMsg]);
                } else {
                    // Regular AI content generation using EnhancedAIContentWriter
                    const aiResponse = await generateAIContent(text);

                    if (aiWriter && editor && aiResponse) {
                        // Get current cursor position
                        const { from } = editor.state.selection;
                        const position: ContentPosition = {
                            from,
                            to: from,
                            length: 0
                        };

                        // Use the AI writer to add content with proper highlighting
                        const operationId = await aiWriter.addContentAtPosition(position, `\n\n${aiResponse}`);
                        setCurrentChatOperationId(operationId);

                        // Store operation ID globally so DocumentEditor can access it
                        (window as any).currentChatOperationId = operationId;
                        (window as any).currentChatAIWriter = aiWriter;

                        // Show AI actions for the operation with a slight delay to ensure content is rendered
                        console.log('🎯 About to show AI actions for regular AI. showAIActions:', showAIActions);
                        setTimeout(() => {
                            if (showAIActions) {
                                console.log('✅ Calling showAIActions for regular AI operation');
                                showAIActions(`AI Response: ${text}`, documentContent);
                            } else {
                                console.error('❌ showAIActions is undefined for regular AI!');
                            }
                        }, 300);
                    }                    // Add confirmation message 
                    const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "✨ AI content preview generated and highlighted in your document. Review the green-highlighted content and use the action container to accept, reject, or regenerate.",
                        timestamp: Date.now(),
                    };

                    setInternalMessages(prev => [...prev, assistantMsg]);
                }
            } catch (error) {
                console.error('Error processing request:', error);
                const errorMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again.`,
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
                                {isGenerating && (
                                    <div className="flex justify-start">
                                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 text-gray-900 border-2 border-purple-200 rounded-lg px-4 py-3 max-w-[85%] text-[0.95rem] leading-relaxed">
                                            <div className="flex items-center space-x-3">
                                                <div className="flex space-x-1">
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                                </div>
                                                <span className="text-sm font-medium text-purple-700">
                                                    AI is thinking...
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
                                    "*add",
                                    "*remove",
                                    "*edit",
                                    "Improve content",
                                    "Add summary",
                                ]).slice(0, 5).map((s, idx) => (
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
        </div>
    );
}
