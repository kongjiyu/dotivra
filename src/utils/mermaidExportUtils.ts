import mermaid from 'mermaid';

// Initialize Mermaid with default config
mermaid.initialize({
    startOnLoad: false,
    theme: 'default',
    securityLevel: 'loose',
    fontFamily: 'monospace'
});

/**
 * Process HTML content and replace Mermaid code blocks with rendered SVG diagrams
 * @param htmlContent - The HTML content containing potential Mermaid code blocks
 * @returns Processed HTML with Mermaid diagrams rendered as SVG
 */
export async function processMermaidForExport(htmlContent: string): Promise<string> {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find all code blocks that might contain Mermaid
    const codeBlocks = doc.querySelectorAll('pre code.language-mermaid, pre[data-language="mermaid"]');
    
    console.log(`[Mermaid Export] Found ${codeBlocks.length} Mermaid code blocks`);
    
    // Process each Mermaid code block
    for (let i = 0; i < codeBlocks.length; i++) {
        const codeBlock = codeBlocks[i];
        
        try {
            // Get the Mermaid code
            let mermaidCode = codeBlock.textContent || '';
            
            // If it's inside a <code> tag, get from parent <pre>
            if (codeBlock.tagName === 'CODE' && codeBlock.parentElement?.tagName === 'PRE') {
                mermaidCode = codeBlock.textContent || '';
            }
            
            if (!mermaidCode.trim()) {
                console.log(`[Mermaid Export] Empty code block ${i}, skipping`);
                continue;
            }
            
            console.log(`[Mermaid Export] Rendering diagram ${i}:`, mermaidCode.substring(0, 50) + '...');
            
            // Generate unique ID for this diagram
            const diagramId = `mermaid-export-${Date.now()}-${i}`;
            
            // Render the Mermaid diagram
            const { svg } = await mermaid.render(diagramId, mermaidCode);
            
            console.log(`[Mermaid Export] Successfully rendered diagram ${i}`);
            
            // Create a container div for the SVG
            const svgContainer = doc.createElement('div');
            svgContainer.className = 'mermaid-diagram-export';
            svgContainer.style.cssText = `
                margin: 16px 0;
                padding: 16px;
                background: white;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                overflow-x: auto;
                page-break-inside: avoid;
                break-inside: avoid;
            `;
            svgContainer.innerHTML = svg;
            
            // Find the pre element (either the code block itself or its parent)
            let preElement = codeBlock.tagName === 'PRE' 
                ? codeBlock 
                : codeBlock.parentElement;
            
            // If there's a wrapper (code-block-wrapper), replace that instead
            let elementToReplace = preElement;
            if (preElement?.parentElement?.classList.contains('code-block-wrapper')) {
                elementToReplace = preElement.parentElement;
            }
            
            // Replace the code block with the rendered SVG
            if (elementToReplace && elementToReplace.parentNode) {
                elementToReplace.parentNode.replaceChild(svgContainer, elementToReplace);
            }
            
        } catch (error) {
            console.error(`[Mermaid Export] Error rendering diagram ${i}:`, error);
            
            // On error, add a note instead of leaving broken code
            const errorDiv = doc.createElement('div');
            errorDiv.className = 'mermaid-error-export';
            errorDiv.style.cssText = `
                margin: 16px 0;
                padding: 12px;
                background: #fef2f2;
                border: 1px solid #ef4444;
                border-radius: 6px;
                color: #991b1b;
                font-family: monospace;
            `;
            errorDiv.textContent = `⚠️ Mermaid Diagram Error: ${error instanceof Error ? error.message : 'Failed to render'}`;
            
            let preElement = codeBlock.tagName === 'PRE' 
                ? codeBlock 
                : codeBlock.parentElement;
            
            let elementToReplace = preElement;
            if (preElement?.parentElement?.classList.contains('code-block-wrapper')) {
                elementToReplace = preElement.parentElement;
            }
            
            if (elementToReplace && elementToReplace.parentNode) {
                elementToReplace.parentNode.replaceChild(errorDiv, elementToReplace);
            }
        }
    }
    
    // Return the processed HTML
    return doc.body.innerHTML;
}

/**
 * Extract Mermaid code blocks as plain text with section markers
 * Useful for Markdown export
 */
export function extractMermaidAsMarkdown(htmlContent: string): string {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');
    
    // Find all code blocks that might contain Mermaid
    const codeBlocks = doc.querySelectorAll('pre code.language-mermaid, pre[data-language="mermaid"]');
    
    codeBlocks.forEach((codeBlock) => {
        const mermaidCode = codeBlock.textContent || '';
        
        if (!mermaidCode.trim()) return;
        
        // Create markdown code block
        const markdownBlock = doc.createElement('pre');
        markdownBlock.textContent = `\`\`\`mermaid\n${mermaidCode}\n\`\`\``;
        
        let preElement = codeBlock.tagName === 'PRE' 
            ? codeBlock 
            : codeBlock.parentElement;
        
        let elementToReplace = preElement;
        if (preElement?.parentElement?.classList.contains('code-block-wrapper')) {
            elementToReplace = preElement.parentElement;
        }
        
        if (elementToReplace && elementToReplace.parentNode) {
            elementToReplace.parentNode.replaceChild(markdownBlock, elementToReplace);
        }
    });
    
    return doc.body.innerHTML;
}
