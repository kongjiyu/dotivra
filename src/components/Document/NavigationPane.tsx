import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
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

        // Listen for content updates - both manual edits and programmatic changes
        const updateHandler = () => {
            extractHeadings();
        };

        const transactionHandler = () => {
            extractHeadings();
        };

        editor.on("update", updateHandler);
        editor.on("transaction", transactionHandler);

        return () => {
            editor.off("update", updateHandler);
            editor.off("transaction", transactionHandler);
        };
    }, [editor, isOpen]);

    const handleNavigateToHeading = (position: number) => {
        if (!editor) return;

        // Focus the heading
        editor.commands.setTextSelection(position);
        editor.commands.focus();

        const { view } = editor;
        const coords = view.coordsAtPos(position);

        if (coords) {
            // Find the editor element in the DOM
            const editorElement = view.dom;
            const editorNode = editorElement.closest('.ProseMirror');
            
            if (editorNode) {
                // Get the node at this position and scroll it into view
                const node = view.domAtPos(position);
                if (node && node.node) {
                    const element = node.node.nodeType === Node.ELEMENT_NODE 
                        ? node.node as HTMLElement
                        : (node.node.parentElement as HTMLElement);
                    
                    if (element) {
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start',
                            inline: 'nearest'
                        });
                    }
                }
            } else {
                // Fallback to window scroll with better offset calculation
                const viewportHeight = window.innerHeight;
                const toolbarHeight = 120; // Approximate toolbar height
                const offset = toolbarHeight + 40; // Additional padding
                
            window.scrollTo({
                    top: window.scrollY + coords.top - offset,
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

        const visibleHeadings: HeadingNode[] = [];
        const parentStack: { heading: HeadingNode; collapsed: boolean }[] = [];

        headings.forEach((heading, index) => {
            // Pop parents that are no longer ancestors
            while (parentStack.length > 0 && parentStack[parentStack.length - 1].heading.level >= heading.level) {
                parentStack.pop();
            }

            // Check if any parent is collapsed
            const isHidden = parentStack.some(parent => parent.collapsed);

            if (!isHidden) {
                visibleHeadings.push(heading);
            }

            // Add current heading to parent stack if it has children
            const nextHeading = headings[index + 1];
            const hasChildren = nextHeading && nextHeading.level > heading.level;
            if (hasChildren) {
                const isCollapsed = collapsedLevels.has(heading.id);
                parentStack.push({ heading, collapsed: isCollapsed });
            }
        });

        return visibleHeadings.map((heading) => {
            const isCollapsed = collapsedLevels.has(heading.id);
            const nextHeading = headings[headings.indexOf(heading) + 1];
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
                        {!hasChildren && <div className="w-6" />}
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
        <div className="h-full w-full bg-white flex flex-col overflow-hidden">
            {/* Header with gradient background */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-blue-50 flex-shrink-0">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                    Document Tabs
                </h3>
            </div>

            {/* Headings List with ScrollArea */}
            <ScrollArea className="flex-1 px-1 py-3 bg-gray-50/50 overflow-y-auto">
                {renderHeadingTree()}
            </ScrollArea>

            </div>
    );
}
