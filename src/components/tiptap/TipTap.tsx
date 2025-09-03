import { EditorContext, useEditor } from "@tiptap/react";
import DocumentContext from "./DocumentContext";
import ToolBar from "./ToolBar";
import { useMemo, useCallback, useState, useEffect } from "react";
import { createTipTapConfig } from "../../config/tiptap-config";

interface TiptapProps {
    initialContent?: string;
    editable?: boolean;
    onUpdate?: (content: string) => void;
    className?: string;
}

const Tiptap = ({ 
    initialContent = "<p>Start writing your document...</p>", 
    editable = true,
    onUpdate,
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
            <div className={`tiptap-container ${className}`}>
                
                {/* Toolbar */}
                <ToolBar editor={editor} />
                
                {/* Document Content */}
                <DocumentContext editor={editor}>
                    {/* Any additional overlay content can be passed as children */}
                </DocumentContext>
            </div>
        </EditorContext.Provider>
    );
};

export default Tiptap;
