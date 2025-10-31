import type { Editor } from "@tiptap/react";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { TextSelection } from 'prosemirror-state';

/**
 * Safely insert a horizontal rule right after a heading (H1 or H2)
 * without causing ProseMirror "mismatched transaction" errors.
 *
 * Key differences from older versions:
 * - Uses the latest EditorState and View directly (no async timing)
 * - Executes all mutations in a single valid transaction
 * - Prevents duplicate <hr> insertions
 * - Works with autosave / collaborative setups
 */
/**
 * Safe version: applies heading and inserts horizontal rule in ONE transaction.
 * Eliminates all "Applying a mismatched transaction" errors.
 */
export const insertHorizontalLineAfterHeading = (editor: Editor, level: 1 | 2) => {
    if (!editor || editor.isDestroyed) return;
    const { state, view } = editor;
    const { schema } = state;
    const { horizontalRule, heading } = schema.nodes;

    try {
        const { tr } = state;

        // 1️⃣ Replace current block with heading
        const { from, to } = state.selection;
        const attrs = { level };
        tr.setBlockType(from, to, heading, attrs);

        // 2️⃣ Compute after-heading position from that transaction’s mapping
        const mappedAfter = tr.mapping.map(to + 1);

        // 3️⃣ Prevent duplicate HR (check on tr.doc, not editor.state.doc)
        const nextNode = tr.doc.nodeAt(mappedAfter);
        if (nextNode?.type.name === 'horizontalRule') {
            // move cursor after existing HR
            const movePos = mappedAfter + nextNode.nodeSize;
            tr.setSelection(TextSelection.near(tr.doc.resolve(movePos)));
            view.dispatch(tr);
            return;
        }

        // 4️⃣ Insert <hr> and move cursor after it
        const hrNode = horizontalRule.create();
        tr.insert(mappedAfter, hrNode);
        const posAfterHR = mappedAfter + hrNode.nodeSize;
        tr.setSelection(TextSelection.near(tr.doc.resolve(posAfterHR)));

        // 5️⃣ Dispatch the single unified transaction
        view.dispatch(tr);

    } catch (err) {
        console.error('[insertHorizontalLineAfterHeading] failed:', err);
    }
};

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Bold,
    Italic,
    Underline,
    Strikethrough,
    Highlighter,
    Palette,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignJustify,
    List,
    ListOrdered,
    Quote,
    Code,
    MoreHorizontal,
    ChevronDown,
    Table,
    CheckSquare,
    IndentDecrease,
    IndentIncrease,
    Network,
    Eraser,
    Link,
    Minus,
    ImageIcon,
    Sparkles,
} from "lucide-react";
import { TableGridSelector } from "./TableGridSelector";
import { useDocument } from "@/context/DocumentContext";

const FONT_FAMILIES = [
    "Inter", "Arial", "Georgia", "Roboto", "Courier New", "Times New Roman", "Verdana", "Tahoma", "Monospace",
];

// Table Grid Selector Component



const ToolBar = ({
    editor,
    readOnly = false,
    onOpenChat,
    selectedText
}: {
    editor: Editor | null;
    readOnly?: boolean;
    onOpenChat?: (selectedText?: string, isReply?: boolean) => void;
    selectedText?: string;
}) => {

    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
    const [currentFontFamily, setCurrentFontFamily] = useState<string>("Inter");
    const [currentTextColor, setCurrentTextColor] = useState<string>('#000000');
    const [currentBackgroundColor, setCurrentBackgroundColor] = useState<string>('');
    const [tablePopoverOpen, setTablePopoverOpen] = useState(false);

    const [isInPreviewMode, setIsInPreviewMode] = useState(false);
    const [maxIndentLevel, setMaxIndentLevel] = useState<number>(14);

    const containerRef = useRef<HTMLDivElement | null>(null);

    // Calculate dynamic maxIndentLevel based on window width
    // Wider screens can handle more indentation levels without content overflow
    const calculateMaxIndentLevel = (width: number): number => {
        if (width >= 1600) return 18;      // Very wide screens: 18 levels
        if (width >= 1400) return 15;      // Wide screens: 12 levels
        if (width >= 1200) return 12;      // Standard screens: 10 levels
        if (width >= 1000) return 10;       // Medium screens: 8 levels
        if (width >= 800) return 8;        // Small screens: 6 levels
        return 6;                          // Very small screens: 4 levels
    };

    // Check if editing should be disabled - moved to top to avoid hoisting issues
    const isEditingDisabled = readOnly || isInPreviewMode;
    // Get current font attributes and heading state from editor when selection changes
    useEffect(() => {
        if (!editor) return;

        const updateToolbarState = () => {
            // Check if we're in a code block first
            let inMermaidPreview = false;
            const inCodeBlock = editor.isActive('codeBlock');

            if (inCodeBlock) {
                // Get the current DOM element of the active node
                const { from } = editor.state.selection
                const domAtPos = editor.view.domAtPos(from)
                const nodeEl = domAtPos?.node

                // Find the nearest block container (the <pre> or wrapping div)
                const block = (nodeEl instanceof HTMLElement) ? nodeEl.closest('.ProseMirror') : null;

                if (block) {
                    // Now limit queries to the current code block only
                    const mermaidPreviews = block.querySelectorAll(
                        '[data-mermaid-preview="true"], .mermaid-preview, .mermaid-container'
                    )
                    const mermaidErrors = block.querySelectorAll(
                        '[data-mermaid-error="true"], .mermaid-error, .syntax-error, .mermaid-parse-error'
                    )

                    inMermaidPreview = mermaidPreviews.length > 0 || mermaidErrors.length > 0
                }
            }
            // Only disable editing when Mermaid is in preview mode or showing errors
            setIsInPreviewMode(inMermaidPreview);

            // Get text style attributes (font size and family)
            const textStyleAttrs = editor.getAttributes('textStyle');

            // Update font family if set (or disable if in code block)
            if (inCodeBlock) {
                setCurrentFontFamily('');
            } else if (textStyleAttrs.fontFamily) {
                setCurrentFontFamily(textStyleAttrs.fontFamily);
            } else {
                // Check if we're in a heading and get its default font family
                const headingAttrs = editor.getAttributes('heading');
                if (headingAttrs && headingAttrs.level) {
                    // Headings typically use the same font family or inherit
                    setCurrentFontFamily("Inter"); // Default
                } else {
                    setCurrentFontFamily("Inter");
                }
            }

            // Update font size - check both textStyle and heading attributes (or disable if in code block)
            let effectiveFontSize = '16px';

            if (inCodeBlock) {
                setCurrentFontSize('');
            } else if (textStyleAttrs.fontSize) {
                effectiveFontSize = textStyleAttrs.fontSize;
                setCurrentFontSize(effectiveFontSize);
            } else {
                // Check if we're in a heading and set appropriate size
                const headingAttrs = editor.getAttributes('heading');
                if (headingAttrs && headingAttrs.level) {
                    const headingLevel = headingAttrs.level;
                    // Set default heading sizes
                    const headingSizes = {
                        1: '32px', // h1
                        2: '24px', // h2
                        3: '20px', // h3
                        4: '18px', // h4
                        5: '16px', // h5
                        6: '14px', // h6
                    };
                    effectiveFontSize = headingSizes[headingLevel as keyof typeof headingSizes] || '16px';
                } else {
                    // For regular paragraphs, get computed style to get actual font size
                    try {
                        const { state } = editor;
                        const { from } = state.selection;
                        const resolvedPos = state.doc.resolve(from);
                        const node = resolvedPos.parent;

                        if (node && node.type.name === 'paragraph') {
                            // Try to get actual computed font size from DOM
                            const editorElement = (editor.view as any).dom;
                            if (editorElement) {
                                const selection = window.getSelection();
                                if (selection && selection.rangeCount > 0) {
                                    const range = selection.getRangeAt(0);
                                    let element = range.commonAncestorContainer;

                                    if (element.nodeType === Node.TEXT_NODE) {
                                        element = element.parentElement as Element;
                                    }

                                    if (element && element instanceof HTMLElement) {
                                        const computedStyle = window.getComputedStyle(element);
                                        const fontSize = computedStyle.fontSize;
                                        if (fontSize && fontSize !== '16px') {
                                            effectiveFontSize = fontSize;
                                        }
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Fallback to default if there's an error
                        effectiveFontSize = '16px';
                    }

                    if (!textStyleAttrs.fontSize && effectiveFontSize === '16px') {
                        effectiveFontSize = '16px'; // Default paragraph size
                    }
                }
                setCurrentFontSize(effectiveFontSize);
            }

            // Update text color (similar to background color logic)
            let textColor = '#000000'; // Default color
            if (editor.isActive('textStyle')) {
                const styleAttrs = editor.getAttributes('textStyle');
                textColor = styleAttrs.color || '#000000';
            }
            setCurrentTextColor(textColor);

            // Update background color (highlight or table cell background)
            let bgColor = '';
            if (editor.isActive('highlight')) {
                const highlightAttrs = editor.getAttributes('highlight');
                bgColor = highlightAttrs.color || '';
            } else if (editor.isActive('tableCell')) {
                const cellAttrs = editor.getAttributes('tableCell');
                bgColor = cellAttrs.backgroundColor || '';
            }
            setCurrentBackgroundColor(bgColor);
        };

        // Initialize toolbar state immediately when editor becomes available
        updateToolbarState();

        // Listen for selection changes and content updates
        editor.on('selectionUpdate', updateToolbarState);
        editor.on('transaction', updateToolbarState);
        editor.on('focus', updateToolbarState);

        return () => {
            editor.off('selectionUpdate', updateToolbarState);
            editor.off('transaction', updateToolbarState);
            editor.off('focus', updateToolbarState);
        };
    }, [editor]);

    // Track when a code block is selected
    useEffect(() => {
        if (!editor) return;

        const updateCodeBlockState = () => {
            // Code block state tracking (unused for now)
        };

        editor.on('selectionUpdate', updateCodeBlockState);
        editor.on('transaction', updateCodeBlockState);

        return () => {
            editor.off('selectionUpdate', updateCodeBlockState);
            editor.off('transaction', updateCodeBlockState);
        };
    }, [editor]);

    // Control editor editability based on preview mode
    useEffect(() => {
        if (editor) {
            editor.setEditable(!isEditingDisabled);
        }
    }, [editor, isEditingDisabled]);

    // Monitor editor width and update maximum indentation
    useEffect(() => {
        if (!editor) return;

        // Note: Resize monitoring is handled by the bookmark-style hiding useEffect below
    }, [editor]);

    // Width-based responsive toolbar - show/hide sections based on available width
    // Base on window width but adjust for open sidebars (navigation pane: 300px, chat sidebar: 400px)
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
    const [toolbarLeft, setToolbarLeft] = useState('50%');
    const { showNavigationPane, chatSidebarOpen } = useDocument();

    // Calculate available width accounting for sidebars
    const calculateAvailableWidth = () => {
        let availableWidth = window.innerWidth;
        // More aggressive shrinking when both sidebars are open
        if (showNavigationPane && chatSidebarOpen) {
            availableWidth -= 850; // Compound penalty for both sidebars
        } else {
            if (showNavigationPane) availableWidth -= 300; // Navigation pane width
            if (chatSidebarOpen) availableWidth -= 400; // Chat sidebar width
        }
        return availableWidth;
    };

    // Calculate toolbar position based on the document content container (the white page)
    useEffect(() => {
        const updateToolbarPosition = () => {
            // Look for the document-context white page container
            const documentContainer = document.querySelector('.document-context > div > div');
            if (documentContainer) {
                const rect = documentContainer.getBoundingClientRect();
                const centerX = rect.left + (rect.width / 2);
                setToolbarLeft(`${centerX}px`);
            }
        };

        // Initial update and debounced resize handler
        updateToolbarPosition();

        let resizeTimeout: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(updateToolbarPosition, 100);
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        };
    }, [showNavigationPane, chatSidebarOpen]); // Re-calculate when sidebars change

    // Initialize maxIndentLevel based on initial window width
    useEffect(() => {
        const availableWidth = calculateAvailableWidth();
        const initialMaxIndentLevel = calculateMaxIndentLevel(availableWidth);
        setMaxIndentLevel(initialMaxIndentLevel);
    }, []); // Run once on mount

    // Update width when window resizes or sidebars toggle
    useEffect(() => {
        // Throttled resize handler to improve performance and reduce lag
        const handleResize = () => {
            const newWidth = calculateAvailableWidth();

            // Only update if we crossed a breakpoint threshold for smoother performance
            const thresholds = [1400, 1150, 1000, 850, 650];
            const oldThreshold = thresholds.find(t => windowWidth >= t) || 0;
            const newThreshold = thresholds.find(t => newWidth >= t) || 0;

            if (oldThreshold === newThreshold && Math.abs(newWidth - windowWidth) < 50) return;

            // Update maxIndentLevel based on new width
            const newMaxIndentLevel = calculateMaxIndentLevel(newWidth);
            setMaxIndentLevel(newMaxIndentLevel);

            // Calculated width breakpoints based on actual toolbar section sizes
            // Core sections (always visible): Bold, Italic, Underline, Font Size, Font Color, Background Color ~400px
            // More Options button: ~50px, Separators and padding: ~100px, Base requirement: ~550px
            const breakpoints = {
                insertOptions: 1400,    // Insert Options (Table, Diagram, Link) �?200px - hide below 1400px
                textAlign: 1150,        // Text Alignment (4 buttons) �?150px - hide below 1150px  
                clearFormatting: 1000,  // Clear Formatting (1 button) �?40px - hide below 1000px
                indent: 850,            // Indentation (2 buttons) �?100px - hide below 850px (earlier than before)
                lists: 650              // Lists (3 buttons) �?150px - hide below 650px (earlier than before)
            };


            const hasHiddenSections = newWidth < breakpoints.insertOptions ||
                newWidth < breakpoints.textAlign ||
                newWidth < breakpoints.clearFormatting ||
                newWidth < breakpoints.indent ||
                newWidth < breakpoints.lists;

            setWindowWidth(newWidth);
        };

        let debounceTimer: NodeJS.Timeout | null = null;
        let rafId: number | null = null;

        const debouncedResize = () => {
            // Cancel previous requests for smoother performance
            if (debounceTimer) clearTimeout(debounceTimer);
            if (rafId) cancelAnimationFrame(rafId);

            // Immediate visual response
            rafId = requestAnimationFrame(() => {
                handleResize();
                rafId = null;
            });

            // Final cleanup after resize stops
            debounceTimer = setTimeout(() => {
                requestAnimationFrame(() => {
                    handleResize(); // Always update after resize stops
                });
                debounceTimer = null;
            }, 150);
        };

        // Initial calculation
        handleResize();

        // Listen for window resize with optimized debouncing
        window.addEventListener('resize', debouncedResize, { passive: true });

        return () => {
            window.removeEventListener('resize', debouncedResize);
            if (debounceTimer) clearTimeout(debounceTimer);
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, [windowWidth, maxIndentLevel, showNavigationPane, chatSidebarOpen]); // Re-calculate when sidebars change

    // Helper functions to determine section visibility based on available toolbar width
    // Memoize these functions to prevent unnecessary recalculations
    // Optimized breakpoints for toolbar - sections hide progressively as width decreases
    // Calculate available width after accounting for sidebars
    const availableWidth = calculateAvailableWidth();
    const toolbarMaxWidth = Math.min(availableWidth - 40, 1400); // Increased from 900px to 1400px to show all sections

    // Progressive hiding from largest to smallest sections
    // Essential formatting (Bold, Italic, etc.) + Font controls: ~400px
    // Each section adds approximately:
    // - Insert Options (Table, Diagram, Link, Divider): ~220px
    // - Indent controls: ~90px  
    // - Clear Formatting: ~50px
    // - Lists: ~140px
    // - Text Align: ~120px
    // - Font Controls (Family + Size): ~280px
    // - Heading Selector: ~150px

    const shouldShowInsertOptions = useMemo(() => toolbarMaxWidth >= 1400, [toolbarMaxWidth]);
    const shouldShowIndent = useMemo(() => toolbarMaxWidth >= 1300, [toolbarMaxWidth]);
    const shouldShowClearFormatting = useMemo(() => toolbarMaxWidth >= 1100, [toolbarMaxWidth]);
    const shouldShowLists = useMemo(() => toolbarMaxWidth >= 900, [toolbarMaxWidth]);
    const shouldShowTextAlign = useMemo(() => toolbarMaxWidth >= 800, [toolbarMaxWidth]);
    const shouldShowFontControls = useMemo(() => toolbarMaxWidth >= 650, [toolbarMaxWidth]);
    const shouldShowHeadingSelector = useMemo(() => toolbarMaxWidth >= 500, [toolbarMaxWidth]);

    // Show more options when ANY section is hidden
    const shouldShowMoreOptions = useMemo(() => {
        const showMore = !shouldShowInsertOptions || !shouldShowTextAlign || !shouldShowClearFormatting ||
            !shouldShowIndent || !shouldShowLists || !shouldShowFontControls || !shouldShowHeadingSelector;

        return showMore;
    }, [toolbarMaxWidth, availableWidth, shouldShowInsertOptions, shouldShowTextAlign, shouldShowClearFormatting, shouldShowIndent,
        shouldShowLists, shouldShowFontControls, shouldShowHeadingSelector]
    );

    // Add keyboard shortcut handlers for indentation with dynamic limits
    useEffect(() => {
        if (!editor) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Tab') return; // Ignore all other keys
            event.preventDefault(); // Prevent default tab behavior (moved to be conditional)

            // Tab pressed
            if (isEditingDisabled) {
                return; // Don’t prevent default
            }

            if (event.shiftKey) {
                // Shift + Tab = Outdent
                if (editor.isActive('paragraph')) {
                    editor.chain().focus().outdentParagraph().run();
                } else if (editor.isActive('heading')) {
                    editor.chain().focus().outdentHeading().run();
                }
            } else {
                // Tab = Indent - check max level same as button logic
                if (editor.isActive('paragraph')) {
                    // Check current indent level against maxIndentLevel (same as button logic)
                    const attrs = editor.getAttributes('paragraph');
                    const currentLevel = attrs.indent || 0;

                    // Only indent if below maximum level (same check as indent button)
                    if (currentLevel < maxIndentLevel) {
                        editor.chain().focus().indentParagraph().run();
                    }
                } else if (editor.isActive('heading')) {
                    // Check current indent level against maxIndentLevel (same as button logic)
                    const attrs = editor.getAttributes('heading');
                    const currentLevel = attrs.indent || 0;

                    // Only indent if below maximum level (same check as indent button)
                    if (currentLevel < maxIndentLevel) {
                        editor.chain().focus().indentHeading().run();
                    }
                }
            }

        };


        const editorElement = editor.view ? (editor.view as any).dom : null;
        if (editorElement) {
            editorElement.addEventListener('keydown', handleKeyDown);

            return () => {
                editorElement.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [editor, isEditingDisabled, maxIndentLevel]);

    if (!editor) return <div>No editor available</div>;

    // Helper for active state
    const isActive = (name: string, attrs?: any) => editor.isActive(name, attrs);

    // Close the dropdown when clicking outside without blocking scroll via overlays
    useEffect(() => {
        const onDocMouseDown = (e: MouseEvent) => {
            if (!showMoreOptions) return;
            const el = containerRef.current;
            if (el && !el.contains(e.target as Node)) {
                setShowMoreOptions(false);
            }
        };
        document.addEventListener('mousedown', onDocMouseDown);
        return () => document.removeEventListener('mousedown', onDocMouseDown);
    }, [showMoreOptions]);

    // Font size input handling with typing state
    const [fontSizeInput, setFontSizeInput] = useState<string>('16');
    const [isTyping, setIsTyping] = useState(false);

    // Sync input field with current font size only when not typing
    useEffect(() => {
        if (!isTyping && currentFontSize && !isEditingDisabled) {
            const sizeMatch = currentFontSize.match(/^(\d+)px$/);
            const displaySize = sizeMatch ? sizeMatch[1] : '16';
            setFontSizeInput(displaySize);
        } else if (isEditingDisabled) {
            setFontSizeInput('');
        }
    }, [currentFontSize, isEditingDisabled, isTyping]);

    // Initialize font size on editor load
    useEffect(() => {
        if (editor && !isEditingDisabled) {
            // Delay to ensure editor is fully initialized
            const timeoutId = setTimeout(() => {
                // Get current font attributes immediately
                const textStyleAttrs = editor.getAttributes('textStyle');
                if (textStyleAttrs.fontSize) {
                    setCurrentFontSize(textStyleAttrs.fontSize);
                } else {
                    // Check if we're in a heading for proper initialization
                    const headingAttrs = editor.getAttributes('heading');
                    if (headingAttrs && headingAttrs.level) {
                        const headingSizes = {
                            1: '32px', 2: '24px', 3: '20px', 4: '18px', 5: '16px', 6: '14px',
                        };
                        const size = headingSizes[headingAttrs.level as keyof typeof headingSizes] || '16px';
                        setCurrentFontSize(size);
                    } else {
                        setCurrentFontSize('16px');
                    }
                }
            }, 100);

            return () => clearTimeout(timeoutId);
        }
    }, [editor, isEditingDisabled]);

    // Apply font size with simple validation
    const applyFontSize = (sizeStr: string) => {
        if (isEditingDisabled) return; // Don't apply if editing is disabled

        const size = parseInt(sizeStr, 10);

        // Simple validation
        if (isNaN(size) || size < 1) {
            return; // Invalid input, don't apply
        }

        const newSize = `${size}px`;
        setFontSizeInput(size.toString());
        setCurrentFontSize(newSize);

        // Apply to editor
        if (editor) {
            editor.chain().focus().setFontSize(newSize).run();
        }
    };

    // Handle input changes with typing state
    const handleFontSizeChange = (value: string) => {
        setIsTyping(true);
        setFontSizeInput(value);
    };

    const handleFontSizeBlur = () => {
        setIsTyping(false);
        applyFontSize(fontSizeInput);
    };

    const handleFontSizeKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsTyping(false);
            applyFontSize(fontSizeInput);
            (e.target as HTMLInputElement).blur();
        }
        if (e.key === 'Escape') {
            setIsTyping(false);
            // Reset to current font size
            const sizeMatch = currentFontSize.match(/^(\d+)px$/);
            const currentDisplaySize = sizeMatch ? sizeMatch[1] : '16';
            setFontSizeInput(currentDisplaySize);
            (e.target as HTMLInputElement).blur();
        }
    };

    // Helper function to determine dropdown alignment based on toolbar position
    const getDropdownAlignment = useCallback((): { side: 'top' | 'bottom' | 'left' | 'right'; align: 'start' | 'center' | 'end' } => {
        // Always horizontal mode, toolbar at top-center
        return { side: 'bottom', align: 'end' };
    }, []);

    // Memoize dropdown alignment to avoid recalculating on every render
    const dropdownAlignment = useMemo(() => getDropdownAlignment(), [getDropdownAlignment, showMoreOptions]);

    return (
        <>
            <div
                ref={containerRef}
                className="toolbar fixed top-[152px] z-50 flex items-center gap-0 p-1.5 rounded-md border border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg overflow-hidden"
                style={{
                    left: toolbarLeft,
                    transform: 'translateX(-50%)',
                    width: 'fit-content',
                    minWidth: '200px',
                    maxWidth: `${toolbarMaxWidth}px`, // Adjusted for sidebars
                    flexWrap: 'nowrap' // Prevent wrapping - hide sections in More Options instead
                }}
            >

                {/* ESSENTIAL FORMATTING - Always visible */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                    {/* Basic Text Formatting */}
                    <Button variant="outline" size="sm"
                        onClick={() => {
                            if (!isEditingDisabled) {
                                editor.chain().focus().toggleBold().run();
                            }
                        }}
                        disabled={isEditingDisabled}
                        className={`h-7 w-7 p-0 ${isActive('bold') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            } ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Bold"
                    >
                        <Bold className="w-3.5 h-3.5" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`h-7 w-7 p-0 ${isActive('italic') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Italic"
                    >
                        <Italic className="w-3.5 h-3.5" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`h-7 w-7 p-0 ${isActive('underline') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Underline"
                    >
                        <Underline className="w-3.5 h-3.5" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`h-7 w-7 p-0 ${isActive('strike') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-3.5 h-3.5" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().toggleCode().run()}
                        className={`h-7 w-7 p-0 ${isActive('code') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Inline Code"
                    >
                        <Code className="w-3.5 h-3.5" />
                    </Button>

                    {/* Ask AI button - opens chat with selected text */}
                    {onOpenChat && selectedText && (
                        <>
                            <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onOpenChat(selectedText)}
                                className="h-7 px-2 bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 hover:border-purple-300"
                                title="Ask AI about selected text"
                            >
                                <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                                <span className="text-xs font-medium text-purple-700">Ask AI</span>
                            </Button>
                        </>
                    )}

                    {shouldShowHeadingSelector && <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* Headings & Blocks Dropdown */}
                    {shouldShowHeadingSelector && (
                        <Select
                            value={
                                isActive('heading', { level: 1 }) ? 'h1' :
                                    isActive('heading', { level: 2 }) ? 'h2' :
                                        isActive('heading', { level: 3 }) ? 'h3' :
                                            isActive('heading', { level: 4 }) ? 'h4' :
                                                isActive('heading', { level: 5 }) ? 'h5' :
                                                    isActive('blockquote') ? 'blockquote' :
                                                        isActive('codeBlock') ? 'codeBlock' : 'paragraph'
                            }
                            onValueChange={(value) => {
                                // Get current selection
                                const { state } = editor;
                                const { from, to } = state.selection;
                                const hasSelection = from !== to;

                                // Helper to apply a block type to the current selection or block
                                const applyBlockType = (target: 'paragraph' | 'blockquote' | 'codeBlock' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5') => {
                                    // Store the original selection range
                                    const originalFrom = from;
                                    const originalTo = to;

                                    if (!hasSelection) {
                                        // No selection - apply to current block
                                        const c = editor.chain().focus();

                                        // Clear conflicting types first
                                        if (target !== 'codeBlock' && editor.isActive('codeBlock')) c.toggleCodeBlock();
                                        if (target !== 'blockquote' && editor.isActive('blockquote')) c.toggleBlockquote();
                                        if (target === 'paragraph' && editor.isActive('heading')) c.setParagraph();

                                        switch (target) {
                                            case 'paragraph':
                                                c.setParagraph();
                                                break;
                                            case 'blockquote':
                                                c.setBlockquote();
                                                break;
                                            case 'codeBlock':
                                                c.setCodeBlock();
                                                break;
                                            case 'h1':
                                                insertHorizontalLineAfterHeading(editor, 1);
                                                break;
                                            case 'h2':
                                                insertHorizontalLineAfterHeading(editor, 2);
                                                break;
                                            case 'h3':
                                                c.setHeading({ level: 3 });
                                                break;
                                            case 'h4':
                                                c.setHeading({ level: 4 });
                                                break;
                                            case 'h5':
                                                c.setHeading({ level: 5 });
                                                break;
                                        }
                                        c.run();
                                    } else {
                                        // Has selection - apply to all blocks in selection
                                        const chain = editor.chain().focus();

                                        // Use setNode for block types which will apply to all selected blocks
                                        switch (target) {
                                            case 'paragraph':
                                                chain.setParagraph();
                                                break;
                                            case 'blockquote':
                                                // First convert to paragraphs, then wrap in blockquote
                                                chain.setParagraph().setBlockquote();
                                                break;
                                            case 'codeBlock':
                                                chain.setCodeBlock();
                                                break;
                                            case 'h1':
                                            case 'h2':
                                                // For H1/H2, set heading and then add HR
                                                const headingLevel = parseInt(target.charAt(1)) as 1 | 2;
                                                chain.setHeading({ level: headingLevel });
                                                chain.run();

                                                // Insert HR after the heading
                                                requestAnimationFrame(() => {
                                                    try {
                                                        const { state } = editor;
                                                        const { $from } = state.selection;

                                                        // Get position after the heading
                                                        const afterHeadingPos = $from.after();

                                                        if (afterHeadingPos < state.doc.content.size) {
                                                            const $after = state.doc.resolve(afterHeadingPos);
                                                            const nextNode = $after.nodeAfter;

                                                            if (!nextNode || nextNode.type.name !== 'horizontalRule') {
                                                                editor.chain()
                                                                    .setTextSelection(afterHeadingPos)
                                                                    .insertContent({ type: 'horizontalRule' })
                                                                    .run();
                                                            }
                                                        }
                                                    } catch (error) {
                                                        console.error('Error inserting horizontal rule:', error);
                                                    }
                                                });
                                                break;
                                            default:
                                                // For other headings (H3-H5), no HR
                                                const level = parseInt(target.charAt(1)) as 3 | 4 | 5;
                                                chain.setHeading({ level });
                                                break;
                                        }

                                        // Run the command
                                        chain.run();

                                        // Restore the text selection after applying block type
                                        // Use requestAnimationFrame to ensure dropdown is closed first
                                        requestAnimationFrame(() => {
                                            requestAnimationFrame(() => {
                                                editor.chain().focus().setTextSelection({ from: originalFrom, to: originalTo }).run();
                                            });
                                        });
                                    }
                                };

                                // Apply the selected block type
                                if (value === 'paragraph' || value === 'h1' || value === 'h2' || value === 'h3' || value === 'h4' || value === 'h5' || value === 'blockquote' || value === 'codeBlock') {
                                    applyBlockType(value as any);
                                }
                            }}
                        >
                            <SelectTrigger data-size="" className="w-[120px] h-7 text-xs">
                                <SelectValue>
                                    {/* Full text display in horizontal mode */}
                                    <>
                                        {isActive('heading', { level: 1 }) && "Heading 1"}
                                        {isActive('heading', { level: 2 }) && "Heading 2"}
                                        {isActive('heading', { level: 3 }) && "Heading 3"}
                                        {isActive('heading', { level: 4 }) && "Heading 4"}
                                        {isActive('heading', { level: 5 }) && "Heading 5"}
                                        {isActive('blockquote') && "Quote"}
                                        {isActive('codeBlock') && "Code Block"}
                                        {(!isActive('heading') && !isActive('blockquote') && !isActive('codeBlock')) && "Paragraph"}
                                    </>
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="paragraph">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-normal">P</span>
                                        <span>Paragraph</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="h1">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold">H1</span>
                                        <span>Heading 1</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="h2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-base font-bold">H2</span>
                                        <span>Heading 2</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="h3">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold">H3</span>
                                        <span>Heading 3</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="h4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">H4</span>
                                        <span>Heading 4</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="h5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold">H5</span>
                                        <span>Heading 5</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="blockquote">
                                    <div className="flex items-center gap-2">
                                        <Quote className="w-3.5 h-3.5" />
                                        <span>Quote</span>
                                    </div>
                                </SelectItem>
                                <SelectItem value="codeBlock">
                                    <div className="flex items-center gap-2">
                                        <Code className="w-3.5 h-3.5" />
                                        <span>Code Block</span>
                                    </div>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    )}

                    {shouldShowFontControls && <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* Font Styling - Bookmark-style hiding */}
                    {shouldShowFontControls && ( // Font family always visible
                        <div className={`flex items-center gap-0.5`}>
                            {/* Horizontal mode: Dropdown selector */}
                            <Select
                                value={isEditingDisabled ? '' : currentFontFamily}
                                onValueChange={(value) => {
                                    if (!isEditingDisabled) {
                                        editor.chain().focus().setFontFamily(value).run();
                                        setCurrentFontFamily(value);
                                    }
                                }}
                                disabled={isEditingDisabled}
                            >
                                <SelectTrigger data-size="" className={`w-[140px] h-7.5 text-xs ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <SelectValue placeholder={isEditingDisabled ? '' : currentFontFamily} />
                                </SelectTrigger>
                                <SelectContent side="bottom">
                                    {FONT_FAMILIES.map(f => (
                                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {shouldShowFontControls && ( // Font size always visible
                        <div className={`flex items-center gap-0.5`}>
                            {/* Font Size Input with Dropdown - Horizontal mode: full input + dropdown */}
                            <div className="relative flex items-center">
                                <input
                                    type="text"
                                    value={isEditingDisabled ? '' : fontSizeInput}
                                    onChange={(e) => {
                                        if (!isEditingDisabled) {
                                            handleFontSizeChange(e.target.value);
                                        }
                                    }}
                                    onKeyDown={handleFontSizeKeyDown}
                                    onBlur={handleFontSizeBlur}
                                    onFocus={() => setIsTyping(true)}
                                    disabled={isEditingDisabled}
                                    placeholder={isEditingDisabled ? '' : '16'}
                                    className={`w-14 h-7.5 text-xs text-center border border-gray-300 rounded-l-md bg-white mr-0
                                       ${isEditingDisabled ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:border-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200'}`}
                                />
                                <Select
                                    value={isEditingDisabled ? '' : fontSizeInput}
                                    onValueChange={(value) => {
                                        if (!isEditingDisabled) {
                                            setIsTyping(false);
                                            applyFontSize(value);
                                        }
                                    }}
                                    disabled={isEditingDisabled}
                                >
                                    <SelectTrigger className={`h-7.5 w-6 border border-l-0 border-gray-300 rounded-l-none rounded-r-md bg-white p-0 flex items-center justify-center [&>svg]:w-3 [&>svg]:h-3
   ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : 'outline-none focus:ring-offset-0 focus:outline-none hover:bg-gray-50 focus:border-blue-400 focus:ring-1 focus:ring-blue-200'}`} data-size="">
                                    </SelectTrigger>
                                    <SelectContent align="center" side="bottom" className="w-20">
                                        {['4', '6', '8', '10', '12', '16', '20', '24', '28', '36', '48', '64', '72', '96'].map(size => (
                                            <SelectItem key={size} value={size}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    {shouldShowFontControls && ( // Text color always visible
                        <div className={`flex items-center gap-0.5`}>
                            <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>

                            {/* Text Color with current color indicator */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="h-7 w-7 p-0  flex flex-col justify-center items-center relative">
                                        <Button variant="outline" size="sm"
                                            className="h-6.5 w-7 bg-white hover:bg-gray-50"
                                            title="Text Color"
                                            disabled={isEditingDisabled}
                                        >
                                            <Highlighter className="w-3 h-3"
                                                style={{
                                                    color: isEditingDisabled ? 'transparent' : (currentTextColor || '#ffffff'),
                                                }} />
                                        </Button>
                                        <div
                                            className="w-5 h-0.5 mt-0.5 p-[1px] rounded-sm border border-gray-300"
                                            style={{
                                                backgroundColor: isEditingDisabled ? 'transparent' : currentTextColor,
                                                borderColor: currentTextColor ? 'transparent' : '#d1d5db'
                                            }}
                                        />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-4" side="bottom" align="center">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-700">Text Color</h4>

                                        {/* Default Color */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="w-8 h-7 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
                                                onClick={() => {
                                                    if (!isEditingDisabled) {
                                                        editor.chain().focus().unsetColor().run();

                                                        // Update state immediately and verify after operation
                                                        setCurrentTextColor('#000000');

                                                        // Double-check the actual state after a brief delay
                                                        setTimeout(() => {
                                                            if (editor.isActive('textStyle')) {
                                                                const styleAttrs = editor.getAttributes('textStyle');
                                                                const actualColor = styleAttrs.color || '#000000';
                                                                setCurrentTextColor(actualColor);
                                                            } else {
                                                                setCurrentTextColor('#000000');
                                                            }
                                                        }, 100);
                                                    }
                                                }}
                                                title="Default (Auto)"
                                            >
                                                A
                                            </button>
                                            <span className="text-xs text-gray-500">Default</span>
                                        </div>

                                        {/* 8 Most Popular Colors for Light Theme */}
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">Popular Colors</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { color: '#000000', name: 'Black' },
                                                    { color: '#6B7280', name: 'Gray' },
                                                    { color: '#DC2626', name: 'Red' },
                                                    { color: '#2563EB', name: 'Blue' },
                                                    { color: '#059669', name: 'Green' },
                                                    { color: '#D97706', name: 'Orange' },
                                                    { color: '#7C2D12', name: 'Brown' },
                                                    { color: '#7C3AED', name: 'Purple' }
                                                ].map(({ color, name }) => (
                                                    <button
                                                        key={color}
                                                        className="w-10 h-10 rounded-lg border-2 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
                                                        style={{
                                                            backgroundColor: `${color}20`, // 20 = ~12% opacity
                                                            borderColor: color
                                                        }}
                                                        onClick={() => {
                                                            if (!isEditingDisabled) {
                                                                editor.chain().focus().setColor(color).run();

                                                                // Update state immediately
                                                                setCurrentTextColor(color);

                                                                // Verify the actual state after operation completes
                                                                setTimeout(() => {
                                                                    if (editor.isActive('textStyle')) {
                                                                        const styleAttrs = editor.getAttributes('textStyle');
                                                                        const actualColor = styleAttrs.color || '#000000';
                                                                        setCurrentTextColor(actualColor);
                                                                    } else {
                                                                        // If textStyle is not active, the color should be default
                                                                        setCurrentTextColor('#000000');
                                                                    }
                                                                }, 100);
                                                            }
                                                        }}
                                                        title={name}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {/* Background Color with current color indicator */}
                    {shouldShowFontControls && ( // Background color always visible
                        <div className={`flex items-center gap-0.5`}>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="h-7 w-7 p-0 flex flex-col justify-center items-center relative">
                                        <Button variant="outline" size="sm"
                                            className="w-7 h-6.5 bg-white hover:bg-gray-50"
                                            title="Background Color"
                                            disabled={isEditingDisabled}
                                            style={{
                                                backgroundColor: isEditingDisabled ? 'transparent' : (currentBackgroundColor || '#ffffff'),
                                            }}
                                        >
                                            <Palette className="w-3 h-3" />
                                        </Button>
                                        <div
                                            className="w-5 h-0.5 mt-0.5 p-[1px] rounded-sm border border-gray-300"
                                            style={{
                                                backgroundColor: isEditingDisabled ? 'transparent' : (currentBackgroundColor || '#ffffff'),
                                                borderColor: currentBackgroundColor ? 'transparent' : '#d1d5db'
                                            }}
                                        />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" side="bottom" align="center">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-medium text-gray-700">Background Color</h4>

                                        {/* Context Detection */}
                                        <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                                            {(editor?.isActive('tableCell') || editor?.isActive('tableHeader'))
                                                ? "💡 You're in a table cell - colors will be applied to the cell background"
                                                : "💡 Colors will be applied as text highlighting"
                                            }
                                        </div>

                                        {/* Default Background */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="w-8 h-7 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
                                                onClick={() => {
                                                    if (!isEditingDisabled) {
                                                        if (editor?.isActive('tableCell')) {
                                                            // Remove cell background using our custom extension
                                                            editor?.chain().focus().unsetTableCellBackgroundColor().run();
                                                        } else if (editor?.isActive('tableHeader')) {
                                                            // Remove header background using our custom extension
                                                            editor?.chain().focus().unsetTableHeaderBackgroundColor().run();
                                                        } else {
                                                            // Remove text highlighting
                                                            editor?.chain().focus().unsetHighlight().run();
                                                        }
                                                        setCurrentBackgroundColor('');
                                                    }
                                                }}
                                                title="No Background"
                                            >

                                            </button>
                                            <span className="text-xs text-gray-500">No Background</span>
                                        </div>

                                        {/* 8 Most Popular Background Colors for Light Theme */}
                                        <div>
                                            <p className="text-xs text-gray-500 mb-2">Popular Colors</p>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { color: '#FEF3C7', name: 'Light Yellow' },
                                                    { color: '#DBEAFE', name: 'Light Blue' },
                                                    { color: '#DCFCE7', name: 'Light Green' },
                                                    { color: '#FEE2E2', name: 'Light Red' },
                                                    { color: '#F3E8FF', name: 'Light Purple' },
                                                    { color: '#FED7AA', name: 'Light Orange' },
                                                    { color: '#F3F4F6', name: 'Light Gray' },
                                                    { color: '#FDF2F8', name: 'Light Pink' }
                                                ].map(({ color, name }) => (
                                                    <button
                                                        key={color}
                                                        className="w-10 h-10 rounded-lg border-2 hover:scale-105 transition-all duration-200 shadow-sm hover:shadow-md"
                                                        style={{
                                                            backgroundColor: `${color}80`, // 80 = ~50% opacity for backgrounds
                                                            borderColor: color
                                                        }}
                                                        onClick={() => {
                                                            if (!isEditingDisabled) {
                                                                if (editor?.isActive('tableCell')) {
                                                                    // Apply to table cell background using our custom extension
                                                                    editor?.chain().focus().setTableCellBackgroundColor(color).run();
                                                                } else if (editor?.isActive('tableHeader')) {
                                                                    // Apply to table header background using our custom extension
                                                                    editor?.chain().focus().setTableHeaderBackgroundColor(color).run();
                                                                } else {
                                                                    // Apply as text highlighting
                                                                    editor?.chain().focus().setHighlight({ color }).run();
                                                                }
                                                                setCurrentBackgroundColor(color);
                                                            }
                                                        }}
                                                        title={name}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Additional Table Cell Colors */}
                                        {(editor?.isActive('tableCell') || editor?.isActive('tableHeader')) && (
                                            <div>
                                                <p className="text-xs text-gray-500 mb-2">Additional Cell Colors</p>
                                                <div className="grid grid-cols-6 gap-1">
                                                    {[
                                                        { color: '#E0E7FF', name: 'Light Indigo' },
                                                        { color: '#FCE7F3', name: 'Light Pink' },
                                                        { color: '#F0FDF4', name: 'Very Light Green' },
                                                        { color: '#FEF7CD', name: 'Very Light Yellow' },
                                                        { color: '#FDF4FF', name: 'Very Light Purple' },
                                                        { color: '#F8FAFC', name: 'Very Light Gray' }
                                                    ].map(({ color, name }) => (
                                                        <button
                                                            key={color}
                                                            className="w-8 h-7 rounded border border-gray-300 hover:scale-110 transition-transform"
                                                            style={{ backgroundColor: color }}
                                                            onClick={() => {
                                                                if (!isEditingDisabled) {
                                                                    if (editor?.isActive('tableHeader')) {
                                                                        // Use our custom table header extension
                                                                        editor?.chain().focus().setTableHeaderBackgroundColor(color).run();
                                                                    } else {
                                                                        // Use our custom table cell extension
                                                                        editor?.chain().focus().setTableCellBackgroundColor(color).run();
                                                                    }
                                                                    setCurrentBackgroundColor(color);
                                                                }
                                                            }}
                                                            title={name}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </div>
                    )}

                    {/* Separator before Text Alignment - only show if alignment is visible */}
                    {shouldShowTextAlign && <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* Text Alignment */}
                    {shouldShowTextAlign && (
                        <div className={`flex items-center gap-0.5`}>
                            <Select
                                value={
                                    editor.isActive({ textAlign: 'center' }) ? 'center' :
                                        editor.isActive({ textAlign: 'right' }) ? 'right' :
                                            editor.isActive({ textAlign: 'justify' }) ? 'justify' : 'left'
                                }
                                onValueChange={(value) => {
                                    editor.chain().focus().setTextAlign(value).run();
                                }}
                            >
                                <SelectTrigger className="w-14 h-7.5 px-4 border border-gray-300 bg-white hover:bg-gray-50 [&>svg]:hidden" data-size="">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            {editor.isActive({ textAlign: 'center' }) && <AlignCenter className="w-3.5 h-3.5" />}
                                            {editor.isActive({ textAlign: 'right' }) && <AlignRight className="w-3.5 h-3.5" />}
                                            {editor.isActive({ textAlign: 'justify' }) && <AlignJustify className="w-3.5 h-3.5" />}
                                            {(!editor.isActive({ textAlign: 'center' }) &&
                                                !editor.isActive({ textAlign: 'right' }) &&
                                                !editor.isActive({ textAlign: 'justify' })) && <AlignLeft className="w-3.5 h-3.5" />}
                                        </div>
                                        <ChevronDown className="w-3 h-3 ml-1 text-gray-500" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">
                                        <div className="flex items-center gap-2">
                                            <AlignLeft className="w-3.5 h-3.5" />
                                            <span>Left</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="center">
                                        <div className="flex items-center gap-2">
                                            <AlignCenter className="w-3.5 h-3.5" />
                                            <span>Center</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="right">
                                        <div className="flex items-center gap-2">
                                            <AlignRight className="w-3.5 h-3.5" />
                                            <span>Right</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="justify">
                                        <div className="flex items-center gap-2">
                                            <AlignJustify className="w-3.5 h-3.5" />
                                            <span>Justify</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Separator before Lists - only show if lists are visible */}
                    {shouldShowLists && <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* Essential Lists */}
                    {shouldShowLists && (
                        <>
                            <Button variant="outline" size="sm"
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                className={`h-7 w-7 p-0 ${isActive('bulletList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                                    }`}
                                title="Bullet List"
                            >
                                <List className="w-3.5 h-3.5" />
                            </Button>

                            <Button variant="outline" size="sm"
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                className={`h-7 w-7 p-0 ${isActive('orderedList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                                    }`}
                                title="Numbered List"
                            >
                                <ListOrdered className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="outline"
                                onClick={() => editor.chain().focus().toggleTaskList().run()}
                                className={`h-7 w-7 p-0 ${isActive('taskList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                                    }`}
                                title="Task List"
                            >
                                <CheckSquare className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    )}

                    {/* Separator before Indent - only show if indent is visible */}
                    {shouldShowIndent && <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* Indentation Controls */}
                    {shouldShowIndent && (
                        <>
                            <Button variant="outline"
                                onClick={() => {
                                    if (!isEditingDisabled && editor) {
                                        // Check current indentation level before allowing indent
                                        let currentLevel = 0;
                                        if (editor.isActive('paragraph')) {
                                            const attrs = editor.getAttributes('paragraph');
                                            currentLevel = attrs.indent || 0;
                                        } else if (editor.isActive('heading')) {
                                            const attrs = editor.getAttributes('heading');
                                            currentLevel = attrs.indent || 0;
                                        }

                                        // Only indent if below maximum level
                                        if (currentLevel < maxIndentLevel) {
                                            if (editor.isActive('paragraph')) {
                                                editor.chain().focus().indentParagraph().run();
                                            } else if (editor.isActive('heading')) {
                                                editor.chain().focus().indentHeading().run();
                                            }
                                        }
                                    }
                                }}
                                disabled={isEditingDisabled}
                                className={`h-7 w-7 p-0 rounded-md bg-white hover:bg-gray-50 transition-colors text-sm ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Indent"
                            >
                                <IndentIncrease className="w-3.5 h-3.5" />
                            </Button>

                            <Button variant="outline"
                                onClick={() => {
                                    if (!isEditingDisabled && editor) {
                                        if (editor.isActive('paragraph')) {
                                            editor.chain().focus().outdentParagraph().run();
                                        } else if (editor.isActive('heading')) {
                                            editor.chain().focus().outdentHeading().run();
                                        }
                                    }
                                }}
                                disabled={isEditingDisabled}
                                className={`h-7 w-7 p-0  rounded-md bg-white hover:bg-gray-50 transition-colors text-sm ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Outdent"
                            >
                                <IndentDecrease className="w-3.5 h-3.5" />
                            </Button>
                        </>
                    )}

                    {/* Clear Formatting */}
                    {shouldShowClearFormatting && (
                        <Button variant="outline" size="sm"
                            onClick={() => {
                                if (!isEditingDisabled) {
                                    editor.chain().focus().clearNodes().unsetAllMarks().run();
                                }
                            }}
                            disabled={isEditingDisabled}
                            className={`h-7 w-7 p-0 bg-white hover:bg-gray-50 ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Clear All Formatting"
                        >
                            <Eraser className="w-3.5 h-3.5" />
                        </Button>
                    )}

                    {/* Separator before Insert Options - only show if insert options are visible */}
                    {shouldShowInsertOptions && <div className={'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* INSERT OPTIONS */}
                    {shouldShowInsertOptions && (
                        <div className={`flex items-center gap-0.5`}>
                            {/* Table Grid Selector */}
                            <Popover open={tablePopoverOpen} onOpenChange={setTablePopoverOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm"
                                        className="flex items-center gap-1.5 px-2 py-1 h-7 rounded-md hover:bg-gray-100 transition-colors text-sm"
                                        title="Insert Table"
                                        onClick={() => setTablePopoverOpen(!tablePopoverOpen)}
                                    >
                                        <Table className="w-3.5 h-3.5" />
                                        <span className="hidden lg:inline">Table</span>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                    className="w-64 p-4"
                                    side="bottom"
                                    align="start"
                                    onInteractOutside={() => setTablePopoverOpen(false)}
                                >
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-700">Insert Table</h4>
                                        <TableGridSelector
                                            onSelect={(rows, cols) => {
                                                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                                                setTablePopoverOpen(false);
                                            }}
                                        />
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button variant="outline" size="sm"
                                onClick={() => {
                                    const defaultChart = `graph TD
A[Start] --> B{Decision}
B -->|Yes| C[Do something]
B -->|No| D[Do something else]
C --> E[End]
D --> E`;

                                    // Insert a Mermaid code block directly instead of using prompt
                                    editor?.chain().focus().toggleCodeBlock({ language: 'mermaid' }).insertContent(defaultChart).run();
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 h-7 rounded-md hover:bg-gray-100 transition-colors text-sm"
                                title="Insert Mermaid Diagram"
                            >
                                <Network className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Diagram</span>
                            </Button>

                            <Button variant="outline" size="sm"
                                onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = () => {
                                                const result = reader.result as string;
                                                editor?.chain().focus().setImage({ src: result }).run();
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    };
                                    input.click();
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 h-7 rounded-md hover:bg-gray-100 transition-colors text-sm"
                                title="Image"
                            >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Image</span>
                            </Button>

                            <Button variant="outline" size="sm"
                                onClick={() => {
                                    // Check if cursor is in a link
                                    const isInLink = editor.isActive('link');

                                    if (isInLink) {
                                        // If cursor is in a link, remove the link
                                        editor.chain().focus().unsetLink().run();
                                    } else {
                                        // Always show modal for link insertion
                                        const { state } = editor;
                                        const { from, to } = state.selection;
                                        const hasSelection = from !== to;
                                        const selectedText = hasSelection ? state.doc.textBetween(from, to, ' ', ' ').trim() : '';

                                        // Show modal for link insertion
                                        import('sweetalert2').then(async ({ default: Swal }) => {
                                            const { value: formValues } = await Swal.fire({
                                                title: 'Insert Link',
                                                html:
                                                    '<input id="swal-link-url" class="swal2-input" placeholder="https://example.com" style="margin-bottom: 10px;" />' +
                                                    (hasSelection 
                                                        ? `<div style="margin: 10px 0; padding: 10px; background: #f3f4f6; border-radius: 6px; text-align: left;"><strong>Selected text:</strong> ${selectedText}</div>`
                                                        : '<input id="swal-link-text" class="swal2-input" placeholder="Link text (optional)" />'),
                                                focusConfirm: false,
                                                showCancelButton: true,
                                                confirmButtonColor: '#3B82F6',
                                                cancelButtonColor: '#6B7280',
                                                confirmButtonText: 'Insert Link',
                                                preConfirm: () => {
                                                    const url = (document.getElementById('swal-link-url') as HTMLInputElement)?.value?.trim();
                                                    const text = !hasSelection ? (document.getElementById('swal-link-text') as HTMLInputElement)?.value?.trim() : '';
                                                    if (!url) {
                                                        Swal.showValidationMessage('Please enter a URL');
                                                        return null;
                                                    }
                                                    // Validate URL format
                                                    const urlPattern = /^https?:\/\/.+/i;
                                                    if (!urlPattern.test(url)) {
                                                        Swal.showValidationMessage('Please enter a valid URL starting with http:// or https://');
                                                        return null;
                                                    }
                                                    return { url, text };
                                                }
                                            });
                                            if (formValues && formValues.url) {
                                                const href = formValues.url;
                                                if (hasSelection) {
                                                    // Apply link to selected text
                                                    editor.chain().focus().setLink({ href }).run();
                                                } else {
                                                    // Insert new link with text
                                                    const text = formValues.text || formValues.url;
                                                    editor.chain().focus().insertContent(`<a href="${href}">${text}</a>`).run();
                                                }
                                            }
                                        });
                                    }
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 h-7 rounded-md hover:bg-gray-100 transition-colors text-sm"
                                title="Insert Link"
                            >
                                <Link className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Link</span>
                            </Button>

                            <Button variant="outline" size="sm"
                                onClick={() => {
                                    editor?.chain().focus().setHorizontalRule().run();
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 h-7 rounded-md hover:bg-gray-100 transition-colors text-sm"
                                title="Insert Divider"
                            >
                                <Minus className="w-3.5 h-3.5" />
                                <span className="hidden lg:inline">Divider</span>
                            </Button>
                        </div>
                    )}

                </div>

                {/* Spacing before More Options */}
                {shouldShowMoreOptions && (
                    <div className={'w-px h-6 bg-gray-300 mx-2'}></div>
                )}

                {/* MORE OPTIONS DROPDOWN - Shows when sections are hidden due to narrow width */}
                {shouldShowMoreOptions && (
                    <div className="relative flex-shrink-0">
                        <DropdownMenu open={showMoreOptions} onOpenChange={setShowMoreOptions}>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm"
                                    className="flex items-center px-2 h-8 bg-white hover:bg-gray-50"
                                    title="More Options"
                                >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                                side={dropdownAlignment.side}
                                align={dropdownAlignment.align}
                                className="w-50 custom-scrollbar max-h-100 overflow-y-auto"
                            >
                                {/* Categorized sections - only show categories when sections are hidden */}

                                {/* HEADING SELECTOR CATEGORY */}
                                {!shouldShowHeadingSelector && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            Block Type
                                        </div>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()}>
                                            <span className="text-sm font-normal mr-2">P</span>
                                            <span>Paragraph</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => insertHorizontalLineAfterHeading(editor, 1)}>
                                            <span className="text-lg font-bold mr-2">H1</span>
                                            <span>Heading 1</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => insertHorizontalLineAfterHeading(editor, 2)}>
                                            <span className="text-base font-bold mr-2">H2</span>
                                            <span>Heading 2</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().setHeading({ level: 3 }).run()}>
                                            <span className="text-sm font-bold mr-2">H3</span>
                                            <span>Heading 3</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().setBlockquote().run()}>
                                            <Quote className="w-3.5 h-3.5 mr-2" />
                                            <span>Quote</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().setCodeBlock().run()}>
                                            <Code className="w-3.5 h-3.5 mr-2" />
                                            <span>Code Block</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                {/* FONT CONTROLS CATEGORY */}
                                {!shouldShowFontControls && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            Font
                                        </div>
                                        <div className="px-2 py-2">
                                            <div className="text-xs text-gray-500 mb-1">Font Family</div>
                                            <Select
                                                value={currentFontFamily}
                                                onValueChange={(value) => {
                                                    editor.chain().focus().setFontFamily(value).run();
                                                    setCurrentFontFamily(value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {FONT_FAMILIES.map(f => (
                                                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="px-2 py-2">
                                            <div className="text-xs text-gray-500 mb-1">Font Size</div>
                                            <Select
                                                value={fontSizeInput}
                                                onValueChange={(value) => {
                                                    setIsTyping(false);
                                                    applyFontSize(value);
                                                }}
                                            >
                                                <SelectTrigger className="w-full h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {['4', '6', '8', '10', '12', '16', '20', '24', '28', '36', '48', '64', '72', '96'].map(size => (
                                                        <SelectItem key={size} value={size}>{size}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Text Color Picker */}
                                        <div className="px-2 py-2">
                                            <div className="text-xs text-gray-500 mb-2">Text Color</div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { color: '#000000', name: 'Black' },
                                                    { color: '#6B7280', name: 'Gray' },
                                                    { color: '#DC2626', name: 'Red' },
                                                    { color: '#2563EB', name: 'Blue' },
                                                    { color: '#059669', name: 'Green' },
                                                    { color: '#D97706', name: 'Orange' },
                                                    { color: '#7C2D12', name: 'Brown' },
                                                    { color: '#7C3AED', name: 'Purple' }
                                                ].map(({ color, name }) => (
                                                    <button
                                                        key={color}
                                                        className="w-8 h-8 rounded-lg border-2 hover:scale-105 transition-all duration-200 shadow-sm"
                                                        style={{
                                                            backgroundColor: `${color}20`,
                                                            borderColor: color
                                                        }}
                                                        onClick={() => {
                                                            if (!isEditingDisabled) {
                                                                editor.chain().focus().setColor(color).run();
                                                                setCurrentTextColor(color);
                                                            }
                                                        }}
                                                        title={name}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Background Color Picker */}
                                        <div className="px-2 py-2">
                                            <div className="text-xs text-gray-500 mb-2">Background Color</div>
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { color: '#FEF3C7', name: 'Light Yellow' },
                                                    { color: '#DBEAFE', name: 'Light Blue' },
                                                    { color: '#DCFCE7', name: 'Light Green' },
                                                    { color: '#FEE2E2', name: 'Light Red' },
                                                    { color: '#F3E8FF', name: 'Light Purple' },
                                                    { color: '#FED7AA', name: 'Light Orange' },
                                                    { color: '#F3F4F6', name: 'Light Gray' },
                                                    { color: '#FDF2F8', name: 'Light Pink' }
                                                ].map(({ color, name }) => (
                                                    <button
                                                        key={color}
                                                        className="w-8 h-8 rounded-lg border-2 hover:scale-105 transition-all duration-200 shadow-sm"
                                                        style={{
                                                            backgroundColor: `${color}80`,
                                                            borderColor: color
                                                        }}
                                                        onClick={() => {
                                                            if (!isEditingDisabled) {
                                                                if (editor?.isActive('tableCell')) {
                                                                    (editor.chain().focus() as any).setTableCellBackgroundColor(color).run();
                                                                } else if (editor?.isActive('tableHeader')) {
                                                                    (editor.chain().focus() as any).setTableHeaderBackgroundColor(color).run();
                                                                } else {
                                                                    editor.chain().focus().setHighlight({ color }).run();
                                                                }
                                                                setCurrentBackgroundColor(color);
                                                            }
                                                        }}
                                                        title={name}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        <DropdownMenuSeparator />
                                    </>
                                )}



                                {/* ALIGNMENT CATEGORY */}
                                {!shouldShowTextAlign && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            Alignment
                                        </div>
                                        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('left').run()}>
                                            <AlignLeft className="w-3.5 h-3.5 mr-2" />
                                            <span>Left</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('center').run()}>
                                            <AlignCenter className="w-3.5 h-3.5 mr-2" />
                                            <span>Center</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('right').run()}>
                                            <AlignRight className="w-3.5 h-3.5 mr-2" />
                                            <span>Right</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('justify').run()}>
                                            <AlignJustify className="w-3.5 h-3.5 mr-2" />
                                            <span>Justify</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                {/* CLEAR FORMATTING CATEGORY */}
                                {!shouldShowClearFormatting && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            More
                                        </div>
                                        <DropdownMenuItem onClick={() => {
                                            if (!isEditingDisabled) {
                                                editor.chain().focus().clearNodes().unsetAllMarks().run();
                                            }
                                        }}>
                                            <Eraser className="w-3.5 h-3.5 mr-2" />
                                            <span>Clear Formatting</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}



                                {/* INDENTATION CATEGORY */}
                                {!shouldShowIndent && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            Indentation
                                        </div>
                                        <DropdownMenuItem onClick={() => {
                                            if (!isEditingDisabled && editor) {
                                                let currentLevel = 0;
                                                if (editor.isActive('paragraph')) {
                                                    const attrs = editor.getAttributes('paragraph');
                                                    currentLevel = attrs.indent || 0;
                                                } else if (editor.isActive('heading')) {
                                                    const attrs = editor.getAttributes('heading');
                                                    currentLevel = attrs.indent || 0;
                                                }

                                                // Only indent if below maximum level
                                                if (currentLevel < maxIndentLevel) {
                                                    if (editor.isActive('paragraph')) {
                                                        editor.chain().focus().indentParagraph().run();
                                                    } else if (editor.isActive('heading')) {
                                                        editor.chain().focus().indentHeading().run();
                                                    }
                                                }
                                            }
                                        }}>
                                            <IndentIncrease className="w-3.5 h-3.5 mr-2" />
                                            <span>Indent</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            if (!isEditingDisabled && editor) {
                                                if (editor.isActive('paragraph')) {
                                                    editor.chain().focus().outdentParagraph().run();
                                                } else if (editor.isActive('heading')) {
                                                    editor.chain().focus().outdentHeading().run();
                                                }
                                            }
                                        }}>
                                            <IndentDecrease className="w-3.5 h-3.5 mr-2" />
                                            <span>Outdent</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}

                                {/* LISTS CATEGORY */}
                                {!shouldShowLists && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            List
                                        </div>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleTaskList().run()}>
                                            <CheckSquare className="w-3.5 h-3.5 mr-2" />
                                            <span>Task List</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                                            <List className="w-3.5 h-3.5 mr-2" />
                                            <span>Bullet List</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                                            <ListOrdered className="w-3.5 h-3.5 mr-2" />
                                            <span>Ordered List</span>
                                        </DropdownMenuItem>
                                    </>
                                )}



                                {/* INSERT CATEGORY */}
                                {!shouldShowInsertOptions && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            Insert
                                        </div>
                                        <DropdownMenuItem asChild>
                                            {/* Table Grid Selector */}
                                            <Popover open={tablePopoverOpen} onOpenChange={setTablePopoverOpen}>
                                                <PopoverTrigger asChild>
                                                    <div
                                                        className="flex items-center gap-4 cursor-pointer px-2 py-1.5 hover:bg-gray-100 rounded text-sm"
                                                        onMouseEnter={() => setTablePopoverOpen(true)}
                                                    >
                                                        <Table className="w-3.5 h-3.5 text-gray-500" />
                                                        <span>Table</span>
                                                    </div>
                                                </PopoverTrigger>
                                                <PopoverContent
                                                    className="w-64 p-4"
                                                    side="left"
                                                    align="start"
                                                    onInteractOutside={() => setTablePopoverOpen(false)}
                                                >
                                                    <div className="space-y-3">
                                                        <h4 className="text-sm font-medium text-gray-700">Insert Table</h4>
                                                        <TableGridSelector
                                                            onSelect={(rows, cols) => {
                                                                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
                                                                setTablePopoverOpen(false);
                                                            }}
                                                        />
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            const defaultChart = `graph TD
A[Start] --> B{Decision}
B -->|Yes| C[Do something]
B -->|No| D[Do something else]
C --> E[End]
D --> E`;
                                            editor?.chain().focus().toggleCodeBlock({ language: 'mermaid' }).insertContent(defaultChart).run();
                                        }}>
                                            <Network className="w-3.5 h-3.5 mr-2" />
                                            <span>Diagram</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            const input = document.createElement('input');
                                            input.type = 'file';
                                            input.accept = 'image/*';
                                            input.onchange = (e) => {
                                                const file = (e.target as HTMLInputElement).files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onload = () => {
                                                        const result = reader.result as string;
                                                        editor?.chain().focus().setImage({ src: result }).run();
                                                    };
                                                    reader.readAsDataURL(file);
                                                }
                                            };
                                            input.click();
                                        }}>
                                            <ImageIcon className="w-3.5 h-3.5 mr-2" />
                                            <span>Image</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            // Check if cursor is in a link
                                            const isInLink = editor.isActive('link');

                                            if (isInLink) {
                                                // If cursor is in a link, remove the link
                                                editor.chain().focus().unsetLink().run();
                                            } else {
                                                // Check if text is selected
                                                const { state } = editor;
                                                const { from, to } = state.selection;
                                                const hasSelection = from !== to;

                                                if (hasSelection) {
                                                    // Get selected text
                                                    const selectedText = state.doc.textBetween(from, to, ' ', ' ').trim();

                                                    // Check if the selected text is a valid URL
                                                    const urlPattern = /^https?:\/\/.+/i;
                                                    if (urlPattern.test(selectedText)) {
                                                        // If selected text is a valid URL, make it a link
                                                        editor.chain().focus().setLink({ href: selectedText }).run();
                                                    }
                                                    // If selected text is not a valid URL, do nothing
                                                } else {
                                                    // No text selected, prompt for URL and insert new link
                                                    const url = window.prompt('Enter URL:', 'https://');
                                                    if (url && url.trim()) {
                                                        const linkText = window.prompt('Enter link text (optional):', '');
                                                        if (linkText && linkText.trim()) {
                                                            // Insert link with custom text
                                                            editor.chain().focus().insertContent(`<a href="${url.trim()}">${linkText.trim()}</a>`).run();
                                                        } else {
                                                            // Insert link with URL as text
                                                            editor.chain().focus().insertContent(`<a href="${url.trim()}">${url.trim()}</a>`).run();
                                                        }
                                                    }
                                                }
                                            }
                                        }}>
                                            <Link className="w-3.5 h-3.5 mr-2" />
                                            <span>Link</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => {
                                            editor?.chain().focus().setHorizontalRule().run();
                                        }}>
                                            <Minus className="w-3.5 h-3.5 mr-2" />
                                            <span>Divider</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                )}
            </div>
        </>
    );
}

export default ToolBar;



