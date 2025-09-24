import React, { useState, useEffect } from 'react';

interface LinkPreviewProps {
    url: string;
    isVisible: boolean;
    position: { x: number; y: number };
}

export const LinkPreview: React.FC<LinkPreviewProps> = ({
    url,
    isVisible,
    position
}) => {
    const [domainInfo, setDomainInfo] = useState<{
        title: string;
        domain: string;
    } | null>(null);

    useEffect(() => {
        if (!isVisible || !url) {
            setDomainInfo(null);
            return;
        }

        // Simple domain extraction
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            setDomainInfo({
                title: domain,
                domain: domain
            });
        } catch {
            setDomainInfo({
                title: 'Invalid URL',
                domain: ''
            });
        }
    }, [url, isVisible]);

    if (!isVisible || !domainInfo) return null;

    return (
        <div
            className="link-preview"
            style={{
                position: 'fixed',
                left: `${position.x}px`,
                top: `${position.y}px`,
                zIndex: 3000,
                transform: 'translateX(-50%)'
            }}
        >
            <div className="link-preview-content">
                <div className="link-preview-data">
                    <div className="link-preview-header">
                        <div className="link-preview-title">{domainInfo.title}</div>
                    </div>
                    <div className="link-preview-url">{url}</div>
                </div>
            </div>
        </div>
    );
};

export default LinkPreview;