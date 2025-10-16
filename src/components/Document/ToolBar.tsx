import type { Editor } from "@tiptap/react";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import LinkTooltip from "./LinkTooltip";
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
    Link,
    CheckSquare,
    IndentDecrease,
    IndentIncrease,
    Network,
    Eraser
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
    const [isInCodeBlock, setIsInCodeBlock] = useState(false);
    const [isInPreviewMode, setIsInPreviewMode] = useState(false);
    const [linkTooltipOpen, setLinkTooltipOpen] = useState(false);
    const [linkTooltipPosition, setLinkTooltipPosition] = useState({ x: 0, y: 0 });
    const [selectedTextForLink, setSelectedTextForLink] = useState<string>('');
    const [isEditingLink, setIsEditingLink] = useState(false);
    const [existingLinkUrl, setExistingLinkUrl] = useState<string>('');

    // Check if editing should be disabled - moved to top to avoid hoisting issues
    const isEditingDisabled = readOnly || isInPreviewMode || isInCodeBlock;

    // Get current font attributes and heading state from editor when selection changes
    useEffect(() => {
        if (!editor) return;

        const updateToolbarState = () => {
            // Check if we're in a code block first
            const inCodeBlock = editor.isActive('codeBlock');
            setIsInCodeBlock(inCodeBlock);

            // Check if we're in Mermaid preview mode by looking for preview elements
            const previewElements = document.querySelectorAll('[data-mermaid-preview="true"]');
            const inPreviewMode = previewElements.length > 0;
            setIsInPreviewMode(inPreviewMode);

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

            // Update text color
            const textColor = textStyleAttrs.color || '#000000';
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

    if (!editor) return <div>No editor available</div>;

    // Helper for active state
    const isActive = (name: string, attrs?: any) => editor.isActive(name, attrs);

    const containerRef = useRef<HTMLDivElement | null>(null);

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

    // Simple font size input handling
    const [fontSizeInput, setFontSizeInput] = useState<string>('16');

    // Sync input field with current font size
    useEffect(() => {
        if (currentFontSize && !isEditingDisabled) {
            const sizeMatch = currentFontSize.match(/^(\d+)px$/);
            const displaySize = sizeMatch ? sizeMatch[1] : '16';
            setFontSizeInput(displaySize);
        } else if (isEditingDisabled) {
            setFontSizeInput('');
        }
    }, [currentFontSize, isEditingDisabled]);

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

    return (
        <div ref={containerRef} className="toolbar flex items-center gap-1 p-3 m-2 rounded-sm border border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm overflow-hidden w-full">

            {/* ESSENTIAL FORMATTING - Always visible */}
            <div className="flex items-center gap-1 flex-shrink-0 overflow-hidden">
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

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

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
                    <SelectTrigger className="w-[150px] h-8 text-sm">
                        <SelectValue>
                            {isActive('heading', { level: 1 }) && "Heading 1"}
                            {isActive('heading', { level: 2 }) && "Heading 2"}
                            {isActive('heading', { level: 3 }) && "Heading 3"}
                            {isActive('heading', { level: 4 }) && "Heading 4"}
                            {isActive('heading', { level: 5 }) && "Heading 5"}
                            {isActive('blockquote') && "Quote"}
                            {isActive('codeBlock') && "Code Block"}
                            {(!isActive('heading') && !isActive('blockquote') && !isActive('codeBlock')) && "Paragraph"}
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

                <div className="w-px h-6 bg-gray-300 mx-1 hidden md:block"></div>

                {/* Font Styling - Hidden on smaller screens */}
                <div className="hidden lg:flex items-center gap-1">
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
                        <SelectContent>
                            {FONT_FAMILIES.map(f => (
                                <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Font Size Input with Popover */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <input
                                type="number"
                                min="1"
                                max="200"
                                value={isEditingDisabled ? '' : fontSizeInput}
                                onChange={(e) => {
                                    if (!isEditingDisabled) {
                                        const val = e.target.value;
                                        setFontSizeInput(val);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isEditingDisabled) {
                                        e.preventDefault();
                                        const val = fontSizeInput.trim();
                                        if (val && parseInt(val, 10) > 0) {
                                            applyFontSize(val);
                                        }
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                onBlur={(e) => {
                                    if (!isEditingDisabled) {
                                        const val = e.target.value.trim();
                                        if (val && parseInt(val, 10) > 0) {
                                            applyFontSize(val);
                                        }
                                    }
                                }}
                                disabled={isEditingDisabled}
                                placeholder={isEditingDisabled ? '' : 'Size'}
                                className={`w-16 h-8 text-sm text-center border border-input rounded-md bg-background cursor-pointer
                                           [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
                                           ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : 'focus:outline-none focus:border-blue-500 hover:border-gray-400'}`}
                                title="Font size - click for quick options"
                            />
                        </PopoverTrigger>
                        <PopoverContent align="center" side="bottom" className="p-0 w-20 border border-gray-300">
                            <div className="py-1 text-sm max-h-48 overflow-y-auto">
                                {['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '40', '48', '56', '64', '72', '80', '96', '120'].map(size => {
                                    const isActiveSize = fontSizeInput === size;
                                    return (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => {
                                                if (!isEditingDisabled) {
                                                    applyFontSize(size);
                                                }
                                            }}
                                            className={`w-full text-center px-3 py-1.5 hover:bg-gray-100 
                                                       focus:bg-gray-100 focus:outline-none transition-colors
                                                       ${isActiveSize ? 'bg-blue-100 text-blue-600 font-medium' : ''}
                                                       ${isEditingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            disabled={isEditingDisabled}
                                        >
                                            {size}
                                        </button>
                                    );
                                })}
                            </div>
                        </PopoverContent>
                    </Popover>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    {/* Text Color with current color indicator */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="h-8 w-8 p-0  flex flex-col justify-center items-center relative">
                                <Button variant="outline" size="sm"
                                    className=" bg-white hover:bg-gray-50"
                                    title="Text Color"
                                    disabled={isEditingDisabled}
                                >
                                    <Highlighter className="w-3 h-3" />
                                </Button>
                                <div
                                    className="w-8 h-1 mt-0.5 rounded-sm border border-gray-300"
                                    style={{ backgroundColor: isEditingDisabled ? 'transparent' : currentTextColor }}
                                />
                            </div>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4" side="bottom" align="center">
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700">Text Color</h4>

                                {/* Default Color */}
                                <div className="flex items-center gap-2">
                                    <button
                                        className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
                                        onClick={() => {
                                            if (!isEditingDisabled) {
                                                editor.chain().focus().unsetColor().run();
                                                setCurrentTextColor('#000000');
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
                                                        setCurrentTextColor(color);
                                                        console.log('Set text color to', color);
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

                    {/* Background Color with current color indicator */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <div className="h-8 w-8 p-0 flex flex-col justify-center items-center relative">
                                <Button variant="outline" size="sm"
                                    className="bg-white hover:bg-gray-50"
                                    title="Background Color"
                                    disabled={isEditingDisabled}
                                >
                                    <Palette className="w-3 h-3" />
                                </Button>
                                <div
                                    className="w-8 h-1 mt-0.5 p-0 rounded-sm border border-gray-300"
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

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    {/* Alignment Dropdown */}
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

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    {/* Essential Lists */}
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

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>


                    <Button variant="outline"
                        onClick={() => {
                            // Universal indent command for both paragraphs and headings
                            // Silently do nothing if at maximum limit - no visual feedback
                            if (editor) {
                                if (editor.isActive('paragraph')) {
                                    editor.chain().focus().indentParagraph().run();
                                } else if (editor.isActive('heading')) {
                                    editor.chain().focus().indentHeading().run();
                                }
                            }
                        }}
                        className="rounded-md bg-white hover:bg-gray-50 transition-colors text-sm"
                        title="Indent"
                    >
                        <IndentIncrease />
                    </Button>

                    <Button variant="outline"
                        onClick={() => {
                            // Universal outdent command for both paragraphs and headings
                            // Silently do nothing if at minimum level (0) - no visual feedback
                            if (editor) {
                                if (editor.isActive('paragraph')) {
                                    editor.chain().focus().outdentParagraph().run();
                                } else if (editor.isActive('heading')) {
                                    editor.chain().focus().outdentHeading().run();
                                }
                            }
                        }}
                        className="rounded-md bg-white hover:bg-gray-50 transition-colors text-sm"
                        title="Outdent"
                    >
                        <IndentDecrease />
                    </Button>
                    <Button variant="outline" size="sm"
                        onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                        className="h-8 w-8 p-0 bg-white hover:bg-gray-50"
                        title="Clear All Formatting"
                    >
                        <Eraser className="w-4 h-4" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    {/* INSERT OPTIONS - Always visible */}
                    <div className="flex items-center gap-1">
                        {/* Table Grid Selector */}
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="outline" size="sm"
                                    className="flex items-center gap-2 px-3 py-1 h-8 rounded-md hover:bg-gray-100 transition-colors text-sm"
                                    title="Insert Table"
                                >
                                    <Table className="w-4 h-4" />
                                    <span className="hidden lg:inline">Table</span>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-64 p-4" side="bottom" align="start">
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
                            className="flex items-center gap-2 px-3 py-1 h-8 rounded-md hover:bg-gray-100 transition-colors text-sm"
                            title="Insert Mermaid Diagram"
                        >
                            <Network className="w-4 h-4" />
                            <span className="hidden lg:inline">Diagram</span>
                        </Button>

                        <Button variant="outline" size="sm"
                            onClick={(e) => {
                                // Check if we're currently in a link
                                const currentLink = editor?.getAttributes('link');

                                if (currentLink?.href) {
                                    // If already a link, remove it
                                    editor?.chain().focus().unsetLink().run();
                                    return;
                                }

                                // Get selected text
                                const { state } = editor || { state: null };
                                if (!state) return;

                                const { from, to } = state.selection;
                                const selectedText = state.doc.textBetween(from, to, '');

                                // Always show tooltip - with or without selected text
                                setSelectedTextForLink(selectedText);
                                setIsEditingLink(false);
                                setExistingLinkUrl('');

                                // Get cursor position for tooltip
                                const rect = e.currentTarget.getBoundingClientRect();
                                setLinkTooltipPosition({
                                    x: rect.left + rect.width / 2,
                                    y: rect.bottom + 8
                                });

                                setLinkTooltipOpen(true);
                            }}
                            className={`flex items-center gap-2 px-3 py-1 h-8 rounded-md hover:bg-gray-100 transition-colors text-sm ${isActive('link') ? 'bg-blue-100 text-blue-600' : ''
                                }`}
                            title="Add Link"
                        >
                            <Link className="w-4 h-4" />
                            <span className="hidden lg:inline">Link</span>
                        </Button>
                    </div>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>
                </div>

                {/* MORE OPTIONS DROPDOWN - Contains overflow items */}
                <div className="relative ml-auto flex-shrink-0">
                    <DropdownMenu open={showMoreOptions} onOpenChange={setShowMoreOptions}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm"
                                className="flex items-center px-2 h-8 bg-white hover:bg-gray-50"
                                title="More Options"
                            >
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-56">
                            {/* Font Controls for smaller screens */}
                            <div className="lg:hidden">
                                <DropdownMenuItem onClick={() => {
                                    // Font family selector would go here - could implement a submenu
                                }}>
                                    <span>Font Family</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </div>

                            {/* Color controls for mobile */}
                            <div className="md:hidden">
                                <DropdownMenuItem onClick={() => {
                                    // Color picker would go here
                                }}>
                                    <Palette className="w-4 h-4 mr-2" />
                                    <span>Text Color</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                    // Highlight color picker would go here
                                }}>
                                    <Highlighter className="w-4 h-4 mr-2" />
                                    <span>Highlight</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </div>

                            {/* Alignment */}
                            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('left').run()}>
                                <AlignLeft className="w-4 h-4 mr-2" />
                                <span>Align Left</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('center').run()}>
                                <AlignCenter className="w-4 h-4 mr-2" />
                                <span>Align Center</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('right').run()}>
                                <AlignRight className="w-4 h-4 mr-2" />
                                <span>Align Right</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editor?.chain().focus().setTextAlign('justify').run()}>
                                <AlignJustify className="w-4 h-4 mr-2" />
                                <span>Justify</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Lists */}
                            <DropdownMenuItem onClick={() => editor.chain().focus().toggleTaskList().run()}>
                                <CheckSquare className="w-4 h-4 mr-2" />
                                <span>Task List</span>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            {/* Indentation */}
                            <DropdownMenuItem onClick={() => {
                                if (editor?.isActive('paragraph')) {
                                    editor.chain().focus().indentParagraph().run();
                                } else if (editor?.isActive('heading')) {
                                    editor.chain().focus().indentHeading().run();
                                }
                            }}>
                                <IndentIncrease className="w-4 h-4 mr-2" />
                                <span>Increase Indent</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem onClick={() => {
                                if (editor?.isActive('paragraph')) {
                                    editor.chain().focus().outdentParagraph().run();
                                } else if (editor?.isActive('heading')) {
                                    editor.chain().focus().outdentHeading().run();
                                }
                            }}>
                                <IndentDecrease className="w-4 h-4 mr-2" />
                                <span>Decrease Indent</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Outside click handled via document listener to avoid blocking scroll */}

                {/* Link Tooltip */}
                {editor && (
                    <LinkTooltip
                        editor={editor}
                        isOpen={linkTooltipOpen}
                        onClose={() => {
                            setLinkTooltipOpen(false);
                            setIsEditingLink(false);
                            setExistingLinkUrl('');
                            setSelectedTextForLink('');
                        }}
                        position={linkTooltipPosition}
                        selectedText={selectedTextForLink}
                        isEditing={isEditingLink}
                        existingUrl={existingLinkUrl}
                    />
                )}
            </div>
        </div>
    );
}

export default ToolBar;
