import { mergeAttributes } from '@tiptap/core'
import { Heading as TiptapHeading } from '@tiptap/extension-heading'

export interface HeadingOptions {
  levels: number[]
  HTMLAttributes: Record<string, any>
  maxIndent: number // Maximum indentation level to prevent overflow
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indentHeading: {
      /**
       * Indent the current heading
       */
      indentHeading: () => ReturnType
    }
    outdentHeading: {
      /**
       * Outdent the current heading
       */
      outdentHeading: () => ReturnType
    }
  }
}

export const Heading = TiptapHeading.extend<HeadingOptions>({
  name: 'heading',

  addOptions() {
    return {
      levels: [1, 2, 3, 4, 5, 6],
      HTMLAttributes: {},
      maxIndent: 10, // Basic limit to prevent content overflow - reasonable default
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: element => {
          const indentValue = element.getAttribute('data-indent')
          return indentValue ? parseInt(indentValue, 10) : 0
        },
        renderHTML: attributes => {
          if (!attributes.indent || attributes.indent === 0) {
            return {}
          }
          return {
            'data-indent': attributes.indent,
            style: `margin-left: ${attributes.indent * 2}rem;`, // 2rem per indent level
          }
        },
      },
    }
  },

  parseHTML() {
    return this.options.levels
      .map((level: number) => ({
        tag: `h${level}`,
        attrs: { level },
        getAttrs: (element: any) => {
          const indentValue = element.getAttribute('data-indent')
          return {
            level,
            indent: indentValue ? parseInt(indentValue, 10) : 0,
          }
        },
      }))
  },

  renderHTML({ node, HTMLAttributes }) {
    const hasLevel = this.options.levels.includes(node.attrs.level)
    const level = hasLevel ? node.attrs.level : this.options.levels[0]

    return [
      `h${level}`,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes),
      0,
    ]
  },

  addCommands() {
    return {
      ...this.parent?.(),
      indentHeading:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state
          const { from, to } = selection

          let transaction = tr
          let hasChanged = false

          // Find all heading nodes in the selection
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (node.type.name === this.name) {
              const currentIndent = node.attrs.indent || 0
              // Check against maximum indentation limit to prevent overflow
              if (currentIndent < this.options.maxIndent) {
                const newIndent = currentIndent + 1
                transaction = transaction.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: newIndent,
                })
                hasChanged = true
              }
            }
          })

          if (dispatch && hasChanged) {
            dispatch(transaction)
          }

          return hasChanged
        },
      outdentHeading:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state
          const { from, to } = selection

          let transaction = tr
          let hasChanged = false

          // Find all heading nodes in the selection
          state.doc.nodesBetween(from, to, (node: any, pos: number) => {
            if (node.type.name === this.name) {
              const currentIndent = node.attrs.indent || 0
              if (currentIndent > 0) {
                const newIndent = currentIndent - 1
                transaction = transaction.setNodeMarkup(pos, undefined, {
                  ...node.attrs,
                  indent: newIndent,
                })
                hasChanged = true
              }
            }
          })

          if (dispatch && hasChanged) {
            dispatch(transaction)
          }

          return hasChanged
        },
    }
  },

  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      // Tab shortcuts removed to prevent double indentation
      // ToolBar.tsx handles Tab/Shift-Tab with proper maxIndentLevel checking
    }
  },
})

export default Heading