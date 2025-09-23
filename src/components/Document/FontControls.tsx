import React from "react";
import { Editor } from "@tiptap/react";
import {
    ChevronDown,
    Check
} from "lucide-react";

interface FontControlsProps {
    editor: Editor | null;
}

const fontSizes = [
    { title: "Default", value: "" },
    { title: "Small", value: "0.875rem" },
    { title: "Normal", value: "1rem" },
    { title: "Medium", value: "1.125rem" },
    { title: "Large", value: "1.25rem" },
    { title: "XL", value: "1.5rem" },
    { title: "2XL", value: "1.75rem" },
    { title: "3XL", value: "2rem" },
];

const fontFamilies = [
    { title: "Default", value: "" },
    { title: "Sans", value: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif" },
    { title: "Serif", value: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" },
    { title: "Mono", value: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" },
    { title: "Inter", value: "Inter, ui-sans-serif, system-ui" },
    { title: "Poppins", value: "Poppins, ui-sans-serif, system-ui" },
];

export const FontControls: React.FC<FontControlsProps> = ({ editor }) => {
    const [fontSizeOpen, setFontSizeOpen] = React.useState(false);
    const [fontFamilyOpen, setFontFamilyOpen] = React.useState(false);

    const fontSizeRef = React.useRef<HTMLDivElement>(null);
    const fontFamilyRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fontSizeRef.current && !fontSizeRef.current.contains(event.target as Node)) {
                setFontSizeOpen(false);
            }
            if (fontFamilyRef.current && !fontFamilyRef.current.contains(event.target as Node)) {
                setFontFamilyOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (!editor) return null;

    const currentFontSize = editor.getAttributes('textStyle').fontSize || "";
    const currentFontFamily = editor.getAttributes('textStyle').fontFamily || "";

    const currentFontSizeTitle = fontSizes.find(size => size.value === currentFontSize)?.title || "Default";
    const currentFontFamilyTitle = fontFamilies.find(font => font.value === currentFontFamily)?.title || "Default";

    return (
        <div className="flex items-center space-x-1">
            {/* Font Family Dropdown */}
            <div ref={fontFamilyRef} className="relative">
                <button
                    type="button"
                    onClick={() => setFontFamilyOpen(!fontFamilyOpen)}
                    className="flex items-center justify-between h-7 px-2 rounded text-sm bg-white border border-gray-200 hover:bg-gray-50 focus:outline-none"
                >
                    <span className="mr-1 truncate max-w-[80px]">{currentFontFamilyTitle}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {fontFamilyOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1">
                        {fontFamilies.map((font) => (
                            <button
                                key={font.title}
                                onClick={() => {
                                    if (font.value) {
                                        editor.chain().focus().setFontFamily(font.value).run();
                                    } else {
                                        // If "Default" option selected, unset the font family
                                        editor.chain().focus().unsetFontFamily().run();
                                    }
                                    setFontFamilyOpen(false);
                                }}
                                className="flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-gray-100"
                                style={font.value ? { fontFamily: font.value } : {}}
                            >
                                <span>{font.title}</span>
                                {currentFontFamily === font.value && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Font Size Dropdown */}
            <div ref={fontSizeRef} className="relative">
                <button
                    type="button"
                    onClick={() => setFontSizeOpen(!fontSizeOpen)}
                    className="flex items-center justify-between h-7 px-2 rounded text-sm bg-white border border-gray-200 hover:bg-gray-50 focus:outline-none"
                >
                    <span className="mr-1">{currentFontSizeTitle}</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {fontSizeOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg py-1">
                        {fontSizes.map((size) => (
                            <button
                                key={size.title}
                                onClick={() => {
                                    if (size.value) {
                                        editor.chain().focus().setFontSize(size.value).run();
                                    } else {
                                        editor.chain().focus().unsetFontSize().run();
                                    }
                                    setFontSizeOpen(false);
                                }}
                                className="flex items-center justify-between w-full px-3 py-1.5 text-sm hover:bg-gray-100"
                            >
                                <span>{size.title}</span>
                                {currentFontSize === size.value && <Check className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};