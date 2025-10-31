import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidDiagramProps {
  chart: string;
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, theme = 'default' }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const zoomIn = () => setScale((s) => Math.min(3, parseFloat((s + 0.1).toFixed(2))));
  const zoomOut = () => setScale((s) => Math.max(0.3, parseFloat((s - 0.1).toFixed(2))));
  const resetZoom = () => setScale(1);

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
    <div className="mermaid-diagram" style={{
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      padding: '20px',
      backgroundColor: '#fafafa',
      margin: '10px 0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontSize: '12px', color: '#6b7280' }}>Zoom: {(scale * 100).toFixed(0)}%</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={zoomOut} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>−</button>
          <button onClick={resetZoom} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>Reset</button>
          <button onClick={zoomIn} style={{ padding: '4px 8px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#fff' }}>+</button>
        </div>
      </div>
      <div style={{ overflow: 'auto' }}>
        <div
          ref={elementRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100px',
            transform: `scale(${scale})`,
            transformOrigin: 'top left'
          }}
        />
      </div>
    </div>
  );
};

export default MermaidDiagram;