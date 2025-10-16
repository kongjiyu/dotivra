import React, { useEffect, useRef } from 'react'
import type { Editor } from '@tiptap/react'
import { Button } from '@/components/ui/button'
import {
    Copy,
    Scissors,
    ClipboardPaste,
    Bold,
    Italic,
    Underline,
    Table,
    Plus,
    Minus,
    Trash2,
    Merge,
    Split,
    Undo,
    Redo,
    FileText,
    Eraser,
    Bot,
    Delete
} from 'lucide-react'

interface ContextMenuProps {
    editor: Editor | null
    isVisible: boolean
    position: { x: number; y: number }
    onClose: () => void
    isTableContext?: boolean
    onOpenChat?: (message?: string) => void
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
    editor,
    isVisible,
    position,
    onClose,
    isTableContext = false,
    onOpenChat
}) => {
    const menuRef = useRef<HTMLDivElement>(null)

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

    // Close menu on escape key
    useEffect(() => {
        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        if (isVisible) {
            document.addEventListener('keydown', handleEscape)
        }

        return () => {
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isVisible, onClose])

    if (!isVisible || !editor) {
        return null
    }

    const executeCommand = (command: () => void) => {
        command()
        onClose()
    }

    const isTextSelected = !editor.state.selection.empty
    const canPaste = true // We'll assume paste is always available

    // Ensure menu stays within viewport
    const adjustedPosition = {
        x: Math.min(position.x, window.innerWidth - 450), // 450px is approximate menu width + padding
        y: Math.min(position.y, window.innerHeight - 600), // 600px is approximate expanded menu height
    }

    return (
        <div
            ref={menuRef}
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-[200px]"
            style={{
                left: adjustedPosition.x,
                top: adjustedPosition.y,
            }}
        >
            {isTableContext ? (
                // Table-specific context menu with basic features
                <>
                    {/* Basic Actions */}
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Basic Actions
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => editor.chain().focus().undo().run())}
                        disabled={!editor.can().undo()}
                    >
                        <Undo className="w-4 h-4 mr-2" />
                        Undo
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => editor.chain().focus().redo().run())}
                        disabled={!editor.can().redo()}
                    >
                        <Redo className="w-4 h-4 mr-2" />
                        Redo
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => {
                            const selection = window.getSelection()
                            if (selection) {
                                navigator.clipboard.writeText(selection.toString())
                            }
                        })}
                        disabled={!isTextSelected}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => {
                            const selection = window.getSelection()
                            if (selection) {
                                navigator.clipboard.writeText(selection.toString())
                                editor.commands.deleteSelection()
                            }
                        })}
                        disabled={!isTextSelected}
                    >
                        <Scissors className="w-4 h-4 mr-2" />
                        Cut
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(async () => {
                            try {
                                const text = await navigator.clipboard.readText()
                                editor.commands.insertContent(text)
                            } catch (err) {
                                console.warn('Paste operation failed:', err)
                            }
                        })}
                        disabled={!canPaste}
                    >
                        <ClipboardPaste className="w-4 h-4 mr-2" />
                        Paste
                    </Button>

                    {isTextSelected && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700"
                            onClick={() => executeCommand(() => {
                                // Get selected text from TipTap editor
                                const { state } = editor;
                                const { from, to } = state.selection;
                                let selectedText = '';
                                let cleanText = '';

                                if (from !== to) {
                                    // Get the raw text content
                                    selectedText = state.doc.textBetween(from, to, ' ', ' ');
                                    // Clean up the text by removing extra whitespace
                                    cleanText = selectedText.replace(/\s+/g, ' ').trim();
                                }

                                // If no selection in editor, try window selection as fallback
                                if (!cleanText) {
                                    const windowSelection = window.getSelection();
                                    if (windowSelection && !windowSelection.isCollapsed) {
                                        cleanText = windowSelection.toString().replace(/\s+/g, ' ').trim();
                                    }
                                }

                              
                                if (onOpenChat && typeof onOpenChat === 'function') {
                                    const messageToSend = cleanText
                                        ? `Please help me with this content: "${cleanText}"`
                                        : 'Please help me with this document.';

                                    onOpenChat(messageToSend);
                                } else {
                                    console.error('❌ onOpenChat function not available or not a function (table)', {
                                        available: !!onOpenChat,
                                        type: typeof onOpenChat
                                    });
                                }
                            })}
                        >
                            <Bot className="w-4 h-4 mr-2" />
                            Ask AI
                        </Button>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Table-specific actions */}
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Table Actions
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
                        className="w-full justify-start px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600"
                        onClick={() => executeCommand(() => editor.chain().focus().deleteRow().run())}
                    >
                        <Minus className="w-4 h-4 mr-2" />
                        Delete Row
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600"
                        onClick={() => executeCommand(() => editor.chain().focus().deleteColumn().run())}
                    >
                        <Minus className="w-4 h-4 mr-2" />
                        Delete Column
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600"
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
                        onClick={() => executeCommand(() => {
                            // Simple merge cells - let TipTap handle content preservation
                            if (editor.can().mergeCells()) {
                                editor.chain().focus().mergeCells().run();
                            }
                        })}
                    >
                        <Merge className="w-4 h-4 mr-2" />
                        Merge Cells
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => {
                            // Simple split cell - let TipTap handle content preservation
                            if (editor.can().splitCell()) {
                                editor.chain().focus().splitCell().run();
                            }
                        })}
                    >
                        <Split className="w-4 h-4 mr-2" />
                        Split Cell
                    </Button>

                </>
            ) : (
                // General document context menu
                <>
                    {/* History Actions */}
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        History
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => editor.chain().focus().undo().run())}
                        disabled={!editor.can().undo()}
                    >
                        <Undo className="w-4 h-4 mr-2" />
                        Undo
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => editor.chain().focus().redo().run())}
                        disabled={!editor.can().redo()}
                    >
                        <Redo className="w-4 h-4 mr-2" />
                        Redo
                    </Button>

                    <div className="border-t border-gray-100 my-1"></div>

                    {/* Clipboard Actions */}
                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Clipboard
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => {
                            const selection = window.getSelection()
                            if (selection) {
                                navigator.clipboard.writeText(selection.toString())
                            }
                        })}
                        disabled={!isTextSelected}
                    >
                        <Copy className="w-4 h-4 mr-2" />
                        Copy
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => {
                            const selection = window.getSelection()
                            if (selection) {
                                navigator.clipboard.writeText(selection.toString())
                                editor.commands.deleteSelection()
                            }
                        })}
                        disabled={!isTextSelected}
                    >
                        <Scissors className="w-4 h-4 mr-2" />
                        Cut
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(async () => {
                            try {
                                const text = await navigator.clipboard.readText()
                                editor.commands.insertContent(text)
                            } catch (err) {
                                console.warn('Paste operation failed:', err)
                            }
                        })}
                        disabled={!canPaste}
                    >
                        <ClipboardPaste className="w-4 h-4 mr-2" />
                        Paste
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(async () => {
                            try {
                                const text = await navigator.clipboard.readText()
                                // Insert as plain text without formatting
                                editor.commands.insertContent({ type: 'text', text })
                            } catch (err) {
                                console.warn('Paste without formatting failed:', err)
                            }
                        })}
                        disabled={!canPaste}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        Paste without Formatting
                    </Button>

                    {isTextSelected && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full justify-start px-3 py-2 text-sm hover:bg-red-50 hover:text-red-600"
                            onClick={() => executeCommand(() => editor.commands.deleteSelection())}
                        >
                            <Delete className="w-4 h-4 mr-2" />
                            Delete
                        </Button>
                    )}

                    {isTextSelected && (
                        <>
                            <div className="border-t border-gray-100 my-1"></div>

                            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                Format
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-3 py-2 text-sm"
                                onClick={() => executeCommand(() => editor.chain().focus().toggleBold().run())}
                            >
                                <Bold className="w-4 h-4 mr-2" />
                                Bold
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-3 py-2 text-sm"
                                onClick={() => executeCommand(() => editor.chain().focus().toggleItalic().run())}
                            >
                                <Italic className="w-4 h-4 mr-2" />
                                Italic
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-3 py-2 text-sm"
                                onClick={() => executeCommand(() => editor.chain().focus().toggleUnderline().run())}
                            >
                                <Underline className="w-4 h-4 mr-2" />
                                Underline
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-3 py-2 text-sm"
                                onClick={() => executeCommand(() => {
                                    // Clear all formatting from selected text
                                    editor.chain().focus().unsetAllMarks().run()
                                })}
                            >
                                <Eraser className="w-4 h-4 mr-2" />
                                Clear Formatting
                            </Button>

                            <div className="border-t border-gray-100 my-1"></div>

                            <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                AI Assistant
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start px-3 py-2 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700"
                                onClick={() => executeCommand(() => {
                                    // Get selected text from TipTap editor
                                    const { state } = editor;
                                    const { from, to } = state.selection;
                                    let selectedText = '';
                                    let cleanText = '';

                                    if (from !== to) {
                                        // Get the raw text content
                                        selectedText = state.doc.textBetween(from, to, ' ', ' ');
                                        // Clean up the text by removing extra whitespace
                                        cleanText = selectedText.replace(/\s+/g, ' ').trim();
                                    }

                                    // If no selection in editor, try window selection as fallback
                                    if (!cleanText) {
                                        const windowSelection = window.getSelection();
                                        if (windowSelection && !windowSelection.isCollapsed) {
                                            cleanText = windowSelection.toString().replace(/\s+/g, ' ').trim();
                                        }
                                    }

                                  
                                    if (onOpenChat && typeof onOpenChat === 'function') {
                                        const messageToSend = cleanText
                                            ? `Please help me with this content: "${cleanText}"`
                                            : 'Please help me with this document.';

                                        onOpenChat(messageToSend);
                                    } else {
                                        console.error('❌ onOpenChat function not available or not a function (general)', {
                                            available: !!onOpenChat,
                                            type: typeof onOpenChat
                                        });
                                    }
                                })}
                            >
                                <Bot className="w-4 h-4 mr-2" />
                                Ask AI
                            </Button>
                        </>
                    )}

                    <div className="border-t border-gray-100 my-1"></div>

                    <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Insert
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start px-3 py-2 text-sm"
                        onClick={() => executeCommand(() => {
                            editor.chain().focus().insertTable({
                                rows: 3,
                                cols: 3,
                                withHeaderRow: true
                            }).run()
                        })}
                    >
                        <Table className="w-4 h-4 mr-2" />
                        Insert Table
                    </Button>
                </>
            )}
        </div>
    )
}

export default ContextMenu