import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import type { ReactNodeViewProps } from '@tiptap/react'
import { Component, createElement } from 'react'
import MermaidDiagram from '@/components/MermaidDiagram'

// React component for rendering Mermaid in the editor
class MermaidNodeView extends Component<ReactNodeViewProps> {
  render() {
    const { node, updateAttributes, deleteNode, selected } = this.props
    const { chart, theme } = node.attrs

    return createElement(
      NodeViewWrapper,
      {
        className: `mermaid-node ${selected ? 'ProseMirror-selectednode' : ''}`,
        style: {
          outline: selected ? '2px solid #3b82f6' : 'none',
          borderRadius: '8px',
          margin: '1rem 0',
          display: 'block',
          position: 'relative'
        }
      },
      createElement('div', {
        contentEditable: false,
        style: { userSelect: 'none' }
      }, [
        // Edit button
        createElement('div', {
          key: 'controls',
          style: {
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 10,
            display: 'flex',
            gap: '4px'
          }
        }, [
          createElement('button', {
            key: 'edit',
            onClick: () => {
              const newChart = prompt('Edit Mermaid diagram:', chart)
              if (newChart !== null) {
                updateAttributes({ chart: newChart })
              }
            },
            style: {
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }
          }, 'Edit'),
          createElement('button', {
            key: 'delete',
            onClick: deleteNode,
            style: {
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              cursor: 'pointer'
            }
          }, 'Delete')
        ]),
        // Mermaid diagram
        createElement(MermaidDiagram, {
          key: 'diagram',
          chart: chart || 'graph TD\n    A[Start] --> B[End]',
          theme: theme || 'default'
        })
      ])
    )
  }
}

export interface MermaidOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mermaid: {
      /**
       * Insert a Mermaid diagram
       */
      insertMermaidDiagram: (options: { chart: string; theme?: string }) => ReturnType
    }
  }
}

export const Mermaid = Node.create<MermaidOptions>({
  name: 'mermaid',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      chart: {
        default: 'graph TD\n    A[Start] --> B[End]',
        parseHTML: element => element.getAttribute('data-chart'),
        renderHTML: attributes => ({
          'data-chart': attributes.chart,
        }),
      },
      theme: {
        default: 'default',
        parseHTML: element => element.getAttribute('data-theme'),
        renderHTML: attributes => ({
          'data-theme': attributes.theme,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="mermaid"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'mermaid',
      }),
      0,
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidNodeView)
  },

  addCommands() {
    return {
      insertMermaidDiagram:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          })
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Alt-m': () => {
        const chart = prompt('Enter Mermaid diagram code:', 'graph TD\n    A[Start] --> B[End]')
        if (chart) {
          return this.editor.commands.insertMermaidDiagram({ chart })
        }
        return false
      },
    }
  },
})

export default Mermaid