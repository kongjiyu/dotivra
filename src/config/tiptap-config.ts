import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";

// TipTap Editor Configuration
export const getTipTapExtensions = () => [
    StarterKit.configure({
        heading: false, // we'll add Heading explicitly below
    }),
    Heading.configure({
        levels: [1, 2, 3, 4, 5],
    }),
    // Text formatting extensions
    Highlight.configure({
        multicolor: true,
    }),
    Color.configure({
        types: ['textStyle'],
    }),
    TextStyle,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    Underline,
    // Link extension
    Link.configure({
        openOnClick: false,
        HTMLAttributes: {
            class: 'text-blue-600 underline cursor-pointer hover:text-blue-800',
        },
    }),
    // Image extension
    Image.configure({
        HTMLAttributes: {
            class: 'max-w-full h-auto rounded-lg',
        },
    }),
    // Table extensions
    Table.configure({
        resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    // Task list extensions
    TaskList,
    TaskItem.configure({
        nested: true,
    }),
    // Character count for status bar
    CharacterCount,
];

// Editor Props Configuration
export const getTipTapEditorProps = (extraClasses: string = '') => ({
    attributes: {
        class: `document-content prose prose-lg max-w-none focus:outline-none ${extraClasses}`.trim(),
        spellcheck: 'true',
    },
});

// Complete Editor Configuration Factory
export const createTipTapConfig = (options: {
    content?: string;
    editable?: boolean;
    onCreate?: () => void;
    onUpdate?: (editor: any) => void;
    extraClasses?: string; // allow callers to add more utility classes
}) => ({
    extensions: getTipTapExtensions(),
    content: options.content || "<p>Start writing your document...</p>",
    editable: options.editable !== false,
    // Performance optimizations
    enableInputRules: true,
    enablePasteRules: true,
    injectCSS: false, // We'll handle CSS ourselves
    // Event handlers
    onCreate: options.onCreate,
    onUpdate: options.onUpdate,
    // Editor props for better UX
    editorProps: getTipTapEditorProps(options.extraClasses),
});

// Legacy support - keeping the original editor creation for backwards compatibility
export const createDocumentEditor = (element: HTMLElement) => {
    return new Editor({
        element,
        ...createTipTapConfig({
            content: "<p>Start writing...</p>",
        }),
        autofocus: true,
    });
};