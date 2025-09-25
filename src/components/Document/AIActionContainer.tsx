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
    operationType?: 'addition' | 'editing' | 'removal' | 'replacement';
    affectedContentSummary?: string;
}

export default function AIActionContainer({
    show,
    onAccept,
    onReject,
    onRegenerate,
    isRegenerating = false,
    chatSidebarOpen = false,
    operationType = 'addition',
    affectedContentSummary
}: AIActionContainerProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        console.log('🎯 AIActionContainer show prop changed to:', show);
        if (show) {
            console.log('✅ Making AIActionContainer visible');
            setIsVisible(true);
        } else {
            console.log('❌ Hiding AIActionContainer');
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

    if (!isVisible) {
        console.log('🚫 AIActionContainer not visible, returning null');
        return null;
    }

    console.log('👀 AIActionContainer is visible, rendering with show:', show);

    // Adjust positioning based on chat sidebar state
    const rightPosition = chatSidebarOpen ? 'right-[30rem]' : 'right-6';

    return (
        <div className={`fixed bottom-6 ${rightPosition} z-50 transition-all duration-300 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
            <div className={`bg-white border-2 rounded-xl shadow-lg p-4 min-w-[320px] ${show ? 'border-blue-400' : 'border-gray-200'
                }`}>
                {/* Header */}
                <div className="flex items-start gap-3 mb-4">
                    <div className={`p-2 rounded-lg ${operationType === 'removal' ? 'bg-gradient-to-br from-red-500 to-red-600' :
                        operationType === 'editing' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                            operationType === 'replacement' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                                'bg-gradient-to-br from-green-500 to-green-600'
                        }`}>
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">
                            {operationType === 'removal' ? 'AI Content Removal' :
                                operationType === 'editing' ? 'AI Content Edit' :
                                    operationType === 'replacement' ? 'AI Content Replacement' :
                                        'AI Content Addition'}
                        </h3>
                        <p className="text-xs text-gray-500">
                            {operationType === 'removal' ? 'Content marked for removal (highlighted in red)' :
                                operationType === 'editing' ? 'Content has been modified (highlighted in blue)' :
                                    operationType === 'replacement' ? 'Content has been replaced (highlighted in orange)' :
                                        'New content added (highlighted in green)'}
                            {affectedContentSummary && ` • ${affectedContentSummary}`}
                        </p>
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