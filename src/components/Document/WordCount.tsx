import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, FileText, Type } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface WordCountProps {
    editor: Editor | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function WordCount({ editor, isOpen, onClose }: WordCountProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    const [stats, setStats] = useState({
        characters: 0,
        charactersWithSpaces: 0,
        words: 0
    });

    // Calculate stats whenever editor content changes
    useEffect(() => {
        if (!editor || !isOpen) return;

        const calculateStats = () => {
            const text = editor.getText();

            // Character count without spaces
            const characters = text.replace(/\s/g, "").length;

            // Character count with spaces
            const charactersWithSpaces = text.length;

            // Word count (split by whitespace and filter empty strings)
            const words = text
                .split(/\s+/)
                .filter((word) => word.length > 0).length;

            setStats({
                characters,
                charactersWithSpaces,
                words
            });
        };

        calculateStats();

        // Listen for content updates
        const updateHandler = () => {
            calculateStats();
        };

        editor.on("update", updateHandler);

        return () => {
            editor.off("update", updateHandler);
        };
    }, [editor, isOpen]);

    if (!isOpen) return null;

    return (
        <div
            ref={containerRef}
            className="fixed bottom-6 left-6 w-62 bg-white border border-gray-200 rounded-lg shadow-xl z-30"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 rounded-t-lg border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5 ">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    Word Count
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700"
                >
                    <X className="w-3.5 h-3.5" />
                </Button>
            </div>

            {/* Stats */}
            <div className="p-2.5 space-y-2">
                {/* Primary Stats */}
                <div className="space-y-1.5">
                    <StatRow
                        icon={<Type className="w-3.5 h-3.5 text-blue-600" />}
                        label="Words"
                        value={stats.words.toLocaleString()}
                        highlight
                    />
                    <StatRow
                        icon={<FileText className="w-3.5 h-3.5 text-gray-600" />}
                        label="Characters (no spaces)"
                        value={stats.characters.toLocaleString()}
                    />
                    <StatRow
                        icon={<FileText className="w-3.5 h-3.5 text-gray-600" />}
                        label="Characters (with spaces)"
                        value={stats.charactersWithSpaces.toLocaleString()}
                    />
                </div>
            </div>
        </div>
    );
}

// Helper component for stat rows
interface StatRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    highlight?: boolean;
}

function StatRow({ icon, label, value, highlight }: StatRowProps) {
    return (
        <div
            className={`flex items-center justify-between p-2 rounded-md transition-all text-xs ${highlight
                ? "bg-blue-50 border border-blue-100"
                : "bg-gray-50 hover:bg-gray-100"
                }`}
        >
            <div className="flex items-center gap-1.5">
                {icon}
                <span className="text-gray-700 font-medium">{label}</span>
            </div>
            <span
                className={`text-sm font-bold ${highlight ? "text-blue-600" : "text-gray-900"
                    }`}
            >
                {value}
            </span>
        </div>
    );
}
