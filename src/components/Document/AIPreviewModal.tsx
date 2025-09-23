import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, X, RotateCcw, Eye, Sparkles } from "lucide-react";

interface AIPreviewModalProps {
    open: boolean;
    onAccept: () => void;
    onReject: () => void;
    onRegenerate?: () => void;
    contentPreview?: string;
    isRegenerating?: boolean;
}

export default function AIPreviewModal({
    open,
    onAccept,
    onReject,
    onRegenerate,
    contentPreview,
    isRegenerating = false
}: AIPreviewModalProps) {
    const wordCount = contentPreview?.split(/\s+/).length || 0;
    const charCount = contentPreview?.length || 0;

    return (
        <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
            <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader className="space-y-3">
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        AI Content Preview
                        <Badge variant="secondary" className="ml-auto">
                            {wordCount} words • {charCount} characters
                        </Badge>
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        AI has generated content and inserted it into your document.
                        Review the preview below and choose your next action.
                    </DialogDescription>
                </DialogHeader>

                <Separator />

                {contentPreview && (
                    <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Content Preview</span>
                        </div>
                        <div className="max-h-64 overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border-2 border-dashed border-gray-200 text-sm leading-relaxed">
                            <div className="prose prose-sm max-w-none">
                                <div className="whitespace-pre-wrap text-gray-800">{contentPreview}</div>
                            </div>
                        </div>
                    </div>
                )}

                <Separator />

                <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                    <div className="flex gap-2">
                        {onRegenerate && (
                            <Button
                                variant="outline"
                                onClick={onRegenerate}
                                disabled={isRegenerating}
                                className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300"
                            >
                                <RotateCcw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                                {isRegenerating ? 'Regenerating...' : 'Regenerate'}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={onReject}
                            className="flex items-center gap-2 hover:bg-red-50 hover:border-red-300 hover:text-red-700"
                        >
                            <X className="w-4 h-4" />
                            Reject & Undo
                        </Button>
                    </div>

                    <Button
                        onClick={onAccept}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 flex items-center gap-2 shadow-lg"
                        size="lg"
                    >
                        <Check className="w-4 h-4" />
                        Accept & Keep Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}