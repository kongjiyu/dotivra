import type { Editor } from "@tiptap/react";

interface File {
    editor: Editor | null;

    print: () => boolean;

    export: () => boolean;

    import: () => boolean;
}

const file: File = {
        editor: null,
        print: () => {
            
            return false;
        },
        export: () => {
            return false;
        },
        import: () => {
            return false;
        },
    };

function useFile(editor: Editor | null): File {
    file.editor = editor;
    return file;
}

export { type File, useFile };
