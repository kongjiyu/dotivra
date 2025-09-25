import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import AIActionContainer from '@/components/document/AIActionContainer';
import { Send, Bot, User } from 'lucide-react';

type OperationType = 'addition' | 'editing' | 'removal' | 'replacement';

interface ChatMessage {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
}

interface AIOperation {
    type: OperationType;
    originalText?: string;
    newText: string;
    summary: string;
}

export default function ChatEditingSimulator() {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            content: 'Hello! I\'m your AI assistant. I can help you edit your document. Try commands like:\n• "*add" - to add new content\n• "*edit" - to edit existing content\n• "*remove" - to remove content\n• "*test" - to test all operations',
            isUser: false,
            timestamp: new Date()
        }
    ]);

    const [inputValue, setInputValue] = useState('');
    const [showAI, setShowAI] = useState(false);
    const [currentOperation, setCurrentOperation] = useState<AIOperation | null>(null);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [documentContent, setDocumentContent] = useState(`
    <div class="document-content">
      <h1>My Document</h1>
      <p>This is a sample document with some content that can be edited.</p>
      <p>You can add new paragraphs, edit existing ones, or remove unwanted content.</p>
      <ul>
        <li>Feature 1: Document editing</li>
        <li>Feature 2: AI assistance</li>
        <li>Feature 3: Real-time collaboration</li>
      </ul>
      <p>This paragraph might need to be updated or removed.</p>
    </div>
  `);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const simulateAddContent = (): AIOperation => {
        const newContent = `<p class="ai-addition-content">🤖 This is new AI-generated content added to your document. It includes helpful information and maintains the document's flow and structure.</p>`;
        return {
            type: 'addition',
            newText: newContent,
            summary: 'Adding new paragraph with AI-generated content'
        };
    };

    const simulateEditContent = (): AIOperation => {
        return {
            type: 'editing',
            originalText: 'This is a sample document with some content that can be edited.',
            newText: '<p class="ai-editing-content">This is an enhanced document with improved content that has been AI-optimized for clarity and engagement.</p>',
            summary: 'Editing existing paragraph for better clarity'
        };
    };

    const simulateRemoveContent = (): AIOperation => {
        return {
            type: 'removal',
            originalText: 'This paragraph might need to be updated or removed.',
            newText: '',
            summary: 'Removing outdated paragraph content'
        };
    };

    const simulateTestContent = (): AIOperation[] => {
        return [
            simulateAddContent(),
            simulateEditContent(),
            simulateRemoveContent()
        ];
    };

    const processCommand = (command: string): AIOperation | AIOperation[] | null => {
        const cmd = command.toLowerCase().trim();

        if (cmd === '*add') {
            return simulateAddContent();
        } else if (cmd === '*edit') {
            return simulateEditContent();
        } else if (cmd === '*remove') {
            return simulateRemoveContent();
        } else if (cmd === '*test') {
            return simulateTestContent();
        }

        return null;
    };

    const applyOperation = (operation: AIOperation) => {
        let updatedContent = documentContent;

        switch (operation.type) {
            case 'addition':
                // Add new content at the end
                updatedContent = updatedContent.replace(
                    '</div>',
                    `    ${operation.newText}\n    </div>`
                );
                break;

            case 'editing':
                if (operation.originalText) {
                    // Replace original text with new text
                    updatedContent = updatedContent.replace(
                        operation.originalText,
                        operation.newText
                    );
                }
                break;

            case 'removal':
                if (operation.originalText) {
                    // Mark content for removal (add removal class)
                    const markedContent = `<p class="ai-removal-content">${operation.originalText}</p>`;
                    updatedContent = updatedContent.replace(
                        `<p>${operation.originalText}</p>`,
                        markedContent
                    );
                }
                break;
        }

        setDocumentContent(updatedContent);
    };

    const handleSendMessage = () => {
        if (!inputValue.trim()) return;

        // Add user message
        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: inputValue,
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);

        // Process command
        const operation = processCommand(inputValue);

        if (operation) {
            if (Array.isArray(operation)) {
                // Handle test command (multiple operations)
                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    content: `I'll demonstrate all editing operations:\n• Adding new content\n• Editing existing content\n• Removing unwanted content\n\nLet me start with adding new content...`,
                    isUser: false,
                    timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);

                // Apply first operation and show UI
                setCurrentOperation(operation[0]);
                applyOperation(operation[0]);
                setShowAI(true);
            } else {
                // Handle single operation
                const operationName = {
                    addition: 'add new content',
                    editing: 'edit existing content',
                    removal: 'remove content',
                    replacement: 'replace content'
                }[operation.type];

                const aiMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    content: `I'll ${operationName} for you. Please review the highlighted changes and let me know if you want to accept or reject them.`,
                    isUser: false,
                    timestamp: new Date()
                };

                setMessages(prev => [...prev, aiMessage]);
                setCurrentOperation(operation);
                applyOperation(operation);
                setShowAI(true);
            }
        } else {
            // Handle regular chat
            const aiMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                content: `I understand you want to "${inputValue}". Try using these commands:\n• *add - to add new content\n• *edit - to edit existing text\n• *remove - to remove unwanted content\n• *test - to see all operations`,
                isUser: false,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        }

        setInputValue('');
    };

    const handleAccept = () => {
        if (currentOperation?.type === 'removal' && currentOperation.originalText) {
            // Actually remove the content for removal operations
            const updatedContent = documentContent.replace(
                new RegExp(`<p class="ai-removal-content">${currentOperation.originalText}</p>`),
                ''
            );
            setDocumentContent(updatedContent);
        }

        const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            content: `✅ Changes accepted! The ${currentOperation?.type} operation has been applied to your document.`,
            isUser: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        setShowAI(false);
        setCurrentOperation(null);
    };

    const handleReject = () => {
        // Revert changes
        const aiMessage: ChatMessage = {
            id: Date.now().toString(),
            content: `❌ Changes rejected. Your document remains unchanged.`,
            isUser: false,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, aiMessage]);
        setShowAI(false);
        setCurrentOperation(null);

        // Reset document content
        setDocumentContent(`
      <div class="document-content">
        <h1>My Document</h1>
        <p>This is a sample document with some content that can be edited.</p>
        <p>You can add new paragraphs, edit existing ones, or remove unwanted content.</p>
        <ul>
          <li>Feature 1: Document editing</li>
          <li>Feature 2: AI assistance</li>
          <li>Feature 3: Real-time collaboration</li>
        </ul>
        <p>This paragraph might need to be updated or removed.</p>
      </div>
    `);
    };

    const handleRegenerate = () => {
        setIsRegenerating(true);
        setTimeout(() => {
            setIsRegenerating(false);
            const aiMessage: ChatMessage = {
                id: Date.now().toString(),
                content: `🔄 I've regenerated the content with a different approach. Please review the updated changes.`,
                isUser: false,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, aiMessage]);
        }, 2000);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 h-screen">
            {/* Chat Interface */}
            <Card className="flex flex-col h-full">
                <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Bot className="w-5 h-5" />
                        AI Document Editor Chat
                    </h2>
                    <p className="text-sm opacity-90">Simulate editing commands: *add, *edit, *remove, *test</p>
                </div>

                <ScrollArea className="flex-1 p-4">
                    <div className="space-y-4">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${message.isUser ? 'bg-blue-600' : 'bg-purple-600'
                                    }`}>
                                    {message.isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                </div>
                                <div className={`max-w-[80%] p-3 rounded-lg text-sm ${message.isUser
                                        ? 'bg-blue-600 text-white ml-4'
                                        : 'bg-gray-100 text-gray-900 mr-4'
                                    }`}>
                                    <div className="whitespace-pre-line">{message.content}</div>
                                    <div className="text-xs opacity-70 mt-1">
                                        {message.timestamp.toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div ref={messagesEndRef} />
                </ScrollArea>

                <div className="p-4 border-t bg-gray-50 rounded-b-lg">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Type *add, *edit, *remove, or *test to simulate AI operations..."
                            className="flex-1"
                        />
                        <Button onClick={handleSendMessage} size="sm">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                        <Button size="sm" variant="outline" onClick={() => setInputValue('*add')}>
                            *add
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setInputValue('*edit')}>
                            *edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setInputValue('*remove')}>
                            *remove
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setInputValue('*test')}>
                            *test
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Document Preview */}
            <Card className="flex flex-col h-full">
                <div className="p-4 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-lg font-semibold">Document Preview</h2>
                    <p className="text-sm text-gray-600">Live preview of your document with AI edits</p>
                </div>

                <ScrollArea className="flex-1 p-6">
                    <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: documentContent }}
                    />
                </ScrollArea>

                <div className="p-4 border-t bg-gray-50 text-sm text-gray-600 rounded-b-lg">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <strong>Legend:</strong>
                            <div className="space-y-1 mt-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-green-200 border border-green-500 rounded"></div>
                                    <span>Addition</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-blue-200 border border-blue-500 rounded"></div>
                                    <span>Editing</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-red-200 border border-red-500 rounded"></div>
                                    <span>Removal</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-orange-200 border border-orange-500 rounded"></div>
                                    <span>Replacement</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>

            {/* AI Action Container */}
            <AIActionContainer
                show={showAI}
                onAccept={handleAccept}
                onReject={handleReject}
                onRegenerate={handleRegenerate}
                isRegenerating={isRegenerating}
                chatSidebarOpen={false}
                operationType={currentOperation?.type || 'addition'}
                affectedContentSummary={currentOperation?.summary}
            />
        </div>
    );
}