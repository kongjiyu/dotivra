import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
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
    Sparkles,
    Palette,
    Highlighter,
} from 'lucide-react'

interface ContextMenuProps {
    editor: Editor | null
    isVisible: boolean
    position: { x: number; y: number }
    onClose: () => void
    isTableContext?: boolean
    onOpenChat?: (selectedText: string, isReply?: boolean) => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    editor,
    isVisible,
    position,
    onClose,
    isTableContext = false,
    onOpenChat,
}) => {
    const menuRef = useRef<HTMLDivElement>(null)

    // Always declare hooks at the top level
    const [menuHeight, setMenuHeight] = React.useState(500)
    const [textColorOpen, setTextColorOpen] = useState(false)
    const [bgColorOpen, setBgColorOpen] = useState(false)

    // Color palettes
    const TEXT_COLORS = [
        '#000000', '#374151', '#6B7280', '#EF4444', '#F97316', 
        '#F59E0B', '#EAB308', '#84CC16', '#22C55E', '#10B981',
        '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
        '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F43F5E'
    ]

    const BG_COLORS = [
        '#FFCCCC', '#FFE5CC', '#FFFFCC', '#E5FFCC', '#CCFFCC',
        '#CCFFE5', '#CCFFFF', '#CCE5FF', '#CCCCFF', '#E5CCFF',
        '#FFCCFF', '#FFCCE5', '#F3F4F6', '#E5E7EB', '#D1D5DB'
    ]

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

                        {/* Ask AI Button */}
                        {onOpenChat && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-3 py-2 text-sm bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100"
                                onClick={() => {
                                    const { from, to } = editor.state.selection;
                                    const selectedText = editor.state.doc.textBetween(from, to, ' ');
                                    if (selectedText) {
                                        onOpenChat(selectedText, true);
                                        onClose();
                                    }
                                }}
                            >
                                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                                <span className="text-purple-700">Ask AI</span>
                            </Button>
                        )}

                    </>
                ) : (
                    // Default mode (no selection) - show insert (link, divider, table, image, diagram) and more (clear formatting button)
                    <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                            Insert
                        </div>

                        {/* Simple 3x3 Table Button */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm"
                            onClick={() => {
                                editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                                onClose();
                            }}
                        >
                            <Table className="w-3.5 h-3.5 mr-2" />
                            <span>Table</span>
                        </Button>
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
                                onClose();
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
                                            onClose();
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
                                        // No selection: collect URL/text via SweetAlert2 modal
                                        import('sweetalert2').then(async ({ default: Swal }) => {
                                            const { value: formValues } = await Swal.fire({
                                                title: 'Insert link',
                                                html:
                                                    '<input id="swal-link-url" class="swal2-input" placeholder="https://example.com" />' +
                                                    '<input id="swal-link-text" class="swal2-input" placeholder="Link text (optional)" />',
                                                focusConfirm: false,
                                                showCancelButton: true,
                                                preConfirm: () => {
                                                    const url = (document.getElementById('swal-link-url') as HTMLInputElement)?.value?.trim();
                                                    const text = (document.getElementById('swal-link-text') as HTMLInputElement)?.value?.trim();
                                                    if (!url) return null;
                                                    return { url, text };
                                                }
                                            });
                                            if (formValues && formValues.url) {
                                                const href = formValues.url;
                                                const text = formValues.text || formValues.url;
                                                editor.chain().focus().insertContent(`<a href="${href}">${text}</a>`).run();
                                            }
                                            onClose();
                                        });
                                    }
                                }
                                onClose();
                            }}>
                            <Link className="w-3.5 h-3.5 mr-2" />
                            <span>Link</span>
                        </Button>
                        <Button variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm" onClick={() => {
                                editor?.chain().focus().setHorizontalRule().run();
                                onClose();
                            }}>
                            <Minus className="w-3.5 h-3.5 mr-2" />
                            <span>Divider</span>
                        </Button>
                        
                        <div className="border-t border-gray-100 my-1"></div>

                        {/* Font Color */}
                        <Popover open={textColorOpen} onOpenChange={setTextColorOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start px-3 py-2 text-sm"
                                >
                                    <Palette className="w-4 h-4 mr-2" />
                                    Font Color
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3" side="right" align="start">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-medium text-gray-700">Font Color</h4>
                                    <div className="grid grid-cols-5 gap-1">
                                        <button
                                            className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-xs font-bold"
                                            onClick={() => {
                                                editor?.chain().focus().unsetColor().run();
                                                setTextColorOpen(false);
                                            }}
                                            title="Default"
                                        >
                                            A
                                        </button>
                                        {TEXT_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                className="w-8 h-8 rounded border border-gray-200 hover:border-gray-400 transition-all hover:scale-110"
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                    editor?.chain().focus().setColor(color).run();
                                                    setTextColorOpen(false);
                                                }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

                        {/* Background Color */}
                        <Popover open={bgColorOpen} onOpenChange={setBgColorOpen}>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full justify-start px-3 py-2 text-sm"
                                >
                                    <Highlighter className="w-4 h-4 mr-2" />
                                    Background Color
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-56 p-3" side="right" align="start">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-medium text-gray-700">Background Color</h4>
                                    <div className="grid grid-cols-5 gap-1">
                                        <button
                                            className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-xs"
                                            onClick={() => {
                                                editor?.chain().focus().unsetHighlight().run();
                                                setBgColorOpen(false);
                                            }}
                                            title="No highlight"
                                        >
                                            ✕
                                        </button>
                                        {BG_COLORS.map((color) => (
                                            <button
                                                key={color}
                                                className="w-8 h-8 rounded border border-gray-200 hover:border-gray-400 transition-all hover:scale-110"
                                                style={{ backgroundColor: color }}
                                                onClick={() => {
                                                    editor?.chain().focus().setHighlight({ color }).run();
                                                    setBgColorOpen(false);
                                                }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </PopoverContent>
                        </Popover>

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
                )}
            </ScrollArea>
        </div>
    )

    // Render using Portal to escape DocumentMenu's stacking context
    return createPortal(menuContent, document.body)
}

export default ContextMenu