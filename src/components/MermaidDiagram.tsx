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
      startOnLoad: false, // Disable auto-rendering to prevent errors on dashboard
      theme,
      securityLevel: 'loose',
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
        } catch (error) {
          console.error('Error rendering Mermaid diagram:', error);
          // Don't show error UI - just fail silently
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