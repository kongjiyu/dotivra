/**
 * AI Interaction HTML Builder
 * Converts all AI interaction stages (planning, reasoning, tool calls) into HTML format
 * for storage and dynamic rendering
 */

export interface AIInteractionStage {
    stage: 'planning' | 'reasoning' | 'toolUsed' | 'toolResult' | 'summary' | 'error';
    content: any;
    thought?: string;
    timestamp?: number;
}

export interface AIInteractionSession {
    userPrompt: string;
    stages: AIInteractionStage[];
    toolExecutions: any[];
    startTime: number;
    endTime?: number;
    success: boolean;
}

/**
 * Build complete HTML representation of AI interaction session
 */
export function buildAIInteractionHTML(session: AIInteractionSession): string {
    const { userPrompt, stages, toolExecutions, startTime, endTime, success } = session;
    
    const duration = endTime ? ((endTime - startTime) / 1000).toFixed(1) : '...';
    const statusClass = success ? 'status-success' : 'status-error';
    const statusIcon = success ? '✅' : '❌';
    
    let html = `
<div class="ai-interaction-session">
    <!-- Session Header -->
    <div class="session-header">
        <div class="session-title">
            <span class="session-icon">🤖</span>
            <span class="session-label">AI Agent Session</span>
        </div>
        <div class="session-meta">
            <span class="session-status ${statusClass}">${statusIcon} ${success ? 'Completed' : 'Failed'}</span>
            <span class="session-duration">⏱️ ${duration}s</span>
            <span class="session-time">${new Date(startTime).toLocaleTimeString()}</span>
        </div>
    </div>

    <!-- User Prompt -->
    <div class="user-prompt-block">
        <div class="block-header">
            <span class="block-icon">💬</span>
            <span class="block-title">User Request</span>
        </div>
        <div class="user-prompt-content">${escapeHtml(userPrompt)}</div>
    </div>

    <!-- AI Stages -->
    <div class="ai-stages">`;

    // Add each stage
    for (const stage of stages) {
        html += buildStageHTML(stage);
    }

    html += `
    </div>

    <!-- Tool Execution Summary -->
    ${toolExecutions.length > 0 ? buildToolExecutionSummaryHTML(toolExecutions) : ''}
</div>`;

    return html;
}

/**
 * Build HTML for a single stage
 */
function buildStageHTML(stage: AIInteractionStage): string {
    const { stage: stageName, content, thought } = stage;
    
    switch (stageName) {
        case 'planning':
            return `
<div class="stage-block stage-planning">
    <div class="stage-header">
        <span class="stage-icon">📋</span>
        <span class="stage-label">Planning</span>
    </div>
    <div class="stage-content">${formatContent(content)}</div>
</div>`;

        case 'reasoning':
            return `
<div class="stage-block stage-reasoning">
    <div class="stage-header">
        <span class="stage-icon">🧠</span>
        <span class="stage-label">Reasoning</span>
    </div>
    <div class="stage-content">${formatContent(content)}</div>
</div>`;

        case 'toolUsed':
            const toolData = typeof content === 'object' ? content : { description: content };
            const toolName = toolData.tool || 'Tool';
            const description = toolData.description || 'Processing...';
            return `
<div class="stage-block stage-tool-use">
    <div class="stage-header">
        <span class="stage-icon">🔧</span>
        <span class="stage-label">Using Tool</span>
        <span class="tool-badge">${escapeHtml(toolName)}</span>
    </div>
    ${thought ? `<div class="stage-thought">${escapeHtml(thought)}</div>` : ''}
    <div class="stage-content">${escapeHtml(description)}</div>
</div>`;

        case 'toolResult':
            const resultData = content;
            const success = resultData.success;
            const tool = resultData.tool || 'Tool';
            const resultText = resultData.html || resultData.message || JSON.stringify(resultData);
            return `
<div class="stage-block stage-tool-result ${success ? 'result-success' : 'result-error'}">
    <div class="stage-header">
        <span class="stage-icon">${success ? '✅' : '❌'}</span>
        <span class="stage-label">Tool Result</span>
        <span class="tool-badge">${escapeHtml(tool)}</span>
    </div>
    <div class="stage-content tool-result-content">${resultText}</div>
</div>`;

        case 'summary':
            return `
<div class="stage-block stage-summary">
    <div class="stage-header">
        <span class="stage-icon">📝</span>
        <span class="stage-label">Summary</span>
    </div>
    <div class="stage-content summary-content">${formatContent(content)}</div>
</div>`;

        case 'error':
            return `
<div class="stage-block stage-error">
    <div class="stage-header">
        <span class="stage-icon">⚠️</span>
        <span class="stage-label">Error</span>
    </div>
    <div class="stage-content error-content">${escapeHtml(String(content))}</div>
</div>`;

        default:
            return `
<div class="stage-block">
    <div class="stage-header">
        <span class="stage-label">${escapeHtml(stageName)}</span>
    </div>
    <div class="stage-content">${formatContent(content)}</div>
</div>`;
    }
}

/**
 * Build tool execution summary table
 */
function buildToolExecutionSummaryHTML(toolExecutions: any[]): string {
    return `
<div class="tool-execution-summary">
    <div class="summary-header">
        <span class="summary-icon">📊</span>
        <span class="summary-title">Tool Execution Summary</span>
        <span class="tool-count">${toolExecutions.length} tool${toolExecutions.length !== 1 ? 's' : ''} used</span>
    </div>
    <div class="tool-execution-table">
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Tool</th>
                    <th>Status</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${toolExecutions.map((exec, index) => `
                <tr class="${exec.success ? 'exec-success' : 'exec-error'}">
                    <td>${index + 1}</td>
                    <td><code>${escapeHtml(exec.tool)}</code></td>
                    <td><span class="status-badge ${exec.success ? 'badge-success' : 'badge-error'}">${exec.success ? '✅ Success' : '❌ Failed'}</span></td>
                    <td class="tool-details">
                        ${buildToolDetailsHTML(exec)}
                    </td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</div>`;
}

/**
 * Build tool execution details
 */
function buildToolDetailsHTML(execution: any): string {
    const { args, result } = execution;
    
    let details = '';
    
    // Show relevant args based on tool type
    if (args.position) {
        if (typeof args.position === 'object') {
            details += `<div class="detail-item">Position: ${args.position.from} → ${args.position.to}</div>`;
        } else {
            details += `<div class="detail-item">Position: ${args.position}</div>`;
        }
    }
    
    if (args.content) {
        const preview = args.content.substring(0, 50) + (args.content.length > 50 ? '...' : '');
        details += `<div class="detail-item">Content: ${escapeHtml(preview)}</div>`;
    }
    
    if (args.reason) {
        details += `<div class="detail-item">Reason: ${escapeHtml(args.reason)}</div>`;
    }
    
    // Show result info
    if (result && result.operation) {
        details += `<div class="detail-item">Operation: ${escapeHtml(result.operation)}</div>`;
    }
    
    return details || '<div class="detail-item">No details available</div>';
}

/**
 * Format content - handles strings, objects, arrays
 */
function formatContent(content: any): string {
    if (typeof content === 'string') {
        return escapeHtml(content).replace(/\n/g, '<br>');
    }
    if (typeof content === 'object' && content !== null) {
        return `<pre class="json-content">${escapeHtml(JSON.stringify(content, null, 2))}</pre>`;
    }
    return escapeHtml(String(content));
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Get CSS styles for AI interaction HTML
 */
export function getAIInteractionStyles(): string {
    return `
<style>
.ai-interaction-session {
    font-family: system-ui, -apple-system, sans-serif;
    padding: 1rem;
    background: #f9fafb;
    border-radius: 8px;
    margin-bottom: 1rem;
}

.session-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: white;
    border-radius: 6px;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.session-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 1rem;
}

.session-meta {
    display: flex;
    align-items: center;
    gap: 1rem;
    font-size: 0.875rem;
    color: #6b7280;
}

.session-status {
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    font-weight: 500;
}

.status-success {
    background: #d1fae5;
    color: #065f46;
}

.status-error {
    background: #fee2e2;
    color: #991b1b;
}

.user-prompt-block {
    background: white;
    border-radius: 6px;
    padding: 1rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.block-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: #374151;
}

.user-prompt-content {
    padding: 0.5rem;
    background: #f3f4f6;
    border-radius: 4px;
    border-left: 3px solid #3b82f6;
}

.ai-stages {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.stage-block {
    background: white;
    border-radius: 6px;
    padding: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.stage-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
}

.stage-icon {
    font-size: 1.25rem;
}

.stage-label {
    font-weight: 600;
    text-transform: capitalize;
    color: #374151;
}

.tool-badge {
    padding: 0.25rem 0.5rem;
    background: #e0e7ff;
    color: #3730a3;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    font-family: monospace;
}

.stage-thought {
    padding: 0.5rem;
    background: #fef3c7;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    font-style: italic;
    color: #92400e;
}

.stage-content {
    color: #4b5563;
    line-height: 1.6;
}

.stage-planning {
    border-left: 3px solid #8b5cf6;
}

.stage-reasoning {
    border-left: 3px solid #3b82f6;
}

.stage-tool-use {
    border-left: 3px solid #f59e0b;
}

.stage-tool-result {
    border-left: 3px solid #10b981;
}

.result-error {
    border-left: 3px solid #ef4444;
}

.stage-summary {
    border-left: 3px solid #06b6d4;
}

.stage-error {
    border-left: 3px solid #ef4444;
    background: #fef2f2;
}

.tool-result-content {
    font-family: monospace;
    font-size: 0.875rem;
}

.summary-content {
    font-weight: 500;
}

.error-content {
    color: #dc2626;
}

.json-content {
    background: #1f2937;
    color: #e5e7eb;
    padding: 0.75rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.875rem;
}

.tool-execution-summary {
    background: white;
    border-radius: 6px;
    padding: 1rem;
    margin-top: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

.summary-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid #e5e7eb;
}

.summary-title {
    font-weight: 600;
    color: #374151;
}

.tool-count {
    margin-left: auto;
    padding: 0.25rem 0.75rem;
    background: #dbeafe;
    color: #1e40af;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
}

.tool-execution-table table {
    width: 100%;
    border-collapse: collapse;
}

.tool-execution-table th {
    text-align: left;
    padding: 0.5rem;
    background: #f3f4f6;
    font-weight: 600;
    color: #374151;
    font-size: 0.875rem;
}

.tool-execution-table td {
    padding: 0.75rem 0.5rem;
    border-top: 1px solid #e5e7eb;
    font-size: 0.875rem;
}

.tool-execution-table code {
    background: #f3f4f6;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8125rem;
}

.status-badge {
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
}

.badge-success {
    background: #d1fae5;
    color: #065f46;
}

.badge-error {
    background: #fee2e2;
    color: #991b1b;
}

.tool-details {
    color: #6b7280;
}

.detail-item {
    margin-bottom: 0.25rem;
    font-size: 0.8125rem;
}

.exec-success {
    background: #f0fdf4;
}

.exec-error {
    background: #fef2f2;
}
</style>`;
}
