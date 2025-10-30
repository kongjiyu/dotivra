import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface MermaidDiagramProps {
  chart: string;
  theme?: 'default' | 'forest' | 'dark' | 'neutral';
}

const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ chart, theme = 'default' }) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(100);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const minZoom = 25;
  const maxZoom = 200;

  // Keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if the container or its children are focused/hovered
      if (!containerRef.current?.contains(document.activeElement) &&
        !containerRef.current?.matches(':hover')) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === '=') {
        e.preventDefault();
        setZoom(prev => Math.min(prev + 25, maxZoom));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault();
        setZoom(prev => Math.max(prev - 25, minZoom));
      } else if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault();
        setZoom(100);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [maxZoom, minZoom]);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false, // Disable auto-rendering to prevent errors on dashboard
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
          // Don't show error UI - just fail silently
          elementRef.current.innerHTML = '';
        }
      }
    };

    renderDiagram();
  }, [chart, theme]);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 25, maxZoom));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 25, minZoom));
  };

  const handleResetZoom = () => {
    setZoom(100);
    setPanOffset({ x: 0, y: 0 });
  };

  // Pan/Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      if (contentRef.current) {
        contentRef.current.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoom > 100) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    if (contentRef.current) {
      contentRef.current.style.cursor = zoom > 100 ? 'grab' : 'default';
    }
  };

  const handleMouseLeave = () => {
    if (isPanning) {
      setIsPanning(false);
      if (contentRef.current) {
        contentRef.current.style.cursor = zoom > 100 ? 'grab' : 'default';
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className="mermaid-diagram"
      style={{
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        backgroundColor: '#fafafa',
        margin: '10px 0',
        maxWidth: '100%',
        overflow: 'auto',
        position: 'relative'
      }}
      tabIndex={0}
    >
      {/* Zoom Controls */}
      <div className="mermaid-zoom-controls no-print" style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        display: 'flex',
        gap: '8px',
        zIndex: 10
      }}>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= minZoom}
          className="zoom-button"
          title="Zoom Out (Ctrl + -)"
          style={{
            padding: '6px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: zoom <= minZoom ? 'not-allowed' : 'pointer',
            opacity: zoom <= minZoom ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={handleResetZoom}
          className="zoom-button"
          title={`Reset Zoom (Ctrl + 0) - Current: ${zoom}%`}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
        >
          <Maximize2 size={14} />
          {zoom}%
        </button>
        <button
          onClick={handleZoomIn}
          disabled={zoom >= maxZoom}
          className="zoom-button"
          title="Zoom In (Ctrl + =)"
          style={{
            padding: '6px',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            backgroundColor: 'white',
            cursor: zoom >= maxZoom ? 'not-allowed' : 'pointer',
            opacity: zoom >= maxZoom ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
        >
          <ZoomIn size={16} />
        </button>
      </div>

      <div
        ref={contentRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100px',
          width: '100%',
          cursor: zoom > 100 ? 'grab' : 'default',
          userSelect: 'none'
        }}
        className="mermaid-content-wrapper"
      >
        <div
          ref={elementRef}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100px',
            transform: `scale(${zoom / 100}) translate(${panOffset.x / (zoom / 100)}px, ${panOffset.y / (zoom / 100)}px)`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.2s ease'
          }}
          className="mermaid-content"
        />
      </div>
    </div>
  );
};

export default MermaidDiagram;