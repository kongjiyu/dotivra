import { useState } from "react";
import { marked } from 'marked';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FolderOpen, Upload } from "lucide-react";
import { showError } from "@/utils/sweetAlert";

interface ImportModalProps {
    onImport: (content: string, title: string) => void;
    trigger?: React.ReactNode;
}

export default function ImportModal({ onImport, trigger }: ImportModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [documentTitle, setDocumentTitle] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Accept only Markdown files - removed Mermaid support
        const allowedExtensions = ['.md'];
        const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (!allowedExtensions.includes(fileExtension)) {
            showError(
                'Invalid File Type',
                'Please select a Markdown (.md) file. Note: You can import from Google Docs or Microsoft Word by saving as Markdown first.'
            );
            return;
        }

        setSelectedFile(file);

        // Auto-suggest title from filename
        if (!documentTitle) {
            const suggestedTitle = file.name
                .replace(/\.md$/i, '')
                .replace(/[-_]/g, ' ');
            setDocumentTitle(suggestedTitle);
        }
    };

    const handleImport = async () => {
        if (!selectedFile || !documentTitle.trim()) {
            return;
        }

        setIsImporting(true);

        try {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileContent = e.target?.result as string;
                const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));

                try {
                    let htmlContent = '';

                    if (fileExtension === '.md') {
                        // Convert Markdown to HTML using marked
                        let markdownContent = fileContent;

                        // Add horizontal line before H1 and H2 headings (except the first one)
                        // This regex matches H1 (#) and H2 (##) at the start of lines
                        const lines = markdownContent.split('\n');
                        const processedLines: string[] = [];
                        let isFirstHeading = true;

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].trim();

                            // Check if line is H1 or H2
                            const isH1 = /^#\s+/.test(line);
                            const isH2 = /^##\s+/.test(line);

                            if ((isH1 || isH2) && !isFirstHeading) {
                                // Add horizontal line before heading (but not if previous line already has one)
                                const prevLine = processedLines[processedLines.length - 1];
                                if (prevLine && prevLine.trim() !== '---') {
                                    processedLines.push('---');
                                    processedLines.push('');
                                }
                            }

                            if (isH1 || isH2) {
                                isFirstHeading = false;
                            }

                            processedLines.push(lines[i]); // Keep original line with formatting
                        }

                        markdownContent = processedLines.join('\n');
                        htmlContent = await marked(markdownContent);
                    }

                    if (htmlContent) {
                        onImport(htmlContent, documentTitle.trim());

                        // Reset form and close modal
                        setDocumentTitle("");
                        setSelectedFile(null);
                        setIsOpen(false);
                    }
                } catch (error) {
                    console.error('Error processing file:', error);
                    showError('Processing Failed', 'Failed to process file. Please try again.');
                } finally {
                    setIsImporting(false);
                }
            };

            reader.readAsText(selectedFile);
        } catch (error) {
            console.error('Error reading file:', error);
            showError('Read Failed', 'Failed to read file. Please try again.');
            setIsImporting(false);
        }
    };

    const handleClose = () => {
        if (!isImporting) {
            setIsOpen(false);
            setDocumentTitle("");
            setSelectedFile(null);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm">
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Import
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]" onPointerDownOutside={handleClose}>
                <DialogHeader>
                    <DialogTitle>Import as Markdown</DialogTitle>
                    <DialogDescription>
                        Import a Markdown file (.md) to your project. You can export from Google Docs or Microsoft Word as Markdown. Enter a title for the document and select a file. Horizontal lines will be automatically added before H1 and H2 headings.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Document Title Input */}
                    <div className="grid gap-2">
                        <label htmlFor="title" className="text-sm font-medium">
                            Document Title
                        </label>
                        <Input
                            id="title"
                            placeholder="Enter document title..."
                            value={documentTitle}
                            onChange={(e) => setDocumentTitle(e.target.value)}
                            disabled={isImporting}
                        />
                    </div>

                    {/* File Upload */}
                    <div className="grid gap-2">
                        <label htmlFor="file" className="text-sm font-medium">
                            Markdown File (.md)
                        </label>
                        <div className="relative">
                            <Input
                                id="file"
                                type="file"
                                accept=".md"
                                onChange={handleFileSelect}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                disabled={isImporting}
                            />
                            <div className={`flex items-center justify-center w-full h-24 border-2 border-dashed rounded-lg transition-colors ${selectedFile
                                ? 'border-green-300 bg-green-50'
                                : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                                } ${isImporting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                <div className="text-center">
                                    {selectedFile ? (
                                        <div className="flex flex-col items-center">
                                            <Upload className="w-5 h-5 text-green-600 mb-1" />
                                            <span className="text-sm text-green-700 font-medium">{selectedFile.name}</span>
                                            <span className="text-xs text-green-600">Ready to import</span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <FolderOpen className="w-5 h-5 text-gray-400 mb-1" />
                                            <span className="text-sm text-gray-600">Click to select Markdown file</span>
                                            <span className="text-xs text-gray-500">.md files only</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={isImporting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleImport}
                        disabled={!selectedFile || !documentTitle.trim() || isImporting}
                    >
                        {isImporting ? "Importing..." : "Import Document"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}