import React, { useEffect, useRef, useState } from 'react';
import { linkPreviewService } from '@/services/linkPreviewService';
import { Card, CardContent } from '@/components/ui/card';
import { ExternalLink, Globe } from 'lucide-react';

interface Props {
    url: string;
    isVisible: boolean;
    onClose: () => void;
    position: { x: number; y: number };
    onSave?: (newUrl: string, topic: string) => void;
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
}

const extractDomain = (u: string) => {
    try {
        const urlObj = new URL(u);
        return urlObj.hostname.replace(/^www\./, '');
    } catch {
        return '';
    }
};

// Store topic mappings outside component to persist across renders
const urlTopicMap: Record<string, string> = {};

export const LinkPreviewEditor: React.FC<Props> = ({ url, isVisible, onClose, position, onSave, onMouseEnter, onMouseLeave }) => {
    const [metadata, setMetadata] = useState<any>(null);
    const [topic, setTopic] = useState('');
    const [editUrl, setEditUrl] = useState(url || '');
    const [isEditingTopic, setIsEditingTopic] = useState(false);
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);
    const topicInputRef = useRef<HTMLInputElement | null>(null);
    const urlInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        setEditUrl(url || '');

        // Use saved topic for this URL, or default to URL if no custom topic exists
        const savedTopic = urlTopicMap[url || ''] || url || '';
        setTopic(savedTopic);

        setMetadata(null);
        if (!isVisible || !url) return;

        let cancelled = false;
        const fetch = async () => {
            try {
                const data = await linkPreviewService.fetchMetadata(url);
                if (!cancelled) {
                    setMetadata(data);
                    // Keep topic as the original URL (don't override with page title)
                    // Topic remains as the URL unless user manually changes it
                }
            } catch (e) {
                if (!cancelled) {
                    setMetadata({ url, siteName: extractDomain(url) });
                    // Topic remains as URL
                }
            }
        };

        // small delay to avoid quick flickers
        const t = setTimeout(fetch, 200);
        return () => {
            cancelled = true;
            clearTimeout(t);
        };
    }, [isVisible, url]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    const domain = extractDomain(editUrl || url);

    const handleSave = () => {
        const finalUrl = editUrl.trim() || url;
        const finalTopic = topic.trim() || finalUrl;

        // Save the topic for this URL in the global map
        urlTopicMap[finalUrl] = finalTopic;

        if (onSave) onSave(finalUrl, finalTopic);
        onClose();
    };

    const handleTopicClick = () => {
        setIsEditingTopic(true);
        setTimeout(() => topicInputRef.current?.focus(), 10);
    };

    const handleUrlClick = () => {
        setIsEditingUrl(true);
        setTimeout(() => urlInputRef.current?.focus(), 10);
    };

    const handleTopicKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditingTopic(false);
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditingTopic(false);
        }
    };

    const handleUrlKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditingUrl(false);
            handleSave();
        } else if (e.key === 'Escape') {
            setIsEditingUrl(false);
        }
    };

    return (
        <div
            ref={ref}
            className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
            style={{ left: `${position.x}px`, top: `${position.y + 20}px`, maxWidth: '440px' }}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <Card className="shadow-lg border border-gray-200 bg-white">
                <CardContent className="p-2">
                    <div className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-16 h-12 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                            {metadata?.image ? (
                                <img src={metadata.image} alt="preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            ) : metadata?.favicon ? (
                                <img src={metadata.favicon} alt="favicon" className="w-8 h-8" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                            ) : (
                                <div className="text-gray-400"><Globe /></div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            {isEditingTopic ? (
                                <input
                                    ref={topicInputRef}
                                    className="w-full text-sm font-medium border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 truncate"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    onKeyDown={handleTopicKeyDown}
                                    onBlur={() => setIsEditingTopic(false)}
                                    placeholder="Title"
                                />
                            ) : (
                                <div
                                    className="w-full text-sm font-medium cursor-text border border-gray-300 rounded px-2 py-1 bg-white hover:border-gray-400 truncate"
                                    onClick={handleTopicClick}
                                    title={topic || 'Click to edit title'}
                                >
                                    {topic || 'Title'}
                                </div>
                            )}

                            <div className="mt-2">
                                {isEditingUrl ? (
                                    <input
                                        ref={urlInputRef}
                                        className="w-full text-xs text-gray-600 border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 truncate"
                                        value={editUrl}
                                        onChange={(e) => setEditUrl(e.target.value)}
                                        onKeyDown={handleUrlKeyDown}
                                        onBlur={() => setIsEditingUrl(false)}
                                        placeholder="URL"
                                    />
                                ) : (
                                    <div
                                        className="w-full text-xs text-gray-600 cursor-text border border-gray-300 rounded px-2 py-1 bg-white hover:border-gray-400 truncate"
                                        onClick={handleUrlClick}
                                        title={editUrl || 'Click to edit URL'}
                                    >
                                        {editUrl || 'URL'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{domain}</span>
                        <button className="px-2 py-1 text-sm" onClick={() => { window.open(url, '_blank') }} title="Open original">
                            <ExternalLink className="w-4 h-4" />
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default LinkPreviewEditor;
