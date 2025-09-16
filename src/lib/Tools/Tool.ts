import type { Editor } from "@tiptap/react";

import { type Font, useFont } from "./Font";
import { type List, useList } from "./List";
import { type Table, useTable } from "./Table";

interface Tool {
    editor: Editor | null;

    font: Font | null;

    list: List | null;

    table: Table | null;

    image: (src: string, alt?: string, title?: string) => boolean;

    undo: () => boolean;

    redo: () => boolean;

    search: (query: string) => boolean;
} 

const Tool: Tool = {
    editor: null,
    font: null,
    list: null,
    table: null,
    undo: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().undo().run();
        }
        return false;
    },
    redo: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().redo().run();
        }
        return false;
    },
    image: function (src: string, alt = "", title = ""): boolean {
        if (this.editor) {
            return this.editor.chain().focus().setImage({ src, alt, title }).run();
        }
        return false;
    },
    search: function (_query: string): boolean {
        if (this.editor) {
            return true;
            //return this.editor.chain().focus().search(query).run();
        }
        return false;
    }
}; 

function useTool(editor: Editor, font?: Font, list?: List, table?: Table): Tool {
    if (!font)
        font = useFont(editor);

    if (!list)
        list = useList(editor);

    if (!table)
        table = useTable(editor);
    
    return {
        editor,
        font,
        list,
        table,
        undo: Tool.undo,
        redo: Tool.redo,
        image: Tool.image,
        search: Tool.search,
    };
}

export { type Tool, useTool };