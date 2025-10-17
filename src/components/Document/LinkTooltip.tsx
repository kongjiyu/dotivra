import React, { useState, useEffect, useRef } from 'react';
import type { Editor } from '@tiptap/react';

interface LinkTooltipProps {
    editor: Editor;
    isOpen: boolean;
    onClose: () => void;
    position: { x: number; y: number };
    selectedText?: string;
    isEditing?: boolean;
    existingUrl?: string;
}

export const LinkTooltip: React.FC<LinkTooltipProps> = ({
    editor,
    isOpen,
    onClose,
    position,
    selectedText,
    isEditing = false,
    existingUrl = ''
}) => {
    const [topic, setTopic] = useState(selectedText || '');
    const [url, setUrl] = useState(existingUrl || '');
    const tooltipRef = useRef<HTMLDivElement>(null);
    const topicInputRef = useRef<HTMLInputElement>(null);
    const urlInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Check if selected text is a valid HTTP/HTTPS URL
            const isValidUrl = selectedText && /^https?:\/\/.+/.test(selectedText.trim());

            if (isValidUrl) {
                // If selected text is a valid URL, use it as the URL and clear topic
                setTopic('');
                setUrl(selectedText.trim());
            } else {
                // Otherwise, use selected text as topic (link text)
                setTopic(selectedText || '');
                setUrl(existingUrl || '');
            }

            // Focus management: If we auto-filled URL, focus on topic; otherwise focus appropriately
            setTimeout(() => {
                if (isValidUrl) {
                    // URL is auto-filled, focus on topic input for user to enter display text
                    topicInputRef.current?.focus();
                } else if (selectedText && selectedText.trim()) {
                    // Topic is pre-filled, focus on URL input
                    urlInputRef.current?.focus();
                } else {
                    // Nothing pre-filled, focus on topic input
                    topicInputRef.current?.focus();
                }
            }, 100);
        }
    }, [isOpen, selectedText, existingUrl]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!url.trim()) return;

        const finalTopic = topic.trim() || url;

        if (isEditing) {
            // Update existing link - first remove old link, then insert new content
            editor.chain().focus().unsetLink().insertContent(`<a href="${url}">${finalTopic}</a>`).run();
        } else {
            // Insert new link
            const { from, to } = editor.state.selection;

            if (from === to) {
                // No selection - insert new link
                editor.chain().focus().insertContent(`<a href="${url}">${finalTopic}</a>`).run();
            } else {
                // Replace selection with link
                editor.chain().focus().insertContent(`<a href="${url}">${finalTopic}</a>`).run();
            }
        }

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div
            ref={tooltipRef}
            className="link-tooltip"
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 2000,
            }}
        >
            <form onSubmit={handleSubmit}>
                <h3>{isEditing ? 'Edit Link' : 'Insert Link'}</h3>

                <div>
                    <input
                        ref={topicInputRef}
                        type="text"
                        placeholder={url && /^https?:\/\/.+/.test(url) ? "Display text (optional)" : "Link text (display name)"}
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                    />
                </div>

                <div>
                    <input
                        ref={urlInputRef}
                        type="url"
                        placeholder="https://example.com"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        required
                    />
                </div>

                <div className="button-group">
                    <button type="button" onClick={onClose}>
                        Cancel
                    </button>
                    {isEditing && (
                        <button
                            type="button"
                            onClick={() => {
                                editor.chain().focus().unsetLink().run();
                                onClose();
                            }}
                            className="delete"
                        >
                            Remove Link
                        </button>
                    )}
                    <button type="submit" className="primary" disabled={!url.trim()}>
                        {isEditing ? 'Update Link' : 'Insert Link'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LinkTooltip;