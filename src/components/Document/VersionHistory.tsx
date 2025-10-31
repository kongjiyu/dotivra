import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_ENDPOINTS } from "@/lib/apiConfig";
import { GitBranch, FileText } from "lucide-react";
import VersionCard from "./VersionHistory/VersionCard";
import ContentSection from "./VersionHistory/ContentSection";

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

// Firebase DocumentHistory structure
interface FirebaseVersionEntry {
    id: string;
    Document_Id: string;
    Content: string;
    Version: string;
    Edited_Time: any; // Firebase Timestamp
}

interface VersionHistoryProps {
    documentId?: string;
    currentContent: string;
    onRestoreVersion?: (content: string) => void;
    onPreviewVersion?: (content: string) => void;
}

export default function VersionHistory({
    documentId,
    onRestoreVersion,
}: VersionHistoryProps) {
    const [versions, setVersions] = useState<VersionEntry[]>([]);
    const [selectedVersion, setSelectedVersion] = useState<VersionEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch version history from Firebase
    useEffect(() => {
        const fetchVersionHistory = async () => {
            if (!documentId) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);
                
                const response = await fetch(API_ENDPOINTS.documentHistory(documentId));
                
                if (!response.ok) {
                    throw new Error(`Failed to fetch version history: ${response.status}`);
                }

                const data = await response.json();

                if (data.versions && Array.isArray(data.versions)) {
                    // Convert Firebase versions to VersionEntry format
                    const formattedVersions: VersionEntry[] = data.versions.map((v: FirebaseVersionEntry, index: number) => {
                        const timestamp = v.Edited_Time?.toDate?.() || 
                                        (v.Edited_Time?._seconds ? new Date(v.Edited_Time._seconds * 1000) : new Date());
                        
                        const contentLength = v.Content?.length || 0;
                        const prevVersion = data.versions[index + 1];
                        const prevContentLength = prevVersion?.Content?.length || 0;

                        return {
                            id: v.id,
                            timestamp: timestamp.getTime(),
                            action: index === data.versions.length - 1 ? "Created" : "Edit",
                            content: v.Content || "",
                            contentLength,
                            version: v.Version,
                            changes: index < data.versions.length - 1 ? {
                                added: Math.max(0, contentLength - prevContentLength),
                                removed: Math.max(0, prevContentLength - contentLength),
                            } : undefined,
                        };
                    });

                    setVersions(formattedVersions);
                    // Don't auto-select on load - let user click to view
                } else {
                    setVersions([]);
                }
            } catch (err) {
                console.error('❌ Error fetching version history:', err);
                setError(err instanceof Error ? err.message : 'Failed to load version history');
            } finally {
                setLoading(false);
            }
        };

        fetchVersionHistory();
    }, [documentId]);

    const handleRestore = (version: VersionEntry) => {
        if (onRestoreVersion) {
            onRestoreVersion(version.content);
        }
    };

    const handleCardClick = (version: VersionEntry) => {
        // Toggle selection: if already selected, deselect; otherwise select
        if (selectedVersion?.id === version.id) {
            setSelectedVersion(null);
        } else {
            setSelectedVersion(version);
        }
    };

    return (
        <div className="h-full flex">
            <div className={`transition-all duration-300 ${
                selectedVersion ? 'flex-[3]' : 'flex-1'
            } bg-white ${selectedVersion ? 'border-r border-gray-200' : ''}`}>
                {selectedVersion ? (
                    <ContentSection version={selectedVersion} />
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                        <div className="text-center">
                            <FileText className="w-20 h-20 mx-auto mb-4 opacity-20" />
                            <p className="text-lg">Select a version to view its content</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Version List */}
            <div className={`transition-all duration-300 ${
                selectedVersion ? 'flex-[2]' : 'flex-1'
            } bg-gray-50`}>
                <ScrollArea className="h-full">
                    <div className="p-6">
                        {loading ? (
                            <div className="text-center py-12">
                                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
                                <p className="mt-4 text-gray-600">Loading versions...</p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-12 text-red-600">
                                <p className="font-medium">Failed to load history</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        ) : versions.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-30" />
                                <p className="text-lg font-medium">No versions yet</p>
                                <p className="text-sm mt-2">Versions will appear here as you edit</p>
                            </div>
                        ) : (
                            <div>
                                {versions.map((version, index) => (
                                    <VersionCard
                                        key={version.id}
                                        version={version}
                                        index={index}
                                        isSelected={selectedVersion?.id === version.id}
                                        onSelect={() => handleCardClick(version)}
                                        onRestore={() => handleRestore(version)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}