import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronRight, ChevronDown } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface HeadingNode {
    level: number;
    text: string;
    position: number;
    id: string;
}

interface NavigationPaneProps {
    editor: Editor | null;
    isOpen: boolean;
    onClose: () => void;
}

export default function NavigationPane({ editor, isOpen, onClose }: NavigationPaneProps) {
    const [headings, setHeadings] = useState<HeadingNode[]>([]);
    const [collapsedLevels, setCollapsedLevels] = useState<Set<string>>(new Set());

    // Extract headings from the document
    useEffect(() => {
        if (!editor || !isOpen) return;

        const extractHeadings = () => {
            const doc = editor.state.doc;
            const newHeadings: HeadingNode[] = [];
            let headingCounter = 0;

            doc.descendants((node, pos) => {
                if (node.type.name === "heading") {
                    const level = node.attrs.level || 1;
                    const text = node.textContent;
                    const id = `heading-${headingCounter++}`;

                    newHeadings.push({
                        level,
                        text: text || `Heading ${level}`,
                        position: pos,
                        id,
                    });
                }
            });

            setHeadings(newHeadings);
        };

        extractHeadings();

        // Listen for content updates
        const updateHandler = () => {
            extractHeadings();
        };

        editor.on("update", updateHandler);

        return () => {
            editor.off("update", updateHandler);
        };
    }, [editor, isOpen]);

    const handleNavigateToHeading = (position: number) => {
        if (!editor) return;

        // Set selection to the heading position
        editor.commands.setTextSelection(position);
        editor.commands.focus();

        // Scroll to the heading with more upward offset for better visibility
        const { view } = editor;
        const coords = view.coordsAtPos(position);

        if (coords) {
            const editorElement = view.dom.parentElement;
            if (editorElement) {
                const offset = coords.top - editorElement.getBoundingClientRect().top;
                // Increased offset from 100 to 200 for better visibility
                editorElement.scrollTo({
                    top: editorElement.scrollTop + offset - 200,
                    behavior: "smooth",
                });
            }
        }
    };

    const toggleCollapse = (id: string) => {
        setCollapsedLevels((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    // Group headings by hierarchy
    const renderHeadingTree = () => {
        if (headings.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500 text-sm">
                    No headings found in document.
                    <br />
                    Add headings to see them here.
                </div>
            );
        }

        return headings.map((heading, index) => {
            const isCollapsed = collapsedLevels.has(heading.id);
            const nextHeading = headings[index + 1];
            const hasChildren = nextHeading && nextHeading.level > heading.level;

            return (
                <div key={heading.id}>
                    <div
                        className="group flex items-center hover:bg-gray-100 rounded-md transition-colors cursor-pointer"
                        style={{ paddingLeft: `${(heading.level - 1) * 16 + 8}px` }}
                    >
                        {hasChildren && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleCollapse(heading.id);
                                }}
                                className="p-1 hover:bg-gray-200 rounded"
                            >
                                {isCollapsed ? (
                                    <ChevronRight className="w-3 h-3 text-gray-500" />
                                ) : (
                                    <ChevronDown className="w-3 h-3 text-gray-500" />
                                )}
                            </button>
                        )}
                        <button
                            onClick={() => handleNavigateToHeading(heading.position)}
                            className="flex-1 text-left py-2 px-2 text-sm truncate"
                            style={{
                                fontSize: heading.level === 1 ? "14px" : heading.level === 2 ? "13px" : "12px",
                                fontWeight: heading.level === 1 ? 600 : heading.level === 2 ? 500 : 400,
                            }}
                        >
                            {heading.text}
                        </button>
                    </div>
                </div>
            );
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed left-6 top-[180px] bottom-6 w-72 bg-white border border-gray-200 rounded-xl shadow-2xl z-30 flex flex-col">
            {/* Header with gradient background */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-t-xl">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Navigation
                </h3>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="h-6 w-6 p-0 text-gray-500 hover:text-gray-700 hover:bg-white rounded-md"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Headings List with better scrollbar */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3 bg-gray-50/50">
                {renderHeadingTree()}
            </div>

        </div>
    );
}
