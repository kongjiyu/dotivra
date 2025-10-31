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
      startOnLoad: false,
      theme,
      securityLevel: 'loose',
      suppressErrorRendering: true,
    });

    const renderDiagram = async () => {
      if (elementRef.current && chart.trim()) {
        try {
          elementRef.current.innerHTML = '';
          const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const { svg } = await mermaid.render(id, chart);
          elementRef.current.innerHTML = svg;

          // Ensure any mermaid-generated error containers are not editable
          try {
            elementRef.current.querySelectorAll('.error, .mermaid-error, [id^="d"]').forEach((el) => {
              if (el instanceof HTMLElement) {
                el.setAttribute('contenteditable', 'false');
                el.style.userSelect = 'none';
                el.tabIndex = -1;
              }
            });
          } catch (e) {
            // ignore
          }

          // Remove error divs from document
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
                  if (div.textContent?.includes('Syntax error') ||
                    div.textContent?.includes('error') ||
                    div.id.includes('error')) {
                    div.parentNode.removeChild(div);
                  }
                }
              });
            });

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
          elementRef.current.innerHTML = '';
        }
      }
    };

    renderDiagram();
  }, [chart, theme]);

  return (
    <div
      className="mermaid-diagram"
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#fafafa',
        margin: '10px 0',
        maxWidth: '100%',
        overflow: 'auto'
      }}
    >
      <div
        ref={elementRef}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100px'
        }}
        className="mermaid-content"
      />
    </div>
  );
};

export default MermaidDiagram;