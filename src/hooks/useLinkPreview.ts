import { useState, useCallback } from 'react';

interface LinkPreviewState {
    isVisible: boolean;
    url: string;
    position: { x: number; y: number };
    target: HTMLElement | null;
}

export const useLinkPreview = () => {
    const [previewState, setPreviewState] = useState<LinkPreviewState>({
        isVisible: false,
        url: '',
        position: { x: 0, y: 0 },
        target: null
    });

    // Accept either an element or mouse event; prefer passing element for stable position
    const showPreview = useCallback((url: string, targetElement: HTMLElement | null) => {
        let x = 0, y = 0;
        if (targetElement) {
            const rect = targetElement.getBoundingClientRect();
            const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.pageYOffset || document.documentElement.scrollTop;
            x = rect.left + scrollX;
            y = rect.bottom + scrollY;
            const viewportWidth = window.innerWidth;
            x = Math.min(x, viewportWidth - 360 - 20);
        }

        setPreviewState(prev => ({
            ...prev,
            isVisible: true,
            url,
            position: { x, y },
            target: targetElement
        }));
    }, []);

    const hidePreview = useCallback(() => {
        setPreviewState(prev => ({ ...prev, isVisible: false }));
    }, []);

    const resetPreview = useCallback(() => {
        setPreviewState({
            isVisible: false,
            url: '',
            position: { x: 0, y: 0 },
            target: null
        });
    }, []);

    return {
        previewState,
        showPreview,
        hidePreview,
        resetPreview
    };
};

export default useLinkPreview;