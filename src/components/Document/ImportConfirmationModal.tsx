import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Plus, AlertCircle } from "lucide-react";

interface ImportConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileName: string;
    onConfirm: (action: 'overwrite' | 'append') => void;
}

export default function ImportConfirmationModal({
    isOpen,
    onClose,
    fileName,
    onConfirm,
}: ImportConfirmationModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-orange-600" />
                        Import File: {fileName}
                    </DialogTitle>
                    <DialogDescription>
                        You have existing content in your document. How would you like to import this file?
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 py-4">
                    {/* Overwrite Option */}
                    <button
                        onClick={() => onConfirm('overwrite')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-red-100 rounded-lg group-hover:bg-red-200 transition-colors">
                                <FileText className="w-5 h-5 text-red-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    Overwrite Current Content
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Replace all existing content with the imported file. Your current document will be lost.
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* Append Option */}
                    <button
                        onClick={() => onConfirm('append')}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                    >
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                                <Plus className="w-5 h-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-semibold text-gray-900 mb-1">
                                    Append After Current Content
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Add the imported file content at the end of your current document. Nothing will be lost.
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-200"></div>

                <div className="flex justify-end pt-2">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
