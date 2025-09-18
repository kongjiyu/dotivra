import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Clock,
    User,
    RotateCcw,
    Eye,
    GitBranch,
    Calendar
} from "lucide-react";

interface VersionEntry {
    id: string;
    timestamp: number;
    action: string;
    content: string;
    contentLength: number;
    changes?: {
        added: number;
        removed: number;
    };
}

interface VersionHistoryProps {
    currentContent: string;
    onRestoreVersion?: (content: string) => void;
    onPreviewVersion?: (content: string) => void;
}

export default function VersionHistory({
    currentContent,
    onRestoreVersion,
    onPreviewVersion,
}: VersionHistoryProps) {
    const [versions, setVersions] = useState<VersionEntry[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<string | null>(null);

    // Track content changes and create version entries
    useEffect(() => {
        if (currentContent) {
            const lastVersion = versions[0];
            const contentLength = currentContent.length;

            // Only create a new version if content has actually changed
            if (!lastVersion || lastVersion.content !== currentContent) {
                const newVersion: VersionEntry = {
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    action: lastVersion ? "Edit" : "Created",
                    content: currentContent,
                    contentLength,
                    changes: lastVersion ? {
                        added: Math.max(0, contentLength - lastVersion.contentLength),
                        removed: Math.max(0, lastVersion.contentLength - contentLength),
                    } : undefined,
                };

                setVersions(prev => [newVersion, ...prev].slice(0, 50)); // Keep last 50 versions
            }
        }
    }, [currentContent, versions]);

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - timestamp;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return "Just now";
        if (diffMins < 60) return `${diffMins} min ago`;
        if (diffHours < 24) return `${diffHours} hr ago`;
        if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

        return date.toLocaleDateString();
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case "Created":
                return "bg-green-100 text-green-800 border-green-200";
            case "Edit":
                return "bg-blue-100 text-blue-800 border-blue-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    };

    const handleRestore = (version: VersionEntry) => {
        if (onRestoreVersion) {
            onRestoreVersion(version.content);
        }
    };

    const handlePreview = (version: VersionEntry) => {
        setSelectedVersion(version.id);
        if (onPreviewVersion) {
            onPreviewVersion(version.content);
        }
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    History
                </CardTitle>
                
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                    <div className="space-y-2 p-4">
                        {versions.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <GitBranch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <p>No version history yet</p>
                                <p className="text-sm">Start editing to track changes</p>
                            </div>
                        ) : (
                            versions.map((version, index) => (
                                <div
                                    key={version.id}
                                    className={`border rounded-lg p-4 transition-all ${selectedVersion === version.id
                                            ? 'border-blue-300 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className={getActionColor(version.action)}
                                            >
                                                {version.action}
                                            </Badge>
                                            {index === 0 && (
                                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                                                    Current
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handlePreview(version)}
                                                className="h-7 px-2"
                                            >
                                                <Eye className="w-3 h-3 mr-1" />
                                                Preview
                                            </Button>
                                            {index > 0 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleRestore(version)}
                                                    className="h-7 px-2"
                                                >
                                                    <RotateCcw className="w-3 h-3 mr-1" />
                                                    Restore
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {formatTime(version.timestamp)}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            You
                                        </div>
                                        <div>
                                            {version.contentLength.toLocaleString()} characters
                                        </div>
                                    </div>

                                    {version.changes && (
                                        <div className="flex items-center gap-4 text-xs">
                                            {version.changes.added > 0 && (
                                                <span className="text-green-600">
                                                    +{version.changes.added} added
                                                </span>
                                            )}
                                            {version.changes.removed > 0 && (
                                                <span className="text-red-600">
                                                    -{version.changes.removed} removed
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}