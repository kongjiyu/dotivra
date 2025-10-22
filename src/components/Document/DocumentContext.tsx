import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { memo, useState, useEffect, useRef } from "react";
import ContextMenu from "./ContextMenu";

interface DocumentContextProps {
    editor: Editor | null;
    children?: React.ReactNode;
    onOpenChat?: (message?: string) => void;
}

const DocumentContext = memo(({ editor, children, onOpenChat }: DocumentContextProps) => {
    const [contextMenu, setContextMenu] = useState({
        isVisible: false,
        position: { x: 0, y: 0 },
        isTableContext: false
    });
    const editorContentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!editor || !editorContentRef.current) return;

        const handleContextMenu = (event: MouseEvent) => {
            event.preventDefault();

            const selection = window.getSelection();
            let x = event.clientX;
            let y = event.clientY;

            // If there's a selection, position menu relative to the caret
            if (selection && selection.rangeCount > 0 && !selection.isCollapsed) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                // Position to the right and vertically centered with the selection
                x = rect.right + 10; // 10px offset to the right
                y = rect.top + (rect.height / 2); // Center vertically

                // Ensure menu stays within viewport
                const menuWidth = 350; // Approximate menu width
                const menuHeight = 500; // Approximate menu height

                // Adjust if would overflow right edge
                if (x + menuWidth > window.innerWidth) {
                    x = rect.left - menuWidth - 10; // Show on left instead
                }

                // Adjust if would overflow bottom
                if (y + (menuHeight / 2) > window.innerHeight) {
                    y = window.innerHeight - (menuHeight / 2) - 20;
                }

                // Adjust if would overflow top
                if (y - (menuHeight / 2) < 0) {
                    y = (menuHeight / 2) + 20;
                }
            }

            // Check if right-click is on a table
            const target = event.target as HTMLElement;
            const isInTable = target.closest('table, td, th, tr');

            setContextMenu({
                isVisible: true,
                position: { x, y },
                isTableContext: !!isInTable
            });
        };

        const handleClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // More robust check: detect if click is on blank space (not on actual content nodes)
            // Check if target is container/wrapper, not actual content elements
            const isEditorContainer = target.classList.contains('tiptap') ||
                target.classList.contains('ProseMirror') ||
                target === editorContentRef.current;

            // Also check if clicking on the wrapper divs (document-context, prose container)
            const isWrapperElement = target.classList.contains('document-context') ||
                target.classList.contains('prose') ||
                target.closest('.document-context') === target;

            // Check if clicked element has no text content or is just whitespace
            const hasNoContent = !target.textContent?.trim() &&
                target.nodeName !== 'P' &&
                target.nodeName !== 'H1' &&
                target.nodeName !== 'H2' &&
                target.nodeName !== 'H3' &&
                target.nodeName !== 'H4' &&
                target.nodeName !== 'H5' &&
                target.nodeName !== 'H6' &&
                target.nodeName !== 'LI' &&
                target.nodeName !== 'TD' &&
                target.nodeName !== 'TH' &&
                !target.closest('p, h1, h2, h3, h4, h5, h6, li, td, th, a, code, pre');

            if (isEditorContainer || isWrapperElement || hasNoContent) {
                // Move cursor to the end of the document
                const { doc } = editor.state;
                const endPos = doc.content.size;
                editor.commands.focus();
                editor.commands.setTextSelection(endPos);
            }
        };

        const editorElement = editorContentRef.current;
        editorElement.addEventListener('contextmenu', handleContextMenu);
        editorElement.addEventListener('click', handleClick);

        return () => {
            editorElement.removeEventListener('contextmenu', handleContextMenu);
            editorElement.removeEventListener('click', handleClick);
        };
    }, [editor]);

    const closeContextMenu = () => {
        setContextMenu(prev => ({ ...prev, isVisible: false }));
    };

    if (!editor) {
        return (
            <div className="document-context min-h-96 p-6 bg-white border border-gray-200 rounded-lg">
                <div className="text-gray-500 text-center">Loading editor...</div>
            </div>
        );
    }

    return (
        <div className="document-context h-full min-h-0">

            {/* Centered page like Google Docs */}
            <div className="w-full flex justify-center">

                <div className="relative w-[816px] max-w-full bg-white border border-gray-200 rounded-sm shadow-md">
                    <div className="absolute top-[50px] left-[50px] w-9 h-9 border-t-1 border-l-1 border-gray-350/50"></div>
                    <div className="absolute top-[50px] right-[50px] w-9 h-9 border-t-1 border-r-1 border-gray-350/50"></div>
                    <div className="absolute bottom-[50px] left-[50px] w-9 h-9 border-b-1 border-l-1 border-gray-350/50"></div>
                    <div className="absolute bottom-[50px] right-[50px] w-9 h-9 border-b-1 border-r-1 border-gray-350/50"></div>
                    <div className=" p-[56px] sm:p-[64px]" ref={editorContentRef}>

                        <EditorContent
                            editor={editor}
                            className="tiptap prose prose-stale prose-lg max-w-none focus:outline-none text-base"
                            style={{ minHeight: '400px' }}
                            data-testid="editor-content"
                        />
                        {/* Custom content overlay/children */}
                        {children && (

                            <div className="absolute inset-0 pointer-events-none">
                                {children}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Context Menu */}
            <ContextMenu
                editor={editor}
                isVisible={contextMenu.isVisible}
                position={contextMenu.position}
                onClose={closeContextMenu}
                isTableContext={contextMenu.isTableContext}
                onOpenChat={onOpenChat}
            />
        </div>
    );
});

DocumentContext.displayName = 'DocumentContext';

export default DocumentContext;