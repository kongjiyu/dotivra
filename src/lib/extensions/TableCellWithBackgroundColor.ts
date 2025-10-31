import { TableCell } from '@tiptap/extension-table-cell'
import { Plugin, PluginKey } from '@tiptap/pm/state'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableCellBackgroundColor: {
      /**
       * Set the background color of the current table cell
       */
      setTableCellBackgroundColor: (color: string) => ReturnType
      /**
       * Unset the background color of the current table cell
       */
      unsetTableCellBackgroundColor: () => ReturnType
    }
  }
}

export const TableCellWithBackgroundColor = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: (element: HTMLElement) => element.style.backgroundColor || null,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            style: `background-color: ${attributes.backgroundColor}`,
          }
        },
      },
    }
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setTableCellBackgroundColor:
        (color: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { backgroundColor: color })
        },
      unsetTableCellBackgroundColor:
        () =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { backgroundColor: null })
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('tableCellCursor'),
        props: {
          handleDOMEvents: {
            mousemove: (_view, event) => {
              const target = event.target as HTMLElement
              
              // Check if we're hovering over a table cell (td or th)
              if (target.tagName === 'TD' || target.tagName === 'TH') {
                const cellRect = target.getBoundingClientRect()
                const mouseX = event.clientX
                const mouseY = event.clientY
                
                // Define the edge detection zone (10px from edges)
                const edgeZone = 10
                const nearLeftEdge = mouseX < cellRect.left + edgeZone
                const nearRightEdge = mouseX > cellRect.right - edgeZone
                const nearTopEdge = mouseY < cellRect.top + edgeZone
                const nearBottomEdge = mouseY > cellRect.bottom - edgeZone
                
                // Show resize cursor when near cell edges
                if (nearLeftEdge || nearRightEdge) {
                  target.style.cursor = 'col-resize' // Column resize
                } else if (nearTopEdge || nearBottomEdge) {
                  target.style.cursor = 'row-resize' // Row resize
                } else {
                  target.style.cursor = 'text' // Default text cursor for content editing
                }
              }
              
              return false
            },
            mouseleave: (_view, event) => {
              const target = event.target as HTMLElement
              
              // Reset cursor when leaving table cell
              if (target.tagName === 'TD' || target.tagName === 'TH') {
                target.style.cursor = 'text'
              }
              
              return false
            }
          }
        }
      })
    ]
  }
})

export default TableCellWithBackgroundColor