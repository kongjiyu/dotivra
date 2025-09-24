import type { Editor } from "@tiptap/react";
import { type Tool, useTool } from "../../lib/Tools/Tool";
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



const ToolBar = ({ editor }: { editor: Editor | null }) => {
    const tool: Tool | null = editor ? useTool(editor) : null;
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
    const [currentFontFamily, setCurrentFontFamily] = useState<string>("Inter");
    const [linkTooltipOpen, setLinkTooltipOpen] = useState(false);
    const [linkTooltipPosition, setLinkTooltipPosition] = useState({ x: 0, y: 0 });
    const [selectedTextForLink, setSelectedTextForLink] = useState<string>('');
    const [isEditingLink, setIsEditingLink] = useState(false);
    const [existingLinkUrl, setExistingLinkUrl] = useState<string>('');

    // Get current font attributes from editor when selection changes
    useEffect(() => {
        if (!editor) return;

        const updateFontAttributes = () => {
            const attrs = editor.getAttributes('textStyle');

            // Update font family if set
            if (attrs.fontFamily) {
                setCurrentFontFamily(attrs.fontFamily);
            }

            // Update font size if set
            if (attrs.fontSize) {
                setCurrentFontSize(attrs.fontSize);
            }
        };

        // Listen for selection changes
        editor.on('selectionUpdate', updateFontAttributes);
        editor.on('transaction', updateFontAttributes);

        return () => {
            editor.off('selectionUpdate', updateFontAttributes);
            editor.off('transaction', updateFontAttributes);
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

    if (!tool || !editor) return <div>No editor available</div>;

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

    // Get the display value for the current font size
    const getCurrentFontSizeDisplay = () => {
        // Strip 'px' and convert to number for display
        if (!currentFontSize) return '16';
        const sizeMatch = currentFontSize.match(/^(\d+)px$/);
        return sizeMatch ? sizeMatch[1] : '16';
    };

    // Apply font size with proper px unit
    const applyFontSize = (size: string) => {
        const newSize = `${size}px`;
        setCurrentFontSize(newSize);
        editor.chain().focus().setFontSize(newSize).run();
    };

    return (
        <div ref={containerRef} className="toolbar flex items-center gap-1 p-3 m-2 rounded-sm border border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm overflow-hidden w-full">

            {/* ESSENTIAL FORMATTING - Always visible */}
            <div className="flex items-center gap-1 flex-shrink-0 overflow-hidden">
                {/* Basic Text Formatting */}
                <Button variant="outline" size="sm"
                    onClick={() => tool.font?.bold()}
                    className={`h-8 w-8 p-0 ${isActive('bold') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                        }`}
                    title="Bold"
                >
                    <Bold className="w-4 h-4" />
                </Button>

                <Button variant="outline" size="sm"
                    onClick={() => tool.font?.italic()}
                    className={`h-8 w-8 p-0 ${isActive('italic') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                        }`}
                    title="Italic"
                >
                    <Italic className="w-4 h-4" />
                </Button>

                <Button variant="outline" size="sm"
                    onClick={() => tool.font?.underline()}
                    className={`h-8 w-8 p-0 ${isActive('underline') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                        }`}
                    title="Underline"
                >
                    <Underline className="w-4 h-4" />
                </Button>

                <Button variant="outline" size="sm"
                    onClick={() => tool.font?.strikethrough()}
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
                        value={currentFontFamily}
                        onValueChange={(value) => {
                            editor.chain().focus().setFontFamily(value).run();
                            setCurrentFontFamily(value);
                        }}
                    >
                        <SelectTrigger className="w-[140px] h-8 text-sm">
                            <SelectValue placeholder={currentFontFamily} />
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_FAMILIES.map(f => (
                                <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Enhanced Font Size Selector with card-like appearance */}
                    <div className="relative">
                        <Popover>
                            <PopoverTrigger asChild>
                                <div className="flex items-center h-8 rounded-md border border-input bg-background">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation(); // Prevent popover from opening
                                            const currentSize = parseInt(getCurrentFontSizeDisplay(), 10);
                                            if (currentSize > 1) {
                                                applyFontSize((currentSize - 1).toString());
                                            }
                                        }}
                                        className="h-full px-1.5 flex items-center justify-center border-r border-input 
                                    text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-l-md"
                                    >
                                        -
                                    </button>

                                    <input
                                        type="text"
                                        value={getCurrentFontSizeDisplay()}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/[^\d]/g, '');
                                            if (val === '') {
                                                setCurrentFontSize('');
                                                return;
                                            }

                                            const numVal = parseInt(val, 10);
                                            if (numVal >= 0 && numVal <= 100) {
                                                applyFontSize(numVal.toString());
                                            }
                                        }}
                                        onBlur={(e) => {
                                            // If empty or 0, reset to default (16)
                                            if (e.target.value === '' || parseInt(e.target.value, 10) === 0) {
                                                applyFontSize('16');
                                            }
                                        }}
                                        className="h-full w-8 bg-transparent text-sm text-center focus:outline-none"
                                    />


                                    <div className="flex items-center h-full">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation(); // Prevent popover from opening
                                                const currentSize = parseInt(getCurrentFontSizeDisplay(), 10);
                                                if (currentSize < 100) {
                                                    applyFontSize((currentSize + 1).toString());
                                                }
                                            }}
                                            className="h-full px-1.5 flex items-center justify-center border-l border-input 
                                        text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        >
                                            +
                                        </button>

                                    </div>
                                </div>
                            </PopoverTrigger>

                            <PopoverContent align="center" side="bottom" className="p-0 w-16 border border-gray-300">
                                <ul className="py-1 text-sm">
                                    {['8', '9', '10', '11', '12', '14', '18', '24', '30', '36', '48', '60', '72', '96'].map(disp => {
                                        const isActiveSize = getCurrentFontSizeDisplay() === disp;
                                        return (
                                            <li key={disp}>
                                                <button
                                                    type="button"
                                                    onClick={() => applyFontSize(disp)}
                                                    className={`w-full text-left px-3 py-1.5 hover:bg-gray-100 
                                                focus:bg-gray-100 focus:outline-none
                                                ${isActiveSize ? 'bg-gray-100' : ''}`}
                                                >
                                                    {disp}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    {/* Text Color: 8 most used colors for light theme */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm"
                                className="h-8 w-8 p-0 bg-white hover:bg-gray-50"
                                title="Text Color"
                            >
                                <Palette className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4" side="bottom" align="center">
                            <div className="space-y-3">
                                <h4 className="text-sm font-medium text-gray-700">Text Color</h4>

                                {/* Default Color */}
                                <div className="flex items-center gap-2">
                                    <button
                                        className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
                                        onClick={() => tool.font?.clearColor()}
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
                                                onClick={() => tool.font?.color(color)}
                                                title={name}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>

                    {/* Background Color: Same 8 colors */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm"
                                className="h-8 w-8 p-0 bg-white hover:bg-gray-50"
                                title="Background Color"
                            >
                                <Highlighter className="w-4 h-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" side="bottom" align="center">
                            <div className="space-y-4">
                                <h4 className="text-sm font-medium text-gray-700">Background Color</h4>

                                {/* Context Detection */}
                                <div className="text-xs text-gray-500 bg-blue-50 p-2 rounded">
                                    {editor?.isActive('tableCell')
                                        ? "💡 You're in a table cell - colors will be applied to the cell background"
                                        : "💡 Colors will be applied as text highlighting"
                                    }
                                </div>

                                {/* Default Background */}
                                <div className="flex items-center gap-2">
                                    <button
                                        className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
                                        onClick={() => {
                                            if (editor?.isActive('tableCell')) {
                                                // Remove cell background
                                                editor?.chain().focus().updateAttributes('tableCell', { style: '' }).run();
                                            } else {
                                                // Remove text highlighting
                                                editor?.chain().focus().unsetHighlight().run();
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
                                                    if (editor?.isActive('tableCell')) {
                                                        // Apply to table cell background
                                                        editor?.chain().focus().updateAttributes('tableCell', {
                                                            style: `background-color: ${color}`
                                                        }).run();
                                                    } else {
                                                        // Apply as text highlighting
                                                        editor?.chain().focus().setHighlight({ color }).run();
                                                    }
                                                }}
                                                title={name}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Table Cell Colors */}
                                {editor?.isActive('tableCell') && (
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
                                                        editor?.chain().focus().updateAttributes('tableCell', {
                                                            style: `background-color: ${color}`
                                                        }).run();
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
                        onClick={() => tool.list?.bullet()}
                        className={`h-8 w-8 p-0 ${isActive('bulletList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </Button>

                    <Button variant="outline" size="sm"
                        onClick={() => tool.list?.ordered()}
                        className={`h-8 w-8 p-0 ${isActive('orderedList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                            }`}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </Button>
                    <Button variant="outline"
                        onClick={() => tool.list?.task()}
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
                        onClick={() => tool.font?.clearMarks()}
                        className="h-8 w-8 p-0 bg-white hover:bg-gray-50"
                        title="Clear All Formatting"
                    >
                        <Eraser className="w-4 h-4" />
                    </Button>

                    <div className="w-px h-6 bg-gray-300 mx-1"></div>

                    {/* INSERT OPTIONS - Always visible */}
                    <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm"
                            onClick={() => {
                                const rowsInput = window.prompt('Number of rows:', '3');
                                const colsInput = window.prompt('Number of columns:', '3');
                                const rows = rowsInput ? Number(rowsInput) : NaN;
                                const cols = colsInput ? Number(colsInput) : NaN;
                                if (Number.isFinite(rows) && Number.isFinite(cols) && rows > 0 && cols > 0) {
                                    tool.table?.create(rows, cols);
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1 h-8 rounded-md hover:bg-gray-100 transition-colors text-sm"
                            title="Insert Table"
                        >
                            <Table className="w-4 h-4" />
                            <span className="hidden lg:inline">Table</span>
                        </Button>

                        <Button variant="outline" size="sm"
                            onClick={() => {
                                const defaultChart = `graph TD
                                            A[Start] --> B{Decision}
                                            B -->|Yes| C[Do something]
                                            B -->|No| D[Do something else]
                                            C --> E[End]
                                            D --> E`;

                                const chart = window.prompt('Enter Mermaid diagram code:', defaultChart);
                                if (chart && chart.trim()) {
                                    editor?.commands.insertMermaidDiagram({ chart: chart.trim() });
                                }
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
                            <DropdownMenuItem onClick={() => tool.list?.task()}>
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
