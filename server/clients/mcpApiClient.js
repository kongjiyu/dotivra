/**
 * MCP API Client
 * Handles communication with MCP (Model Context Protocol) tools and services
 */

class MCPApiClient {
    constructor() {
        this.tools = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the MCP client with available tools
     * @param {Array} tools - Array of available MCP tools
     * @returns {Promise<MCPApiClient>} Initialized client instance
     */
    async initialize(tools = []) {
        this.tools = tools;
        this.isInitialized = true;
        return this;
    }

    /**
     * Generate content with MCP tools available
     * @param {Object} options - Generation options
     * @param {string} options.model - Model name to use
     * @param {Array} options.contents - Chat contents/history
     * @param {Object} options.systemInstruction - System instruction object
     * @param {boolean} options.enableMcpTools - Whether to enable MCP tools
     * @returns {Promise<Object>} Generation result with text and tool calls
     */
    async generateWithTools({ model, contents, systemInstruction, enableMcpTools = false }) {
        if (!this.isInitialized) {
            throw new Error('MCP API Client not initialized. Call initialize() first.');
        }

        // Get the Gemini balancer from the global context
        // This is set in server.js when the server initializes
        const geminiBalancer = global.geminiBalancer;
        if (!geminiBalancer) {
            throw new Error('Gemini balancer not available');
        }

        // Prepare tools for Gemini if MCP is enabled
        const geminiTools = enableMcpTools && this.tools.length > 0
            ? this.convertMcpToolsToGeminiFormat(this.tools)
            : undefined;

        // Generate using the balancer with MCP tools
        const result = await geminiBalancer.generate({
            model,
            contents,
            systemInstruction: systemInstruction ? [systemInstruction] : undefined,
            tools: geminiTools
        });

        // Extract tool calls if any
        const toolCalls = this.extractToolCalls(result);

        return {
            text: result.text || '',
            toolCalls: toolCalls,
            response: result
        };
    }

    /**
     * Generate content with MCP tools available (streaming version)
     * @param {Object} options - Generation options
     * @param {string} options.model - Model name to use
     * @param {Array} options.contents - Chat contents/history
     * @param {Object} options.systemInstruction - System instruction object
     * @param {boolean} options.enableMcpTools - Whether to enable MCP tools
     * @param {Function} options.onChunk - Callback for each chunk
     * @returns {Promise<Object>} Generation result
     */
    async generateStreamWithTools({ model, contents, systemInstruction, enableMcpTools = false, onChunk }) {
        if (!this.isInitialized) {
            throw new Error('MCP API Client not initialized. Call initialize() first.');
        }

        const geminiBalancer = global.geminiBalancer;
        if (!geminiBalancer) {
            throw new Error('Gemini balancer not available');
        }

        // Prepare tools for Gemini if MCP is enabled
        const geminiTools = enableMcpTools && this.tools.length > 0
            ? this.convertMcpToolsToGeminiFormat(this.tools)
            : undefined;

        // Use generateStream if available, otherwise fall back to generate
        console.log('Starting streaming generation with MCP tools...');
        console.log('Function Existence:', typeof geminiBalancer.generateStream);
        if (typeof geminiBalancer.generateStream === 'function') {
            const result = await geminiBalancer.generateStream({
                model,
                contents,
                systemInstruction: systemInstruction ? [systemInstruction] : undefined,
                tools: geminiTools,
                onStream: onChunk
            });

            return {
                text: result.text || '',
                toolCalls: this.extractToolCalls(result),
                response: result
            };
        } else {
            // Fallback to regular generate if streaming not available
            const result = await geminiBalancer.generate({
                model,
                contents,
                systemInstruction: systemInstruction ? [systemInstruction] : undefined,
                tools: geminiTools
            });

            // Call onChunk with full result if callback provided
            if (onChunk && result.text) {
                onChunk(result.text);
            }

            return {
                text: result.text || '',
                toolCalls: this.extractToolCalls(result),
                response: result
            };
        }
    }

    /**
     * Convert MCP tools to Gemini function declarations format
     * @param {Array} mcpTools - MCP tools array
     * @returns {Array} Gemini-formatted tools
     */
    convertMcpToolsToGeminiFormat(mcpTools) {
        if (!mcpTools || mcpTools.length === 0) return [];

        return [{
            functionDeclarations: mcpTools.map(tool => ({
                name: tool.name,
                description: tool.description || '',
                parameters: this.convertMcpSchemaToGemini(tool.inputSchema || {})
            }))
        }];
    }

    /**
     * Convert MCP JSON schema to Gemini parameters format
     * @param {Object} schema - MCP input schema
     * @returns {Object} Gemini parameters object
     */
    convertMcpSchemaToGemini(schema) {
        const geminiParams = {
            type: 'object',
            properties: {},
            required: []
        };

        if (schema.properties) {
            geminiParams.properties = schema.properties;
        }

        if (schema.required && Array.isArray(schema.required)) {
            geminiParams.required = schema.required;
        }

        return geminiParams;
    }

    /**
     * Extract tool calls from Gemini response
     * @param {Object} result - Gemini generation result
     * @returns {Array} Array of tool calls
     */
    extractToolCalls(result) {
        const toolCalls = [];

        if (result.functionCalls && Array.isArray(result.functionCalls)) {
            toolCalls.push(...result.functionCalls);
        }

        // Also check in response candidates
        if (result.response?.candidates) {
            for (const candidate of result.response.candidates) {
                if (candidate.content?.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.functionCall) {
                            toolCalls.push(part.functionCall);
                        }
                    }
                }
            }
        }

        return toolCalls;
    }

    /**
     * Get available tools
     * @returns {Array} Array of available MCP tools
     */
    getAvailableTools() {
        return this.tools;
    }

    /**
     * Check if client is initialized
     * @returns {boolean} Initialization status
     */
    isReady() {
        return this.isInitialized;
    }
}

// Export singleton instance
const mcpApiClient = new MCPApiClient();

export { mcpApiClient, MCPApiClient };
