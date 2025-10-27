import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Sparkles, SendHorizonal, Loader2, Eraser, RotateCcw, CircleX, CircleStop } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { useDocument } from "@/context/DocumentContext";
import { EnhancedAIContentWriter } from "@/utils/enhancedAIContentWriter";
import { aiService } from "@/services/aiService";
import { useAuth } from "@/context/AuthContext";
import { marked } from "marked";
import { chatHistoryService } from "@/services/chatHistoryService";
import { fetchDocument } from "@/services/apiService";
import { buildApiUrl } from "@/lib/apiConfig";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AIChangesPreviewModal } from "./AIChangesPreviewModal";
import { generatePreviewWithHighlights, type ToolExecution } from "@/utils/previewGenerator";
import { buildAIInteractionHTML, getAIInteractionStyles, type AIInteractionStage, type AIInteractionSession } from "@/utils/aiInteractionHtmlBuilder";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "system-error";
    content: string;
    timestamp?: number;
    type?: 'user' | 'assistant' | 'tool-use' | 'tool-response' | 'progress' | 'error';
    progressStage?: 'planning' | 'reasoning' | 'execution' | 'summary';
    isTemporary?: boolean; // For progress messages that will be removed
    toolReason?: string; // Reason for tool usage
    toolResult?: string; // Result from tool execution
    replyTo?: string; // ID of message being replied to (not stored in Firebase)
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
    selectedText?: string; // Text selected from document
    onClearSelection?: () => void; // Clear selected text
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
    selectedText,
    onClearSelection,
}: ChatSidebarProps) {
    const [input, setInput] = useState("");
    const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreHistory, setHasMoreHistory] = useState(true);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editedContent, setEditedContent] = useState<string>("");
    const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
    const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
    const [contextMenuMessageId, setContextMenuMessageId] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const topSentinelRef = useRef<HTMLDivElement>(null);
    const scrollViewportRef = useRef<HTMLDivElement>(null);
    const [aiWriter, setAIWriter] = useState<EnhancedAIContentWriter | null>(null);
    // AI change review modal state
    const [showAiChanges, setShowAiChanges] = useState(false);
    const [aiBeforeContent, setAiBeforeContent] = useState<string>("");
    const lastUserPromptRef = useRef<string>("");
    const abortControllerRef = useRef<AbortController | null>(null);

    // Preview modal state
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [previewHtml, setPreviewHtml] = useState<string>("");
    const [previewChanges, setPreviewChanges] = useState<any[]>([]);

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
                    } else {
                        initMessage();
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
            // Parse markdown to HTML
            let html = marked.parse(content) as string;

            // Handle code blocks with language tags
            html = html.replace(
                /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
                (match, language, code) => {
                    if (language && language.trim()) {
                        return `<div class="code-block-with-topic">
                            <div class="code-topic-header">${language}</div>
                            <pre class="code-block-pre"><code>${code}</code></pre>
                        </div>`;
                    }
                    return match;
                }
            );

            return html;
        } catch (error) {
            console.error('Markdown parsing error:', error);
            return content; // Fallback to plain text
        }
    };



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

    // Add initial hello message when chat opens
    const initMessage = () => {
        if (open && !externalMessages && internalMessages.length === 0) {
            let content = `Hello and welcome.
I am your Document Assistant, designed to help you analyze, refine, and optimize your documents with precision.
From structure improvements to real-time content updates, I ensure your work remains clear, consistent, and professionally polished.`;

            // Only present after integrate with repository
            // if (repositoryInfo) {
            //     content += `\n\n** Repository Integration Active!**\n Connected to: \`${repositoryInfo.owner}/${repositoryInfo.repo}\`\n\n**Repository Commands:**\n鈥?"Analyze code in [filename]" - Explain specific files\n鈥?"Improve the React components" - Code improvements\n鈥?"Debug the authentication flow" - Find issues\n鈥?"Explain how routing works" - Understand patterns\n鈥?"Document the API endpoints" - Generate docs\n\nI have access to your repository structure, README, and key files to provide contextual assistance!`;
            // }

            content += '\n\nHow can I assist with your writing today?';

            const helloMsg: ChatMessage = {
                id: 'hello-msg',
                role: 'assistant',
                content,
                timestamp: Date.now(),
            };
            setInternalMessages([helloMsg]);
        }
    }

    // Format timestamp to readable date/time
    const formatMessageTime = (timestamp?: number): string => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        // Less than 1 minute ago
        if (diff < 60000) {
            return 'Just now';
        }

        // Less than 1 hour ago
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }

        // Same day
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }

        // Yesterday
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return `Yesterday ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
        }

        // This year
        if (date.getFullYear() === now.getFullYear()) {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }

        // Different year
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Handle right-click context menu
    const handleContextMenu = (e: React.MouseEvent, message: ChatMessage) => {
        e.preventDefault();
        setContextMenuPosition({ x: e.clientX, y: e.clientY });
        setContextMenuMessageId(message.id);
    };

    // Close context menu when clicking outside
    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenuPosition(null);
            setContextMenuMessageId(null);
        };

        if (contextMenuPosition) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [contextMenuPosition]);

    // Handle reply to message
    const handleReplyTo = (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        if (message) {
            setReplyToMessage(message);
            setContextMenuPosition(null);
        }
    };

    // Handle edit message (only last user message)
    const handleEditMessage = (messageId: string) => {
        const message = messages.find(m => m.id === messageId);
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');

        if (message && lastUserMessage && message.id === lastUserMessage.id) {
            setEditingMessageId(messageId);
            setEditedContent(message.content);
            setContextMenuPosition(null);
        }
    };

    // Save edited message and resend
    const handleSaveEdit = async () => {
        if (!editingMessageId || !editedContent.trim()) return;

        console.log('Saving edited message and resending...');

        // Update the message content
        const updatedMessages = messages.map(m =>
            m.id === editingMessageId ? { ...m, content: editedContent.trim() } : m
        );
        setInternalMessages(updatedMessages);

        // Clear edit mode
        setEditingMessageId(null);
        setEditedContent("");

        // Resend the message
        await handleSend(editedContent.trim());
    };

    // Cancel editing
    const handleCancelEdit = () => {
        setEditingMessageId(null);
        setEditedContent("");
    };


    // Preview modal handlers
    const handleAcceptChanges = async () => {
        console.log('✅ User accepted changes');
        setShowPreviewModal(false);

        // Save the current editor content to Firebase
        if (editor && documentId) {
            try {
                // Clear highlights before saving
                editor.chain()
                    .focus()
                    .unsetHighlight()
                    .run();

                const currentContent = editor.getHTML();

                // Update Firebase with current editor content
                await fetch(buildApiUrl(`api/documents/${documentId}`), {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ Content: currentContent })
                });

                console.log('✅ Document updated in Firebase with accepted changes');

                // Reload to ensure sync
                const doc = await fetchDocument(documentId);
                if (doc.Content) {
                    editor.commands.setContent(doc.Content);
                    console.log('Document reloaded to confirm changes');
                }
            } catch (err) {
                console.error('Failed to update document:', err);
            }
        }
    };

    const handleRejectChanges = async () => {
        console.log('❌ User rejected changes');
        setShowPreviewModal(false);

        // Restore original content before AI changes
        if (editor && aiBeforeContent) {
            // Clear all highlights first
            editor.chain()
                .focus()
                .unsetHighlight()
                .run();

            // Restore original content
            editor.commands.setContent(aiBeforeContent);
            console.log('Document restored to original state');

            // Also update Firebase to revert changes
            if (documentId) {
                try {
                    await fetch(buildApiUrl(`api/documents/${documentId}`), {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ Content: aiBeforeContent })
                    });
                    console.log('Document reverted in Firebase');
                } catch (err) {
                    console.error('Failed to revert document in Firebase:', err);
                }
            }
        }
    };

    const handleRegenerateChanges = () => {
        console.log('🔄 User requested regeneration');
        setShowPreviewModal(false);

        // Restore original content first
        if (editor && aiBeforeContent) {
            editor.commands.setContent(aiBeforeContent);
        }

        // Re-run the last prompt
        if (lastUserPromptRef.current) {
            setTimeout(() => handleSend(lastUserPromptRef.current), 100);
        }
    };

    const handleStopGeneration = () => {
        console.log('🛑 User requested to stop generation');

        // Abort the ongoing request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }

        // Reset generating state
        setIsGenerating(false);

        // Add a system message to indicate generation was stopped
        const stopMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Generation stopped by user.",
            timestamp: Date.now()
        };

        setInternalMessages(prev => [...prev, stopMsg]);
    };

    const handleSend = async (messageText?: string, isReply: boolean = false) => {
        const text = (messageText || input).trim();
        if (!text) return;

        console.log('Sending message:', text);
        if (replyToMessage) {
            console.log('Replying to message:', replyToMessage.id);
        }
        if (selectedText) {
            console.log('With selected text:', selectedText.substring(0, 100));
        }

        // Build full prompt with selected text if present
        let fullPrompt = text;
        let displayContent = text;

        // If this is a reply from document selection (isReply=true), treat selectedText as replyToMessage
        if (isReply && selectedText) {
            // Set up reply context with selected text
            const documentReply: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant', // Treat as assistant for UI purposes
                content: selectedText,
                timestamp: Date.now()
            };
            setReplyToMessage(documentReply);
            fullPrompt = `Selected text from document: "${selectedText}"\n\nUser request: ${text}`;
            displayContent = text; // Show only user's prompt in UI
        } else if (selectedText) {
            fullPrompt = `Selected text from document: "${selectedText}"\n\nUser request: ${text}`;
            displayContent = text; // Show only user's prompt in UI
        }

        // Add user message with reply context
        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: "user",
            content: displayContent,
            timestamp: Date.now(),
            replyTo: replyToMessage?.id
        };

        if (onSend) {
            onSend(text);
        } else {
            setInternalMessages(prev => [...prev, userMsg]);
            setIsGenerating(true);

            // Save user message to Firebase (without replyTo field)
            if (documentId && user?.uid) {
                try {
                    const messageToSave = { ...userMsg };
                    delete messageToSave.replyTo;
                    await chatHistoryService.saveMessage(documentId, messageToSave);
                } catch (error) {
                    console.error('Failed to save user message:', error);
                }
            }

            try {
                // Build conversation history
                const recentHistory = messages.slice(-5).map(msg => ({
                    role: msg.role,
                    content: msg.content
                }));

                // If replying, add the original message as context
                if (replyToMessage) {
                    recentHistory.unshift({
                        role: replyToMessage.role,
                        content: `[Context from previous message]: ${replyToMessage.content}`
                    });
                    console.log('Added reply context to history');
                }

                const timestamp = Date.now();
                let toolsUsed = 0;
                let currentProgressMessageId: string | null = null;
                let progressContent: string[] = []; // Store plain text content instead of JSX

                console.log('Starting AI Agent execution...');

                // Capture current document content before modifications
                try {
                    if (documentId) {
                        const beforeDoc = await fetchDocument(documentId);
                        setAiBeforeContent(beforeDoc?.Content || (editor ? editor.getHTML() : ''));
                    } else if (editor) {
                        setAiBeforeContent(editor.getHTML());
                    }
                } catch (e) {
                    console.warn('Could not capture pre-change content:', e);
                    if (editor) setAiBeforeContent(editor.getHTML());
                }

                // Use new AI Agent with streaming stages
                const allToolExecutions: ToolExecution[] = [];
                const allStages: AIInteractionStage[] = [];
                const sessionStartTime = Date.now();

                // Create abort controller for this generation
                abortControllerRef.current = new AbortController();

                for await (const stage of aiService.executeAIAgent(
                    fullPrompt,
                    documentId,
                    recentHistory,
                    selectedText,
                    abortControllerRef.current.signal
                )) {
                    console.log('Received stage:', stage.stage, stage);

                    // Collect all stages for HTML generation
                    allStages.push({
                        stage: stage.stage as any,
                        content: stage.content,
                        thought: stage.thought,
                        timestamp: Date.now()
                    });

                    // Track tool executions if provided
                    if (stage.toolExecutions && Array.isArray(stage.toolExecutions)) {
                        // Update our local tracking with new executions
                        allToolExecutions.length = 0;
                        allToolExecutions.push(...stage.toolExecutions);
                    }

                    if (stage.stage === 'done') {
                        console.log('AI Agent completed');
                        break;
                    }

                    if (stage.stage === 'error') {
                        // Remove all progress messages and show clean error
                        setInternalMessages(prev => prev.filter(msg => msg.id !== currentProgressMessageId));

                        // Friendly, non-technical error messaging
                        const raw = typeof stage.content === 'string' ? stage.content : '';
                        let friendly = 'Sorry, I\'m having trouble right now. Please try again in a moment.';
                        if (/429|rate/i.test(raw)) friendly = 'The AI is a bit busy right now. Please try again in a few seconds.';
                        if (/timeout|network|fetch/i.test(raw)) friendly = 'Having trouble connecting. Please check your connection and try again.';

                        const errorMsg: ChatMessage = {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: friendly,
                            timestamp: Date.now(),
                            type: 'error'
                        };

                        setInternalMessages(prev => [...prev, errorMsg]);

                        // Save error message to Firebase with role "system-error"
                        if (documentId && user?.uid) {
                            try {
                                const errorMsgForFirebase: ChatMessage = {
                                    ...errorMsg,
                                    role: "system-error" as "system-error"
                                };
                                await chatHistoryService.saveMessage(documentId, errorMsgForFirebase);
                            } catch (saveError) {
                                console.error('Failed to save error message:', saveError);
                            }
                        }
                        break;
                    }

                    // Create or update the combined progress message
                    switch (stage.stage) {
                        case 'planning':
                            // Add planning stage content
                            progressContent.push(`**🎯 Planning**\n\n${stage.content}\n`);

                            // Create or update combined message
                            if (!currentProgressMessageId) {
                                currentProgressMessageId = `progress-${Date.now()}`;
                                const newMsg: ChatMessage = {
                                    id: currentProgressMessageId,
                                    role: 'assistant',
                                    content: progressContent.join('\n'),
                                    timestamp,
                                    type: 'progress',
                                    progressStage: stage.stage as any,
                                    isTemporary: true
                                };
                                setInternalMessages(prev => [...prev, newMsg]);
                            } else {
                                // Update existing message
                                setInternalMessages(prev => prev.map(msg =>
                                    msg.id === currentProgressMessageId
                                        ? {
                                            ...msg,
                                            content: progressContent.join('\n'),
                                            progressStage: stage.stage as any
                                        }
                                        : msg
                                ));
                            }
                            break;

                        case 'reasoning':
                            // Add reasoning stage content
                            progressContent.push(`**💭 Reasoning**\n\n${stage.content}\n`);

                            // Update existing message
                            if (currentProgressMessageId) {
                                setInternalMessages(prev => prev.map(msg =>
                                    msg.id === currentProgressMessageId
                                        ? {
                                            ...msg,
                                            content: progressContent.join('\n'),
                                            progressStage: stage.stage as any
                                        }
                                        : msg
                                ));
                            }
                            break;

                        case 'toolUsed':
                            toolsUsed++;
                            const toolData = typeof stage.content === 'object' ? stage.content : { description: stage.content };
                            const toolDescription = toolData.description || 'Processing...';

                            // Add tool execution indicator (simple text, no result)
                            progressContent.push(`**⚙️ Action:** ${toolDescription}`);

                            // Update message to show tool is being used
                            if (currentProgressMessageId) {
                                setInternalMessages(prev => prev.map(msg =>
                                    msg.id === currentProgressMessageId
                                        ? {
                                            ...msg,
                                            content: progressContent.join('\n'),
                                            progressStage: 'execution'
                                        }
                                        : msg
                                ));
                            }
                            break;

                        case 'toolResult':
                            // Skip tool results - don't show them in the chat
                            break;

                        case 'summary':
                            // Add summary content
                            progressContent.push(`\n**✅ Complete**\n\n${stage.content}`);

                            // Finalize the progress message and make it permanent
                            if (currentProgressMessageId) {
                                setInternalMessages(prev => prev.map(msg =>
                                    msg.id === currentProgressMessageId
                                        ? {
                                            ...msg,
                                            content: progressContent.join('\n'),
                                            progressStage: 'summary',
                                            isTemporary: false
                                        }
                                        : msg
                                ));
                            } else {
                                // Create new summary message
                                const summaryMsg: ChatMessage = {
                                    id: `summary-${Date.now()}`,
                                    role: 'assistant',
                                    content: progressContent.join('\n'),
                                    timestamp,
                                    type: 'progress',
                                    progressStage: 'summary',
                                    isTemporary: false
                                };
                                setInternalMessages(prev => [...prev, summaryMsg]);
                            }
                            break;
                    }
                }

                console.log(`Tools used: ${toolsUsed}`);

                // Build complete HTML representation of the AI interaction
                const sessionEndTime = Date.now();
                const interactionSession: AIInteractionSession = {
                    userPrompt: fullPrompt,
                    stages: allStages,
                    toolExecutions: allToolExecutions,
                    startTime: sessionStartTime,
                    endTime: sessionEndTime,
                    success: true
                };

                const completeInteractionHTML = getAIInteractionStyles() + buildAIInteractionHTML(interactionSession);

                // Save complete interaction HTML to Firebase
                if (documentId && user?.uid) {
                    try {
                        await chatHistoryService.saveMessage(documentId, {
                            id: crypto.randomUUID(),
                            role: 'assistant',
                            content: completeInteractionHTML,
                            timestamp,
                            type: 'progress',
                            progressStage: 'summary'
                        });
                        console.log('✅ Saved complete AI interaction HTML to Firebase');
                    } catch (error) {
                        console.error('Failed to save assistant message:', error);
                    }
                }

                // If tools were used, apply highlights to editor and show preview modal
                if (toolsUsed > 0 && allToolExecutions.length > 0 && documentId && editor) {
                    try {
                        console.log('🎨 Applying highlights for', allToolExecutions.length, 'tool executions');

                        // Get current document content
                        const currentDoc = await fetchDocument(documentId);

                        // Apply the new content to editor first
                        if (currentDoc.Content) {
                            editor.commands.setContent(currentDoc.Content);
                        }

                        // Apply highlights directly to the editor content
                        allToolExecutions.forEach(execution => {
                            if (execution.result?.position) {
                                const pos = execution.result.position;
                                let from = pos.from;
                                let to = pos.to || from;

                                // Validate positions
                                const docSize = editor.state.doc.content.size;
                                from = Math.max(0, Math.min(from, docSize));
                                to = Math.max(from, Math.min(to, docSize));

                                // Apply highlight based on action type
                                if (execution.toolName === 'remove_document_content') {
                                    // For deletions, highlight in red (but content is already removed)
                                    // We can't highlight removed content, so skip
                                } else if (execution.toolName === 'insert_document_content' ||
                                    execution.toolName === 'append_document_content') {
                                    // For additions, highlight in green
                                    editor.chain()
                                        .setTextSelection({ from, to })
                                        .setHighlight({ color: '#ccffcc' })
                                        .run();
                                } else if (execution.toolName === 'replace_document_content') {
                                    // For replacements, highlight in yellow
                                    editor.chain()
                                        .setTextSelection({ from, to })
                                        .setHighlight({ color: '#ffffcc' })
                                        .run();
                                }
                            }
                        });

                        // Also generate preview for modal
                        const baseContent = aiBeforeContent || currentDoc.Content || '';
                        const { previewHtml: generatedPreview, changes } = generatePreviewWithHighlights(
                            baseContent,
                            allToolExecutions
                        );

                        setPreviewHtml(generatedPreview);
                        setPreviewChanges(changes);
                        setShowPreviewModal(true);

                        console.log('✅ Highlights applied to editor content');
                    } catch (err) {
                        console.error('Failed to apply highlights:', err);
                        // Fallback: just reload the document
                        if (editor) {
                            const doc = await fetchDocument(documentId);
                            if (doc.Content) {
                                editor.commands.setContent(doc.Content);
                            }
                        }
                    }
                } else if (toolsUsed > 0 && editor && documentId) {
                    // No tool executions tracked, fallback to direct reload
                    try {
                        console.log('Reloading document after tool execution...');
                        const doc = await fetchDocument(documentId);
                        if (doc.Content) {
                            editor.commands.setContent(doc.Content);
                            console.log('Document reloaded');
                        }
                    } catch (err) {
                        console.error('Failed to reload document:', err);
                    }
                }
            } catch (error) {
                // Check if it's an abort error (user stopped generation)
                if (error instanceof Error && error.name === 'AbortError') {
                    console.log('Generation stopped by user');
                    // Don't show error message for user-initiated stops
                    return;
                }

                console.error('Error processing request:', error);
                const errorMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    type: "error",
                    content: `🔴 Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please try again.`,
                    timestamp: Date.now(),
                };
                setInternalMessages(prev => [...prev, errorMsg]);

                // Save error message to Firebase with role "system-error"
                if (documentId && user?.uid) {
                    try {
                        const errorMsgForFirebase: ChatMessage = {
                            ...errorMsg,
                            role: "system-error" as "system-error" // Store as system-error in Firebase
                        };
                        await chatHistoryService.saveMessage(documentId, errorMsgForFirebase);
                    } catch (saveError) {
                        console.error('Failed to save error message:', saveError);
                    }
                }
            } finally {
                setIsGenerating(false);
                abortControllerRef.current = null; // Clean up abort controller

                // Clear reply state after sending (success or failure)
                if (replyToMessage) {
                    console.log('Clearing reply context');
                    setReplyToMessage(null);
                }

                // Clear selected text if present
                if (selectedText && onClearSelection) {
                    console.log(' Clearing selected text');
                    onClearSelection();
                }
            }
        }
        // Record last user prompt for regenerate
        lastUserPromptRef.current = displayContent;
        setInput("");
    };

    if (!open) return null;

    return (
        <>
            <div className="h-full flex flex-col bg-white">
                {/* Header */}
                <div className="flex flex-row items-center justify-between pb-3 px-4 pt-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold flex items-center">
                        <Sparkles className="w-5 h-5 mr-2 text-purple-600" />
                        AI Assistant
                    </h2>
                    <div className="flex items-center gap-1">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                                    title="Clear chat history"
                                >
                                    <Eraser className="w-4 h-4" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Clear chat history?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all chat messages for this document.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                        onClick={async () => {
                                            if (!documentId) return;
                                            setIsClearing(true);
                                            try {
                                                await chatHistoryService.clearHistory(documentId);
                                                setInternalMessages([]);
                                            } catch (error) {
                                                console.error('Failed to clear chat history:', error);
                                            } finally {
                                                setIsClearing(false);
                                            }
                                        }}
                                        disabled={isClearing}
                                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {isClearing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                Clearing...
                                            </>
                                        ) : (
                                            'Clear All'
                                        )}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <div className="max-h-[85vh] flex-1 flex flex-col p-0 overflow-x-hidden relative">
                    {/* Loading overlay during delete */}
                    {isClearing && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3 bg-white p-6 rounded-lg shadow-lg border-2 border-red-200">
                                <Loader2 className="w-8 h-8 animate-spin text-red-600" />
                                <p className="text-sm font-medium text-gray-700">Deleting chat history...</p>
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    <ScrollArea className="flex-1 overflow-y-auto">
                        <div ref={scrollViewportRef} className="px-5 py-2">
                            <div ref={listRef} className="space-y-4 relative min-h-full">
                                {/* Sentinel for loading more history at top */}
                                {!externalMessages && (
                                    <div ref={topSentinelRef} className="h-1 w-full" aria-hidden="true" />
                                )}

                                {/* Loading indicators */}
                                {isLoadingMore && (
                                    <div className="flex justify-center py-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Loading more messages...</span>
                                        </div>
                                    </div>
                                )}

                                {isLoadingHistory && (
                                    <div className="flex justify-center py-2">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Loading chat history...</span>
                                        </div>
                                    </div>
                                )}

                                {/* Messages mapping */}
                                {messages.map((m) => {
                                    // Determine message styling based on type
                                    let bgClass = "bg-white text-gray-900 border border-gray-200";

                                    if (m.role === "user") {
                                        bgClass = "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg border-none";
                                    } else if (m.type === "error" || m.role === 'system-error') {
                                        bgClass = "bg-red-50 border-red-300 text-red-800";
                                    }

                                    return (
                                        <div
                                            key={m.id}
                                            id={`message-${m.id}`}
                                            className={`flex ${m.role === "user" ? "justify-end" : "w-full"} mb-3 transition-all duration-300`}
                                        >
                                            <div
                                                className={`${m.role === "user" ? "max-w-[80%]" : "w-full"
                                                    }`}
                                            >
                                                {/* Error message with retry */}
                                                {m.type === "error" ? (
                                                    <div className="w-full">
                                                        <div className={`${bgClass} rounded-lg px-4 py-3 text-[0.95rem] leading-[1.6] break-words`}>
                                                            <div className="flex items-start gap-2">
                                                                <span className="text-lg"><CircleX /></span>
                                                                <div className="flex-1">{m.content}</div>
                                                            </div>
                                                        </div>
                                                        {/* Retry button at right bottom */}
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            disabled={isGenerating}
                                                            onClick={() => {
                                                                if (isGenerating) return; // Prevent spam during generation

                                                                // Remove the error message first
                                                                setInternalMessages(prev => prev.filter(msg => msg.id !== m.id));

                                                                // Find the last user message and resend
                                                                const lastUserMsg = [...messages].reverse().find(msg => msg.role === 'user');
                                                                if (lastUserMsg) {
                                                                    handleSend(lastUserMsg.content);
                                                                }
                                                            }}
                                                            className="h-7 text-xs mt-1 float-right text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <RotateCcw className="w-3 h-3" />
                                                        </Button>
                                                    </div>
                                                ) : m.type === "progress" ? (
                                                    /* Progress message - no top indicator, all stages shown */
                                                    <div className="w-full">
                                                        {/* Progress message content with stages */}
                                                        <div className={`w-full bg-gray-50 bg-opacity-50 border border-gray-200 rounded-lg px-4 py-3 text-[0.95rem] leading-[1.6] break-words progress-message-content`}>
                                                            <div
                                                                className="prose prose-sm max-w-none
                                                                prose-headings:mt-3 prose-headings:mb-2 prose-headings:font-semibold
                                                                prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                                                                prose-p:my-2 prose-p:leading-relaxed prose-p:text-[0.95rem]
                                                                prose-ul:my-2 prose-ul:pl-5 prose-ol:my-2 prose-ol:pl-5 
                                                                prose-li:my-1 prose-li:leading-relaxed
                                                                prose-strong:font-semibold
                                                                prose-a:text-blue-600 prose-a:underline"
                                                                dangerouslySetInnerHTML={{ __html: m.content ? renderMarkdown(m.content) : '' }}
                                                            />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    /* User and regular assistant messages */
                                                    <div>
                                                        {/* Reply indicator */}
                                                        {m.replyTo && (() => {
                                                            const originalMsg = messages.find(msg => msg.id === m.replyTo);
                                                            return originalMsg ? (
                                                                <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-400 rounded flex items-center justify-between group hover:bg-blue-100 transition-colors">
                                                                    <button
                                                                        onClick={() => {
                                                                            const element = document.getElementById(`message-${m.replyTo}`);
                                                                            if (element) {
                                                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                                                element.classList.add('ring-2', 'ring-blue-400', 'ring-offset-2');
                                                                                setTimeout(() => {
                                                                                    element.classList.remove('ring-2', 'ring-blue-400', 'ring-offset-2');
                                                                                }, 2000);
                                                                            }
                                                                        }}
                                                                        className="flex-1 text-left text-xs text-blue-700 cursor-pointer hover:text-blue-900"
                                                                    >
                                                                        <span className="font-semibold">🔁 Replying to:</span>{' '}
                                                                        <span className="italic">{originalMsg.content.substring(0, 60)}{originalMsg.content.length > 60 ? '...' : ''}</span>
                                                                    </button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setInternalMessages(prev =>
                                                                                prev.map(msg => msg.id === m.id ? { ...msg, replyTo: undefined } : msg)
                                                                            );
                                                                        }}
                                                                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-800"
                                                                    >
                                                                        <X className="w-3 h-3" />
                                                                    </Button>
                                                                </div>
                                                            ) : null;
                                                        })()}

                                                        {/* Edit mode */}
                                                        {editingMessageId === m.id ? (
                                                            <div className="bg-white border-2 border-blue-500 rounded-lg p-3">
                                                                <textarea
                                                                    value={editedContent}
                                                                    onChange={(e) => setEditedContent(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                                            e.preventDefault();
                                                                            handleSaveEdit();
                                                                        } else if (e.key === 'Escape') {
                                                                            handleCancelEdit();
                                                                        }
                                                                    }}
                                                                    className="w-full min-h-[80px] p-2 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                    placeholder="Edit your message..."
                                                                    autoFocus
                                                                />
                                                                <div className="flex gap-2 mt-2">
                                                                    <Button
                                                                        onClick={handleSaveEdit}
                                                                        size="sm"
                                                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                                                    >
                                                                        Save & Resend (Enter)
                                                                    </Button>
                                                                    <Button
                                                                        onClick={handleCancelEdit}
                                                                        size="sm"
                                                                        variant="outline"
                                                                    >
                                                                        Cancel (Esc)
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div
                                                                onContextMenu={(e) => handleContextMenu(e, m)}
                                                                className={`${bgClass} rounded-lg px-4 py-3 text-[0.95rem] leading-[1.6] 
                                                                        ${m.role === "user" ? "whitespace-pre-wrap" : ""} 
                                                                        break-words transition-all duration-200 hover:shadow-md cursor-context-menu`}
                                                            >
                                                                {m.role === "user" ? (
                                                                    m.content
                                                                ) : (
                                                                    <div
                                                                        className="prose prose-sm max-w-none chat-markdown-content"
                                                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                                                                    />
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Timestamp */}
                                                        {m.timestamp && (
                                                            <div className={`text-xs mt-1 ${m.role === "user" ? "text-right text-blue-200" : "text-gray-400"}`}>
                                                                {formatMessageTime(m.timestamp)}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Context Menu */}
                                {contextMenuPosition && contextMenuMessageId && (
                                    <div
                                        className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-50"
                                        style={{
                                            top: contextMenuPosition.y,
                                            left: contextMenuPosition.x,
                                        }}
                                    >
                                        <button
                                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                            onClick={() => handleReplyTo(contextMenuMessageId)}
                                        >
                                            <span>Reply</span>
                                        </button>
                                        {(() => {
                                            const message = messages.find(m => m.id === contextMenuMessageId);
                                            const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
                                            const canEdit = message && lastUserMessage && message.id === lastUserMessage.id;

                                            return canEdit && (
                                                <button
                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                                    onClick={() => handleEditMessage(contextMenuMessageId)}
                                                >
                                                    <span>Edit</span>
                                                </button>
                                            );
                                        })()}
                                    </div>
                                )}




                                {/* Scroll anchor */}
                                <div ref={messagesEndRef} />
                            </div>
                        </div>
                        <ScrollBar orientation="vertical" />
                    </ScrollArea>

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
                        {/* Reply indicator */}
                        {replyToMessage && (
                            <div className="mb-2 p-2 bg-blue-50 border-l-4 border-blue-500 rounded flex items-center justify-between">
                                <div className="flex-1 text-sm">
                                    <div className="text-blue-700 font-semibold">
                                        {selectedText ? 'From Document' : `Replying to ${replyToMessage.role === 'user' ? 'your message' : 'assistant'}`}
                                    </div>
                                    <div className="text-gray-600 truncate">
                                        {replyToMessage.content.substring(0, 60)}...
                                    </div>
                                </div>
                                <button
                                    onClick={() => setReplyToMessage(null)}
                                    className="text-gray-400 hover:text-gray-600 ml-2"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        {/* Selected text indicator */}
                        {selectedText && (
                            <div className="mb-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-purple-500 rounded flex items-center justify-between">
                                <div className="flex-1 text-sm">
                                    <div className="text-purple-700 font-semibold flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5" />
                                        From Document
                                    </div>
                                    <div className="text-gray-600 truncate">
                                        {selectedText.length > 80
                                            ? `${selectedText.substring(0, 80)}...`
                                            : selectedText}
                                    </div>
                                </div>
                                <button
                                    onClick={onClearSelection}
                                    className="text-gray-400 hover:text-gray-600 ml-2"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        )}

                        <div className="flex items-center gap-2">
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isGenerating ? "AI is generating..." : "Ask about this document (Enter to send)"}
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
                                onClick={() => isGenerating ? handleStopGeneration() : handleSend()}
                                disabled={!isGenerating && !input.trim()}
                                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:bg-gray-300 shadow-lg transition-all duration-200 hover:scale-105"
                            >
                                {isGenerating ? (
                                    <CircleStop className="w-4 h-4" />
                                ) : (
                                    <SendHorizonal className="w-4 h-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {
                showAiChanges && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                        <div className="bg-white w-full max-w-3xl rounded-lg shadow-xl overflow-hidden">
                            <div className="px-5 py-3 border-b flex items-center justify-between">
                                <h3 className="text-lg font-semibold">AI Changes</h3>
                                <button className="text-gray-500 hover:text-gray-700" onClick={() => setShowAiChanges(false)}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-5 grid grid-cols-2 gap-4 max-h-[60vh] overflow-auto">
                                <div>
                                    <div className="text-sm text-gray-500 mb-2">Before</div>
                                    <div className="p-3 rounded border bg-gray-50 whitespace-pre-wrap break-words text-sm max-h=[50vh] overflow-auto">{aiBeforeContent?.substring(0, 5000)}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-gray-500 mb-2">After</div>
                                    <div className="p-3 rounded border bg-green-50 whitespace-pre-wrap break-words text-sm max-h=[50vh] overflow-auto">{editor?.getHTML()?.substring(0, 5000) || ''}</div>
                                </div>
                            </div>
                            <div className="px-5 py-3 border-t flex justify-end gap-2">
                                <Button variant="outline" onClick={() => {
                                    // Regenerate: re-run last prompt
                                    setShowAiChanges(false);
                                    if (lastUserPromptRef.current) {
                                        setTimeout(() => handleSend(lastUserPromptRef.current), 0);
                                    }
                                }}>Regenerate</Button>
                                <Button variant="destructive" onClick={async () => {
                                    // Reject: revert server content to before version using replace_document_content
                                    try {
                                        const currentContent = editor?.getHTML() || '';
                                        const toLen = currentContent.length;
                                        await fetch(buildApiUrl('api/tools/execute'), {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                tool: 'replace_document_content',
                                                args: { position: { from: 0, to: toLen }, content: aiBeforeContent || '', reason: 'Revert AI change' },
                                                documentId
                                            })
                                        });
                                        // Update editor to before content
                                        if (editor) editor.commands.setContent(aiBeforeContent || '');
                                    } catch (e) {
                                        console.error('Failed to revert AI change:', e);
                                    } finally {
                                        setShowAiChanges(false);
                                    }
                                }}>Reject</Button>
                                <Button onClick={() => {
                                    // Accept: keep current content (server already updated)
                                    setShowAiChanges(false);
                                }}>Accept</Button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* New Preview Modal with Highlighted Changes */}
            <AIChangesPreviewModal
                isOpen={showPreviewModal}
                onClose={() => setShowPreviewModal(false)}
                previewHtml={previewHtml}
                changes={previewChanges}
                onAccept={handleAcceptChanges}
                onReject={handleRejectChanges}
                onRegenerate={handleRegenerateChanges}
            />
        </>);
}