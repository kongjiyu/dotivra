const express = require('express');
const router = express.Router();
const { mcpToolManager } = require('../../services/mcpIntegration');
const { mcpApiClient } = require('../../clients/mcpApiClient');
const { getToolService } = require('../services/toolService');
const { getReasoningAgent } = require('../gemini/geminiMcpIntegration');

/**
 * GET /api/mcp-test/tools
 * List available MCP tools
 */
router.get('/tools', async (req, res) => {
    try {
        const toolService = getToolService();
        const tools = await toolService.getAvailableTools();
        res.json({
            success: true,
            toolCount: tools.length,
            tools: tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema
            }))
        });
    } catch (error) {
        console.error('❌ Error fetching tools:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch tools',
            details: error.message
        });
    }
});

/**
 * POST /api/mcp-test/execute
 * Execute a single MCP tool
 */
router.post('/execute', async (req, res) => {
    try {
        const { toolName, parameters } = req.body;

        if (!toolName) {
            return res.status(400).json({
                success: false,
                error: 'toolName is required'
            });
        }

        const toolService = getToolService();
        const result = await toolService.executeTool(toolName, parameters || {});

        res.json({
            success: true,
            toolName,
            result
        });
    } catch (error) {
        console.error(`❌ Error executing tool ${req.body.toolName}:`, error);
        res.status(500).json({
            success: false,
            error: 'Tool execution failed',
            details: error.message
        });
    }
});

/**
 * POST /api/mcp-test/chain
 * Test agent tool chaining with MCP integration
 */
router.post('/chain', async (req, res) => {
    try {
        const { prompt, maxTurns = 5 } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        const agent = getReasoningAgent();
        const result = await agent.processWithReasoning(prompt, { maxTurns });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('❌ Error in tool chaining:', error);
        res.status(500).json({
            success: false,
            error: 'Tool chaining failed',
            details: error.message
        });
    }
});

/**
 * POST /api/mcp-test/generate
 * Generate content with MCP tools available
 */
router.post('/generate', async (req, res) => {
    try {
        const { prompt, documentId, context = {}, chatHistory = [] } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        const toolService = getToolService();
        const availableTools = await toolService.getAvailableTools();

        console.log(`📝 MCP Generate - Available tools: ${availableTools.length}`);
        console.log(`📝 Document ID: ${documentId || 'none'}`);
        console.log(`📝 Prompt: ${prompt.substring(0, 100)}...`);

        // Build chat history context
        let historyContext = '';
        if (chatHistory.length > 0) {
            historyContext = '\n\nPrevious Conversation:\n';
            chatHistory.forEach((msg, i) => {
                const role = msg.role === 'user' ? 'User' : 'Assistant';
                historyContext += `${role}: ${msg.parts[0].text}\n`;
            });
        }

        // Prepare conversation contents
        const contents = [
            ...chatHistory,
            {
                role: 'user',
                parts: [{ text: prompt }]
            }
        ];

        // Use gemini-2.0-flash-thinking-exp-01-21 for progressive thinking
        let model = 'gemini-2.0-flash-thinking-exp-01-21';

        // Initialize MCP client with tools
        const client = await mcpApiClient.initialize(availableTools);

        console.log('🚀 Generating with tools enabled...');

        const result = await client.generateWithTools({
            model,
            contents,
            systemInstruction: {
                parts: [{
                    text: `You are an Advanced Document Manipulation Agent with Progressive Thinking.

AVAILABLE TOOLS:
• scan_document_content(reason) - Analyze document structure and content
• search_document_content(query, reason) - Find specific text or patterns
• append_document_content(content, reason) - Add text at the end
• insert_document_content(position, content, reason) - Insert text at a position
• replace_document_content(position, content, reason) - Replace text at a range
• remove_document_content(position, reason) - Remove text at a range
• get_document_content(documentId) - Retrieve full document content
• verify_document_content(reason) - Confirm effects of modifications

YOUR WORKFLOW - Always show these phases to the user:

1. PLANNING PHASE
   Format: "📋 Planning: [brief plan of what you'll do]"

2. REASONING PHASE (Repeatable)
   Format: "🤔 Reasoning: [what you're analyzing or thinking about]"

3. EXECUTION PHASE (Repeatable for each tool)
   Format: "⚙️ Executing: [tool_name]"
   Then: "💭 Reason: [why you're calling this tool]"
   Then: "✅ Result: [what happened after the tool executed]"

4. SUMMARY PHASE
   Format: "✨ Summary: [final outcome and confirmation]"

CRITICAL RULES:
1. Execute immediately - never ask for confirmation
2. Find positions yourself using scan_document_content or search_document_content
3. Always show emoji phase markers (📋 🤔 ⚙️ 💭 ✅ ✨)
4. For each tool call: show the ⚙️ Executing → 💭 Reason → ✅ Result sequence
5. You can repeat reasoning and execution phases as many times as needed
6. Always provide clear reason field explaining why each tool is called
7. Never explain what you would do - just execute and show progress
8. Adopt a professional, concise, deterministic tone

EXAMPLE - Removal Task:
User: "Remove the Project Overview section"

📋 Planning: Locate and remove the Project Overview section from the document

🤔 Reasoning: I need to scan the document to find where the Project Overview section is located

⚙️ Executing: scan_document_content
💭 Reason: Finding the position of the Project Overview section in the document
✅ Result: Found Project Overview section at characters 450-890 (440 characters total)

🤔 Reasoning: Now that I've located the section, I'll remove it from the document

⚙️ Executing: remove_document_content
💭 Reason: Removing the Project Overview section at position 450-890 as requested by the user
✅ Result: Successfully removed 440 characters from the document

⚙️ Executing: verify_document_content
💭 Reason: Confirming that the Project Overview section has been completely removed
✅ Result: Verified - the Project Overview section no longer exists in the document

✨ Summary: Successfully removed the Project Overview section (440 characters removed)

EXAMPLE - Replacement Task:
User: "Replace all mentions of 'FooCorp' with 'BarCorp'"

📋 Planning: Find all occurrences of 'FooCorp' and replace them with 'BarCorp'

🤔 Reasoning: First, I need to search the document to locate all instances of 'FooCorp'

⚙️ Executing: search_document_content
💭 Reason: Locating all instances of 'FooCorp' throughout the document
✅ Result: Found 3 occurrences of 'FooCorp' at positions 120, 450, and 890

🤔 Reasoning: Now I'll replace each occurrence one by one with 'BarCorp'

⚙️ Executing: replace_document_content
💭 Reason: Replacing the first occurrence of 'FooCorp' at position 120 with 'BarCorp'
✅ Result: Successfully replaced text at position 120

⚙️ Executing: replace_document_content
💭 Reason: Replacing the second occurrence of 'FooCorp' at position 450 with 'BarCorp'
✅ Result: Successfully replaced text at position 450

⚙️ Executing: replace_document_content
💭 Reason: Replacing the third occurrence of 'FooCorp' at position 890 with 'BarCorp'
✅ Result: Successfully replaced text at position 890

⚙️ Executing: verify_document_content
💭 Reason: Confirming that no instances of 'FooCorp' remain in the document
✅ Result: Verified - all 'FooCorp' mentions have been replaced with 'BarCorp'

✨ Summary: Successfully replaced 3 instances of 'FooCorp' with 'BarCorp'

Document ID: ${documentId || 'none'}
${historyContext}

Execute operations immediately when the user instructs.`
                }]
            },
            enableMcpTools: true
        });

        res.json({
            success: true,
            text: result.text,
            toolCalls: result.toolCalls,
            toolsUsed: result.toolCalls.length,
            availableToolCount: availableTools.length
        });
    } catch (error) {
        console.error('❌ Error in MCP generate:', error);
        res.status(500).json({
            success: false,
            error: 'Generation failed',
            details: error.message
        });
    }
});

/**
 * POST /api/mcp-test/reasoning
 * Test reasoning agent with streaming
 */
router.post('/reasoning', async (req, res) => {
    try {
        const { prompt, documentId, context = {} } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        // Set headers for Server-Sent Events
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const agent = getReasoningAgent();

        // Stream reasoning process
        const stream = agent.streamReasoning(prompt, {
            documentId,
            context
        });

        for await (const chunk of stream) {
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }

        res.end();
    } catch (error) {
        console.error('❌ Error in reasoning stream:', error);
        res.status(500).json({
            success: false,
            error: 'Reasoning failed',
            details: error.message
        });
    }
});

module.exports = router;
