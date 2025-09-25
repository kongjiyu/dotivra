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

    // Note: Current operation ID is stored globally for DocumentEditor access

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
        // Enhanced AI content generation based on user input
        return new Promise((resolve) => {
            setTimeout(() => {
                const lowerPrompt = prompt.toLowerCase();
                let content = '';

                // Generate contextual content based on keywords in the prompt
                if (lowerPrompt.includes('summary') || lowerPrompt.includes('summarize')) {
                    content = `## Document Summary\n\nThis comprehensive document outlines our strategic approach and key initiatives. The main focus areas include:\n\n### Key Highlights:\n- **Strategic Vision**: Clear direction for 2024 and beyond\n- **Implementation Framework**: Structured approach to execution\n- **Success Metrics**: Measurable outcomes and KPIs\n- **Risk Management**: Proactive mitigation strategies\n\n### Recommendations:\n1. Proceed with implementation as outlined\n2. Monitor progress against defined metrics\n3. Adjust strategies based on market feedback`;

                } else if (lowerPrompt.includes('conclusion') || lowerPrompt.includes('ending') || lowerPrompt.includes('wrap up')) {
                    content = `## Final Thoughts\n\nAs we move forward with this strategic initiative, it's essential to maintain focus on our core objectives while remaining agile enough to adapt to changing circumstances.\n\n### Next Steps:\n- **Immediate Actions**: Begin implementation of Phase 1 initiatives\n- **Short-term Goals**: Establish baseline metrics and monitoring systems\n- **Long-term Vision**: Position for sustained growth and market leadership\n\n### Call to Action:\nThe success of this strategy depends on coordinated effort across all teams. We encourage active participation and continuous feedback to ensure optimal outcomes.\n\n*"Strategy without execution is hallucination. Execution without strategy is chaos."* - Let's ensure we have both.`;

                } else if (lowerPrompt.includes('next steps') || lowerPrompt.includes('action') || lowerPrompt.includes('todo')) {
                    content = `## Action Items & Next Steps\n\n### Immediate Actions (Next 30 Days):\n- [ ] Finalize resource allocation and team assignments\n- [ ] Establish communication protocols and reporting structure\n- [ ] Set up monitoring dashboards and success metrics\n- [ ] Conduct stakeholder alignment sessions\n\n### Short-term Goals (Next 90 Days):\n- [ ] Launch pilot programs in selected markets\n- [ ] Implement feedback collection mechanisms\n- [ ] Optimize processes based on initial results\n- [ ] Prepare for full-scale rollout\n\n### Long-term Milestones (6-12 Months):\n- [ ] Achieve target performance metrics\n- [ ] Expand to additional markets or segments\n- [ ] Conduct comprehensive strategy review\n- [ ] Plan for next strategic cycle`;

                } else if (lowerPrompt.includes('improve') || lowerPrompt.includes('enhance') || lowerPrompt.includes('better')) {
                    content = `## Enhancement Recommendations

### Content Improvements:
- **Add Supporting Data**: Include relevant statistics and benchmarks
- **Visual Elements**: Consider adding charts, graphs, or infographics  
- **Case Studies**: Include real-world examples and success stories
- **Expert Quotes**: Add insights from industry leaders or stakeholders

### Structure Enhancements:
1. **Executive Summary**: Add a concise overview at the beginning
2. **Appendices**: Include detailed data and supporting materials
3. **Glossary**: Define technical terms and acronyms
4. **Reference Section**: Add citations and further reading

### Code Examples:
Here's how to implement \`structured data\`:

\`\`\`javascript
const enhancedData = {
  title: "Document Enhancement",
  methods: ["analysis", "optimization", "validation"]
};
\`\`\`

### Style Recommendations:
- Use *active voice* for clarity and impact
- Vary **sentence length** for better readability
- Include ***transition sentences*** between sections
- Strengthen conclusions with specific recommendations

> "The best way to improve documentation is through continuous iteration and user feedback."

### Reference Table:
| Aspect | Current | Enhanced | Impact |
|--------|---------|----------|--------|
| Structure | Basic | Advanced | High |
| Content | Good | Excellent | Medium |
| Style | Standard | Professional | High |`;

                } else if (lowerPrompt.includes('risk') || lowerPrompt.includes('challenge') || lowerPrompt.includes('mitigation')) {
                    content = `## Risk Assessment & Mitigation\n\n### Identified Risks:\n\n#### High Priority:\n1. **Market Volatility**: Economic uncertainties may impact demand\n   - *Mitigation*: Diversify market exposure and maintain flexible pricing\n\n2. **Resource Constraints**: Limited availability of skilled personnel\n   - *Mitigation*: Invest in training programs and strategic partnerships\n\n3. **Technology Disruption**: Rapid pace of technological change\n   - *Mitigation*: Continuous innovation and agile development practices\n\n#### Medium Priority:\n- Regulatory changes in target markets\n- Competitive response to our initiatives\n- Supply chain disruptions\n\n### Monitoring Framework:\n- Monthly risk assessment reviews\n- Quarterly strategy adjustments\n- Annual comprehensive risk audit`;

                } else if (lowerPrompt.includes('metric') || lowerPrompt.includes('kpi') || lowerPrompt.includes('measure')) {
                    content = `## Key Performance Indicators\n\n### Primary Success Metrics:\n\n#### Financial Performance:\n- **Revenue Growth**: 25% year-over-year increase\n- **Profit Margins**: Maintain or improve current levels\n- **ROI**: Achieve minimum 20% return on strategic investments\n- **Cost Efficiency**: Reduce operational costs by 15%\n\n#### Operational Excellence:\n- **Customer Satisfaction**: 95% satisfaction score\n- **Quality Metrics**: <2% defect rate\n- **Delivery Performance**: 98% on-time delivery\n- **Process Efficiency**: 30% reduction in cycle time\n\n#### Growth Indicators:\n- **Market Share**: Increase by 5 percentage points\n- **Customer Acquisition**: 40% increase in new customers\n- **Employee Engagement**: 90% satisfaction score\n- **Innovation Pipeline**: 5 new products/services launched\n\n### Reporting Schedule:\n- Daily operational dashboards\n- Weekly performance reviews\n- Monthly executive summaries\n- Quarterly strategic assessments`;

                } else {
                    // Generate contextual content based on the user's specific request
                    const topics = [
                        'implementation strategy',
                        'market analysis',
                        'competitive positioning',
                        'resource planning',
                        'stakeholder engagement',
                        'technology roadmap',
                        'performance optimization'
                    ];

                    const randomTopic = topics[Math.floor(Math.random() * topics.length)];

                    content = `# Additional Insights: ${prompt}

## Context:
Based on your request **"${prompt}"**, here are some relevant considerations and recommendations with mixed *markdown* and <strong>HTML</strong> formatting:

### Key Points:
- **Strategic Alignment**: Ensure this initiative aligns with overall business objectives
- ***Resource Requirements***: Consider the necessary personnel, budget, and timeline  
- **Success Criteria**: Define clear, measurable outcomes and milestones
- <em>Risk Factors</em>: Identify potential challenges and mitigation strategies

### Code Implementation:
\`\`\`typescript
interface ProjectInsights {
  topic: string;
  priority: "high" | "medium" | "low";
  timeline: number;
}

const insight: ProjectInsights = {
  topic: "${randomTopic}",
  priority: "high", 
  timeline: 30
};
\`\`\`

### Detailed Analysis:
This topic relates to our broader **${randomTopic}** and should be integrated into our comprehensive approach. Consider the following:

1. **Current State Assessment**: Where are we today?
2. **Desired Outcomes**: What specific results are we targeting?  
3. **Action Steps**: What concrete steps will move us forward?
4. **Success Metrics**: How will we measure progress and success?

> "Success is not final, failure is not fatal: it is the courage to continue that counts." - Winston Churchill

### Comparison Matrix:
| Aspect | Before | After | Impact Level |
|--------|--------|--------|--------------|
| Efficiency | 60% | 85% | <strong>High</strong> |
| Quality | Good | *Excellent* | Medium |  
| Speed | Standard | **Fast** | High |

### Recommendations:
- Conduct stakeholder consultation to validate approach
- Develop detailed implementation timeline
- Establish clear accountability and governance structure  
- Create feedback loops for continuous improvement

### Links and References:
Check out [our methodology](https://example.com/methodology) and \`inline code examples\` for more details.`;
                }

                resolve(content);
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
                    // Regular AI content generation using EnhancedAIContentWriter - ADD AT END OF DOCUMENT
                    const aiResponse = await generateAIContent(text);

                    if (aiWriter && editor && aiResponse) {
                        // Get the end of document position instead of cursor position
                        const doc = editor.state.doc;
                        const endPosition = doc.content.size;

                        const position: ContentPosition = {
                            from: endPosition,
                            to: endPosition,
                            length: 0
                        };

                        // Use the AI writer to add content at the end of document with proper highlighting
                        const operationId = await aiWriter.addContentAtPosition(position, `\n\n${aiResponse}`);

                        // Store operation ID globally so DocumentEditor can access it
                        (window as any).currentChatOperationId = operationId;
                        (window as any).currentChatAIWriter = aiWriter;

                        // Show AI actions for the operation with a slight delay to ensure content is rendered
                        console.log('🎯 About to show AI actions for regular AI. showAIActions:', showAIActions);
                        setTimeout(() => {
                            let actionFunction = showAIActions;

                            // Fallback to global function if context function is not available
                            if (!actionFunction && (window as any).currentShowAIActionsFunction) {
                                console.log('🔧 Using fallback global showAIActions function for regular chat');
                                actionFunction = (window as any).currentShowAIActionsFunction;
                            }

                            if (actionFunction && typeof actionFunction === 'function') {
                                console.log('✅ Calling showAIActions for regular AI operation');
                                try {
                                    actionFunction(`AI Response: ${text}`, documentContent);
                                } catch (error) {
                                    console.error('❌ Error calling showAIActions for regular AI:', error);
                                }
                            } else {
                                console.error('❌ showAIActions is not available for regular AI!', {
                                    contextFunction: showAIActions,
                                    globalFunction: (window as any).currentShowAIActionsFunction,
                                    type: typeof showAIActions,
                                    isFunction: typeof showAIActions === 'function'
                                });
                            }
                        }, 300);
                    }

                    // Add confirmation message 
                    const assistantMsg: ChatMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "✨ AI content generated and added to the end of your document. Review the green-highlighted content and use the action container to accept, reject, or regenerate.",
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
