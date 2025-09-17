import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Share2,
    Link,
    Mail,
    Copy,
    Users,
    Shield,
    Clock,
    CheckCircle,
    ExternalLink
} from "lucide-react";

interface SharePermission {
    id: string;
    email: string;
    role: 'viewer' | 'editor' | 'admin';
    addedAt: number;
    status: 'pending' | 'accepted';
}

interface ShareSettingsProps {
    documentTitle: string;
    documentContent: string;
}

export default function ShareSettings({
    documentTitle,
    documentContent,
}: ShareSettingsProps) {
    const [shareLink, setShareLink] = useState("");
    const [linkAccess, setLinkAccess] = useState<'view' | 'edit' | 'restricted'>('view');
    const [emailInput, setEmailInput] = useState("");
    const [emailRole, setEmailRole] = useState<'viewer' | 'editor'>('viewer');
    const [shareMessage, setShareMessage] = useState("");
    const [permissions, setPermissions] = useState<SharePermission[]>([
        {
            id: '1',
            email: 'alice@company.com',
            role: 'editor',
            addedAt: Date.now() - 86400000, // 1 day ago
            status: 'accepted'
        },
        {
            id: '2',
            email: 'bob@company.com',
            role: 'viewer',
            addedAt: Date.now() - 3600000, // 1 hour ago
            status: 'pending'
        }
    ]);
    const [copied, setCopied] = useState(false);

    const generateShareLink = () => {
        const baseUrl = window.location.origin;
        const documentId = crypto.randomUUID().slice(0, 8);
        const link = `${baseUrl}/shared/${documentId}?access=${linkAccess}`;
        setShareLink(link);
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

    const addEmailPermission = () => {
        if (emailInput && emailInput.includes('@')) {
            const newPermission: SharePermission = {
                id: crypto.randomUUID(),
                email: emailInput,
                role: emailRole,
                addedAt: Date.now(),
                status: 'pending'
            };
            setPermissions(prev => [...prev, newPermission]);
            setEmailInput("");
        }
    };

    const removePermission = (id: string) => {
        setPermissions(prev => prev.filter(p => p.id !== id));
    };

    const updatePermissionRole = (id: string, newRole: 'viewer' | 'editor' | 'admin') => {
        setPermissions(prev =>
            prev.map(p => p.id === id ? { ...p, role: newRole } : p)
        );
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now.getTime() - timestamp;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    // Note: role icon/color helpers removed due to being unused in current UI

    const handleShareViaEmail = () => {
        const subject = `Shared document: ${documentTitle}`;
        const body = `${shareMessage || 'I wanted to share this document with you.'}\n\nDocument: ${documentTitle}\nLink: ${shareLink}\n\nBest regards`;
        const mailto = `mailto:${emailInput}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto);
    };

    return (
        <Card className="h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Share2 className="w-5 h-5" />
                    Share Document
                </CardTitle>
                <p className="text-sm text-gray-600">
                    Collaborate with others on "{documentTitle}"
                </p>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Share Link Section */}
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Link className="w-4 h-4" />
                        Share with link
                    </h3>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <select
                                value={linkAccess}
                                onChange={(e) => setLinkAccess(e.target.value as 'view' | 'edit' | 'restricted')}
                                className="border rounded px-3 py-1 text-sm"
                            >
                                <option value="view">View only</option>
                                <option value="edit">Can edit</option>
                                <option value="restricted">Restricted access</option>
                            </select>
                            <Button onClick={generateShareLink} size="sm">
                                Generate Link
                            </Button>
                        </div>
                        {shareLink && (
                            <div className="flex gap-2">
                                <Input
                                    value={shareLink}
                                    readOnly
                                    className="text-sm"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => copyToClipboard(shareLink)}
                                >
                                    {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Share via Email Section */}
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Invite people
                    </h3>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Enter email address"
                                value={emailInput}
                                onChange={(e) => setEmailInput(e.target.value)}
                                className="flex-1"
                            />
                            <select
                                value={emailRole}
                                onChange={(e) => setEmailRole(e.target.value as 'viewer' | 'editor')}
                                className="border rounded px-3 py-1 text-sm"
                            >
                                <option value="viewer">Viewer</option>
                                <option value="editor">Editor</option>
                            </select>
                            <Button
                                onClick={addEmailPermission}
                                size="sm"
                                disabled={!emailInput.includes('@')}
                            >
                                Invite
                            </Button>
                        </div>
                        <Textarea
                            placeholder="Add a message (optional)"
                            value={shareMessage}
                            onChange={(e) => setShareMessage(e.target.value)}
                            className="text-sm"
                            rows={2}
                        />
                        {shareLink && emailInput.includes('@') && (
                            <Button
                                variant="outline"
                                onClick={handleShareViaEmail}
                                className="w-full"
                            >
                                <Mail className="w-4 h-4 mr-2" />
                                Send invitation email
                            </Button>
                        )}
                    </div>
                </div>

                {/* Current Permissions */}
                <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        People with access
                    </h3>
                    <div className="space-y-2">
                        {/* Owner (You) */}
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                    Y
                                </div>
                                <div>
                                    <p className="font-medium">You (Owner)</p>
                                    <p className="text-xs text-gray-600">Full access</p>
                                </div>
                            </div>
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-200">
                                <Shield className="w-3 h-3 mr-1" />
                                Owner
                            </Badge>
                        </div>

                        {/* Shared Permissions */}
                        {permissions.map((permission) => (
                            <div key={permission.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                        {permission.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium">{permission.email}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Clock className="w-3 h-3" />
                                            Added {formatTime(permission.addedAt)}
                                            {permission.status === 'pending' && (
                                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                                                    Pending
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={permission.role}
                                        onChange={(e) => updatePermissionRole(permission.id, e.target.value as any)}
                                        className="border rounded px-2 py-1 text-xs"
                                    >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removePermission(permission.id)}
                                        className="h-7 w-7 p-0 text-gray-400 hover:text-red-600"
                                    >
                                        ×
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-3 border-t pt-4">
                    <h3 className="font-semibold">Quick actions</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(documentContent)}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy content
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://twitter.com/intent/tweet?text=Check out this document: ${documentTitle} ${shareLink}`)}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Share on Twitter
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}