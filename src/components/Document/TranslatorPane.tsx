import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Languages, GripVertical, Copy, Check, ArrowRightLeft, Loader2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { SUPPORTED_LANGUAGES, translationService } from "@/services/translationService";

interface TranslatorPaneProps {
    editor: Editor | null;
    isOpen: boolean;
    onClose: () => void;
    initialText?: string; // Text to translate when opened
}

export default function TranslatorPane({ editor, isOpen, onClose, initialText }: TranslatorPaneProps) {
    const [sourceText, setSourceText] = useState("");
    const [translatedText, setTranslatedText] = useState("");
    const [targetLanguage, setTargetLanguage] = useState("es"); // Default: Spanish
    const [isTranslating, setIsTranslating] = useState(false);
    const [copied, setCopied] = useState(false);

    // Dragging state
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef<{ x: number; y: number; panelX: number; panelY: number } | null>(null);

    // Initialize position to right side on first open
    useEffect(() => {
        if (isOpen && position === null) {
            const padding = 16;
            const panelWidth = 400;
            const panelHeight = 500;
            setPosition({
                x: window.innerWidth - panelWidth - padding,
                y: window.innerHeight - panelHeight - padding
            });
        }
    }, [isOpen, position]);

    // Set initial text when panel opens
    useEffect(() => {
        if (isOpen && initialText) {
            setSourceText(initialText);
            setTranslatedText("");
            setCopied(false);
        }
    }, [isOpen, initialText]);

    // Get selected text from editor
    const getSelectedText = useCallback(() => {
        if (!editor) return "";
        const { from, to } = editor.state.selection;
        return editor.state.doc.textBetween(from, to, " ");
    }, [editor]);

    // Load selected text button handler
    const handleLoadSelection = () => {
        const selected = getSelectedText();
        if (selected) {
            setSourceText(selected);
            setTranslatedText("");
            setCopied(false);
        }
    };

    // Handle translation
    const handleTranslate = async () => {
        if (!sourceText.trim()) return;

        setIsTranslating(true);
        setTranslatedText("");
        setCopied(false);

        try {
            const result = await translationService.translateText({
                text: sourceText,
                targetLanguage,
            });
            setTranslatedText(result.translatedText);
        } catch (error) {
            console.error("Translation error:", error);
            setTranslatedText("Translation failed. Please try again.");
        } finally {
            setIsTranslating(false);
        }
    };

    // Copy translated text
    const handleCopy = async () => {
        if (!translatedText) return;
        try {
            await navigator.clipboard.writeText(translatedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error("Copy failed:", error);
        }
    };

    // Insert translated text into editor
    const handleInsert = () => {
        if (!editor || !translatedText) return;
        editor.commands.insertContent(translatedText);
        setSourceText("");
        setTranslatedText("");
    };

    // Replace selected text with translation
    const handleReplace = () => {
        if (!editor || !translatedText) return;
        const { from, to } = editor.state.selection;
        if (from !== to) {
            editor.chain().focus().deleteSelection().insertContent(translatedText).run();
        } else {
            editor.commands.insertContent(translatedText);
        }
        setSourceText("");
        setTranslatedText("");
    };

    // Swap languages
    const handleSwap = () => {
        if (!translatedText) return;
        setSourceText(translatedText);
        setTranslatedText("");
        setCopied(false);
    };

    // Dragging handlers
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setIsDragging(true);
        dragStartPos.current = {
            x: e.clientX,
            y: e.clientY,
            panelX: rect.left,
            panelY: rect.top,
        };
    }, []);

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !dragStartPos.current || !containerRef.current) return;

        const deltaX = e.clientX - dragStartPos.current.x;
        const deltaY = e.clientY - dragStartPos.current.y;
        let newX = dragStartPos.current.panelX + deltaX;
        let newY = dragStartPos.current.panelY + deltaY;

        const panel = containerRef.current;
        const panelRect = panel.getBoundingClientRect();
        const tiptapContainer = document.querySelector('.tiptap-container');

        if (tiptapContainer) {
            const containerRect = tiptapContainer.getBoundingClientRect();
            newX = Math.max(containerRect.left, Math.min(newX, containerRect.right - panelRect.width));
            newY = Math.max(containerRect.top, Math.min(newY, containerRect.bottom - panelRect.height));
        }

        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartPos.current = null;
    }, []);

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleDragMove);
            document.addEventListener('mouseup', handleDragEnd);
            return () => {
                document.removeEventListener('mousemove', handleDragMove);
                document.removeEventListener('mouseup', handleDragEnd);
            };
        }
    }, [isDragging, handleDragMove, handleDragEnd]);

    if (!isOpen) return null;

    const positionStyle = position
        ? {
            position: 'fixed' as const,
            left: `${position.x}px`,
            top: `${position.y}px`,
            right: 'auto',
            bottom: 'auto',
        }
        : {
            position: 'fixed' as const,
            right: '16px',
            bottom: '16px',
        };

    return (
        <div
            ref={containerRef}
            className="w-[400px] bg-white border border-gray-200 rounded-lg shadow-xl z-30"
            style={positionStyle}
        >
            {/* Header with drag handle */}
            <div
                className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-grab active:cursor-grabbing"
                onMouseDown={handleDragStart}
            >
                <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Languages className="w-4 h-4 text-blue-600" />
                        Translator
                    </h3>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                {/* Language Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 uppercase">
                        Translate To
                    </label>
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
                        <SelectTrigger className="w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {SUPPORTED_LANGUAGES.map((lang) => (
                                <SelectItem key={lang.code} value={lang.code}>
                                    {lang.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Source Text Input */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-600 uppercase">
                            Text to Translate
                        </label>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLoadSelection}
                            className="h-7 text-xs"
                            disabled={!editor}
                        >
                            Load Selection
                        </Button>
                    </div>
                    <textarea
                        value={sourceText}
                        onChange={(e) => {
                            setSourceText(e.target.value);
                            setTranslatedText("");
                            setCopied(false);
                        }}
                        placeholder="Paste or type text here..."
                        className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                {/* Translate Button */}
                <Button
                    onClick={handleTranslate}
                    disabled={!sourceText.trim() || isTranslating}
                    className="w-full"
                >
                    {isTranslating ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Translating...
                        </>
                    ) : (
                        <>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Translate
                        </>
                    )}
                </Button>

                {/* Translated Text Output */}
                {translatedText && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold text-gray-600 uppercase">
                                Translation
                            </label>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleSwap}
                                    className="h-7 text-xs"
                                    title="Swap translation as source"
                                >
                                    <ArrowRightLeft className="w-3 h-3" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopy}
                                    className="h-7 text-xs"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3 h-3 mr-1" />
                                            Copied
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3 h-3 mr-1" />
                                            Copy
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm text-gray-800 min-h-[80px]">
                            {translatedText}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleInsert}
                                className="flex-1"
                            >
                                Insert at Cursor
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleReplace}
                                className="flex-1"
                            >
                                Replace Selection
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
