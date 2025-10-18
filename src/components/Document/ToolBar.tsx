import type { Editor } from "@tiptap/react";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
    GripVertical,
    ArrowLeftRight,
    ArrowUpDown,
    Type
} from "lucide-react";

const FONT_FAMILIES = [
    "Inter", "Arial", "Georgia", "Roboto", "Courier New", "Times New Roman", "Verdana", "Tahoma", "Monospace",
];

// Table Grid Selector Component
const TableGridSelector = ({ onSelect }: { onSelect: (rows: number, cols: number) => void }) => {
    const [hoverRows, setHoverRows] = useState(0);
    const [hoverCols, setHoverCols] = useState(0);

    const maxRows = 6;
    const maxCols = 8;

    const handleCellHover = (row: number, col: number) => {
        setHoverRows(row);
        setHoverCols(col);
    };

    const handleCellClick = (row: number, col: number) => {
        onSelect(row, col);
    };

    return (
        <div className="flex flex-col items-center space-y-3">
            {/* Grid */}
            <div
                className="grid gap-1 justify-center"
                style={{
                    gridTemplateColumns: `repeat(${maxCols}, 22px)`,
                    width: 'fit-content'
                }}
                onMouseLeave={() => {
                    setHoverRows(0);
                    setHoverCols(0);
                }}
            >
                {Array.from({ length: maxRows * maxCols }, (_, index) => {
                    const row = Math.floor(index / maxCols) + 1;
                    const col = (index % maxCols) + 1;
                    const isSelected = row <= hoverRows && col <= hoverCols;

                    return (
                        <div
                            key={index}
                            className={`
                                w-5 h-5 border border-gray-300 cursor-pointer transition-colors rounded-sm
                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white hover:bg-blue-100'}
                            `}
                            onMouseEnter={() => handleCellHover(row, col)}
                            onClick={() => handleCellClick(row, col)}
                        />
                    );
                })}
            </div>

            {/* Label */}
            <div className="text-center text-sm text-gray-600">
                {hoverRows} x {hoverCols}
            </div>
        </div>
    );
};



const ToolBar = ({ editor, readOnly = false }: { editor: Editor | null; readOnly?: boolean }) => {

    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
    const [currentFontFamily, setCurrentFontFamily] = useState<string>("Inter");
    const [currentTextColor, setCurrentTextColor] = useState<string>('#000000');
    const [currentBackgroundColor, setCurrentBackgroundColor] = useState<string>('');

    const [isInPreviewMode, setIsInPreviewMode] = useState(false);
    const [maxIndentLevel, setMaxIndentLevel] = useState<number>(14);

    // Draggable toolbar state
    const [toolbarPosition, setToolbarPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isVertical, setIsVertical] = useState<boolean>(false);
    const dragStartPos = useRef<{ x: number; y: number; toolbarX: number; toolbarY: number } | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Load toolbar orientation preference from cookies on mount
    useEffect(() => {
        const savedOrientation = document.cookie
            .split('; ')
            .find(row => row.startsWith('toolbarOrientation='))
            ?.split('=')[1];

        if (savedOrientation === 'vertical') {
            setIsVertical(true);
        }
    }, []);

    // Save toolbar orientation to cookies
    const toggleOrientation = () => {
        const newOrientation = !isVertical;
        setIsVertical(newOrientation);

        // Save to cookies (expires in 1 year)
        const expires = new Date();
        expires.setFullYear(expires.getFullYear() + 1);
        document.cookie = `toolbarOrientation=${newOrientation ? 'vertical' : 'horizontal'}; expires=${expires.toUTCString()}; path=/`;
    };

    // Drag handlers for toolbar - Optimized with useCallback to prevent lag
    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const toolbar = containerRef.current;
        if (!toolbar) return;

        try {
            const rect = toolbar.getBoundingClientRect();

            // Validate rect to prevent errors
            if (rect.width <= 0 || rect.height <= 0) {
                console.warn('Invalid toolbar dimensions during drag start');
                return;
            }

            // CRITICAL: Always use getBoundingClientRect for accurate position
            // This prevents blinking by using the actual rendered position
            const currentX = rect.left;
            const currentY = rect.top;

            dragStartPos.current = {
                x: e.clientX,
                y: e.clientY,
                toolbarX: currentX,
                toolbarY: currentY
            };

            // Set position immediately to transition from static to fixed positioning
            setToolbarPosition({ x: currentX, y: currentY });
            setIsDragging(true);
        } catch (error) {
            console.error('Error starting toolbar drag:', error);
            // Fallback: reset to default position
            setToolbarPosition(null);
        }
    }, []); // Empty dependencies - no recreations

    const handleDragMove = useCallback((e: MouseEvent) => {
        if (!dragStartPos.current) return;

        try {
            // Calculate position immediately for instant response
            const deltaX = e.clientX - dragStartPos.current.x;
            const deltaY = e.clientY - dragStartPos.current.y;
            let newX = dragStartPos.current.toolbarX + deltaX;
            let newY = dragStartPos.current.toolbarY + deltaY;

            // Get toolbar dimensions for boundary checking
            const toolbar = containerRef.current;
            if (toolbar) {
                const toolbarRect = toolbar.getBoundingClientRect();

                // Validate dimensions
                if (toolbarRect.width <= 0 || toolbarRect.height <= 0) {
                    return; // Skip this frame if dimensions are invalid
                }

                // Find the tiptap-container boundary
                const tiptapContainer = document.querySelector('.tiptap-container');
                if (tiptapContainer) {
                    const containerRect = tiptapContainer.getBoundingClientRect();

                    // Validate container dimensions
                    if (containerRect.width > 0 && containerRect.height > 0) {
                        // Clamp position within tiptap-container boundaries
                        newX = Math.max(containerRect.left, Math.min(newX, containerRect.right - toolbarRect.width));
                        newY = Math.max(containerRect.top, Math.min(newY, containerRect.bottom - toolbarRect.height));
                    }
                }
            }

            // Validate final position before setting
            if (isFinite(newX) && isFinite(newY)) {
                // Direct state update without requestAnimationFrame for zero lag
                setToolbarPosition({ x: newX, y: newY });
            }
        } catch (error) {
            console.error('Error during toolbar drag:', error);
            // Stop dragging on error
            setIsDragging(false);
            dragStartPos.current = null;
            // Fallback to default position
            setToolbarPosition(null);
        }
    }, []);

    const handleDragEnd = useCallback(() => {
        setIsDragging(false);
        dragStartPos.current = null;
    }, []);

    // Set up drag event listeners - Optimized to prevent re-creation
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

    // Ref to track if we're currently updating position (prevent infinite loops)
    const isUpdatingPosition = useRef(false);

    // Helper function to safely clamp position with error handling
    const safeClampPosition = useCallback((position: { x: number; y: number } | null): { x: number; y: number } | null => {
        if (!position || !containerRef.current || isUpdatingPosition.current) return position;

        try {
            const toolbar = containerRef.current;
            const toolbarRect = toolbar.getBoundingClientRect();
            const tiptapContainer = document.querySelector('.tiptap-container');

            if (!tiptapContainer) return position;

            const containerRect = tiptapContainer.getBoundingClientRect();

            // Validate rect dimensions to prevent invalid calculations
            if (toolbarRect.width <= 0 || toolbarRect.height <= 0 ||
                containerRect.width <= 0 || containerRect.height <= 0) {
                return null; // Fallback to default position
            }

            // Clamp position within boundaries
            const clampedX = Math.max(containerRect.left, Math.min(position.x, containerRect.right - toolbarRect.width));
            const clampedY = Math.max(containerRect.top, Math.min(position.y, containerRect.bottom - toolbarRect.height));

            // Check if position actually changed (prevent unnecessary updates)
            const hasChanged = Math.abs(clampedX - position.x) > 1 || Math.abs(clampedY - position.y) > 1;

            return hasChanged ? { x: clampedX, y: clampedY } : position;
        } catch (error) {
            console.error('Error clamping toolbar position:', error);
            return null; // Fallback to default position on error
        }
    }, []);

    // Handle window resize to re-clamp toolbar position within new boundaries
    useEffect(() => {
        let resizeTimeout: NodeJS.Timeout;

        const handleResize = () => {
            // Debounce resize handler to prevent too many updates
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (!toolbarPosition || isUpdatingPosition.current) return;

                isUpdatingPosition.current = true;
                const newPosition = safeClampPosition(toolbarPosition);

                if (newPosition && newPosition !== toolbarPosition) {
                    setToolbarPosition(newPosition);
                }

                // Reset flag after a delay
                setTimeout(() => {
                    isUpdatingPosition.current = false;
                }, 100);
            }, 150); // Debounce by 150ms
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
        };
    }, [toolbarPosition, safeClampPosition]);

    // Check position once when orientation changes (prevent infinite loops)
    useEffect(() => {
        if (isUpdatingPosition.current) return;

        // Use timeout to ensure DOM has updated after orientation change
        const timeoutId = setTimeout(() => {
            if (!toolbarPosition || !containerRef.current) return;

            isUpdatingPosition.current = true;
            const newPosition = safeClampPosition(toolbarPosition);

            if (newPosition && newPosition !== toolbarPosition) {
                setToolbarPosition(newPosition);
            } else if (!newPosition) {
                // Fallback: reset to default position if calculation failed
                setToolbarPosition(null);
            }

            // Reset flag after a delay
            setTimeout(() => {
                isUpdatingPosition.current = false;
            }, 100);
        }, 100);

        return () => clearTimeout(timeoutId);
    }, [isVertical]); // Only trigger on orientation change

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
            const inCodeBlock = editor.isActive('codeBlock');

            // Check specifically for Mermaid preview/error mode
            // Look for Mermaid preview containers or error indicators
            const mermaidPreviews = document.querySelectorAll('[data-mermaid-preview="true"], .mermaid-preview, .mermaid-container');
            const mermaidErrors = document.querySelectorAll('[data-mermaid-error="true"], .mermaid-error, .syntax-error, .mermaid-parse-error');

            // Only disable editing when Mermaid is in preview mode or showing errors
            const inMermaidPreview = inCodeBlock && (mermaidPreviews.length > 0 || mermaidErrors.length > 0);
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
        };        // Initialize toolbar state immediately when editor becomes available
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

    // Width-based responsive toolbar - show/hide sections based on specific window width breakpoints
    const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

    // Initialize maxIndentLevel based on initial window width
    useEffect(() => {
        const initialMaxIndentLevel = calculateMaxIndentLevel(windowWidth);
        setMaxIndentLevel(initialMaxIndentLevel);
    }, []); // Run once on mount

    useEffect(() => {
        // Throttled resize handler to improve performance and reduce lag
        const handleResize = () => {
            const newWidth = window.innerWidth;

            // Only update if we crossed a breakpoint threshold for smoother performance
            const thresholds = [1400, 1150, 1000, 850, 650];
            const oldThreshold = thresholds.find(t => windowWidth >= t) || 0;
            const newThreshold = thresholds.find(t => newWidth >= t) || 0;

            if (oldThreshold === newThreshold && Math.abs(newWidth - windowWidth) < 50) return;
            console.log('� ========== WIDTH-BASED TOOLBAR DEBUG ==========');
            console.log('� Window width changed:', windowWidth, '→', newWidth);

            // Update maxIndentLevel based on new width
            const newMaxIndentLevel = calculateMaxIndentLevel(newWidth);
            setMaxIndentLevel(newMaxIndentLevel);
            console.log('� Max indent level updated:', maxIndentLevel, '→', newMaxIndentLevel);

            // Calculated width breakpoints based on actual toolbar section sizes
            // Core sections (always visible): Bold, Italic, Underline, Font Size, Font Color, Background Color ≈ 400px
            // More Options button: ≈ 50px, Separators and padding: ≈ 100px, Base requirement: ≈ 550px
            const breakpoints = {
                insertOptions: 1400,    // Insert Options (Table, Diagram, Link) ≈ 200px - hide below 1400px
                textAlign: 1150,        // Text Alignment (4 buttons) ≈ 150px - hide below 1150px  
                clearFormatting: 1000,  // Clear Formatting (1 button) ≈ 40px - hide below 1000px
                indent: 850,            // Indentation (2 buttons) ≈ 100px - hide below 850px (earlier than before)
                lists: 650              // Lists (3 buttons) ≈ 150px - hide below 650px (earlier than before)
            };


            const hasHiddenSections = newWidth < breakpoints.insertOptions ||
                newWidth < breakpoints.textAlign ||
                newWidth < breakpoints.clearFormatting ||
                newWidth < breakpoints.indent ||
                newWidth < breakpoints.lists;

            console.log('�   - More Options needed:', hasHiddenSections ? 'SHOW' : 'HIDE');
            console.log('� ==========================================');

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
                    const finalWidth = window.innerWidth;
                    if (Math.abs(finalWidth - windowWidth) > 10) {
                        handleResize();
                    }
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
    }, [editor]);

    // Helper functions to determine section visibility based on calculated window width breakpoints  
    // In vertical mode, show only essential options (up to font/color), wrap Lists/Indent/Align/Insert in More Options
    // Memoize these functions to prevent unnecessary recalculations
    const shouldShowInsertOptions = useMemo(() => isVertical ? false : windowWidth >= 1390, [isVertical, windowWidth]);
    const shouldShowIndent = useMemo(() => isVertical ? false : windowWidth >= 1150, [isVertical, windowWidth]);
    const shouldShowClearFormatting = useMemo(() => isVertical ? false : windowWidth >= 1150, [isVertical, windowWidth]);
    const shouldShowLists = useMemo(() => isVertical ? false : windowWidth >= 990, [isVertical, windowWidth]);
    const shouldShowTextAlign = useMemo(() => isVertical ? false : windowWidth >= 880, [isVertical, windowWidth]);
    const shouldShowMoreOptions = useMemo(() =>
        isVertical ? true : (!shouldShowInsertOptions || !shouldShowTextAlign || !shouldShowClearFormatting || !shouldShowIndent || !shouldShowLists),
        [isVertical, shouldShowInsertOptions, shouldShowTextAlign, shouldShowClearFormatting, shouldShowIndent, shouldShowLists]
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
    const [showFontSizePopover, setShowFontSizePopover] = useState(false);

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

    return (
        <>
            <div
                ref={containerRef}
                className={`toolbar ${isVertical
                    ? 'flex-col items-center w-fit'
                    : 'flex items-center overflow-x-auto'
                    } gap-0 p-1.5 rounded-md border border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-lg`}
                style={toolbarPosition ? {
                    position: 'fixed',
                    left: `${toolbarPosition.x}px`,
                    top: `${toolbarPosition.y}px`,
                    cursor: isDragging ? 'grabbing' : 'default',
                    zIndex: 50,
                    ...(isVertical && { maxHeight: '600px', overflowY: 'auto' }),
                    transition: isDragging ? 'none' : undefined
                } : isVertical ? {
                    // Vertical mode: Top-left of drag area (tiptap-container)
                    position: 'fixed' as const,
                    left: '16px', // Left edge with 16px padding, or left of centered 1000px container
                    top: '168px', // Top of drag area (152px content start + 8px padding)
                    zIndex: 50,
                    maxHeight: '600px',
                    overflowY: 'auto' as const
                } : {
                    // Horizontal mode: Top-center of drag area (tiptap-container)
                    position: 'fixed' as const,
                    left: '50%',
                    top: '168px', // Top of drag area (152px content start + 8px padding)
                    transform: 'translateX(-50%)',
                    zIndex: 50
                }}
            >
                {/* Drag Handle and Orientation Toggle */}
                <div className={`flex ${isVertical ? 'flex-col gap-1 items-center' : 'items-center gap-1'} flex-shrink-0`}>
                    {/* Drag Handle */}
                    <div
                        className={`flex items-center justify-center h-8 ${isVertical ? 'w-8' : 'w-8'} cursor-grab active:cursor-grabbing hover:bg-gray-100 rounded transition-colors flex-shrink-0`}
                        onMouseDown={handleDragStart}
                        title="Drag to reposition toolbar"
                    >
                        <GripVertical className="w-4 h-4 text-gray-400" />
                    </div>

                    {/* Orientation Toggle Button - Separate row in vertical mode */}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleOrientation}
                        className={`h-8 ${isVertical ? 'w-8' : 'w-8'} p-0 bg-white hover:bg-gray-50 border-gray-300 flex items-center justify-center`}
                        title={isVertical ? "Switch to Horizontal" : "Switch to Vertical"}
                    >
                        {isVertical ? <ArrowLeftRight className="w-4 h-4" /> : <ArrowUpDown className="w-4 h-4" />}
                    </Button>
                </div>

                <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>

                {/* ESSENTIAL FORMATTING - Always visible */}
                <div className={`flex ${isVertical ? 'flex-col gap-1 items-center' : 'items-center gap-0.5'} flex-shrink-0`}>
                    {/* Basic Text Formatting */}
                    <Button variant="outline" size="sm"
                        onClick={() => {
                            if (!isEditingDisabled) {
                                editor.chain().focus().toggleBold().run();
                            }
                        }}
                        disabled={isEditingDisabled}
                        className={`h-8 w-8 p-0 ${isActive('bold') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            } ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`h-8 w-8 p-0 ${isActive('italic') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        className={`h-8 w-8 p-0 ${isActive('underline') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Underline"
                    >
                        <Underline className="w-4 h-4" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        className={`h-8 w-8 p-0 ${isActive('strike') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Strikethrough"
                    >
                        <Strikethrough className="w-4 h-4" />
                    </Button>

                    <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>

                    {/* Headings & Blocks Dropdown */}
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
                            // Determine current selection or cursor position

                            // Helper to apply an exclusive block type
                            const applyExclusive = (target: 'paragraph' | 'blockquote' | 'codeBlock' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5') => {
                                const c = editor.chain().focus();
                                // Clear conflicting wrappers first
                                if (target !== 'codeBlock' && editor.isActive('codeBlock')) c.toggleCodeBlock();
                                if (target !== 'blockquote' && editor.isActive('blockquote')) c.toggleBlockquote();

                                // Normalize to paragraph before applying target to avoid mixed states
                                c.setParagraph();

                                switch (target) {
                                    case 'paragraph':
                                        // already set above
                                        break;
                                    case 'blockquote':
                                        c.toggleBlockquote();
                                        break;
                                    case 'codeBlock':
                                        c.toggleCodeBlock();
                                        break;
                                    case 'h1':
                                        c.toggleHeading({ level: 1 });
                                        break;
                                    case 'h2':
                                        c.toggleHeading({ level: 2 });
                                        break;
                                    case 'h3':
                                        c.toggleHeading({ level: 3 });
                                        break;
                                    case 'h4':
                                        c.toggleHeading({ level: 4 });
                                        break;
                                    case 'h5':
                                        c.toggleHeading({ level: 5 });
                                        break;
                                }
                                c.run();
                            };

                            // Headings & Paragraph: if no selection, act on current block to improve UX
                            if (value === 'paragraph' || value === 'h1' || value === 'h2' || value === 'h3' || value === 'h4' || value === 'h5') {
                                applyExclusive(value as any);
                                return;
                            }

                            // Quote & Code Block may apply to the current block even without selection
                            if (value === 'blockquote' || value === 'codeBlock') {
                                applyExclusive(value as any);
                                return;
                            }
                        }}
                    >
                        <SelectTrigger className={isVertical ? "w-8 h-8 p-0 [&>svg]:hidden flex items-center justify-center" : "w-[150px] h-8 text-sm"}>
                            <SelectValue>
                                {isVertical ? (
                                    // Icon-only display in vertical mode
                                    isActive('heading', { level: 1 }) ? <span className="text-lg font-bold">H1</span> :
                                        isActive('heading', { level: 2 }) ? <span className="text-base font-bold">H2</span> :
                                            isActive('heading', { level: 3 }) ? <span className="text-sm font-bold">H3</span> :
                                                isActive('heading', { level: 4 }) ? <span className="text-xs font-bold">H4</span> :
                                                    isActive('heading', { level: 5 }) ? <span className="text-xs font-bold">H5</span> :
                                                        isActive('blockquote') ? <Quote className="w-4 h-4" /> :
                                                            isActive('codeBlock') ? <Code className="w-4 h-4" /> :
                                                                <span className="text-sm font-normal">P</span>
                                ) : (
                                    // Full text display in horizontal mode
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
                                )}
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
                                    <Quote className="w-4 h-4" />
                                    <span>Quote</span>
                                </div>
                            </SelectItem>
                            <SelectItem value="codeBlock">
                                <div className="flex items-center gap-2">
                                    <Code className="w-4 h-4" />
                                    <span>Code Block</span>
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>

                    <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>

                    {/* Font Styling - Bookmark-style hiding */}
                    {true && ( // Font family always visible
                        <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
                            {isVertical ? (
                                // Vertical mode: Popover with icon trigger showing font list
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`h-8 w-8 p-0 flex items-center justify-center ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={isEditingDisabled}
                                            title="Font Family"
                                        >
                                            <Type className="w-4 h-4" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="right" align="center" className="w-48 p-2">
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-medium text-gray-700 mb-2">Font Family</h4>
                                            {FONT_FAMILIES.map(f => (
                                                <button
                                                    key={f}
                                                    onClick={() => {
                                                        if (!isEditingDisabled) {
                                                            editor.chain().focus().setFontFamily(f).run();
                                                            setCurrentFontFamily(f);
                                                        }
                                                    }}
                                                    className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 transition-colors ${currentFontFamily === f ? 'bg-blue-50 text-blue-700 font-medium' : ''
                                                        }`}
                                                    style={{ fontFamily: f }}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                // Horizontal mode: Dropdown selector
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
                                    <SelectTrigger className={`w-[140px] h-8 text-sm ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <SelectValue placeholder={isEditingDisabled ? '' : currentFontFamily} />
                                    </SelectTrigger>
                                    <SelectContent side="bottom">
                                        {FONT_FAMILIES.map(f => (
                                            <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    )}

                    {true && ( // Font size always visible
                        <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
                            {/* Font Size Input with Dropdown - Unified Implementation */}
                            {isVertical ? (
                                // Vertical mode: Button that opens popover to pick size
                                <Popover open={showFontSizePopover} onOpenChange={setShowFontSizePopover}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className={`h-8 w-8 p-0 flex items-center justify-center text-xs font-medium ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={isEditingDisabled}
                                            title={`Font Size: ${fontSizeInput}px`}
                                        >
                                            {fontSizeInput}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent side="right" align="center" className="w-20 p-2">
                                        <div className="space-y-1">
                                            <h4 className="text-xs font-medium text-gray-700 mb-2">Size</h4>
                                            {['4', '6', '8', '10', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '64', '72', '96'].map(size => (
                                                <button
                                                    key={size}
                                                    onClick={() => {
                                                        setIsTyping(false);
                                                        applyFontSize(size);
                                                        setShowFontSizePopover(false);
                                                    }}
                                                    className={`w-full text-center px-2 py-1.5 text-sm rounded hover:bg-gray-100 transition-colors ${fontSizeInput === size ? 'bg-blue-50 text-blue-700 font-medium' : ''
                                                        }`}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            ) : (
                                // Horizontal mode: full input + dropdown
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
                                        className={`w-14 h-8 text-sm text-center border border-gray-300 rounded-l-md bg-white mr-0
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
                                        <SelectTrigger className={`h-8 w-6 border border-l-0 border-gray-300 rounded-l-none rounded-r-md bg-white p-0 flex items-center justify-center [&>svg]:w-3 [&>svg]:h-3
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
                            )}
                        </div>
                    )}

                    {true && ( // Text color always visible
                        <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
                            <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>

                            {/* Text Color with current color indicator */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="h-8 w-8 p-0  flex flex-col justify-center items-center relative">
                                        <Button variant="outline" size="sm"
                                            className="h-7 w-8 bg-white hover:bg-gray-50"
                                            title="Text Color"
                                            disabled={isEditingDisabled}
                                        >
                                            <Highlighter className="w-3 h-3"
                                                style={{
                                                    color: isEditingDisabled ? 'transparent' : (currentTextColor || '#ffffff'),
                                                }} />
                                        </Button>
                                        <div
                                            className="w-7 h-1 mt-0.5 p-[1px] rounded-sm border border-gray-300"
                                            style={{
                                                backgroundColor: isEditingDisabled ? 'transparent' : currentTextColor,
                                                borderColor: currentTextColor ? 'transparent' : '#d1d5db'
                                            }}
                                        />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-4" side={isVertical ? "right" : "bottom"} align="center">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-700">Text Color</h4>

                                        {/* Default Color */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
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
                                                                console.log('Set text color to', color);

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
                    {true && ( // Background color always visible
                        <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <div className="h-8 w-8 p-0 flex flex-col justify-center items-center relative">
                                        <Button variant="outline" size="sm"
                                            className="w-8 h-7 bg-white hover:bg-gray-50"
                                            title="Background Color"
                                            disabled={isEditingDisabled}
                                            style={{
                                                backgroundColor: isEditingDisabled ? 'transparent' : (currentBackgroundColor || '#ffffff'),
                                            }}
                                        >
                                            <Palette className="w-3 h-3" />
                                        </Button>
                                        <div
                                            className="w-7 h-1 mt-0.5 p-[1px] rounded-sm border border-gray-300"
                                            style={{
                                                backgroundColor: isEditingDisabled ? 'transparent' : (currentBackgroundColor || '#ffffff'),
                                                borderColor: currentBackgroundColor ? 'transparent' : '#d1d5db'
                                            }}
                                        />
                                    </div>
                                </PopoverTrigger>
                                <PopoverContent className="w-80 p-4" side={isVertical ? "right" : "bottom"} align="center">
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
                                                className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
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
                                                ✕
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
                                                            className="w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform"
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
                    {shouldShowTextAlign && <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* Text Alignment */}
                    {shouldShowTextAlign && (
                        <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
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
                                <SelectTrigger className="w-16 h-8 px-4 border border-gray-300 bg-white hover:bg-gray-50 [&>svg]:hidden">
                                    <div className="flex items-center justify-between w-full">
                                        <div className="flex items-center">
                                            {editor.isActive({ textAlign: 'center' }) && <AlignCenter className="w-4 h-4" />}
                                            {editor.isActive({ textAlign: 'right' }) && <AlignRight className="w-4 h-4" />}
                                            {editor.isActive({ textAlign: 'justify' }) && <AlignJustify className="w-4 h-4" />}
                                            {(!editor.isActive({ textAlign: 'center' }) &&
                                                !editor.isActive({ textAlign: 'right' }) &&
                                                !editor.isActive({ textAlign: 'justify' })) && <AlignLeft className="w-4 h-4" />}
                                        </div>
                                        <ChevronDown className="w-3 h-3 ml-1 text-gray-500" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="left">
                                        <div className="flex items-center gap-2">
                                            <AlignLeft className="w-4 h-4" />
                                            <span>Left</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="center">
                                        <div className="flex items-center gap-2">
                                            <AlignCenter className="w-4 h-4" />
                                            <span>Center</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="right">
                                        <div className="flex items-center gap-2">
                                            <AlignRight className="w-4 h-4" />
                                            <span>Right</span>
                                        </div>
                                    </SelectItem>
                                    <SelectItem value="justify">
                                        <div className="flex items-center gap-2">
                                            <AlignJustify className="w-4 h-4" />
                                            <span>Justify</span>
                                        </div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Separator before Lists - only show if lists are visible */}
                    {shouldShowLists && <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* Essential Lists */}
                    {shouldShowLists && (
                        <>
                            <Button variant="outline" size="sm"
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                className={`h-8 w-8 p-0 ${isActive('bulletList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                                    }`}
                                title="Bullet List"
                            >
                                <List className="w-4 h-4" />
                            </Button>

                            <Button variant="outline" size="sm"
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                className={`h-8 w-8 p-0 ${isActive('orderedList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                                    }`}
                                title="Numbered List"
                            >
                                <ListOrdered className="w-4 h-4" />
                            </Button>
                            <Button variant="outline"
                                onClick={() => editor.chain().focus().toggleTaskList().run()}
                                className={`h-8 w-8 p-0 ${isActive('taskList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                                    }`}
                                title="Task List"
                            >
                                <CheckSquare className="w-4 h-4" />
                            </Button>
                        </>
                    )}

                    {/* Separator before Indent - only show if indent is visible */}
                    {shouldShowIndent && <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>}

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
                                className={`h-8 w-8 p-0 rounded-md bg-white hover:bg-gray-50 transition-colors text-sm ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Indent"
                            >
                                <IndentIncrease className="w-4 h-4" />
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
                                className={`h-8 w-8 p-0  rounded-md bg-white hover:bg-gray-50 transition-colors text-sm ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title="Outdent"
                            >
                                <IndentDecrease className="w-4 h-4" />
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
                            className={`h-8 w-8 p-0 bg-white hover:bg-gray-50 ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title="Clear All Formatting"
                        >
                            <Eraser className="w-4 h-4" />
                        </Button>
                    )}

                    {/* Separator before Insert Options - only show if insert options are visible */}
                    {shouldShowInsertOptions && <div className={isVertical ? 'h-px w-full bg-gray-200 my-1' : 'w-px h-6 bg-gray-300 mx-0.5'}></div>}

                    {/* INSERT OPTIONS */}
                    {shouldShowInsertOptions && (
                        <div className={`flex ${isVertical ? 'flex-col gap-1' : 'items-center gap-0.5'}`}>
                            {/* Table Grid Selector */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" size="sm"
                                        className={isVertical ? "h-8 w-8 p-0" : "flex items-center gap-1.5 px-2 py-1 h-8 rounded-md hover:bg-gray-100 transition-colors text-sm"}
                                        title="Insert Table"
                                    >
                                        <Table className="w-4 h-4" />
                                        {!isVertical && <span className="hidden lg:inline">Table</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-4" side={isVertical ? "right" : "bottom"} align="start">
                                    <div className="space-y-3">
                                        <h4 className="text-sm font-medium text-gray-700">Insert Table</h4>
                                        <TableGridSelector
                                            onSelect={(rows, cols) => {
                                                editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run();
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
                                className={isVertical ? "h-8 w-8 p-0" : "flex items-center gap-1.5 px-2 py-1 h-8 rounded-md hover:bg-gray-100 transition-colors text-sm"}
                                title="Insert Mermaid Diagram"
                            >
                                <Network className="w-4 h-4" />
                                {!isVertical && <span className="hidden lg:inline">Diagram</span>}
                            </Button>

                            <Button variant="outline" size="sm"
                                onClick={() => {
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
                                }}
                                className={isVertical ? "h-8 w-8 p-0" : "flex items-center gap-1.5 px-2 py-1 h-8 rounded-md hover:bg-gray-100 transition-colors text-sm"}
                                title="Insert Link"
                            >
                                <Link className="w-4 h-4" />
                                {!isVertical && <span className="hidden lg:inline">Link</span>}
                            </Button>
                        </div>
                    )}

                </div>

                {/* Spacing before More Options */}
                {shouldShowMoreOptions && (
                    <div className={isVertical ? 'h-2 w-full' : 'w-px h-6 bg-gray-300 mx-2'}></div>
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
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent align="end" className="w-50">
                                {/* Categorized sections - only show categories when sections are hidden */}

                                {/* INSERT CATEGORY */}
                                {!shouldShowInsertOptions && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide bg-gray-50">
                                            Insert
                                        </div>
                                        <DropdownMenuItem onClick={() => {
                                            editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                                        }}>
                                            <Table className="w-4 h-4 mr-2" />
                                            <span>Table</span>
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
                                            <Network className="w-4 h-4 mr-2" />
                                            <span>Diagram</span>
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
                                            <Link className="w-4 h-4 mr-2" />
                                            <span>Link</span>
                                        </DropdownMenuItem>
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
                                            <AlignLeft className="w-4 h-4 mr-2" />
                                            <span>Left</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('center').run()}>
                                            <AlignCenter className="w-4 h-4 mr-2" />
                                            <span>Center</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('right').run()}>
                                            <AlignRight className="w-4 h-4 mr-2" />
                                            <span>Right</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('justify').run()}>
                                            <AlignJustify className="w-4 h-4 mr-2" />
                                            <span>Justify</span>
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
                                            <IndentIncrease className="w-4 h-4 mr-2" />
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
                                            <IndentDecrease className="w-4 h-4 mr-2" />
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
                                            <CheckSquare className="w-4 h-4 mr-2" />
                                            <span>Task List</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleBulletList().run()}>
                                            <List className="w-4 h-4 mr-2" />
                                            <span>Bullet List</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => editor.chain().focus().toggleOrderedList().run()}>
                                            <ListOrdered className="w-4 h-4 mr-2" />
                                            <span>Ordered List</span>
                                        </DropdownMenuItem>
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
                                            <Eraser className="w-4 h-4 mr-2" />
                                            <span>Clear Formatting</span>
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
