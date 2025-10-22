import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

interface ShortcutKeysProps {
    isOpen: boolean;
    onClose: () => void;
}

interface ShortcutGroup {
    title: string;
    shortcuts: Array<{
        keys: string[];
        description: string;
    }>;
}

export default function ShortcutKeys({ isOpen, onClose }: ShortcutKeysProps) {
    const shortcutGroups: ShortcutGroup[] = [
        {
            title: "General",
            shortcuts: [
                { keys: ["Ctrl", "P"], description: "Print document" },
                { keys: ["Ctrl", "F"], description: "Search and replace" },
                { keys: ["Ctrl", "Z"], description: "Undo" },
                { keys: ["Ctrl", "Y"], description: "Redo" },
                { keys: ["Ctrl", "Shift", "Z"], description: "Redo (alternative)" },
                { keys: ["Esc"], description: "Close dialogs / Cancel AI operations" },
            ],
        },
        {
            title: "Text Formatting",
            shortcuts: [
                { keys: ["Ctrl", "B"], description: "Bold" },
                { keys: ["Ctrl", "I"], description: "Italic" },
                { keys: ["Ctrl", "U"], description: "Underline" },
                { keys: ["Ctrl", "Shift", "X"], description: "Strikethrough" },
                { keys: ["Ctrl", "H"], description: "Highlight" },
            ],
        },
        {
            title: "Paragraph Formatting",
            shortcuts: [
                { keys: ["Ctrl", "Shift", "L"], description: "Align left" },
                { keys: ["Ctrl", "Shift", "E"], description: "Align center" },
                { keys: ["Ctrl", "Shift", "R"], description: "Align right" },
                { keys: ["Ctrl", "Shift", "J"], description: "Justify" },
                { keys: ["Ctrl", "Alt", "0"], description: "Normal text" },
                { keys: ["Ctrl", "Alt", "1"], description: "Heading 1" },
                { keys: ["Ctrl", "Alt", "2"], description: "Heading 2" },
                { keys: ["Ctrl", "Alt", "3"], description: "Heading 3" },
                { keys: ["Ctrl", "Shift", "7"], description: "Numbered list" },
                { keys: ["Ctrl", "Shift", "8"], description: "Bullet list" },
                { keys: ["Ctrl", "Shift", "9"], description: "Task list" },
            ],
        },
        {
            title: "Indentation",
            shortcuts: [
                { keys: ["Tab"], description: "Increase indent" },
                { keys: ["Shift", "Tab"], description: "Decrease indent" },
                { keys: ["Ctrl", "]"], description: "Increase indent (alternative)" },
                { keys: ["Ctrl", "["], description: "Decrease indent (alternative)" },
            ],
        },
        {
            title: "Code & Formatting",
            shortcuts: [
                { keys: ["Ctrl", "Alt", "C"], description: "Insert code block" },
                { keys: ["Ctrl", "Shift", "\\"], description: "Clear formatting" },
            ],
        },
        {
            title: "Tables",
            shortcuts: [
                { keys: ["Tab"], description: "Next cell" },
                { keys: ["Shift", "Tab"], description: "Previous cell" },
                { keys: ["Ctrl", "Shift", "T"], description: "Insert table" },
            ],
        },
        {
            title: "Text Selection",
            shortcuts: [
                { keys: ["Ctrl", "A"], description: "Select all" },
                { keys: ["Shift", "←/→"], description: "Select character" },
                { keys: ["Shift", "↑/↓"], description: "Select line" },
                { keys: ["Ctrl", "Shift", "←/→"], description: "Select word" },
            ],
        },
        {
            title: "Navigation",
            shortcuts: [
                { keys: ["Ctrl", "Home"], description: "Go to document start" },
                { keys: ["Ctrl", "End"], description: "Go to document end" },
                { keys: ["Ctrl", "←/→"], description: "Move by word" },
                { keys: ["Home"], description: "Go to line start" },
                { keys: ["End"], description: "Go to line end" },
            ],
        },
        {
            title: "Search & Replace",
            shortcuts: [
                { keys: ["Ctrl", "F"], description: "Open search" },
                { keys: ["Ctrl", "H"], description: "Open search and replace" },
                { keys: ["Enter"], description: "Next match" },
                { keys: ["Shift", "Enter"], description: "Previous match" },
                { keys: ["Esc"], description: "Close search" },
            ],
        },
    ];

    const renderKey = (key: string) => (
        <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono shadow-sm">
            {key}
        </kbd>
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Keyboard className="w-6 h-6 text-blue-600" />
                        Keyboard Shortcuts
                    </DialogTitle>

                </DialogHeader>

                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {shortcutGroups.map((group, groupIndex) => (
                            <div key={groupIndex} className="space-y-3">
                                <h3 className="font-semibold text-lg text-gray-900 border-b pb-2">
                                    {group.title}
                                </h3>
                                <div className="space-y-2">
                                    {group.shortcuts.map((shortcut, shortcutIndex) => (
                                        <div
                                            key={shortcutIndex}
                                            className="flex items-center justify-between gap-4 py-1"
                                        >
                                            <span className="text-sm text-gray-700 flex-1">
                                                {shortcut.description}
                                            </span>
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {shortcut.keys.map((key, keyIndex) => (
                                                    <span key={keyIndex} className="flex items-center">
                                                        {renderKey(key)}
                                                        {keyIndex < shortcut.keys.length - 1 && (
                                                            <span className="mx-1 text-gray-400">+</span>
                                                        )}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                    <p className="text-xs text-gray-500">
                        <strong>Note:</strong> On Mac, use <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">⌘</kbd> instead of <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Ctrl</kbd>
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
