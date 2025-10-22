import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Languages, Loader2 } from "lucide-react";
import { SUPPORTED_LANGUAGES } from "@/services/translationService";

interface TranslationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onTranslate: (targetLanguage: string) => Promise<void>;
    isTranslating: boolean;
}

export default function TranslationDialog({
    isOpen,
    onClose,
    onTranslate,
    isTranslating,
}: TranslationDialogProps) {
    const [selectedLanguage, setSelectedLanguage] = useState('es');

    const handleTranslate = async () => {
        await onTranslate(selectedLanguage);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Languages className="w-5 h-5 text-blue-600" />
                        Translate Document
                    </DialogTitle>
                    <DialogDescription>
                        Select a target language to translate your entire document.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Language Selector */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                            Target Language
                        </label>
                        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select language" />
                            </SelectTrigger>
                            <SelectContent>
                                {SUPPORTED_LANGUAGES.map((lang) => (
                                    <SelectItem key={lang.code} value={lang.code}>
                                        {lang.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Information */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm text-blue-800">
                            <strong>Note:</strong> Translation will preserve your document's formatting.
                            This action cannot be undone, so consider saving your document first.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={isTranslating}>
                        Cancel
                    </Button>
                    <Button onClick={handleTranslate} disabled={isTranslating}>
                        {isTranslating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {isTranslating ? 'Translating...' : 'Translate'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
