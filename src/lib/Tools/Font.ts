import type { Editor } from "@tiptap/react";

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

interface Font {
    editor: Editor | null;
    color: (color: string) => boolean;
    
    clearColor: () => boolean;
    
    link:(href: string, text?: string, openInNewTab?: boolean) => boolean;
    
    unlink: () => boolean;
    
    bold: () => boolean;
    
    italic: () => boolean;
    
    underline: () => boolean;
    
    strikethrough: () => boolean;
    
    highlight: () => boolean;
    
    clearMarks: () => boolean;
    
    heading: (level: HeadingLevel) => boolean;
    
    size: (size: number) => boolean;
    
    family: (family: string) => boolean;
}

const font: Font = {
    editor: null,
    color: function (color: string): boolean {
        if (this.editor) {
            return this.editor.chain().focus().setColor(color).run();
        }
        return false;
    },
    clearColor: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().unsetColor().run();
        }
        return false;
    },
    link(href: string, text?: string): boolean {
        if (this.editor) {
            const { from, to } = this.editor.state.selection;
            
            if (text && from === to) {
                // No selection and custom text provided - insert new content
                return this.editor.chain().focus().insertContent(`<a href="${href}">${text}</a>`).run();
            } else if (text && from !== to) {
                // Selection exists and custom text provided - replace with custom text
                return this.editor.chain().focus().insertContent(`<a href="${href}">${text}</a>`).run();
            } else {
                // Default behavior - apply link to selection or insert URL as text
                if (from === to) {
                    // No selection - insert URL as text with link
                    return this.editor.chain().focus().insertContent(`<a href="${href}">${href}</a>`).run();
                } else {
                    // Apply link to current selection
                    return this.editor.chain().focus().setLink({ href: href }).run();
                }
            }
        }
        
        return false;
    },
    unlink(): boolean {
        if (this.editor) {
            return this.editor.chain().focus().unsetLink().run();
        }
        return false;
    },
    bold: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleBold().run();
        }
        return false;
    },
    italic: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleItalic().run();
        }
        return false;
    },
    underline: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleUnderline().run();
        }
        return false;
    },
    strikethrough: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleStrike().run();
        }
        return false;
    },
    highlight: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleHighlight().run();
        }
        return false;
    },
    clearMarks: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().unsetAllMarks().run();
        }
        return false;
    },
    heading: function (level: HeadingLevel): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleHeading({ level : level}).run();
        }
        return false;
    },
    size: function (size: number): boolean {
        if (this.editor) {
            return this.editor.chain().focus().setFontSize(size.toString()).run();
        }
        return false;
    },
    family: function (family: string): boolean {
        if (this.editor) {
            return this.editor.chain().focus().setFontFamily(family).run();
        }
        return false;
    }
};

function useFont(editor: Editor): Font {
    font.editor = editor;
    return font;
}
    
export { type Font, type HeadingLevel, useFont };

