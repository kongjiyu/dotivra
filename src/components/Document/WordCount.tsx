import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { X, FileText, Type, GripVertical } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface WordCountProps {
    editor: Editor | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function WordCount({ editor, isOpen, onClose }: WordCountProps) {
    const [stats, setStats] = useState({
        characters: 0,
        charactersWithSpaces: 0,
        words: 0
    });

    // Dragging state
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartPos = useRef<{ x: number; y: number; panelX: number; panelY: number } | null>(null);

    // Initialize position to bottom-left on first open (matching ToolBar default position)
    useEffect(() => {
        if (isOpen && position === null) {
            // Set default position to bottom-left with same spacing as ToolBar
            // Fixed position at left: 16px, bottom: 16px from viewport
            const padding = 16;
            const panelHeight = 250; // Approximate panel height
            setPosition({
                x: padding,
                y: window.innerHeight - panelHeight - padding
            });
        }
    }, [isOpen, position]);

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

        // Get panel dimensions for boundary checking
        const panel = containerRef.current;
        const panelRect = panel.getBoundingClientRect();

        // Find the tiptap-container boundary
        const tiptapContainer = document.querySelector('.tiptap-container');
        if (tiptapContainer) {
            const containerRect = tiptapContainer.getBoundingClientRect();

            // Clamp position within tiptap-container boundaries
            newX = Math.max(containerRect.left, Math.min(newX, containerRect.right - panelRect.width));
            newY = Math.max(containerRect.top, Math.min(newY, containerRect.bottom - panelRect.height));
        }

        setPosition({ x: newX, y: newY });
    }, [isDragging]);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartPos.current = null;
    }, []);

    // Set up drag event listeners
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

    useEffect(() => {
        if (!editor || !isOpen) return;

        const calculateStats = () => {
            const text = editor.getText();

            // Character count (without spaces)
            const characters = text.replace(/\s/g, "").length;

            // Character count (with spaces)
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

    // Determine position style
    const positionStyle = position
        ? {
            position: 'fixed' as const,
            left: `${position.x}px`,
            top: `${position.y}px`,
            right: 'auto',
            bottom: 'auto',
        }
        : {
            // Default to bottom-left if position not calculated yet
            position: 'fixed' as const,
            left: '24px',
            bottom: '24px',
        };

    return (
        <div
            ref={containerRef}
            className="w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-30"
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
                        <FileText className="w-4 h-4 text-blue-600" />
                        Word Count
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

            {/* Stats */}
            <div className="p-4 space-y-4">
                {/* Primary Stats */}
                <div className="space-y-3">
                    <StatRow
                        icon={<Type className="w-4 h-4 text-blue-600" />}
                        label="Words"
                        value={stats.words.toLocaleString()}
                        highlight
                    />
                    <StatRow
                        icon={<FileText className="w-4 h-4 text-gray-600" />}
                        label="Characters (no spaces)"
                        value={stats.characters.toLocaleString()}
                    />
                    <StatRow
                        icon={<FileText className="w-4 h-4 text-gray-600" />}
                        label="Characters (with spaces)"
                        value={stats.charactersWithSpaces.toLocaleString()}
                    />
                </div>


            </div>


        </div>
    );
}

interface StatRowProps {
    icon?: React.ReactNode;
    label: string;
    value: string;
    subtext?: string;
    highlight?: boolean;
}

function StatRow({ icon, label, value, subtext, highlight }: StatRowProps) {
    return (
        <div
            className={`flex items-center justify-between ${highlight ? "bg-blue-50 -mx-2 px-2 py-2 rounded" : ""
                }`}
        >
            <div className="flex items-center gap-2">
                {icon}
                <div>
                    <span className={`text-sm ${highlight ? "font-semibold text-gray-900" : "text-gray-700"}`}>
                        {label}
                    </span>
                    {subtext && <p className="text-xs text-gray-500">{subtext}</p>}
                </div>
            </div>
            <span className={`text-sm font-semibold ${highlight ? "text-blue-600" : "text-gray-900"}`}>
                {value}
            </span>
        </div>
    );
}
