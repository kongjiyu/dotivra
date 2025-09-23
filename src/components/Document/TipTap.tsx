import { EditorContext, useEditor } from "@tiptap/react";
import DocumentContext from "./DocumentContext";
import ToolBar from "./ToolBar";
// import LinkPreview from "./LinkPreview"; // Temporarily disabled
import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { createTipTapConfig } from "../../config/tiptap-config";

interface TiptapProps {
    initialContent?: string;
    editable?: boolean;
    onUpdate?: (content: string) => void;
    onEditorReady?: (editor: any) => void;
    className?: string;
    onOpenChat?: (message?: string) => void;
}

const Tiptap = ({
    initialContent,
    editable = true,
    onUpdate,
    onEditorReady,
    className = "",
    onOpenChat
}: TiptapProps) => {
    const [isReady, setIsReady] = useState(false);
    // const [linkPreview, setLinkPreview] = useState... // Temporarily disabled
    const initialAppliedRef = useRef(false); // NEW
    console.log("Rendering Tiptap with initialContent:", initialContent);
    // Create editor configuration using the config file
    //FIXME: adjust default content, prevent undo feature undo initial content set
    const editorConfig = useMemo(() =>
        createTipTapConfig({
            content: initialContent,
            editable,
            extraClasses: 'break-words whitespace-pre-wrap',
            onCreate: () => {
                setIsReady(true);
            },
            onUpdate: ({ editor }: { editor: any }) => {
                if (onUpdate) {
                    onUpdate(editor.getHTML());
                }
            },
        }),
        [initialContent, editable, onUpdate]
    );


    const editor = useEditor(editorConfig);

    // Temporarily disable hover event listeners to prevent corruption
    // TODO: Re-implement with safer event handling
    /*
    // Add hover event listeners for link preview
    useEffect(() => {
        if (!editor) return;

        const handleLinkHover = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const linkElement = target.closest('a');
            
            if (linkElement && linkElement.getAttribute('href')) {
                const url = linkElement.getAttribute('href');
                if (url) {
                    const rect = linkElement.getBoundingClientRect();
                    setLinkPreview({
                        isVisible: true,
                        url: url,
                        position: {
                            x: rect.left + rect.width / 2,
                            y: rect.bottom + 8
                        }
                    });
                }
            }
        };

        const handleLinkLeave = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const linkElement = target.closest('a');
            
            if (linkElement) {
                setLinkPreview(prev => ({ ...prev, isVisible: false }));
            }
        };

        const editorElement = editor.view.dom;
        if (editorElement) {
            editorElement.addEventListener('mouseover', handleLinkHover);
            editorElement.addEventListener('mouseout', handleLinkLeave);
        }

        return () => {
            if (editorElement) {
                editorElement.removeEventListener('mouseover', handleLinkHover);
                editorElement.removeEventListener('mouseout', handleLinkLeave);
            }
        };
    }, [editor]);
    */

    // Temporarily disable link preview to debug corruption
    // TODO: Re-enable once issue is resolved

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({ editor }), [editor]);

    // Cleanup on unmount
    const handleDestroy = useCallback(() => {
        if (editor) {
            editor.destroy();
        }
    }, [editor]);

    useEffect(() => {
        return handleDestroy;
    }, [handleDestroy]);

    // Update editor content when initialContent changes
    useEffect(() => {
        if (editor && initialContent && editor.getHTML() !== initialContent) {
            editor.commands.setContent(initialContent);
            // Only dispatch if editor.view exists
            if (editor.view) {
                editor.view.dispatch(
                    editor.state.tr.setMeta('addToHistory', false)
                );
            }
        }
    }, [editor, initialContent]);

    // Prevent first undo from reverting to empty document:
    // Apply initialContent exactly once, suppress history + update.
    useEffect(() => {
        if (!editor) return;
        if (!initialContent) return;
        if (initialAppliedRef.current) return;

        if (editor.getHTML() !== initialContent) {
            // false => do not emit update event, avoids extra history noise
            editor.commands.setContent(initialContent, { emitUpdate: false });
            // Ensure no history entry for this transaction - fix typo
            if (editor.view) {
                const tr = editor.state.tr.setMeta('addToHistory', false);
                editor.view.dispatch(tr);
            }
        }
        initialAppliedRef.current = true;
    }, [editor, initialContent]);

    // Call onEditorReady when editor is ready
    useEffect(() => {
        if (editor && isReady && onEditorReady) {
            onEditorReady(editor);
        }
    }, [editor, isReady, onEditorReady]);

    // Loading state
    if (!editor || !isReady) {
        return (
            <div className={`tiptap-loading ${className}`}>
                <div className="flex items-center justify-center min-h-96 bg-gray-50 rounded-lg">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                        <p className="text-gray-600">Loading editor...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <EditorContext.Provider value={contextValue}>
            <div className={`tiptap-container h-full min-h-0 ${className}`}>
                <div className="mx-auto w-[75vw] max-w-[1200px] min-w-[320px] space-y-0 h-full min-h-0">
                    {/* Toolbar (fixed under the fixed menu), slightly wider than content */}
                    <div className="fixed left-1/2 -translate-x-1/2 top-[144px] z-20 w-[96vw] max-w-[1680px] min-w-[360px] px-3">
                        <ToolBar editor={editor} />
                    </div>
                    {/* Spacer to offset fixed toolbar height */}
                    <div className="h-[56px]"></div>

                    {/* Document Content */}
                    <div className="min-h-0">
                        <DocumentContext editor={editor} onOpenChat={onOpenChat}>
                            {/* Any additional overlay content can be passed as children */}
                        </DocumentContext>
                    </div>
                </div>

                {/* Link Preview - Temporarily disabled */}
                {/* <LinkPreview
                    url={linkPreview.url}
                    isVisible={linkPreview.isVisible}
                    position={linkPreview.position}
                /> */}
            </div>
        </EditorContext.Provider>

    );
};

export default Tiptap;