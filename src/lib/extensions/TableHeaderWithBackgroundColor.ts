import { TableHeader } from '@tiptap/extension-table-header'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableHeaderBackgroundColor: {
      /**
       * Set the background color of the current table header
       */
      setTableHeaderBackgroundColor: (color: string) => ReturnType
      /**
       * Unset the background color of the current table header
       */
      unsetTableHeaderBackgroundColor: () => ReturnType
    }
  }
}

export const TableHeaderWithBackgroundColor = TableHeader.extend({
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
      setTableHeaderBackgroundColor:
        (color: string) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { backgroundColor: color })
        },
      unsetTableHeaderBackgroundColor:
        () =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { backgroundColor: null })
        },
    }
  },
})

export default TableHeaderWithBackgroundColor