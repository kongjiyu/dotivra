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
import { aiService } from "@/services/aiService";
import { useAuth } from "@/context/AuthContext";
import { marked } from "marked";

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
    const listRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [aiWriter, setAIWriter] = useState<EnhancedAIContentWriter | null>(null);

    // Get AI actions function from document context
    const { showAIActions } = useDocument();

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
            let content = 'Hello! I\'m your AI writing assistant. I can help you improve your document, create summaries, or answer questions about your content.\n\n**Special AI Operations:**\n• Type `add <content>` to add new content\n• Type `remove <content>` to mark content for removal\n• Type `edit <content>` to replace existing content\n\nThese operations will show highlighted changes in your document with accept/reject options.\n```test\n This is a code block \n```';

            if (repositoryInfo) {
                content += `\n\n**🚀 Repository Integration Active!**\n📂 Connected to: \`${repositoryInfo.owner}/${repositoryInfo.repo}\`\n\n**Repository Commands:**\n• "Analyze code in [filename]" - Explain specific files\n• "Improve the React components" - Code improvements\n• "Debug the authentication flow" - Find issues\n• "Explain how routing works" - Understand patterns\n• "Document the API endpoints" - Generate docs\n\nI have access to your repository structure, README, and key files to provide contextual assistance!`;
            }

            content += '\n\nHow can I assist you today?';

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
        try {

            // Determine the type of AI operation based on the prompt
            const lowerPrompt = prompt.toLowerCase();

            // Use user from hook for repository operations

            // Check for repository-specific commands
            if (repositoryInfo && user && (
                lowerPrompt.includes('analyze code') ||
                lowerPrompt.includes('explain file') ||
                lowerPrompt.includes('improve code') ||
                lowerPrompt.includes('debug') ||
                lowerPrompt.includes('repository') ||
                lowerPrompt.includes('codebase') ||
                lowerPrompt.includes('.js') || lowerPrompt.includes('.ts') ||
                lowerPrompt.includes('.tsx') || lowerPrompt.includes('.py') ||
                lowerPrompt.includes('.java') || lowerPrompt.includes('.cpp')
            )) {

                // Check if user is asking about a specific file
                const fileMatch = prompt.match(/([a-zA-Z0-9_-]+\.[a-zA-Z]+)/);
                if (fileMatch) {
                    const fileName = fileMatch[1];
                    try {
                        const analysis = lowerPrompt.includes('improve') ? 'improve' :
                            lowerPrompt.includes('debug') ? 'debug' :
                                lowerPrompt.includes('document') ? 'document' : 'explain';

                        const result = await aiService.analyzeRepositoryCode(user, repositoryInfo, fileName, analysis);
                        return `<h2>Repository Analysis: ${fileName}</h2>\n${result}`;
                    } catch (error) {
                    }
                }

                // General repository-aware generation
                const result = await aiService.generateWithRepositoryContext(prompt, user, repositoryInfo, editor ? editor.getHTML() : '');
                return `<h2>Repository-Aware Response</h2>\n${result}`;
            }

            if (lowerPrompt.includes('summarize') || lowerPrompt.includes('summary')) {
                // Generate summary of current document
                const summary = await aiService.summarizeContent(editor ? editor.getHTML() : '');
                return `<h2>Document Summary</h2>\n${summary}`;
            } else if (lowerPrompt.includes('improve') || lowerPrompt.includes('enhance')) {
                // Get selected text or current paragraph
                const selectedText = editor?.state.selection.empty ? '' : editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                if (selectedText) {
                    const improved = await aiService.improveText(selectedText, prompt);
                    return `<h3>Improved Version:</h3>\n${improved}`;
                } else {
                    return `<p>Please select some text first, then ask me to improve it.</p>`;
                }
            } else if (lowerPrompt.includes('expand') || lowerPrompt.includes('elaborate')) {
                // Expand on current content
                const selectedText = editor?.state.selection.empty ? '' : editor?.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to);
                if (selectedText) {
                    const expanded = await aiService.expandContent(selectedText, prompt);
                    return expanded;
                } else {
                    const expanded = await aiService.expandContent(editor ? editor.getHTML() : '', prompt);
                    return `<h2>Expanded Content</h2>\n${expanded}`;
                }
            } else {
                // Check if we have repository context for better general generation
                if (repositoryInfo && user) {
                    const generated = await aiService.generateWithRepositoryContext(prompt, user, repositoryInfo, editor ? editor.getHTML() : '');
                    return generated;
                } else {
                    // Fallback to regular generation
                    const generated = await aiService.generateFromPrompt(prompt, editor ? editor.getHTML() : '');
                    return generated;
                }
            }
        } catch (error) {
            console.error('❌ AI Content Generation Error:', error);
            return `<p>I apologize, but I encountered an error while generating content. Please try rephrasing your request or try again later.</p>`;
        }
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

                    // Store operation ID globally so DocumentEditor can access it
                    (window as any).currentChatOperationId = operationId;
                    (window as any).currentChatAIWriter = aiWriter;

                    // Show AI actions for the operation with a slight delay to ensure content is rendered
                    setTimeout(() => {
                        let actionFunction = showAIActions;

                        // Fallback to global function if context function is not available
                        if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                            actionFunction = (window as any).currentShowAIActionsFunction;
                        }

                        if (actionFunction && typeof actionFunction === 'function') {
                            try {
                                actionFunction("New content added via *add command", editor ? editor.getHTML() : '');
                            } catch (error) {
                                console.error('❌ Error calling showAIActions:', error);
                            }
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

                    // Store operation ID globally so DocumentEditor can access it
                    (window as any).currentChatOperationId = operationId;
                    (window as any).currentChatAIWriter = aiWriter;

                    // Show AI actions for the operation with a slight delay to ensure content is rendered
                    setTimeout(() => {
                        let actionFunction = showAIActions;

                        // Fallback to global function if context function is not available
                        if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                            actionFunction = (window as any).currentShowAIActionsFunction;
                        }

                        if (actionFunction && typeof actionFunction === 'function') {
                            try {
                                actionFunction("Content marked for removal via *remove command", editor ? editor.getHTML() : '');
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

                    // Store operation ID globally so DocumentEditor can access it
                    (window as any).currentChatOperationId = operationId;
                    (window as any).currentChatAIWriter = aiWriter;

                    // Show AI actions for the operation with a slight delay to ensure content is rendered
                    setTimeout(() => {
                        let actionFunction = showAIActions;

                        // Fallback to global function if context function is not available
                        if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                            actionFunction = (window as any).currentShowAIActionsFunction;
                        }

                        if (actionFunction && typeof actionFunction === 'function') {
                            try {
                                actionFunction("Content edited via *edit command", editor ? editor.getHTML() : '');
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
                    // Check if this is a content generation request or a chat conversation
                    const contentGenerationKeywords = [
                        'generate', 'create', 'write', 'add', 'insert', 'make', 'produce', 'compose',
                        'draft', 'develop', 'build', 'construct', 'design', 'formulate', 'outline'
                    ];

                    const isContentGeneration = contentGenerationKeywords.some(keyword =>
                        text.toLowerCase().includes(keyword)
                    ) || text.includes('*') || text.length > 100; // Long prompts are likely content requests

                    if (isContentGeneration) {
                        // Generate content and add to document
                        const aiResponse = await generateAIContent(text);

                        if (aiWriter && editor && aiResponse) {
                            // Get the end of document position
                            const doc = editor.state.doc;
                            const endPosition = doc.content.size;

                            const position: ContentPosition = {
                                from: endPosition,
                                to: endPosition,
                                length: 0
                            };

                            // Add content to document with highlighting
                            const operationId = await aiWriter.addContentAtPosition(position, `\n\n${aiResponse}`);

                            // Store operation ID globally so DocumentEditor can access it
                            (window as any).currentChatOperationId = operationId;
                            (window as any).currentChatAIWriter = aiWriter;

                            // Show AI actions with delay
                            setTimeout(() => {
                                let actionFunction = showAIActions;

                                if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                                    actionFunction = (window as any).currentShowAIActionsFunction;
                                }

                                if (actionFunction && typeof actionFunction === 'function') {
                                    try {
                                        actionFunction(`AI Generated Content: ${text}`, editor ? editor.getHTML() : '');
                                    } catch (error) {
                                        console.error('❌ Error calling showAIActions:', error);
                                    }
                                }
                            }, 300);

                            const assistantMsg: ChatMessage = {
                                id: crypto.randomUUID(),
                                role: "assistant",
                                content: "✨ Content generated and added to your document with green highlighting. Use the action buttons to accept, reject, or regenerate the content.",
                                timestamp: Date.now(),
                            };

                            setInternalMessages(prev => [...prev, assistantMsg]);
                        } else {
                            throw new Error('Editor not available for content generation');
                        }
                    } else {

                        // Regular chat response - don't add to document
                        const aiResponse = await aiService.chatResponse(text, editor ? editor.getHTML() : '');

                        const assistantMsg: ChatMessage = {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: aiResponse,
                            timestamp: Date.now(),
                        };

                        setInternalMessages(prev => [...prev, assistantMsg]);
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
                                                    } rounded-lg px-3 py-2 text-[0.95rem] leading-relaxed ${m.role === "user" ? "whitespace-pre-wrap" : ""} break-words transition-all duration-200 hover:scale-[1.02]`}
                                            >
                                                {m.role === "user" ? (
                                                    m.content
                                                ) : (
                                                    <div
                                                        className="prose prose-sm max-w-none chat-markdown-content
                                                        prose-headings:mt-2 prose-headings:mb-1 prose-headings:font-bold
                                                        prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                                                        prose-p:my-1 prose-p:leading-relaxed
                                                        prose-ul:my-1 prose-ul:pl-4 prose-ol:my-1 prose-ol:pl-4 
                                                        prose-li:my-0.5
                                                        prose-pre:bg-[#1e1e1e] prose-pre:text-gray-100 prose-pre:p-3 prose-pre:rounded-md 
                                                        prose-pre:text-xs prose-pre:overflow-x-auto prose-pre:my-2 prose-pre:shadow-md
                                                        prose-strong:font-semibold prose-strong:text-gray-900
                                                        prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-700
                                                        prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic
                                                        prose-hr:border-gray-300 prose-hr:my-3
                                                        prose-table:border-collapse prose-table:w-full
                                                        prose-th:border prose-th:border-gray-300 prose-th:bg-gray-50 prose-th:p-2
                                                        prose-td:border prose-td:border-gray-300 prose-td:p-2"
                                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                                                    />
                                                )}
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
                                {(suggestions ?? (repositoryInfo ? [
                                    "*add",
                                    "*remove",
                                    "*edit",
                                    "Analyze repository",
                                    "Explain codebase",
                                ] : [
                                    "*add",
                                    "*remove",
                                    "*edit",
                                    "Improve content",
                                    "Add summary",
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
                </CardContent>
            </Card>
        </div>
    );
}
