import { mergeAttributes } from '@tiptap/core'
import { Paragraph as TiptapParagraph } from '@tiptap/extension-paragraph'

export interface ParagraphOptions {
  HTMLAttributes: Record<string, any>
  maxIndent: number // Maximum indentation level to prevent overflow
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indentParagraph: {
      /**
       * Indent the current paragraph
       */
      indentParagraph: () => ReturnType
    }
    outdentParagraph: {
      /**
       * Outdent the current paragraph
       */
      outdentParagraph: () => ReturnType
    }
  }
}

export const Paragraph = TiptapParagraph.extend<ParagraphOptions>({
  name: 'paragraph',

  addOptions() {
    return {
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
            style: `margin-left: ${attributes.indent * 2}rem;`, // 2rem per indent level (approximately 8 spaces)
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'p',
        getAttrs: element => {
          const indentValue = (element as HTMLElement).getAttribute('data-indent')
          return {
            indent: indentValue ? parseInt(indentValue, 10) : 0,
          }
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },

  addCommands() {
    return {
      ...this.parent?.(),
      indentParagraph:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state
          const { from, to } = selection

          let transaction = tr
          let hasChanged = false

          // Find all paragraph nodes in the selection
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
      outdentParagraph:
        () =>
        ({ tr, state, dispatch }: any) => {
          const { selection } = state
          const { from, to } = selection

          let transaction = tr
          let hasChanged = false

          // Find all paragraph nodes in the selection
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
      // Tab shortcuts removed to prevent double indentation
      // ToolBar.tsx handles Tab/Shift-Tab with proper maxIndentLevel checking
    }
  },
})

export default Paragraph