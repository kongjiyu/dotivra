import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';

const SimpleAIDemo: React.FC = () => {
    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
        ],
        content: `
            <h1>Simple AI Editor Demo</h1>
            <p>This is a clean editor without any effects.</p>
            <p>You can implement your own character-level cursor system here.</p>
            <p>The editor is ready for your custom AI implementations.</p>
        `,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-6',
            },
        },
    });

    if (!editor) {
        return <div>Loading editor...</div>;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    {/* Header */}
                    <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Clean AI Editor
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            Ready for your custom cursor implementation
                        </p>
                    </div>

                    {/* Editor */}
                    <div className="relative">
                        <EditorContent
                            editor={editor}
                            className="min-h-[500px] bg-white"
                        />
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Character count: {editor.storage.characterCount?.characters() || 0}
                            </div>
                            <div className="text-sm text-gray-500">
                                All effects removed - Ready for implementation
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SimpleAIDemo;