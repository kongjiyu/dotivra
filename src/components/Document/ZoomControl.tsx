import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { ZoomIn, ZoomOut } from "lucide-react";

interface ZoomControlProps {
    onChange?: (zoom: number) => void;
}

export default function ZoomControl({ onChange }: ZoomControlProps) {
    const [zoom, setZoom] = useState(100);

    const zoomLevels = [50, 75, 90, 100, 125, 150, 175, 200];

    useEffect(() => {
        const contentWrapper = document.querySelector('.mx-auto.w-\\[1000px\\]') as HTMLElement;
        if (contentWrapper) {
            // Preserve visual anchor to reduce content jumping on zoom changes
            const beforeTop = contentWrapper.getBoundingClientRect().top + window.scrollY;
            contentWrapper.style.zoom = `${zoom}%`;
            // Defer adjustment until layout applies
            requestAnimationFrame(() => {
                const afterTop = contentWrapper.getBoundingClientRect().top + window.scrollY;
                const delta = afterTop - beforeTop;
                if (Math.abs(delta) > 1) {
                    window.scrollTo({ top: window.scrollY + delta, behavior: 'instant' as ScrollBehavior });
                }
            });
        }

        onChange?.(zoom);
    }, [zoom, onChange]);

    const handleZoomIn = () => {
        setZoom((prev) => Math.min(prev + 10, 200));
    };

    const handleZoomOut = () => {
        setZoom((prev) => Math.max(prev - 10, 50));
    };

    const handleZoomReset = () => {
        setZoom(100);
    };

    const handleZoomChange = (newZoom: number) => {
        setZoom(newZoom);
    };

    return (
        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
            <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="h-7 w-7 p-0 text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-40"
                title="Zoom out"
            >
                <ZoomOut className="w-4 h-4" />
            </Button>

            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-3 text-gray-700 hover:bg-white hover:shadow-sm font-medium min-w-[60px]"
                        title="Change zoom level"
                    >
                        {zoom}%
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-1" align="center">
                    <div className="space-y-1">
                        {zoomLevels.map((level) => (
                            <Button
                                key={level}
                                variant="ghost"
                                size="sm"
                                onClick={() => handleZoomChange(level)}
                                className={`w-full justify-center h-8 text-sm ${level === zoom
                                    ? "bg-blue-100 text-blue-700 font-semibold"
                                    : "text-gray-700"
                                    }`}
                            >
                                {level}%
                            </Button>
                        ))}
                    </div>
                </PopoverContent>
            </Popover>

            <Button
                variant="ghost"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="h-7 w-7 p-0 text-gray-600 hover:bg-white hover:shadow-sm disabled:opacity-40"
                title="Zoom in"
            >
                <ZoomIn className="w-4 h-4" />
            </Button>

            {zoom !== 100 && (
                <>
                    <div className="w-px h-4 bg-gray-300 mx-1"></div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleZoomReset}
                        className="h-7 w-12 p-0 text-gray-600 hover:bg-white hover:shadow-sm"
                        title="Reset zoom to 100%"
                    >
                        Reset
                    </Button>
                </>
            )}
        </div>
    );
}
