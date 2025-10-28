// server/aiAgent.js
// Simplified AI Agent with Direct Tool Registry Integration

import { getToolsRegistry } from './services/toolService.js';

/**
 * AI Agent with stage-based execution
 * Stages: Planning, Reasoning, Executing, ToolUsed, ToolResult, Summary
 */
export class AIAgent {
    constructor(geminiBalancer, toolService) {
        this.geminiBalancer = geminiBalancer;
        this.toolService = toolService;
        this.maxRetries = 3;
    }

    /**
     * Execute AI agent workflow with streaming
     * Yields stage-based JSON objects: {stage: "...", content: ...}
     */
    async* executeWithStream(userPrompt, documentId, conversationHistory = []) {
        console.log('🤖 AI Agent starting execution...');
        console.log('📝 User prompt:', userPrompt);
        console.log('📄 Document ID:', documentId);

        // Get available tools
        const toolRegistry = await getToolsRegistry();
        const tools = toolRegistry.tools;

        console.log(`🔧 Loaded ${tools.length} tools from registry`);

        // Build tool descriptions for the AI
        const toolDescriptions = tools.map(tool => {
            const params = tool.inputSchema.properties;
            const required = tool.inputSchema.required || [];
            const paramList = Object.keys(params).map(key => {
                const param = params[key];
                const req = required.includes(key) ? '*' : '';
                return `${key}${req}: ${param.type} - ${param.description || ''}`;
            }).join(', ');
            return `• ${tool.name}(${paramList}) - ${tool.description}`;
        }).join('\n');

        // System prompt for AI agent
        const systemPrompt = `You are an Advanced Document Manipulation AI Agent working with HTML documents.

IMPORTANT: You are working with HTML document content. When analyzing or modifying content, you're manipulating HTML tags, attributes, and text.

AVAILABLE TOOLS:
${toolDescriptions}

SPECIAL INSTRUCTIONS FOR "CREATE" OR "GENERATE" REQUESTS:
When user asks to "create" or "generate" something (e.g., "create a project overview", "generate a summary"):
1. ALWAYS scan the document first using get_document_content or scan_document_content
2. Analyze the current document structure and content
3. Reason about what content to create and WHERE to place it
4. Use insert_document_content_at_location to add the new content at the appropriate position
5. For project overviews, place at the beginning after any title
6. For summaries, place at a logical section or at the end
7. DO NOT just append at the end unless that's the best location

WORKFLOW - You MUST follow these stages in order:
1. **Planning** - Briefly plan what you need to do
2. **Reasoning** - Analyze and think through the approach (can repeat)
3. **Executing** - Decide to use a tool
4. **ToolUsed** - Specify the exact tool and arguments to execute
5. **ToolResult** - (System will execute and provide result)
6. **Summary** - Summarize what was accomplished

OUTPUT FORMAT - You MUST respond with VALID JSON ONLY:

Stage 1 - Planning:
{"stage":"planning","content":"Brief plan of what I'll do"}

Stage 2 - Reasoning (repeatable):
{"stage":"reasoning","content":"My analysis and thinking"}

Stage 3 - Executing (when ready to use a tool):
{"stage":"executing","content":"I will now use [tool_name] to [action]"}

Stage 4 - ToolUsed (CRITICAL - Must be valid JSON):
{"stage":"toolUsed","content":{"tool":"tool_name","args":{"param1":"value1","param2":"value2"}}}

EXAMPLE - ToolUsed for get_document_content:
{"stage":"toolUsed","content":{"tool":"get_document_content","args":{"reason":"Retrieving document to analyze structure"}}}

EXAMPLE - ToolUsed for replace_document_content:
{"stage":"toolUsed","content":{"tool":"replace_document_content","args":{"position":{"from":0,"to":100},"content":"<h1>New Title</h1>","reason":"Replacing old title"}}}

After tool execution, system provides:
{"stage":"toolResult","content":{"success":true,"result":{...}}}

Stage 6 - Summary (final):
{"stage":"summary","content":"Final summary of what was accomplished"}

CRITICAL RULES:
1. ALWAYS call get_document_content FIRST to see the HTML content
2. Respond with ONLY valid JSON - no explanations outside JSON
3. Each response should be ONE stage at a time
4. For toolUsed stage, ensure the JSON structure is perfect
5. Never ask for confirmation - execute immediately
6. Work with HTML tags and structure
7. After each tool execution, you'll receive a toolResult stage
8. You can repeat reasoning/executing/toolUsed cycles as needed
9. When creating content, analyze the document to find the best insertion point

User Request: ${userPrompt}
`;

        // Build conversation context
        const contents = [
            ...conversationHistory.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            })),
            {
                role: 'user',
                parts: [{ text: userPrompt }]
            }
        ];

        let currentStage = 'planning';
        let retryCount = 0;
        let toolExecutionCount = 0;
        const maxToolExecutions = 15; // Prevent infinite loops

        while (toolExecutionCount < maxToolExecutions) {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🔄 Iteration ${toolExecutionCount + 1} - Current stage: ${currentStage}`);
            console.log(`${'='.repeat(60)}`);

            try {
                // Call Gemini
                console.log('🤖 Calling Gemini...');
                const result = await this.geminiBalancer.generate({
                    model: 'gemini-2.5-pro',
                    contents,
                    systemInstruction: {
                        parts: [{ text: systemPrompt }]
                    },
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 2048
                    }
                });

                const aiResponse = result.text.trim();
                console.log('📥 AI Response:', aiResponse.substring(0, 200));

                // Parse JSON response
                let parsed;
                try {
                    // Try to extract JSON from response
                    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        parsed = JSON.parse(jsonMatch[0]);
                    } else {
                        throw new Error('No JSON found in response');
                    }
                } catch (parseError) {
                    console.error('❌ JSON parse error:', parseError);

                    retryCount++;
                    if (retryCount >= this.maxRetries) {
                        yield {
                            stage: 'error',
                            content: `Failed to parse AI response after ${this.maxRetries} attempts`
                        };
                        break;
                    }

                    // Add error feedback to conversation
                    contents.push({
                        role: 'model',
                        parts: [{ text: aiResponse }]
                    });
                    contents.push({
                        role: 'user',
                        parts: [{ text: 'ERROR: Your response was not valid JSON. Please respond with ONLY valid JSON in the format: {"stage":"...","content":...}' }]
                    });
                    continue;
                }

                // Reset retry count on successful parse
                retryCount = 0;

                // Validate stage
                if (!parsed.stage || !parsed.content) {
                    console.error('❌ Invalid stage structure:', parsed);
                    continue;
                }

                console.log(`✅ Parsed stage: ${parsed.stage}`);
                currentStage = parsed.stage;

                // Yield the stage to the client
                yield parsed;

                // Handle tool execution
                if (parsed.stage === 'toolUsed') {
                    toolExecutionCount++;

                    const toolData = parsed.content;
                    if (!toolData.tool || !toolData.args) {
                        console.error('❌ Invalid tool data:', toolData);
                        yield {
                            stage: 'toolResult',
                            content: {
                                success: false,
                                error: 'Invalid tool specification'
                            }
                        };

                        // Add error to conversation
                        contents.push({
                            role: 'model',
                            parts: [{ text: JSON.stringify(parsed) }]
                        });
                        contents.push({
                            role: 'user',
                            parts: [{ text: `Tool execution failed. Please check the tool name and arguments and try again.` }]
                        });
                        continue;
                    }

                    console.log(`🔧 Executing tool: ${toolData.tool}`);
                    console.log(`📋 Tool args:`, toolData.args);

                    try {
                        // Execute the tool
                        const toolResult = await this.toolService.executeTool(
                            toolData.tool,
                            toolData.args
                        );

                        console.log(`✅ Tool executed successfully:`, toolResult);

                        const toolResultStage = {
                            stage: 'toolResult',
                            content: {
                                success: true,
                                tool: toolData.tool,
                                result: toolResult
                            }
                        };

                        // Yield tool result to client
                        yield toolResultStage;

                        // Add tool execution to conversation
                        contents.push({
                            role: 'model',
                            parts: [{ text: JSON.stringify(parsed) }]
                        });
                        contents.push({
                            role: 'user',
                            parts: [{ text: `TOOL RESULT: ${JSON.stringify(toolResultStage)}` }]
                        });

                    } catch (toolError) {
                        console.error(`❌ Tool execution error:`, toolError);

                        const errorResult = {
                            stage: 'toolResult',
                            content: {
                                success: false,
                                tool: toolData.tool,
                                error: toolError.message
                            }
                        };

                        yield errorResult;

                        // Add error to conversation
                        contents.push({
                            role: 'model',
                            parts: [{ text: JSON.stringify(parsed) }]
                        });
                        contents.push({
                            role: 'user',
                            parts: [{ text: `TOOL ERROR: ${JSON.stringify(errorResult)}. Please adjust your approach and try again.` }]
                        });
                    }
                } else if (parsed.stage === 'summary') {
                    // Agent has completed - break the loop
                    console.log('✅ Agent completed with summary');
                    break;
                } else {
                    // For planning, reasoning, executing stages, add to conversation
                    contents.push({
                        role: 'model',
                        parts: [{ text: JSON.stringify(parsed) }]
                    });

                    // If not a tool execution stage, prompt for next stage
                    if (parsed.stage !== 'executing') {
                        contents.push({
                            role: 'user',
                            parts: [{ text: 'Continue to the next stage.' }]
                        });
                    }
                }

            } catch (error) {
                console.error('❌ Agent execution error:', error);
                yield {
                    stage: 'error',
                    content: error.message
                };
                break;
            }
        }

        if (toolExecutionCount >= maxToolExecutions) {
            console.warn('⚠️ Max tool executions reached');
            yield {
                stage: 'summary',
                content: 'Process completed after maximum tool executions'
            };
        }

        console.log('🏁 AI Agent execution complete');
    }
}
