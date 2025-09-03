import type { Editor } from "@tiptap/react";
import { type Tool, useTool } from "../../lib/Tools/Tool";
import { useState } from "react";
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
    Image,
    Table,
    Link,
    CheckSquare,
    IndentDecrease,
    IndentIncrease
} from "lucide-react";

const FONT_FAMILIES = [
    "Inter", "Arial", "Georgia", "Roboto", "Courier New", "Times New Roman", "Verdana", "Tahoma", "Monospace",
];


const FONT_SIZES = [2, 4, 6, 8, 10, 12, 14, 18, 24, 36, 48, 60, 72, 96];

const ToolBar = ({ editor }: { editor: Editor | null }) => {
    const tool: Tool | null = editor ? useTool(editor) : null;
    const [showMoreOptions, setShowMoreOptions] = useState(false);
    const [currentFontSize, setCurrentFontSize] = useState<number>(16);
    const [currentFontFamily, setCurrentFontFamily] = useState<string>("Inter");

    if (!tool || !editor) return <div>No editor available</div>;

    // Helper for active state
    const isActive = (name: string, attrs?: any) => editor.isActive(name, attrs);

    return (
        <div className="toolbar flex items-center gap-1 p-3 border-b border-gray-200 bg-white shadow-sm">

            {/* ESSENTIAL FORMATTING - Always visible */}
            <div className="flex items-center gap-1">
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
                                    isActive('blockquote') ? 'blockquote' :
                                        isActive('codeBlock') ? 'codeBlock' : 'paragraph'
                    }
                    onValueChange={(value) => {
                        switch (value) {
                            case 'paragraph':
                                editor.chain().focus().setParagraph().run();
                                break;
                            case 'h1':
                                tool.font?.heading(1);
                                break;
                            case 'h2':
                                tool.font?.heading(2);
                                break;
                            case 'h3':
                                tool.font?.heading(3);
                                break;
                            case 'blockquote':
                                editor.chain().focus().toggleBlockquote().run();
                                break;
                            case 'codeBlock':
                                editor.chain().focus().toggleCodeBlock().run();
                                break;
                        }
                    }}
                >
                    <SelectTrigger className="w-[100px] h-8 text-sm">
                        <SelectValue>
                            {isActive('heading', { level: 1 }) && "Heading 1"}
                            {isActive('heading', { level: 2 }) && "Heading 2"}
                            {isActive('heading', { level: 3 }) && "Heading 3"}
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

                {/* Font Styling */}
                <Select onValueChange={(value) => {
                    tool.font?.family(value);
                    setCurrentFontFamily(value);
                }}>
                    <SelectTrigger className="w-[140px] h-8 text-sm">
                        <SelectValue placeholder={currentFontFamily} />
                    </SelectTrigger>
                    <SelectContent>
                        {FONT_FAMILIES.map(f => (
                            <SelectItem key={f} value={f}>{f}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Font Size Adjuster: increment/decrement, manual input with dropdown */}
                <div className="flex items-center gap-1">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-7 p-0 bg-white hover:bg-gray-50"
                        onClick={() => {
                            const newSize = Math.max(1, currentFontSize - 1);
                            setCurrentFontSize(newSize);
                            tool.font?.size(newSize);
                        }}
                        title="Decrease Font Size"
                    >
                        -
                    </Button>

                    {/* Manual input field */}
                    <input
                        type="number"
                        min="1"
                        max="200"
                        value={currentFontSize}
                        onChange={e => {
                            const size = Math.max(1, Math.min(200, parseInt(e.target.value) || 1));
                            setCurrentFontSize(size);
                            tool.font?.size(size);
                        }}
                        className="w-12 h-8 text-sm text-center border border-gray-300 rounded-md bg-white hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                        title="Font Size (Max: 200)"
                    />

                    {/* Dropdown for preset sizes */}
                    <Select
                        value={currentFontSize.toString()}
                        onValueChange={value => {
                            const size = parseInt(value);
                            setCurrentFontSize(size);
                            tool.font?.size(size);
                        }}
                    >
                        <SelectTrigger className="w-4 h-8 p-0 border-none bg-transparent">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                            </svg>
                        </SelectTrigger>
                        <SelectContent>
                            {FONT_SIZES.map(size => (
                                <SelectItem key={size} value={size.toString()}>
                                    {size}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-7 p-0 bg-white hover:bg-gray-50"
                        onClick={() => {
                            const newSize = Math.min(200, currentFontSize + 1);
                            setCurrentFontSize(newSize);
                            tool.font?.size(newSize);
                        }}
                        title="Increase Font Size"
                    >
                        +
                    </Button>
                </div>                <div className="w-px h-6 bg-gray-300 mx-1"></div>

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
                    className={`h-8 w-8 p-0 ${isActive('orderedList') ? 'bg-blue-100 text-blue-600 border-blue-300' : 'bg-white hover:bg-gray-50'
                        }`}
                    title="Task List"
                >
                    <CheckSquare className="w-4 h-4" />
                </Button>

                <div className="w-px h-6 bg-gray-300 mx-1"></div>


                <Button variant="outline"
                    onClick={() => tool.list?.sink("listItem")}
                    className=" rounded-md bg-white hover:bg-gray-50 transition-colors  text-sm"
                    title="Indent"
                >
                    <IndentDecrease />
                </Button>

                <Button variant="outline"
                    onClick={() => tool.list?.lift("listItem")}
                    className=" rounded-md bg-white hover:bg-gray-50 transition-colors  text-sm"
                    title="Outdent"
                >
                    <IndentIncrease />
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
            <div className="relative ml-2">
                <Button variant="outline" size="sm"
                    onClick={() => setShowMoreOptions(!showMoreOptions)}
                    className="flex items-center gap-1 px-3 h-8 bg-white hover:bg-gray-50"
                    title="More Options"
                >
                    <MoreHorizontal className="w-4 h-4" />
                    <span className="text-sm">More</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showMoreOptions ? 'rotate-180' : ''}`} />
                </Button>

                {showMoreOptions && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[600px] p-4">
                        <div className="grid grid-cols-1 gap-4">






                            {/* Media & Insert */}
                            <div className="border-b pb-3">
                                <h4 className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Insert</h4>
                                <div className="flex flex-wrap gap-1">
                                    <Button variant="outline"
                                        onClick={() => {
                                            const url = window.prompt('Enter image URL:');
                                            const alt = window.prompt('Enter alt text (optional):');
                                            const title = window.prompt('Enter title (optional):');
                                            if (url) tool.image(url, alt || '', title || '');
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors  text-sm"
                                        title="Insert Image"
                                    >
                                        <Image className="w-4 h-4" />
                                        Image
                                    </Button>

                                    <Button variant="outline"
                                        onClick={() => {
                                            const rows = Number(window.prompt('Number of rows:', '3'));
                                            const cols = Number(window.prompt('Number of columns:', '3'));
                                            if (rows && cols) tool.table?.create(rows, cols);
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

                        <div className="mt-3 pt-3 border-t">
                            <Button variant="outline"
                                onClick={() => setShowMoreOptions(false)}
                                className="w-full px-3 py-2 text-sm text-gray-500 hover: transition-colors"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Close dropdown when clicking outside */}
            {showMoreOptions && (
                <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMoreOptions(false)}
                />
            )}
        </div>
    );
}

export default ToolBar;
