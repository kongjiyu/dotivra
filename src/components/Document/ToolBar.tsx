import type { Editor } from "@tiptap/react";
import { type Tool, useTool } from "../../lib/Tools/Tool";
import { useEffect, useRef, useState } from "react";
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
    IndentIncrease
} from "lucide-react";

const FONT_FAMILIES = [
    "Inter", "Arial", "Georgia", "Roboto", "Courier New", "Times New Roman", "Verdana", "Tahoma", "Monospace",
];

// Define font size options with display names and actual values
const FONT_SIZES = [
    { display: '10', value: '10px' },
    { display: '12', value: '12px' },
    { display: '14', value: '14px' },
    { display: '16', value: '16px' }, // default
    { display: '18', value: '18px' },
    { display: '20', value: '20px' },
    { display: '24', value: '24px' },
    { display: '30', value: '30px' },
    { display: '36', value: '36px' },
    { display: '48', value: '48px' },
    { display: '60', value: '60px' },
    { display: '72', value: '72px' },
];

const ToolBar = ({ editor }: { editor: Editor | null }) => {
    const tool: Tool | null = editor ? useTool(editor) : null;
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [currentFontSize, setCurrentFontSize] = useState<string>('16px');
    const [currentFontFamily, setCurrentFontFamily] = useState<string>("Inter");

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
        <div ref={containerRef} className="toolbar flex flex-wrap items-center gap-1 p-3 m-2 rounded-sm border border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 shadow-sm overflow-visible w-full">

            {/* ESSENTIAL FORMATTING - Always visible */}
            <div className="flex items-center gap-1 flex-shrink-0">
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

                <Button variant="outline" size="sm"
                    onClick={() => editor.chain().focus().toggleCode().run()}
                    className={`h-8 w-8 p-0 ${isActive('code') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                        }`}
                    title="Inline Code"
                >
                    <Code className="w-4 h-4" />
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

                <div className="w-px h-6 bg-gray-300 mx-1"></div>

                {/* Font Styling - Updated to use TipTap extension directly */}
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
                    <PopoverContent className="w-64 p-4" side="bottom" align="center">
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-gray-700">Background Color</h4>

                            {/* Default Background */}
                            <div className="flex items-center gap-2">
                                <button
                                    className="w-8 h-8 rounded-lg border-2 border-gray-300 hover:border-gray-400 transition-colors flex items-center justify-center bg-white text-sm font-medium shadow-sm"
                                    onClick={() => editor?.chain().focus().unsetHighlight().run()}
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
                                            onClick={() => editor?.chain().focus().setHighlight({ color }).run()}
                                            title={name}
                                        />
                                    ))}
                                </div>
                            </div>
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
                    onClick={() => tool.list?.indent()}
                    className=" rounded-md bg-white hover:bg-gray-50 transition-colors  text-sm"
                    title="Indent"
                >
                    <IndentIncrease />
                </Button>

                <Button variant="outline"
                    onClick={() => tool.list?.outdent()}
                    className=" rounded-md bg-white hover:bg-gray-50 transition-colors  text-sm"
                    title="Outdent"
                >
                    <IndentDecrease />
                </Button>
                <Button variant="outline" size="sm"
                    onClick={() => tool.font?.clearMarks()}
                    className="px-3 h-8 bg-white hover:bg-gray-50 text-sm"
                    title="Clear All Formatting"
                >
                    Clear Format
                </Button>
                <div className="w-px h-6 bg-gray-300 mx-1"></div>


            </div>

            {/* MORE OPTIONS DROPDOWN */}
            <div className="relative ml-2 flex-shrink-0">
                <Button variant="outline" size="sm"
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    className="flex items-center px-2 h-8 bg-white hover:bg-gray-50"
                    title="More Options"
                >
                    <MoreHorizontal className="w-4 h-4" />
                </Button>

                {showMoreOptions && (
                    <div className="absolute top-full right-2 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 w-[700px] max-w-[85vw] max-h-[70vh] overflow-auto p-4">
                        <div className="grid grid-cols-1 gap-4">






                            {/* Media & Insert */}
                            <div className="border-b pb-3">
                                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Insert</h4>
                                <div className="flex flex-wrap gap-1">
                                    <Button variant="outline"
                                        onClick={() => {
                                            const rowsInput = window.prompt('Number of rows:', '3');
                                            const colsInput = window.prompt('Number of columns:', '3');
                                            const rows = rowsInput ? Number(rowsInput) : NaN;
                                            const cols = colsInput ? Number(colsInput) : NaN;
                                            if (Number.isFinite(rows) && Number.isFinite(cols) && rows > 0 && cols > 0) {
                                                tool.table?.create(rows, cols);
                                            }
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors  text-sm"
                                        title="Insert Table"
                                    >
                                        <Table className="w-4 h-4" />
                                        Table
                                    </Button>

                                    <Button variant="outline"
                                        onClick={() => {
                                            const url = window.prompt('Enter URL:');
                                            if (url) tool.font?.link(url);
                                        }}
                                        className={`flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors text-sm ${isActive('link') ? 'bg-blue-100 text-blue-600' : ''
                                            }`}
                                        title="Add Link"
                                    >
                                        <Link className="w-4 h-4" />
                                        Link
                                    </Button>
                                </div>
                            </div>

                            {/* Table Operations */}
                            <div>
                                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Table Operations</h4>
                                <div className="flex flex-wrap gap-1">
                                    <Button variant="outline"
                                        onClick={() => tool.table?.row.addBefore()}
                                        className="px-3 py-2 rounded-md hover:bg-gray-100 transition-colors  text-sm"
                                        title="Add Row Before"
                                    >
                                        +Row Above
                                    </Button>

                                    <Button variant="outline"
                                        onClick={() => tool.table?.row.addAfter()}
                                        className="px-3 py-2 rounded-md hover:bg-gray-100 transition-colors  text-sm"
                                        title="Add Row After"
                                    >
                                        +Row Below
                                    </Button>

                                    <Button variant="outline"

                                        onClick={() => tool.table?.column.addBefore()}
                                        className=" px-3 py-2 rounded-md hover:bg-gray-100 transition-colors  text-sm"
                                        title="Add Column Before"
                                    >
                                        +Col Left
                                    </Button>

                                    <Button variant="outline"
                                        onClick={() => tool.table?.column.addAfter()}
                                        className="px-3 py-2 rounded-md hover:bg-gray-100 transition-colors  text-sm"
                                        title="Add Column Right"
                                    >
                                        +Col Right
                                    </Button>

                                    <Button variant="outline"
                                        onClick={() => tool.table?.row.delete()}
                                        className="px-3 py-2 rounded-md hover:bg-red-100 transition-colors text-red-600 text-sm"
                                        title="Delete Row"
                                    >
                                        Delete Row
                                    </Button>

                                    <Button variant="outline"
                                        onClick={() => tool.table?.column.delete()}
                                        className="px-3 py-2 rounded-md hover:bg-red-100 transition-colors text-red-600 text-sm"
                                        title="Delete Column"
                                    >
                                        Delete Col
                                    </Button>

                                    <Button variant="outline"
                                        onClick={() => tool.table?.delete()}
                                        className="px-3 py-2 rounded-md hover:bg-red-100 transition-colors text-red-600 text-sm"
                                        title="Delete Table"
                                    >
                                        Delete Table
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Outside click handled via document listener to avoid blocking scroll */}
        </div>
    );
}

export default ToolBar;
