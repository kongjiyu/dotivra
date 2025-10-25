import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Sparkles, SendHorizonal, Wand2, Wrench, Loader2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useDocument } from "@/context/DocumentContext";
import { EnhancedAIContentWriter } from "@/utils/enhancedAIContentWriter";
import { aiService } from "@/services/aiService";
import { useAuth } from "@/context/AuthContext";
import { marked } from "marked";
import { mcpService, type MCPToolCall } from "@/services/mcpService";
import { chatHistoryService } from "@/services/chatHistoryService";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp?: number;
    toolCalls?: MCPToolCall[]; // Add MCP tool calls
    type?: 'user' | 'assistant' | 'tool-use' | 'tool-response' | 'progress';
    progressStage?: 'planning' | 'reasoning' | 'execution' | 'summary';
    isTemporary?: boolean; // For progress messages that will be removed
    toolReason?: string; // Reason for tool usage
    toolResult?: string; // Result from tool execution
};

/**
 * Parse AI response with progressive thinking markers into structured messages
 */
function parseProgressiveResponse(response: string, baseTimestamp: number): ChatMessage[] {
    const messages: ChatMessage[] = [];
    let currentId = Date.now();

    // Split by emoji markers while preserving the marker
    const sections = response.split(/(?=📋|🤔|⚙️|💭|✅|✨)/);

    for (const section of sections) {
        const trimmed = section.trim();
        if (!trimmed) continue;

        // Planning phase
        if (trimmed.startsWith('📋 Planning:')) {
            messages.push({
                id: `progress-${currentId++}`,
                role: 'assistant',
                content: trimmed.replace('📋 Planning:', '').trim(),
                timestamp: baseTimestamp,
                type: 'progress',
                progressStage: 'planning',
                isTemporary: true
            });
        }
        // Reasoning phase
        else if (trimmed.startsWith('🤔 Reasoning:')) {
            messages.push({
                id: `progress-${currentId++}`,
                role: 'assistant',
                content: trimmed.replace('🤔 Reasoning:', '').trim(),
                timestamp: baseTimestamp,
                type: 'progress',
                progressStage: 'reasoning',
                isTemporary: true
            });
        }
        // Execution phase - tool name
        else if (trimmed.startsWith('⚙️ Executing:')) {
            messages.push({
                id: `progress-${currentId++}`,
                role: 'assistant',
                content: trimmed.replace('⚙️ Executing:', '').trim(),
                timestamp: baseTimestamp,
                type: 'tool-use',
                progressStage: 'execution',
                isTemporary: true
            });
        }
        // Tool reason
        else if (trimmed.startsWith('💭 Reason:')) {
            messages.push({
                id: `progress-${currentId++}`,
                role: 'assistant',
                content: trimmed.replace('💭 Reason:', '').trim(),
                timestamp: baseTimestamp,
                type: 'progress',
                progressStage: 'execution',
                toolReason: trimmed.replace('💭 Reason:', '').trim(),
                isTemporary: true
            });
        }
        // Tool result
        else if (trimmed.startsWith('✅ Result:')) {
            messages.push({
                id: `progress-${currentId++}`,
                role: 'assistant',
                content: trimmed.replace('✅ Result:', '').trim(),
                timestamp: baseTimestamp,
                type: 'tool-response',
                progressStage: 'execution',
                toolResult: trimmed.replace('✅ Result:', '').trim(),
                isTemporary: true
            });
        }
        // Summary phase - final message (not temporary)
        else if (trimmed.startsWith('✨ Summary:')) {
            messages.push({
                id: `progress-${currentId++}`,
                role: 'assistant',
                content: trimmed.replace('✨ Summary:', '').trim(),
                timestamp: baseTimestamp,
                type: 'progress',
                progressStage: 'summary',
                isTemporary: false // Keep the summary
            });
        }
        // Regular text (no marker)
        else {
            messages.push({
                id: `msg-${currentId++}`,
                role: 'assistant',
                content: trimmed,
                timestamp: baseTimestamp,
                type: 'assistant'
            });
        }
    }

    return messages;
}

interface ChatSidebarProps {
    open: boolean;
    onClose: () => void;
    messages?: ChatMessage[];
    onSend?: (message: string) => void;
    suggestions?: string[];
    editor?: Editor; // Add editor prop for AI content integration
    initialMessage?: string; // Add initial message prop
    repositoryInfo?: { owner: string; repo: string }; // GitHub repository context
}

export default function ChatSidebar({
    open,
    onClose,
    messages: externalMessages,
    onSend,
    suggestions,
    editor,
    initialMessage,
    repositoryInfo,
}: ChatSidebarProps) {
    const [input, setInput] = useState("");
    const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const listRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const [aiWriter, setAIWriter] = useState<EnhancedAIContentWriter | null>(null);

    // Get document ID from context for MCP operations
    const { documentId } = useDocument();

    // Get user context for repository operations
    const { user } = useAuth();

    // Configure marked for better markdown rendering
    useEffect(() => {
        marked.setOptions({
            breaks: true, // Convert \n to <br>
            gfm: true, // GitHub flavored markdown
        });
    }, []);

    // Combine external messages (if any) with internal state
    const messages = useMemo(() => externalMessages ?? internalMessages, [externalMessages, internalMessages]);

    // Load initial chat history from Firebase when chat opens
    useEffect(() => {
        const loadHistory = async () => {
            if (open && documentId && user?.uid && !externalMessages && internalMessages.length === 0) {
                setIsLoadingHistory(true);
                try {
                    const history = await chatHistoryService.loadInitialHistory(documentId);
                    if (history.length > 0) {
                        setInternalMessages(history);
                    }
                } catch (error) {
                    console.error('Failed to load chat history:', error);
                } finally {
                    setIsLoadingHistory(false);
                }
            }
        };

        loadHistory();
    }, [open, documentId, user?.uid, externalMessages, internalMessages.length]);

    // Load more history when scrolling to top
    useEffect(() => {
        if (!open || !topSentinelRef.current || !scrollViewportRef.current || externalMessages || !documentId) return;

        const observer = new IntersectionObserver(
            async (entries) => {
                const entry = entries[0];
                if (entry.isIntersecting && !isLoadingMore && hasMoreHistory && internalMessages.length > 0) {
                    setIsLoadingMore(true);
                    try {
                        // Get the oldest message (first in array)
                        const oldestMessage = internalMessages[0];
                        const moreMessages = await chatHistoryService.loadMoreHistory(documentId, oldestMessage);

                        if (moreMessages.length > 0) {
                            // Prepend messages (they're already reversed from service)
                            setInternalMessages((prev) => [...moreMessages, ...prev]);
                        } else {
                            // No more history available
                            setHasMoreHistory(false);
                        }
                    } catch (error) {
                        console.error('Failed to load more history:', error);
                    } finally {
                        setIsLoadingMore(false);
                    }
                }
            },
            {
                root: scrollViewportRef.current,
                threshold: 1.0
            }
        );

        observer.observe(topSentinelRef.current);

        return () => {
            observer.disconnect();
        };
    }, [open, isLoadingMore, hasMoreHistory, documentId, externalMessages, internalMessages]);    // Note: Scroll-to-load-more-history feature now implemented with IntersectionObserver

    // Function to render markdown content as HTML with custom code block handling
    const renderMarkdown = (content: string): string => {
        try {
            // First, parse markdown to HTML
            let html = marked.parse(content) as string;

            // Post-process to add topic headers to code blocks
            // Match code blocks with optional language/topic: <pre><code class="language-topic">...
            html = html.replace(
                /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
                (match, language, code) => {
                    // If there's a language/topic specified
                    if (language && language.trim()) {
                        return `<div class="code-block-with-topic">
                            <div class="code-topic-header">${language}</div>
                            <pre class="code-block-pre"><code>${code}</code></pre>
                        </div>`;
                    }
                    // No topic, return standard code block
                    return match;
                }
            );

            return html;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return content; // Fallback to plain text
        }
    };

    // Add initial hello message when chat opens
    useEffect(() => {
        if (open && !externalMessages && internalMessages.length === 0) {
            let content = 'Hello! I\'m your AI writing assistant powered by **Gemini 2.0 Flash** with **MCP (Model Context Protocol)** function calling.\n\n**🔧 7 MCP Document Tools:**\n• **scan_document_content** - Analyze document structure\n• **search_document_content** - Find specific text\n• **get_document_content** - Retrieve document\n• **append_document_content** - Add to end\n• **insert_document_content** - Insert at position\n• **replace_document_content** - Replace text\n• **remove_document_content** - Delete content\n\n**💬 Natural Language Commands:**\nJust tell me what you want, and I\'ll automatically call the right tools:\n\n• "Scan the document structure"\n• "Search for the word \'hello\'"\n• "Append a conclusion paragraph"\n• "Replace the intro with something better"\n• "Remove any TODO items"\n• "Add a summary section at the end"\n• "Insert a new paragraph after the introduction"\n\n**✨ I intelligently decide which tools to use** - you just describe what you need!\n\nHow can I assist with your writing today?';

            if (repositoryInfo) {
                content += `\n\n**🚀 Repository Integration Active!**\n📂 Connected to: \`${repositoryInfo.owner}/${repositoryInfo.repo}\`\n\n**Repository Commands:**\n• "Analyze code in [filename]" - Explain specific files\n• "Improve the React components" - Code improvements\n• "Debug the authentication flow" - Find issues\n• "Explain how routing works" - Understand patterns\n• "Document the API endpoints" - Generate docs\n\nI have access to your repository structure, README, and key files to provide contextual assistance!`;
            }

            content += '\n\nHow can I assist with your writing today?';

            const helloMsg: ChatMessage = {
                id: 'hello-msg',
                role: 'assistant',
                content,
                timestamp: Date.now(),
            };
            setInternalMessages([helloMsg]);
        }
    }, [open, externalMessages, internalMessages.length, repositoryInfo]);

    // Initialize AI Writer when editor is available
    useEffect(() => {
        if (editor && !aiWriter) {
            setAIWriter(new EnhancedAIContentWriter(editor));
        }
    }, [editor, aiWriter]);

    // Handle initial message from context menu
    useEffect(() => {

        if (open && initialMessage && initialMessage.trim()) {

            // Show the message in the input field first
            setInput(initialMessage);

            // Auto-send the initial message after a brief delay
            const autoSend = async () => {

                // Create user message
                const userMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "user",
                    content: initialMessage,
                    timestamp: Date.now()
                };

                // Add user message to chat
                setInternalMessages(prev => [...prev, userMsg]);

                // Clear input after sending
                setInput('');

                // Start generating AI response
                setIsGenerating(true);

                try {
                    const response = await aiService.chatResponse(initialMessage, editor ? editor.getHTML() : '');

                    const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: response,
                        timestamp: Date.now()
                    };

                    setInternalMessages(prev => [...prev, assistantMsg]);
                } catch (error) {
                    const errorMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                        timestamp: Date.now()
                    };
                    setInternalMessages(prev => [...prev, errorMsg]);
                } finally {
                    setIsGenerating(false);
                }
            };

            // Delay to show the message in input field briefly, then send
            const timeoutId = setTimeout(autoSend, 100); // Reduced from 500ms for faster response

            // Cleanup timeout on component unmount or effect re-run
            return () => clearTimeout(timeoutId);
        }
    }, [open, initialMessage, editor]);

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

            // Save user message to Firebase
            if (documentId && user?.uid) {
                try {
                    await chatHistoryService.saveMessage(documentId, userMsg);
                } catch (error) {
                    console.error('Failed to save user message:', error);
                }
            }

            try {
                // Use MCP service for intelligent function calling
                // Let the AI decide which tools to use based on the prompt
                console.log('🔧 MCP Chat - Document ID:', documentId);
                console.log('🔧 MCP Chat - Prompt:', text);

                // Get last 5 messages for context (excluding the current user message)
                const recentHistory = messages.slice(-5).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                const mcpResponse = await mcpService.chat(text, documentId, recentHistory);

                console.log('✅ MCP Response:', mcpResponse);

                // Parse response for progressive thinking markers
                const timestamp = Date.now();
                const parsedMessages = parseProgressiveResponse(mcpResponse.text, timestamp);

                // If progressive markers found, use parsed messages; otherwise use simple message
                if (parsedMessages.length > 0) {
                    // Add all parsed progress messages
                    setInternalMessages(prev => [...prev, ...parsedMessages]);

                    // Save only the final summary or complete response to Firebase
                    if (documentId && user?.uid) {
                        const summaryMsg = parsedMessages.find(m => m.progressStage === 'summary') || parsedMessages[parsedMessages.length - 1];
                        try {
                            await chatHistoryService.saveMessage(documentId, {
                                ...summaryMsg,
                                toolCalls: mcpResponse.toolCalls
                            });
                        } catch (error) {
                            console.error('Failed to save assistant message:', error);
                        }
                    }
                } else {
                    // Fallback to simple message if no markers found
                    const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: mcpResponse.text,
                        timestamp: timestamp,
                        toolCalls: mcpResponse.toolCalls
                    };

                    setInternalMessages(prev => [...prev, assistantMsg]);

                    // Save assistant message to Firebase
                    if (documentId && user?.uid) {
                        try {
                            await chatHistoryService.saveMessage(documentId, assistantMsg);
                        } catch (error) {
                            console.error('Failed to save assistant message:', error);
                        }
                    }
                }

                // If tools were used, reload the document to show changes IMMEDIATELY
                if (mcpResponse.toolsUsed > 0 && editor && documentId) {
                    console.log('🔄 Reloading document after tool execution...');
                    // Reload document content immediately after MCP operations
                    // The backend has already synced to Firebase by the time we get here
                    try {
                        const doc = await mcpService.loadDocument(documentId);
                        if (doc.content) {
                            console.log('✅ Document reloaded, updating editor');
                            editor.commands.setContent(doc.content);
                        }
                    } catch (err) {
                        console.error('Failed to reload document:', err);
                    }
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

                // Save error message to Firebase
                if (documentId && user?.uid) {
                    try {
                        await chatHistoryService.saveMessage(documentId, errorMsg);
                    } catch (saveError) {
                        console.error('Failed to save error message:', saveError);
                    }
                }
            } finally {
                setIsGenerating(false);
            }
        }
        setInput("");
    };

    if (!open) return null;

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="flex flex-row items-center justify-between pb-3 px-4 pt-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold flex items-center">
                    <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                    AI Assistant
                </h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col p-0 overflow-hidden relative">
                {/* Messages */}
                <div
                    ref={scrollViewportRef}
                    className="flex-1 h-full overflow-y-auto overflow-x-hidden"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    <div className="px-5 py-2">
                        <div ref={listRef} className="space-y-4 relative min-h-full">
                            {/* Sentinel for loading more history at top */}
                            {!externalMessages && (
                                <div
                                    ref={topSentinelRef}
                                    className="h-1 w-full"
                                    aria-hidden="true"
                                />
                            )}

                            {/* Loading more history indicator */}
                            {isLoadingMore && (
                                <div className="flex justify-center py-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Loading more messages...</span>
                                    </div>
                                </div>
                            )}

                            {/* Loading more history indicator */}
                            {isLoadingHistory && (
                                <div className="flex justify-center py-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Loading chat history...</span>
                                    </div>
                                </div>
                            )}

                            {messages.map((m) => {
                                // Determine message styling based on type
                                let bgClass = "bg-white text-gray-900 border-2 border-gray-200";
                                let icon = null;

                                if (m.role === "user") {
                                    bgClass = "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg";
                                } else if (m.type === 'progress') {
                                    // Progress messages styling based on stage
                                    if (m.progressStage === 'planning') {
                                        bgClass = "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-2 border-blue-200 shadow-sm";
                                        icon = <span className="text-lg mr-2">📋</span>;
                                    } else if (m.progressStage === 'reasoning') {
                                        bgClass = "bg-gradient-to-r from-amber-50 to-yellow-50 text-amber-800 border-2 border-amber-200 shadow-sm";
                                        icon = <span className="text-lg mr-2">🤔</span>;
                                    } else if (m.progressStage === 'execution') {
                                        bgClass = "bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-800 border-2 border-indigo-200 shadow-sm";
                                        icon = <span className="text-lg mr-2">💭</span>;
                                    } else if (m.progressStage === 'summary') {
                                        bgClass = "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border-2 border-emerald-300 shadow-md";
                                        icon = <span className="text-lg mr-2">✨</span>;
                                    }
                                } else if (m.type === 'tool-use') {
                                    bgClass = "bg-gradient-to-r from-purple-50 to-violet-50 text-purple-800 border-2 border-purple-300 shadow-sm";
                                    icon = <span className="text-lg mr-2">⚙️</span>;
                                } else if (m.type === 'tool-response') {
                                    bgClass = "bg-gradient-to-r from-green-50 to-emerald-50 text-green-800 border-2 border-green-200 shadow-sm";
                                    icon = <span className="text-lg mr-2">✅</span>;
                                }

                                return (
                                    <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                        <div className={`${m.role === "user" ? "max-w-[80%]" : "max-w-full"} space-y-2`}>
                                            <div
                                                className={`${bgClass} rounded-lg px-4 py-3 text-[0.95rem] leading-[1.6] ${m.role === "user" ? "whitespace-pre-wrap" : ""} break-words transition-all duration-200 hover:shadow-md`}
                                            >
                                                {m.role === "user" ? (
                                                    m.content
                                                ) : (
                                                    <>
                                                        <div className="flex items-start">
                                                            {icon}
                                                            <div
                                                                className="flex-1 prose prose-sm max-w-none chat-markdown-content
                                                            prose-headings:mt-3 prose-headings:mb-2 prose-headings:font-semibold
                                                            prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                                                            prose-p:my-2 prose-p:leading-relaxed prose-p:text-[0.95rem]
                                                            prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-ol:pl-5 
                                                            prose-li:my-1 prose-li:leading-relaxed
                                                            prose-pre:bg-[#1e1e1e] prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-md 
                                                            prose-pre:text-sm prose-pre:overflow-x-auto prose-pre:my-3 prose-pre:shadow-lg
                                                            prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                                                            prose-strong:font-semibold prose-strong:text-gray-900
                                                            prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-700
                                                            prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:my-3
                                                            prose-hr:border-gray-300 prose-hr:my-4
                                                            prose-table:border-collapse prose-table:w-full prose-table:my-3
                                                            prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2
                                                            prose-td:border prose-td:border-gray-300 prose-td:p-2"
                                                                dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                                                            />
                                                        </div>
                                                        {/* Display MCP tool calls if present */}
                                                        {m.toolCalls && m.toolCalls.length > 0 && (
                                                            <div className="mt-3 pt-3 border-t border-gray-200">
                                                                <div className="flex items-center gap-2 text-xs font-semibold text-purple-700 mb-2">
                                                                    <Wrench className="w-3.5 h-3.5" />
                                                                    Function Calls ({m.toolCalls.length})
                                                                </div>
                                                                <div className="space-y-1.5">
                                                                    {m.toolCalls.map((tool, idx) => (
                                                                        <div key={idx} className="bg-purple-50 border border-purple-200 rounded px-2.5 py-1.5">
                                                                            <div className="flex items-center gap-2">
                                                                                <span className="font-mono text-xs font-semibold text-purple-800">
                                                                                    {tool.name}
                                                                                </span>
                                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${tool.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                                                    }`}>
                                                                                    {tool.success ? '✓' : '✗'}
                                                                                </span>
                                                                            </div>
                                                                            {Object.keys(tool.args).length > 0 && (
                                                                                <div className="text-[11px] text-gray-600 font-mono mt-1">
                                                                                    {JSON.stringify(tool.args, null, 2).substring(0, 100)}
                                                                                    {JSON.stringify(tool.args).length > 100 && '...'}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {messages.length === 0 && (
                                <div className="text-sm text-gray-500 text-center py-8">Ask for a summary, rewrite a section, or request suggestions.</div>
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
                        {/* Scroll anchor */}
                        <div ref={messagesEndRef} />
                    </div>
                </div>

                {/* Floating Quick Suggestions - positioned just above the composer */}
                {(suggestions?.length ?? 0) > 0 && input.length === 0 && !messages.some(m => m.role === 'user') && (
                    <div className="px-3 pb-2">
                        <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {(suggestions ?? (repositoryInfo ? [
                                "Analyze repository",
                                "Explain codebase",
                                "Document the code",
                                "Find best practices",
                                "Suggest improvements",
                            ] : [
                                "Add a summary",
                                "Improve this section",
                                "Search for keywords",
                                "Expand on this topic",
                                "Check document structure",
                            ])).slice(0, 5).map((s, idx) => (
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
            </div>
        </div>
    );
}
