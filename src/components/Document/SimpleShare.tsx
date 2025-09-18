import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Share2,
    Copy,
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

    const handleCopyLink = () => {
        const link = generateShareLink();
        copyToClipboard(link);
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
                <div className="p-3 space-y-3">
                    <h4 className="font-medium text-sm">Share link</h4>

                    <div className="flex gap-2">
                        <Input
                            value={generateShareLink()}
                            readOnly
                            className="text-sm"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCopyLink}
                            className="px-3 whitespace-nowrap"
                        >
                            {copied ? (
                                <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-1" />
                                    Copy
                                </>
                            )}
                        </Button>
                    </div>

                    {copied && (
                        <p className="text-xs text-green-600">Link copied to clipboard!</p>
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}