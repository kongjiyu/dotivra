import Image from '@tiptap/extension-image'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { NodeSelection } from '@tiptap/pm/state'

export interface ResizableImageOptions {
    inline: boolean
    allowBase64: boolean
    HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        resizableImage: {
            /**
             * Set an image with optional width and border
             */
            setResizableImage: (options: {
                src: string
                alt?: string
                title?: string
                width?: number
                showBorder?: boolean
            }) => ReturnType
            /**
             * Toggle image border
             */
            toggleImageBorder: () => ReturnType
        }
    }
}

export const ResizableImage = Image.extend<ResizableImageOptions>({
    name: 'resizableImage',

    addOptions() {
        return {
            ...this.parent?.(),
            inline: false,
            allowBase64: true,
            HTMLAttributes: {
                class: 'tiptap-image',
            },
        }
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            src: {
                default: null,
            },
            alt: {
                default: null,
            },
            title: {
                default: null,
            },
            width: {
                default: null,
                parseHTML: element => {
                    const width = element.style.width || element.getAttribute('width')
                    return width ? parseInt(width) : null
                },
                renderHTML: attributes => {
                    if (!attributes.width) {
                        return {}
                    }
                    return {
                        width: attributes.width,
                        style: `width: ${attributes.width}px; height: auto;`,
                    }
                },
            },
            showBorder: {
                default: true,
                parseHTML: element => {
                    return element.getAttribute('data-border') !== 'false'
                },
                renderHTML: attributes => {
                    return {
                        'data-border': attributes.showBorder,
                        style: attributes.showBorder
                            ? `border: 1px solid #e5e7eb; border-radius: 4px;${attributes.width ? ` width: ${attributes.width}px; height: auto;` : ''}`
                            : `border: none;${attributes.width ? ` width: ${attributes.width}px; height: auto;` : ''}`,
                    }
                },
            },
        }
    },

    addCommands() {
        return {
            ...this.parent?.(),
            setResizableImage:
                options =>
                ({ commands }) => {
                    return commands.insertContent({
                        type: this.name,
                        attrs: options,
                    })
                },
            toggleImageBorder:
                () =>
                ({ commands, state }) => {
                    const { selection } = state
                    const node = state.doc.nodeAt(selection.from)

                    if (node && node.type.name === this.name) {
                        return commands.updateAttributes(this.name, {
                            showBorder: !node.attrs.showBorder,
                        })
                    }

                    return false
                },
        }
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('resizableImage'),
                props: {
                    decorations: state => {
                        const { doc, selection } = state
                        const decorations: Decoration[] = []

                        doc.descendants((node, pos) => {
                            if (node.type.name === this.name) {
                                const selected = selection.from === pos && selection.to === pos + node.nodeSize

                                if (selected) {
                                    decorations.push(
                                        Decoration.node(pos, pos + node.nodeSize, {
                                            class: 'ProseMirror-selectednode',
                                        })
                                    )
                                }
                            }
                        })

                        return DecorationSet.create(doc, decorations)
                    },
                    handleDOMEvents: {
                        mousemove: (_view, event) => {
                            const target = event.target as HTMLElement

                            if (target.tagName === 'IMG' && target.classList.contains('tiptap-image')) {
                                const imageRect = target.getBoundingClientRect()
                                const mouseX = event.clientX
                                const mouseY = event.clientY

                                // Check if mouse is near the right edge (within 10px)
                                const nearRightEdge = mouseX > imageRect.right - 10

                                // Check if mouse is near the bottom edge (within 10px)
                                const nearBottomEdge = mouseY > imageRect.bottom - 10

                                // Show resize cursor when hovering near edges
                                if (nearRightEdge || nearBottomEdge) {
                                    target.style.cursor = 'ew-resize'
                                } else {
                                    target.style.cursor = 'default'
                                }
                            }

                            return false
                        },
                        mousedown: (view, event) => {
                            const target = event.target as HTMLElement

                            if (target.tagName === 'IMG' && target.classList.contains('tiptap-image')) {
                                const pos = view.posAtDOM(target, 0)
                                const node = view.state.doc.nodeAt(pos)

                                if (node && node.type.name === this.name) {
                                    const imageRect = target.getBoundingClientRect()
                                    const clickX = event.clientX
                                    const clickY = event.clientY

                                    // Check if click is near the right edge (within 10px)
                                    const nearRightEdge = clickX > imageRect.right - 10

                                    // Check if click is near the bottom edge (within 10px)
                                    const nearBottomEdge = clickY > imageRect.bottom - 10

                                    // Always select the image first
                                    view.dispatch(
                                        view.state.tr.setSelection(
                                            // @ts-ignore
                                            NodeSelection.create(view.state.doc, pos)
                                        )
                                    )

                                    // If clicking near edges, start resize operation
                                    if (nearRightEdge || nearBottomEdge) {
                                        event.preventDefault()

                                        const startX = event.clientX
                                        const startWidth = imageRect.width

                                        const handleMouseMove = (e: MouseEvent) => {
                                            const deltaX = e.clientX - startX
                                            const newWidth = Math.max(100, Math.min(800, startWidth + deltaX))

                                            // Update the image width in real-time
                                            view.dispatch(
                                                view.state.tr.setNodeMarkup(pos, undefined, {
                                                    ...node.attrs,
                                                    width: Math.round(newWidth),
                                                })
                                            )
                                        }

                                        const handleMouseUp = () => {
                                            document.removeEventListener('mousemove', handleMouseMove)
                                            document.removeEventListener('mouseup', handleMouseUp)
                                        }

                                        document.addEventListener('mousemove', handleMouseMove)
                                        document.addEventListener('mouseup', handleMouseUp)

                                        return true
                                    }
                                    
                                    // If not resizing, just allow selection (return false to allow default behavior)
                                    return false
                                }
                            }

                            return false
                        },
                    },
                },
            }),
        ]
    },
})

export default ResizableImage
