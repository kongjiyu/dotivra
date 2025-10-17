import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Globe, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { linkPreviewService } from '@/services/linkPreviewService';
import { cn } from '@/lib/utils';

interface LinkPreviewProps {
    url: string;
    isVisible: boolean;
    onClose: () => void;
    position: { x: number; y: number };
}

interface LinkMetadata {
    title?: string;
    description?: string;
    favicon?: string;
    url: string;
    image?: string;
    siteName?: string;
    error?: string;
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({
    url,
    isVisible,
    onClose,
    position
}) => {
    const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
    const [loading, setLoading] = useState(false);
    const previewRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!isVisible || !url) {
            setMetadata(null);
            return;
        }

        const fetchMetadata = async () => {
            setLoading(true);
            try {
                const data = await linkPreviewService.fetchMetadata(url);
                setMetadata(data);
            } catch (error) {
                console.error('Failed to fetch link preview:', error);
                // Provide better default information
                const urlObj = new URL(url);
                setMetadata({
                    url,
                    title: urlObj.hostname.replace(/^www\./, ''),
                    description: `Visit ${urlObj.hostname} to learn more`,
                    siteName: urlObj.hostname.replace(/^www\./, ''),
                    favicon: `${urlObj.protocol}//${urlObj.hostname}/favicon.ico`
                });
            } finally {
                setLoading(false);
            }
        };

        // Add a small delay to prevent flickering on quick hovers
        timeoutRef.current = setTimeout(fetchMetadata, 300);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [url, isVisible]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (previewRef.current && !previewRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isVisible) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isVisible, onClose]);

    if (!isVisible || (!loading && !metadata)) {
        return null;
    }

    const handleOpenLink = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        window.open(url, '_blank', 'noopener,noreferrer');
        onClose();
    };

    return (
        <div
            ref={previewRef}
            className="fixed z-50 animate-in fade-in-0 zoom-in-95 duration-200"
            style={{
                left: `${position.x}px`,
                top: `${position.y + 20}px`, // Offset below the link
                maxWidth: '320px',
            }}
        >
            <Card className="shadow-lg border border-gray-200 bg-white">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-4 flex items-center gap-3">
                            <div className="w-5 h-5 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                            <span className="text-sm text-gray-600">Loading preview...</span>
                        </div>
                    ) : (
                        <div
                            className="cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={handleOpenLink}
                        >
                            {/* Simplified header with just favicon, URL and external link icon */}
                            <div className="p-3">
                                <div className="flex items-center gap-3">
                                    <div className="flex-shrink-0">
                                        {metadata?.favicon ? (
                                            <img
                                                src={metadata.favicon}
                                                alt=""
                                                className="w-4 h-4 rounded-sm"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const fallback = target.nextElementSibling as HTMLElement;
                                                    if (fallback) fallback.style.display = 'block';
                                                }}
                                            />
                                        ) : null}
                                        <div
                                            className={cn(
                                                "w-4 h-4 rounded-sm bg-gray-100 flex items-center justify-center",
                                                metadata?.favicon ? "hidden" : "block"
                                            )}
                                        >
                                            <Globe className="w-2.5 h-2.5 text-gray-400" />
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 truncate font-medium">
                                            {metadata?.url || url}
                                        </p>
                                    </div>

                                    <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                </div>
                            </div>

                            {/* Show detailed looks only if metadata was successfully fetched */}
                            {metadata?.title && metadata.title !== (metadata?.url || url) && (
                                <>
                                    {/* Title and description */}
                                    <div className="px-3 pb-2 border-t border-gray-100">
                                        <h3 className="font-medium text-sm text-gray-900 line-clamp-1 mt-2">
                                            {metadata.title}
                                        </h3>
                                        {metadata?.description && (
                                            <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed mt-1">
                                                {metadata.description}
                                            </p>
                                        )}
                                        {metadata?.siteName && metadata.siteName !== metadata.title && (
                                            <p className="text-xs text-gray-500 mt-1 truncate">
                                                {metadata.siteName}
                                            </p>
                                        )}
                                    </div>

                                    {/* Image preview */}
                                    {metadata?.image && (
                                        <div className="px-3 pb-3">
                                            <img
                                                src={metadata.image}
                                                alt=""
                                                className="w-full h-20 object-cover rounded border border-gray-200"
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                }}
                                            />
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Error state - only show if no meaningful data was fetched */}
                            {metadata?.error && !metadata.title && (
                                <div className="px-3 pb-3 pt-1 border-t border-gray-100">
                                    <div className="flex items-center gap-2 text-xs text-amber-600">
                                        <AlertCircle className="w-3 h-3" />
                                        <span>Preview not available</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default LinkPreview;