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

            // Check if right-click is on a table
            const target = event.target as HTMLElement;
            const isInTable = target.closest('table, td, th, tr');

            setContextMenu({
                isVisible: true,
                position: { x: event.clientX, y: event.clientY },
                isTableContext: !!isInTable
            });
        };

        const editorElement = editorContentRef.current;
        editorElement.addEventListener('contextmenu', handleContextMenu);

        return () => {
            editorElement.removeEventListener('contextmenu', handleContextMenu);
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