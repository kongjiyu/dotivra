import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText } from "lucide-react";
import { useEditor, EditorContent } from '@tiptap/react';
import { useEffect } from 'react';
import { getTipTapExtensions } from '@/config/tiptap-config';

interface VersionEntry {
    id: string;
    timestamp: number;
    action: string;
    content: string;
    contentLength: number;
    version?: string;
    changes?: {
        added: number;
        removed: number;
    };
}

interface ContentSectionProps {
    version: VersionEntry | null;
}

export default function ContentSection({ version }: ContentSectionProps) {
    // Initialize read-only TipTap editor
    const editor = useEditor({
        extensions: getTipTapExtensions(),
        editable: false,
        content: '',
    });

    // Update editor content when version changes
    useEffect(() => {
        if (editor && version) {
            editor.commands.setContent(version.content || '');
        }
    }, [editor, version]);

    if (!version) {
        return (
            <Card className="h-full border-none shadow-none rounded-none">
                <CardContent className="flex items-center justify-center h-full">
                    <div className="text-center text-gray-500">
                        <FileText className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">No version selected</p>
                        <p className="text-sm mt-2">Click on a version to view its content</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="h-full border-none shadow-none rounded-none flex flex-col">
            <CardContent className="flex-1 p-0 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-6">
                        <EditorContent 
                            editor={editor} 
                            className="prose prose-sm max-w-none tiptap-readonly"
                        />
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
