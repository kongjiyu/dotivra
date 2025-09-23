import { Button } from "@/components/ui/button";
import { Check, X, RotateCcw, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface AIActionContainerProps {
    show: boolean;
    onAccept: () => void;
    onReject: () => void;
    onRegenerate?: () => void;
    isRegenerating?: boolean;
    chatSidebarOpen?: boolean;
}

export default function AIActionContainer({
    show,
    onAccept,
    onReject,
    onRegenerate,
    isRegenerating = false,
    chatSidebarOpen = false
}: AIActionContainerProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (show) {
            setIsVisible(true);
        } else {
            // Delay hiding to allow for exit animation
            const timer = setTimeout(() => setIsVisible(false), 300);
            return () => clearTimeout(timer);
        }
    }, [show]);

    // Add keyboard event handlers
    useEffect(() => {
        if (!show) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                onAccept();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                onReject();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [show, onAccept, onReject]);

    if (!isVisible) return null;

    // Adjust positioning based on chat sidebar state
    const rightPosition = chatSidebarOpen ? 'right-[30rem]' : 'right-6';

    return (
        <div className={`fixed bottom-6 ${rightPosition} z-50 transition-all duration-300 ${show ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95'
            }`}>
            <div className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 min-w-[320px] backdrop-blur-sm bg-white/95">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">AI Content Preview</h3>
                        <p className="text-xs text-gray-500">Review the highlighted content and choose your action</p>
                    </div>
                </div>

                {/* Progress indicator for ongoing generation */}
                {isRegenerating && (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span>Generating new content...</span>
                        </div>
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                            <div className="bg-gradient-to-r from-purple-500 to-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col gap-3">
                    {/* Primary Action - Accept */}
                    <Button
                        onClick={onAccept}
                        disabled={isRegenerating}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2 shadow-lg text-sm h-11 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Check className="w-4 h-4" />
                        Accept & Keep Changes
                    </Button>

                    {/* Secondary Actions */}
                    <div className="flex gap-2">
                        {onRegenerate && (
                            <Button
                                variant="outline"
                                onClick={onRegenerate}
                                disabled={isRegenerating}
                                className="flex-1 flex items-center justify-center gap-2 hover:bg-blue-50 hover:border-blue-300 text-sm h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <RotateCcw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={onReject}
                            disabled={isRegenerating}
                            className="flex-1 flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700 text-sm h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <X className="w-4 h-4" />
                            Reject & Undo
                        </Button>
                    </div>
                </div>

                {/* Keyboard shortcuts hint */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 text-center">
                        Press <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Enter</kbd> to accept • <kbd className="px-1 py-0.5 bg-gray-100 rounded text-xs">Esc</kbd> to reject
                    </p>
                </div>
            </div>
        </div>
    );
}