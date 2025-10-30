import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Color from "@tiptap/extension-color";
import { Table } from "@tiptap/extension-table";
import { TextStyle } from "@tiptap/extension-text-style";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import BulletList from "@tiptap/extension-bullet-list";
import OrderedList from "@tiptap/extension-ordered-list";
import ListItem from "@tiptap/extension-list-item";
import TableRow from "@tiptap/extension-table-row";
import TableHeaderWithBackgroundColor from "@/lib/extensions/TableHeaderWithBackgroundColor";
import TableCellWithBackgroundColor from "@/lib/extensions/TableCellWithBackgroundColor";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";
import FontFamily from "@tiptap/extension-font-family";
import ResizableImage from "@/lib/extensions/ResizableImage";
import FontSize from "@/types/fontSize";
import { cn } from "@/lib/utils";
import Paragraph from "@/lib/extensions/Paragraph";
import Heading from "@/lib/extensions/Heading";
import Mermaid from "@/lib/extensions/Mermaid";
import { CodeBlockWithHighlight } from "@/lib/extensions/CodeBlockWithHighlight";
import { BackspaceBehaviorFix } from "@/lib/extensions/BackspaceBehaviorFix";
import MarkdownLinkPaste from "@/lib/extensions/MarkdownLinkPaste";

// TipTap Editor Configuration
export const getTipTapExtensions = () => [
    StarterKit.configure({
        heading: false, // we'll add Heading explicitly below
        paragraph: false, // we'll use our custom paragraph extension
        codeBlock: false, // we'll use our custom code block extension
        bulletList: false, // we'll add BulletList explicitly below
        orderedList: false, // we'll add OrderedList explicitly below
        listItem: false, // we'll add ListItem explicitly below
        link: false, // we'll add Link explicitly below to avoid duplicates
        underline: false, // we'll add Underline explicitly below to avoid duplicates
        horizontalRule: false, // we'll add HorizontalRule explicitly below to avoid duplicates
    }),
    // Custom paragraph extension with basic indent limit to prevent overflow
    Paragraph.configure({
        maxIndent: 10, // Basic limit to prevent content overflow
    }),
    // Custom heading extension with basic indent limit to prevent overflow
    Heading.configure({
        levels: [1, 2, 3, 4, 5],
        maxIndent: 10, // Basic limit to prevent content overflow
    }),
    // Custom code block extension with highlight.js support
    CodeBlockWithHighlight,
    // List extensions with improved backspace behavior
    BulletList,
    OrderedList,
    ListItem,
    // Text formatting extensions
    Highlight.configure({
        multicolor: true,
        HTMLAttributes: {
            class: 'tiptap-highlight',
        },
    }),
    Color.configure({
        types: ['textStyle'],
    }),
    TextStyle,
    FontFamily.configure({
        types: ['textStyle'],
    }),
    FontSize,
    TextAlign.configure({
        types: ['heading', 'paragraph'],
    }),
    Underline,
    // Simple link extension for basic link support
    Link.configure({
        openOnClick: false, // We'll handle clicks manually to allow Ctrl/Cmd+Click
        linkOnPaste: true,
        autolink: true,
        protocols: ['http', 'https', 'mailto', 'tel'],
        HTMLAttributes: {
            class: 'tiptap-link',
            rel: 'noopener noreferrer',
            target: '_blank',
            title: '⌘+Click (Mac) or Ctrl+Click (Windows) to open link', // Helpful tooltip
        },
        validate: (href: string) => /^https?:\/\//.test(href) || /^mailto:/.test(href) || /^tel:/.test(href),
    }),
    // Markdown link paste extension - converts [text](url) to HTML links
    MarkdownLinkPaste,
    // Resizable Image extension with drag-to-resize and border toggle
    // Uses aggressive compression to keep Base64 images small and safe for Firestore
    ResizableImage.configure({
        inline: false,
        allowBase64: true, // Enabled with automatic compression (200KB limit per image)
        HTMLAttributes: {
            class: 'tiptap-image',
        },
    }),
    // Horizontal rule (divider)
    HorizontalRule.configure({
        HTMLAttributes: {
            class: 'tiptap-hr',
        },
    }),
    // Table extensions
    Table.configure({
        resizable: true,
    }),
    TableRow,
    TableHeaderWithBackgroundColor,
    TableCellWithBackgroundColor.configure({
        HTMLAttributes: {
            class: 'table-cell',
        },
    }),
    // Task list extensions
    TaskList.configure({
        itemTypeName: 'taskItem',
        HTMLAttributes: {
            class: 'task-list',
        },
    }),
    TaskItem.configure({
        nested: true,
        HTMLAttributes: {
            class: 'task-item',
        },
    }),
    // Character count for status bar
    CharacterCount,
    // Mermaid diagram support
    Mermaid,
    // Custom backspace behavior fix for styling blocks
    BackspaceBehaviorFix,
];

// Editor Props Configuration
export const getTipTapEditorProps = (extraClasses: string = '') => ({
    attributes: {
        class: cn(`document-content prose prose-lg max-w-none [&_ol]:list-decimal [&_ul]:list-disc focus:outline-none`, extraClasses),
        spellcheck: 'true',
    },
    // Allow default selection behavior - don't intercept DOM events
    // This ensures cross-block text selection works properly
});

// Complete Editor Configuration Factory
export const createTipTapConfig = (options: {
    content?: string;
    editable?: boolean;
    onCreate?: () => void;
    onUpdate?: (editor: any) => void;
    extraClasses?: string;
}) => ({
    extensions: getTipTapExtensions(),
    content: options.content !== undefined ? options.content : "<p>Start writing your document...</p>",
    editable: options.editable !== false,
    // Performance optimizations
    enableInputRules: true,
    enablePasteRules: true,
    injectCSS: false, // We'll handle CSS ourselves
    // Event handlers
    onCreate: options.onCreate,
    onUpdate: options.onUpdate,
    // Editor props for better UX and selection support
    editorProps: getTipTapEditorProps(options.extraClasses),
    // Selection persistence - prevent toolbar updates from breaking selection
    onSelectionUpdate: undefined, // Don't add custom handlers that might interfere
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