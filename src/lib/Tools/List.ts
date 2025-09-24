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

    indent: () => boolean;

    outdent: () => boolean;

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
            // Simply toggle task list without additional logic that might fail
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
    indent: function (): boolean {
        if (!this.editor) return false;
        const { editor } = this;
        if (editor.isActive('taskItem')) {
            // Try sink; if it fails (e.g., first item), split then sink
            const ok = editor.chain().focus().sinkListItem('taskItem' as any).run();
            if (!ok) {
                return editor.chain().focus().splitListItem('taskItem' as any).sinkListItem('taskItem' as any).run();
            }
            return ok;
        }
        if (editor.isActive('listItem')) {
            const ok = editor.chain().focus().sinkListItem('listItem').run();
            if (!ok) {
                return editor.chain().focus().splitListItem('listItem').sinkListItem('listItem').run();
            }
            return ok;
        }
        // Not in a list: do nothing to avoid unexpected bullet list toggling
        return false;
    },
    outdent: function (): boolean {
        if (!this.editor) return false;
        const { editor } = this;
        if (editor.isActive('taskItem')) {
            return editor.chain().focus().liftListItem('taskItem' as any).run();
        }
        if (editor.isActive('listItem')) {
            return editor.chain().focus().liftListItem('listItem').run();
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
