import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    Clock,
    RotateCcw,
    FileText
} from "lucide-react";

interface VersionEntry {
    id: string;
    timestamp: number;
    action: string;
    content: string;
    contentLength: number;
    version?: string;
    changes?: {
        added: number;
        removed: number;
    };
}

interface VersionCardProps {
    version: VersionEntry;
    index: number;
    isSelected: boolean;
    onSelect: () => void;
    onRestore: () => void;
}

export default function VersionCard({
    version,
    index,
    isSelected,
    onSelect,
    onRestore
}: VersionCardProps) {

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatTimeAgo = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - timestamp;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        
        return date.toLocaleDateString();
    };

    return (
        <div className="pb-4 last:pb-0">
            {/* Version card */}
            <Card 
                className={`transition-all duration-200 cursor-pointer ${
                    isSelected
                        ? 'border-blue-400 shadow-md ring-2 ring-blue-100'
                        : 'border-gray-200 hover:shadow-lg hover:border-gray-300'
                }`}
                onClick={onSelect}
            >
                <CardContent className="p-5">
                    {/* Header with Version Number */}
                    <div className="flex items-start justify-between mb-4 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Version {version.version || index + 1}
                            </h3>
                            {index === 0 && (
                                <Badge className="bg-blue-600 text-white">
                                    Latest
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Metadata - Horizontal Layout */}
                    <div className="flex items-center gap-6 text-sm">
                        {/* Created/Edited Time */}
                        <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="w-4 h-4 shrink-0" />
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{formatTime(version.timestamp)}</span>
                                <span className="text-xs text-gray-500 mt-0.5">{formatTimeAgo(version.timestamp)}</span>
                            </div>
                        </div>

                        {/* Character count */}
                        <div className="flex items-center gap-2 text-gray-700">
                            <FileText className="w-4 h-4" />
                            <div className="flex flex-col">
                                <span className="font-medium">{version.contentLength.toLocaleString()}</span>
                                <span className="text-xs text-gray-500">characters</span>
                            </div>
                        </div>

                        {/* Changes */}
                        {version.changes && (version.changes.added > 0 || version.changes.removed > 0) && (
                            <div className="flex flex-col gap-1">
                                {version.changes.added > 0 && (
                                    <span className="text-emerald-600 font-medium text-xs">
                                        +{version.changes.added}
                                    </span>
                                )}
                                {version.changes.removed > 0 && (
                                    <span className="text-red-600 font-medium text-xs">
                                        -{version.changes.removed}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Show Restore button when selected */}
                    {isSelected && (
                        <div className="mt-4 pt-4 border-t border-gray-200 text-white">
                            <Button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRestore();
                                }}
                                className="w-full bg-blue-600 hover:bg-blue-700 "
                            >
                                <RotateCcw className="w-4 h-4 mr-2 text-white" />
                                Restore This Version
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
