import { TableCell } from '@tiptap/extension-table-cell'

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
})

export default TableCellWithBackgroundColor