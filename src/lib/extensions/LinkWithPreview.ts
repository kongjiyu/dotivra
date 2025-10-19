import Link from '@tiptap/extension-link';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { EditorView } from '@tiptap/pm/view';

export interface LinkWithPreviewOptions {
    openOnClick: boolean;
    linkOnPaste: boolean;
    autolink: boolean;
    protocols: string[];
    HTMLAttributes: Record<string, any>;
    validate?: (url: string) => boolean;
    onHoverStart?: (url: string, event: MouseEvent, view: EditorView) => void;
    onHoverEnd?: () => void;
}

export const LinkWithPreview = Link.extend<LinkWithPreviewOptions>({
    name: 'linkWithPreview',

    addOptions() {
        return {
            ...this.parent?.(),
            openOnClick: false,
            linkOnPaste: true,
            autolink: true,
            protocols: ['http', 'https', 'mailto', 'tel'],
            HTMLAttributes: {
                class: 'tiptap-link',
                rel: 'noopener noreferrer',
                target: '_blank',
                title: '', // Remove default browser tooltip
            },
            validate: (href: string) => /^https?:\/\//.test(href) || /^mailto:/.test(href) || /^tel:/.test(href),
            onHoverStart: undefined,
            onHoverEnd: undefined,
        };
    },

    addProseMirrorPlugins() {
        const plugins = this.parent?.() || [];

        const linkHoverPlugin = new Plugin({
            key: new PluginKey('linkHover'),
            props: {
                handleDOMEvents: {
                    mouseover: (view, event) => {
                        const target = event.target as HTMLElement;
                        
                        // Check if we're hovering over a link
                        const linkElement = target.closest('a[href]') as HTMLAnchorElement;
                        if (!linkElement) return false;

                        const href = linkElement.getAttribute('href');
                        if (!href) return false;

                        // Only show preview for http/https links
                        if (!/^https?:\/\//.test(href)) return false;

                        // Call the hover start callback if provided
                        if (this.options.onHoverStart) {
                            this.options.onHoverStart(href, event, view);
                        }

                        return false;
                    },

                    mouseout: (_view, event) => {
                        const target = event.target as HTMLElement;
                        const relatedTarget = event.relatedTarget as HTMLElement;
                        
                        // Check if we're leaving a link
                        const linkElement = target.closest('a[href]');
                        if (!linkElement) return false;

                        // Don't hide if we're moving to a child element of the link
                        if (relatedTarget && linkElement.contains(relatedTarget)) {
                            return false;
                        }

                        // Call the hover end callback if provided
                        if (this.options.onHoverEnd) {
                            // Add a small delay to prevent flickering
                            setTimeout(() => {
                                if (this.options.onHoverEnd) {
                                    this.options.onHoverEnd();
                                }
                            }, 100);
                        }

                        return false;
                    }
                }
            }
        });

        return [...plugins, linkHoverPlugin];
    }
});

export default LinkWithPreview;