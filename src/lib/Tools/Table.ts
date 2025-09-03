import type { Editor } from "@tiptap/react";

interface Table {
    editor: Editor | null;

    create: (row: number, col: number) => boolean;

    delete: () => boolean;

    row: Row;

    column: Column;

    clear: () => boolean;
}

interface Column {
    editor: Editor | null;
    addBefore: () => boolean;
    addAfter: () => boolean;
    delete: () => boolean;
};

interface Row {
    editor: Editor | null;
    addBefore: () => boolean;
    addAfter: () => boolean;
    delete: () => boolean;
};

const column: Column = {
    editor: null,
    addBefore: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().addColumnBefore().run();
        }
        return false;
    },
    addAfter: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().addColumnAfter().run();
        }
        return false;
    },
    delete: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().deleteRow().run();
        }
        return false;
    },
};
const row: Row = {
    editor: null,
    addBefore: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().addRowBefore().run();
        }
        return false;
    },
    addAfter: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().addRowAfter().run();
        }
        return false;
    },
    delete: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().deleteRow().run();
        }
        return false;
    },
};

const table: Table = {
    editor: null,
    row: row,
    column: column,
    create: function (row: number, col: number): boolean {
        if (this.editor) {
            return this.editor.chain().focus().insertTable({ rows: row, cols: col }).run();
        }
        return false;
    },
    delete: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().deleteTable().run();
        }
        return false;
    },
    clear: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().clearContent().run();
        }
        return false;
    }
    
}

function useTable(editor: Editor): Table {
    table.editor = editor;
    return table;
}

export { type Table, useTable };