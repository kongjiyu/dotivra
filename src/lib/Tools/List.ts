import type { Editor } from "@tiptap/react";

type Item = "listItem" | "taskItem";
interface List {
    editor: Editor | null;

    bullet: () => boolean;

    ordered: () => boolean;

    task: () => boolean;

    // item: (item: Item) => boolean;

    sink: (item: Item) => boolean;

    lift: (item: Item) => boolean;

    clear: () => boolean;
}

const list: List = {
    editor: null,
    bullet: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleBulletList().run();
        }
        return false;
    },
    ordered: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleOrderedList().run();
        }
        return false;
    },
    task: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().toggleTaskList().run();
        }
        return false;
    },
    sink: function (item: Item): boolean {
        if (this.editor) {
            return this.editor.chain().focus().sinkListItem(item).run();
        }
        return false;
    },
    lift: function (item: Item): boolean {
        if (this.editor) {
            return this.editor.chain().focus().liftListItem(item).run();
        }
        return false;
    },
    clear: function (): boolean {
        if (this.editor) {
            return this.editor.chain().focus().clearNodes().run();
        }
        return false;
    }
};

function useList(editor: Editor): List {
    list.editor = editor;
    return list;
}

    
export { type List, type Item, useList };
