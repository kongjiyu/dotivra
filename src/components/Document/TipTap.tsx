import { EditorContext, useEditor } from "@tiptap/react";
import DocumentContext from "./DocumentContext";
import ToolBar from "./ToolBar";
import { useMemo, useCallback, useState, useEffect } from "react";
import { createTipTapConfig } from "../../config/tiptap-config";

interface TiptapProps {
    initialContent?: string;
    editable?: boolean;
    onUpdate?: (content: string) => void;
    onEditorReady?: (editor: any) => void;
    className?: string;
}

const Tiptap = ({
    initialContent = "<p>Start writing your document...</p>",
    editable = true,
    onUpdate,
    onEditorReady,
    className = ""
}: TiptapProps) => {
    const [isReady, setIsReady] = useState(false);

    // Create editor configuration using the config file
    const editorConfig = useMemo(() =>
        createTipTapConfig({
            content: initialContent,
            editable,
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
        }
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
                        <DocumentContext editor={editor}>
                            {/* Any additional overlay content can be passed as children */}
                        </DocumentContext>
                    </div>
                </div>
            </div>
        </EditorContext.Provider>
    );
};

export default Tiptap;