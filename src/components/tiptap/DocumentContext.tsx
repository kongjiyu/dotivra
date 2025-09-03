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
        <div className="document-context min-h-96 bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Editor Content Area */}
            <div className="editor-content-wrapper relative">
                <EditorContent 
                    editor={editor} 
                    className="prose prose-lg max-w-none p-6 focus:outline-none min-h-96"
                    style={{
                        minHeight: '400px'
                    }}
                />
                
                {/* Custom content overlay/children */}
                {children && (
                    <div className="absolute inset-0 pointer-events-none">
                        {children}
                    </div>
                )}
            </div>
            
            {/* Status bar or additional UI can go here */}
            <div className="status-bar px-6 py-2 bg-gray-50 border-t border-gray-200 text-sm text-gray-600">
                <div className="flex justify-between items-center">
                    <span>
                        Words: {editor.storage.characterCount?.words() || 0} | 
                        Characters: {editor.storage.characterCount?.characters() || 0}
                    </span>
                    <span className="text-xs">
                        {editor.isEditable ? 'Editable' : 'Read-only'}
                    </span>
                </div>
            </div>
        </div>
    );
});

DocumentContext.displayName = 'DocumentContext';

export default DocumentContext;