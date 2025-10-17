import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Share2,
    CheckCircle,
} from "lucide-react";

interface SimpleShareProps {
    documentTitle: string;
    documentId?: string;
}

export default function SimpleShare({ documentId = "doc123" }: SimpleShareProps) {
    const [copied, setCopied] = useState(false);

    const generateShareLink = () => {
        const baseUrl = window.location.origin;
        const link = `${baseUrl}/shared/${documentId}`;
        return link;
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const handleInputClick = () => {
        const link = generateShareLink();
        copyToClipboard(link);
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
                <div className="space-y-3">
                    <h4 className="font-medium text-sm">Share link</h4>

                    <div className="space-y-2">
                        <Input
                            value={generateShareLink()}
                            readOnly
                            onClick={handleInputClick}
                            className="text-sm cursor-pointer hover:bg-gray-50 select-all"
                            placeholder="Click to copy share link"
                        />

                        {copied && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                Link copied to clipboard!
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}