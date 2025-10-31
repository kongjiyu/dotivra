import Image from '@tiptap/extension-image'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import { NodeSelection } from '@tiptap/pm/state'
import { processImageFile, MAX_IMAGE_SIZE_MB } from '@/services/imageCompressionService'

// Helper function to check size and insert image
async function handleImageUpload(file: File, view: any, pos?: number) {
    const { schema } = view.state

    try {
        // Process the image (size check + convert to Base64)
        const result = await processImageFile(file)
        
        // Insert the Base64 image
        const node = schema.nodes.resizableImage.create({
            src: result.dataUrl,
            alt: file.name.replace(/\.[^/.]+$/, ''),
            width: result.width > 800 ? 800 : null, // Cap initial width at 800px
            showBorder: true,
        })

        const transaction = view.state.tr
        const insertPos = pos ?? view.state.selection.from
        transaction.insert(insertPos, node)
        view.dispatch(transaction)

    } catch (error) {
        // Show error tooltip using dynamic import of SweetAlert2
        import('sweetalert2').then(({ default: Swal }) => {
            Swal.fire({
                icon: 'error',
                title: 'Image Too Large',
                text: error instanceof Error ? error.message : 'Unknown error',
                footer: `Maximum image size: ${MAX_IMAGE_SIZE_MB}MB`,
                confirmButtonColor: '#3B82F6',
                confirmButtonText: 'OK'
            });
        });
    }
}

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
                        class: 'tiptap-image', // Always add tiptap-image class
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
            // Handle image uploads from paste/drop
            new Plugin({
                key: new PluginKey('imageUpload'),
                props: {
                    handlePaste: (view, event) => {
                        const items = Array.from(event.clipboardData?.items || [])
                        const imageItems = items.filter(item => item.type.startsWith('image/'))

                        if (imageItems.length === 0) {
                            return false
                        }

                        event.preventDefault()

                        imageItems.forEach(item => {
                            const file = item.getAsFile()
                            if (file) {
                                handleImageUpload(file, view)
                            }
                        })

                        return true
                    },
                    handleDrop: (view, event) => {
                        const hasFiles = event.dataTransfer?.files?.length

                        if (!hasFiles) {
                            return false
                        }

                        const images = Array.from(event.dataTransfer.files).filter(file =>
                            file.type.startsWith('image/')
                        )

                        if (images.length === 0) {
                            return false
                        }

                        event.preventDefault()

                        const coordinates = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY,
                        })

                        images.forEach(file => {
                            handleImageUpload(file, view, coordinates?.pos)
                        })

                        return true
                    },
                },
            }),
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

                                // Show appropriate resize cursor
                                if (nearRightEdge && nearBottomEdge) {
                                    target.style.cursor = 'nwse-resize' // Diagonal resize (both directions)
                                } else if (nearRightEdge) {
                                    target.style.cursor = 'ew-resize' // Horizontal resize
                                } else if (nearBottomEdge) {
                                    target.style.cursor = 'ns-resize' // Vertical resize
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
                                        const startY = event.clientY
                                        const startWidth = imageRect.width
                                        const startHeight = imageRect.height
                                        
                                        // Calculate aspect ratio from the actual image
                                        const aspectRatio = startWidth / startHeight
                                        
                                        // Set maximum dimensions (prevent images from becoming too large)
                                        const MAX_WIDTH = 1000
                                        const MAX_HEIGHT = 1000
                                        const MIN_WIDTH = 100
                                        const MIN_HEIGHT = 100


                                        const handleMouseMove = (e: MouseEvent) => {
                                            const deltaX = e.clientX - startX
                                            const deltaY = e.clientY - startY
                                            
                                            // Use the larger delta to determine resize amount (prioritize horizontal drag)
                                            const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY
                                            
                                            // Calculate new width maintaining aspect ratio
                                            let newWidth = startWidth + delta

                                            // Apply minimum constraint (100px minimum)
                                            newWidth = Math.max(MIN_WIDTH, newWidth)
                                            
                                            // Apply maximum constraint
                                            newWidth = Math.min(MAX_WIDTH, newWidth)

                                            
                                            
                                            // Calculate corresponding height maintaining aspect ratio
                                            let newHeight = newWidth / aspectRatio
                                            
                                            // Check if height exceeds maximum, if so recalculate from height
                                            if (newHeight > MAX_HEIGHT) {
                                                newHeight = MAX_HEIGHT
                                                newWidth = newHeight * aspectRatio
                                            }
                                            if (newHeight < MIN_HEIGHT) {
                                                newHeight = MIN_HEIGHT
                                                newWidth = newHeight * aspectRatio
                                            }

                                            // Update the image width in real-time
                                            // Height is automatically calculated by browser with aspect ratio
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
                                            
                                            const finalNode = view.state.doc.nodeAt(pos)
                                            
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
