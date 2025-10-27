import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, theme = 'default' }) => {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: true,
      theme,
      securityLevel: 'loose',
      // Suppress error rendering in DOM
      suppressErrorRendering: true,
    });

    const renderDiagram = async () => {
      if (elementRef.current && chart.trim()) {
        try {
          // Clear previous content
          elementRef.current.innerHTML = '';

          // Generate unique ID
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Render the diagram
          const { svg } = await mermaid.render(id, chart);

          // Set the SVG content
          elementRef.current.innerHTML = svg;

          // Aggressively remove ALL error divs from entire document
          setTimeout(() => {
            const errorSelectors = [
              '#d' + id,
              '[id^="d"][id*="error"]',
              '[id^="d"][id*="mermaid"]',
              '.error',
              '[class*="error"]'
            ];

            errorSelectors.forEach(selector => {
              document.querySelectorAll(selector).forEach(div => {
                if (div !== elementRef.current && div.parentNode) {
                  // Check if it's actually an error div and not part of our content
                  if (div.textContent?.includes('Syntax error') ||
                    div.textContent?.includes('error') ||
                    div.id.includes('error')) {
                    div.parentNode.removeChild(div);
                  }
                }
              });
            });

            // Also remove from body directly
            Array.from(document.body.children).forEach(child => {
              if (child instanceof HTMLElement &&
                child !== document.getElementById('root') &&
                (child.id.startsWith('d') || child.textContent?.includes('Syntax error'))) {
                document.body.removeChild(child);
              }
            });
          }, 100);

        } catch (error) {
          console.error('Error rendering Mermaid diagram:', error);
          // Display error ONLY inside our component
          if (elementRef.current) {
            elementRef.current.innerHTML = `
              <div style="color: #dc2626; padding: 1rem; text-align: center; border: 1px solid #dc2626; border-radius: 0.5rem; background-color: #fef2f2;">
                <p style="font-weight: 600; margin-bottom: 0.5rem;">⚠️ Diagram Rendering Error</p>
                <p style="font-size: 0.875rem; color: #991b1b;">${error instanceof Error ? error.message : 'Invalid diagram syntax'}</p>
              </div>
            `;
          }

          // Clean up any error divs that Mermaid added
          setTimeout(() => {
            document.querySelectorAll('[id^="d"]').forEach(div => {
              if (div.parentNode === document.body && div !== document.getElementById('root')) {
                div.parentNode.removeChild(div);
              }
            });
          }, 100);
        }
      }
    };

    renderDiagram();
  }, [chart, theme]);

  return (
    <div className="mermaid-diagram" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: '#fafafa',
      margin: '10px 0'
    }}>
      <div
        ref={elementRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100px'
        }}
      />
    </div>
  );
};

export default MermaidDiagram;