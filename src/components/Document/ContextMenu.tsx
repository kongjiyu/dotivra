import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Copy,
    Bold,
    Italic,
    Underline,
    Plus,
    Trash2,
    Merge,
    Split,
    Eraser,
    Code,
    Scissors,
    Clipboard as ClipboardIcon,
    Undo,
    Redo,
    FileText,
    Table,
    Network,
    ImageIcon,
    Link,
    Minus,
    Strikethrough,
} from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import { TableGridSelector } from "./TableGridSelector";

interface ContextMenuProps {
    editor: Editor | null
    isVisible: boolean
    position: { x: number; y: number }
    onClose: () => void
    isTableContext?: boolean
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    editor,
    isVisible,
    position,
    onClose,
    isTableContext = false,
}) => {
    const menuRef = useRef<HTMLDivElement>(null)

    // Always declare hooks at the top level
    const [menuHeight, setMenuHeight] = React.useState(500)
    const [tablePopoverOpen, setTablePopoverOpen] = React.useState(false)
    const tablePopoverTimerRef = React.useRef<NodeJS.Timeout | null>(null)

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose()
            }
        }

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside)
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isVisible, onClose])

    // Get menu ref to calculate actual height
    useEffect(() => {
        if (menuRef.current && isVisible) {
            const rect = menuRef.current.getBoundingClientRect()
            setMenuHeight(rect.height)
        }
    }, [isVisible, isTableContext])

    // Early return after all hooks
    if (!isVisible || !editor) {
        return null
    }

    const executeCommand = (command: () => void) => {
        command()
        onClose()
    }

    const isTextSelected = !editor.state.selection.empty

    // Detect selection type
    const isImageSelected = editor.isActive('image')
    const isTableSelected = editor.isActive('table') || isTableContext

    // Determine context menu mode
    let menuMode: 'insert' | 'format' | 'image' | 'table' = 'insert'
    if (isImageSelected) {
        menuMode = 'image'
    } else if (isTableSelected) {
        menuMode = 'table'
    } else if (isTextSelected) {
        menuMode = 'format'
    }

    // Smart positioning: keep close to cursor but prevent overflow at bottom-right
    const menuWidth = 350;
    const menuPadding = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y - (menuHeight / 2); // Center vertically at cursor

    // Check right overflow
    if (adjustedX + menuWidth + menuPadding > viewportWidth) {
        // Position to the left of cursor instead
        adjustedX = Math.max(menuPadding, position.x - menuWidth - 10);
    }

    // Check bottom overflow
    if (adjustedY + menuHeight + menuPadding > viewportHeight) {
        // Position above instead, as close to bottom as possible
        adjustedY = Math.max(menuPadding, viewportHeight - menuHeight - menuPadding);
    }

    // Check top overflow
    if (adjustedY < menuPadding) {
        adjustedY = menuPadding;
    }

    const adjustedPosition = {
        x: adjustedX,
        y: adjustedY,
    }

    const menuContent = (
        <div
            ref={menuRef}
            className="fixed bg-white border border-gray-200 rounded-lg shadow-xl py-2 w-[350px] max-h-[80vh]"
            style={{
                left: `${adjustedPosition.x}px`,
                top: `${adjustedPosition.y}px`,
                zIndex: 9999,
            }}
        >
            <ScrollArea className="max-h-[75vh]">
                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Clipboard
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 py-2 text-sm"
                    onClick={() => executeCommand(() => {
                        const selection = window.getSelection()
                        if (selection) {
                            navigator.clipboard.writeText(selection.toString())
                        }
                    })}
                >
                    <div className="flex items-center">
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                    </div>
                    <span className="text-xs text-gray-400">Ctrl+C</span>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 py-2 text-sm"
                    onClick={() => executeCommand(() => {
                        const selection = window.getSelection()
                        if (selection) {
                            navigator.clipboard.writeText(selection.toString())
                            editor.commands.deleteSelection()
                        }
                    })}
                >
                    <div className="flex items-center">
                        <Scissors className="w-4 h-4 mr-2" />
                        Cut
                    </div>
                    <span className="text-xs text-gray-400">Ctrl+X</span>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 py-2 text-sm"
                    onClick={() => executeCommand(async () => {
                        try {
                            const text = await navigator.clipboard.readText()
                            editor.commands.insertContent(text)
                        } catch (err) {
                            console.warn('Paste operation failed:', err)
                        }
                    })}
                >
                    <div className="flex items-center">
                        <ClipboardIcon className="w-4 h-4 mr-2" />
                        Paste
                    </div>
                    <span className="text-xs text-gray-400">Ctrl+V</span>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 py-2 text-sm"
                    onClick={() => executeCommand(async () => {
                        try {
                            const text = await navigator.clipboard.readText()
                            // Insert as plain text without formatting
                            editor.commands.insertContent({ type: 'text', text })
                        } catch (err) {
                            console.warn('Paste without formatting failed:', err)
                        }
                    })}
                >
                    <div className="flex items-center">
                        <FileText className="w-4 h-4 mr-2" />
                        Paste without Formatting
                    </div>
                    <span className="text-xs text-gray-400">Ctrl+Shift+V</span>
                </Button>

                <div className="border-t border-gray-100 my-1"></div>

                <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    History
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 py-2 text-sm"
                    onClick={() => executeCommand(() => editor.chain().focus().undo().run())}
                    disabled={!editor.can().undo()}
                >
                    <div className="flex items-center">
                        <Undo className="w-4 h-4 mr-2" />
                        Undo
                    </div>
                    <span className="text-xs text-gray-400">Ctrl+Z</span>
                </Button>

                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between px-3 py-2 text-sm"
                    onClick={() => executeCommand(() => editor.chain().focus().redo().run())}
                    disabled={!editor.can().redo()}
                >
                    <div className="flex items-center">
                        <Redo className="w-4 h-4 mr-2" />
                        Redo
                    </div>
                    <span className="text-xs text-gray-400">Ctrl+Y</span>
                </Button>
                <div className="border-t border-gray-100 my-1"></div>


                {menuMode === 'table' ? (
                    // Table-specific context menu
                    <>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Table
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => editor.chain().focus().addRowBefore().run())}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Row Above
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => editor.chain().focus().addRowAfter().run())}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Row Below
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => editor.chain().focus().addColumnBefore().run())}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Column Left
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => editor.chain().focus().addColumnAfter().run())}
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Column Right
                        </Button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => executeCommand(() => editor.chain().focus().deleteRow().run())}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Row
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => executeCommand(() => editor.chain().focus().deleteColumn().run())}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Column
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => executeCommand(() => editor.chain().focus().deleteTable().run())}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Table
                        </Button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => editor.chain().focus().mergeCells().run())}
                        >
                            <Merge className="w-4 h-4 mr-2" />
                            Merge Cells
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => editor.chain().focus().splitCell().run())}
                        >
                            <Split className="w-4 h-4 mr-2" />
                            Split Cell
                        </Button>
                    </>
                ) : menuMode === 'image' ? (
                    // Image-specific context menu
                    <>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Image
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(async () => {
                                try {
                                    // Get the selected image node
                                    const { state } = editor
                                    const { selection } = state
                                    const node = state.doc.nodeAt(selection.from)

                                    if (node && node.type.name === 'image') {
                                        const src = node.attrs.src

                                        // If it's a data URL, convert to blob and copy
                                        if (src.startsWith('data:')) {
                                            const response = await fetch(src)
                                            const blob = await response.blob()
                                            await navigator.clipboard.write([
                                                new ClipboardItem({ [blob.type]: blob })
                                            ])
                                        } else {
                                            // For external URLs, fetch and copy
                                            const response = await fetch(src)
                                            const blob = await response.blob()
                                            await navigator.clipboard.write([
                                                new ClipboardItem({ [blob.type]: blob })
                                            ])
                                        }
                                        console.log('Image copied to clipboard')
                                    }
                                } catch (error) {
                                    console.error('Failed to copy image:', error)
                                    // Fallback: copy image URL as text
                                    const { state } = editor
                                    const { selection } = state
                                    const node = state.doc.nodeAt(selection.from)
                                    if (node && node.type.name === 'image') {
                                        await navigator.clipboard.writeText(node.attrs.src)
                                    }
                                }
                            })}
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Image
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => executeCommand(() => editor.chain().focus().deleteSelection().run())}
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Image
                        </Button>
                    </>
                ) : menuMode === 'format' ? (
                    // Text formatting context menu (when text is selected)
                    <>
                        <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            Format
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => {
                                if (editor.isActive('bold')) {
                                    editor.chain().focus().unsetBold().run()
                                } else {
                                    editor.chain().focus().setBold().run()
                                }
                            })}
                        >
                            <div className="flex items-center">
                                <Bold className="w-4 h-4 mr-2" />
                                Bold
                            </div>
                            <span className="text-xs text-gray-400">Ctrl+B</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => {
                                if (editor.isActive('italic')) {
                                    editor.chain().focus().unsetItalic().run()
                                }
                                else {
                                    editor.chain().focus().setItalic().run()
                                }
                            })}
                        >
                            <div className="flex items-center">
                                <Italic className="w-4 h-4 mr-2" />
                                Italic
                            </div>
                            <span className="text-xs text-gray-400">Ctrl+I</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => {
                                if (editor.isActive('underline')) {
                                    editor.chain().focus().unsetUnderline().run()
                                } else {
                                    editor.chain().focus().setUnderline().run()
                                }
                            })}
                        >
                            <div className="flex items-center">
                                <Underline className="w-4 h-4 mr-2" />
                                Underline
                            </div>
                            <span className="text-xs text-gray-400">Ctrl+U</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => {
                                if (editor.isActive('code')) {
                                    editor.chain().focus().unsetCode().run()
                                }
                                else {
                                    editor.chain().focus().setCode().run()
                                }
                            })}
                        >
                            <div className="flex items-center">
                                <Code className="w-4 h-4 mr-2" />
                                Inline Code
                            </div>
                            <span className="text-xs text-gray-400">Ctrl+E</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-between px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => {
                                if (editor.isActive('strike')) {
                                    editor.chain().focus().unsetStrike().run()
                                } else {
                                    editor.chain().focus().setStrike().run()
                                }
                            })}
                        >
                            <div className="flex items-center">
                                <Strikethrough className="w-4 h-4 mr-2" />
                                Strike
                            </div>
                            <span className="text-xs text-gray-400">Ctrl+E</span>
                        </Button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => executeCommand(() => editor.chain().focus().unsetAllMarks().run())}
                        >
                            <Eraser className="w-4 h-4 mr-2" />
                            Clear Formatting
                        </Button>
                    </>
                ) : (
                    // Default mode (no selection) - show insert (link, divider, table, image, diagram) and more (clear formatting button)
                    <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                            Insert
                        </div>

                        {/* Table Grid Selector */}
                        <Popover open={tablePopoverOpen} onOpenChange={setTablePopoverOpen}>
                            <PopoverTrigger asChild>
                                <div
                                    className="
                                    inline-flex items-center whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50 h-8 rounded-md gap-3 has-[>svg]:px-2.5 w-full justify-start px-3 py-2 text-sm 
                                "
                                    onMouseEnter={() => {
                                        if (tablePopoverTimerRef.current) {
                                            clearTimeout(tablePopoverTimerRef.current);
                                        }
                                        setTablePopoverOpen(true);
                                    }}
                                    onMouseLeave={() => {
                                        tablePopoverTimerRef.current = setTimeout(() => {
                                            setTablePopoverOpen(false);
                                        }, 300);
                                    }}
                                >
                                    <Table className="w-3.5 h-3.5" />
                                    <span className="hidden lg:inline">Table</span>
                                </div>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-64 p-4 z-99991"
                                side="left"
                                align="start"
                                onMouseEnter={() => {
                                    if (tablePopoverTimerRef.current) {
                                        clearTimeout(tablePopoverTimerRef.current);
                                    }
                                    setTablePopoverOpen(true);
                                }}
                                onMouseLeave={() => {
                                    tablePopoverTimerRef.current = setTimeout(() => {
                                        setTablePopoverOpen(false);
                                    }, 300);
                                }}
                            >
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-gray-700">Insert Table</h4>
                                    <TableGridSelector
                                        onSelect={(rows, cols) => {
                                            editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                                            setTablePopoverOpen(false);
                                        }}
                                    />
                                </div>
                            </PopoverContent>
                        </Popover>
                        <Button variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm" onClick={() => {
                                const defaultChart = `graph TD
A[Start] --> B{Decision}
B -->|Yes| C[Do something]
B -->|No| D[Do something else]
C --> E[End]
D --> E`;
                                editor?.chain().focus().toggleCodeBlock({ language: 'mermaid' }).insertContent(defaultChart).run();
                            }}>
                            <Network className="w-3.5 h-3.5 mr-2" />
                            <span>Diagram</span>
                        </Button>
                        <Button variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm" onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.onchange = (e) => {
                                    const file = (e.target as HTMLInputElement).files?.[0];
                                    if (file) {
                                        const reader = new FileReader();
                                        reader.onload = () => {
                                            const result = reader.result as string;
                                            editor?.chain().focus().setImage({ src: result }).run();
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                };
                                input.click();
                            }}>
                            <ImageIcon className="w-3.5 h-3.5 mr-2" />
                            <span>Image</span>
                        </Button>
                        <Button variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm" onClick={() => {
                                // Check if cursor is in a link
                                const isInLink = editor.isActive('link');

                                if (isInLink) {
                                    // If cursor is in a link, remove the link
                                    editor.chain().focus().unsetLink().run();
                                } else {
                                    // Check if text is selected
                                    const { state } = editor;
                                    const { from, to } = state.selection;
                                    const hasSelection = from !== to;

                                    if (hasSelection) {
                                        // Get selected text
                                        const selectedText = state.doc.textBetween(from, to, ' ', ' ').trim();

                                        // Check if the selected text is a valid URL
                                        const urlPattern = /^https?:\/\/.+/i;
                                        if (urlPattern.test(selectedText)) {
                                            // If selected text is a valid URL, make it a link
                                            editor.chain().focus().setLink({ href: selectedText }).run();
                                        }
                                        // If selected text is not a valid URL, do nothing
                                    } else {
                                        // No text selected, prompt for URL and insert new link
                                        const url = window.prompt('Enter URL:', 'https://');
                                        if (url && url.trim()) {
                                            const linkText = window.prompt('Enter link text (optional):', '');
                                            if (linkText && linkText.trim()) {
                                                // Insert link with custom text
                                                editor.chain().focus().insertContent(`<a href="${url.trim()}">${linkText.trim()}</a>`).run();
                                            } else {
                                                // Insert link with URL as text
                                                editor.chain().focus().insertContent(`<a href="${url.trim()}">${url.trim()}</a>`).run();
                                            }
                                        }
                                    }
                                }
                            }}>
                            <Link className="w-3.5 h-3.5 mr-2" />
                            <span>Link</span>
                        </Button>
                        <Button variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm" onClick={() => {
                                editor?.chain().focus().setHorizontalRule().run();
                            }}>
                            <Minus className="w-3.5 h-3.5 mr-2" />
                            <span>Divider</span>
                        </Button>
                        <div className="border-t border-gray-100 my-1"></div>
                    </>
                )}
            </ScrollArea>
        </div>
    )

    // Render using Portal to escape DocumentMenu's stacking context
    return createPortal(menuContent, document.body)
}

export default ContextMenu