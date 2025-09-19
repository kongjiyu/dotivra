import type { Editor } from "@tiptap/react";
import { EditorContent } from "@tiptap/react";
import { memo } from "react";

interface DocumentContextProps {
    editor: Editor | null;
    children?: React.ReactNode;
}

const DocumentContext = memo(({ editor, children }: DocumentContextProps) => {
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
                    <div className="p-[56px] sm:p-[64px]">
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
        </div>
    );
});

DocumentContext.displayName = 'DocumentContext';

export default DocumentContext;