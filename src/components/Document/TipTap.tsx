import { EditorContext, useEditor } from "@tiptap/react";
import DocumentContext from "./DocumentContext";
import ToolBar from "./ToolBar";
import { useMemo, useCallback, useState, useEffect, useRef } from "react";
import { createTipTapConfig } from "../../config/tiptap-config";
import { useLinkPreview } from '../../hooks/useLinkPreview';
import LinkPreviewEditor from './LinkPreviewEditor';

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
    const initialAppliedRef = useRef(false);

    // Create editor configuration using the config file
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
    const { previewState, showPreview, hidePreview, resetPreview } = useLinkPreview();
    const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Memoize the context value to prevent unnecessary re-renders
    const contextValue = useMemo(() => ({ editor }), [editor]);

    // Add link hover detection to the editor
    useEffect(() => {
        if (!editor) return;

        const clearHideTimeout = () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
        };

        const handleMouseOver = (event: MouseEvent) => {
            const target = event.target as HTMLElement;

            // Look for any link element (a tag with href)
            const linkElement = target.closest('a[href]') as HTMLAnchorElement | null;
            if (!linkElement) return;

            const href = linkElement.getAttribute('href') || '';
            if (!href || !/^https?:\/\//.test(href)) return;

            clearHideTimeout();
            showPreview(href, linkElement);
        };

        const handleMouseOut = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            const relatedTarget = event.relatedTarget as HTMLElement | null;

            const linkElement = target.closest('a[href]') as HTMLAnchorElement | null;
            if (!linkElement) return;

            if (relatedTarget && linkElement.contains(relatedTarget)) return;

            // Longer delay to avoid flicker and allow movement to popup
            clearHideTimeout();
            hideTimeoutRef.current = setTimeout(() => {
                hidePreview();
            }, 800);
        };

        const editorElement = editor.options.element as HTMLElement | null;
        if (editorElement) {
            editorElement.addEventListener('mouseover', handleMouseOver);
            editorElement.addEventListener('mouseout', handleMouseOut);
        }

        return () => {
            clearHideTimeout();
            if (editorElement) {
                editorElement.removeEventListener('mouseover', handleMouseOver);
                editorElement.removeEventListener('mouseout', handleMouseOut);
            }
            resetPreview();
        };
    }, [editor, showPreview, hidePreview, resetPreview]);

    // Cleanup on unmount
    const handleDestroy = useCallback(() => {
        if (editor) {
            editor.destroy();
        }
    }, [editor]);

    useEffect(() => {
        return handleDestroy;
    }, [handleDestroy]);

    // Prevent first undo from reverting to empty document:
    // Apply initialContent exactly once, suppress history + update.
    useEffect(() => {
        if (!editor) return;
        if (!initialContent) return;
        if (initialAppliedRef.current) return;

        if (editor.getHTML() !== initialContent) {
            // false => do not emit update event, avoids extra history noise
            editor.commands.setContent(initialContent, { emitUpdate: false });
            // Ensure no history entry for this transaction
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
            <div className={`tiptap-container h-full min-h-0 relative ${className}`}>
                {/* Toolbar - Now handles its own positioning internally, constrained to this container */}
                <ToolBar editor={editor} />

                {/* Document Content Container */}
                <div className="mx-auto w-[1000px] max-w-[95vw] min-w-[320px] space-y-0 h-full min-h-0 pt-20">
                    {/* Document Content */}
                    <div className="min-h-0">
                        <DocumentContext editor={editor} onOpenChat={onOpenChat}>
                            {/* Any additional overlay content can be passed as children */}
                        </DocumentContext>
                    </div>
                </div>

                {/* Link Preview Editor (hover) */}
                <LinkPreviewEditor
                    url={previewState.url}
                    isVisible={previewState.isVisible}
                    position={previewState.position}
                    onClose={hidePreview}
                    onMouseEnter={() => {
                        // Clear any pending hide timeout when entering popup
                        if (hideTimeoutRef.current) {
                            clearTimeout(hideTimeoutRef.current);
                            hideTimeoutRef.current = null;
                        }
                    }}
                    onMouseLeave={() => {
                        // Set a timeout to hide when leaving popup
                        hideTimeoutRef.current = setTimeout(() => {
                            hidePreview();
                        }, 800);
                    }}
                    onSave={(newUrl, topic) => {
                        if (!editor || !previewState.target) return;
                        try {
                            // Find the position of the target link element in the editor
                            const linkElement = previewState.target as HTMLAnchorElement;

                            // Convert DOM range to TipTap position
                            const from = editor.view.posAtDOM(linkElement, 0);
                            const to = editor.view.posAtDOM(linkElement, linkElement.childNodes.length);

                            // Replace the link content with the new content
                            editor.chain()
                                .focus()
                                .setTextSelection({ from, to })
                                .unsetLink()
                                .insertContent(`<a href="${newUrl}">${topic || newUrl}</a>`)
                                .run();
                        } catch (e) {
                            console.error('Failed to update link', e);
                            // Fallback: just insert at cursor
                            editor.chain().focus().insertContent(`<a href="${newUrl}">${topic || newUrl}</a>`).run();
                        }
                    }}
                />

            </div>
        </EditorContext.Provider>
    );
};

export default Tiptap;