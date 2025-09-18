import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { type FileContent, githubClient } from '../../lib/githubClient';
import { 
  Copy, 
  Download, 
  FileText, 
  Code, 
  Calendar,
  HardDrive,
  Tag,
  Check,
  AlertCircle 
} from 'lucide-react';
import { useState } from 'react';

interface FilePreviewProps {
  file: FileContent;
  loading?: boolean;
}

export function FilePreview({ file, loading }: FilePreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(file.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy content:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([file.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.path.split('/').pop() || 'file.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getFileIcon = () => {
    const fileType = githubClient.getFileType(file.path);
    
    switch (fileType) {
      case 'markdown':
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'json':
      case 'yaml':
      case 'config':
        return <Code className="h-4 w-4 text-green-500" />;
      default:
        return <FileText className="h-4 w-4 text-gray-500" />;
    }
  };

  const renderContent = () => {
    const fileType = githubClient.getFileType(file.path);
    
    if (fileType === 'json') {
      try {
        const formatted = JSON.stringify(JSON.parse(file.content), null, 2);
        return (
          <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 border">
            <code className="language-json">{formatted}</code>
          </pre>
        );
      } catch {
        // Fall through to plain text if JSON parsing fails
      }
    }
    
    return (
      <pre className="text-sm bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 border whitespace-pre-wrap break-words">
        <code>{file.content}</code>
      </pre>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {getFileIcon()}
            <div>
              <CardTitle className="text-lg">{file.path}</CardTitle>
              <CardDescription>
                {githubClient.formatFileSize(file.size)} • SHA: {file.sha.substring(0, 8)}
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {file.cached && (
              <Badge variant="secondary" className="text-xs">
                <HardDrive className="h-3 w-3 mr-1" />
                Cached
              </Badge>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="flex items-center gap-1"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="flex items-center gap-1"
            >
              <Download className="h-3 w-3" />
              Download
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* File metadata */}
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              SHA: {file.sha.substring(0, 12)}
            </div>
            {file.encoding && (
              <div className="flex items-center gap-1">
                <Code className="h-3 w-3" />
                {file.encoding.toUpperCase()}
              </div>
            )}
            {(file.fetched_at || file.last_updated) && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {file.cached ? 'Cached' : 'Fetched'}: {
                  new Date(file.last_updated || file.fetched_at!).toLocaleString()
                }
              </div>
            )}
          </div>

          <Separator />

          {/* Truncation warning */}
          {file.truncated && (
            <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <div className="text-sm">
                <p className="font-medium text-yellow-800">Content Truncated</p>
                <p className="text-yellow-700">
                  This file is larger than 50KB. Only the first portion is shown for preview.
                </p>
              </div>
            </div>
          )}

          {/* File content */}
          <div>
            <h4 className="font-medium mb-2">Content Preview</h4>
            {renderContent()}
          </div>

          {/* File stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Size</p>
              <p className="text-xs text-gray-600">{githubClient.formatFileSize(file.size)}</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Type</p>
              <p className="text-xs text-gray-600 capitalize">
                {githubClient.getFileType(file.path)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Lines</p>
              <p className="text-xs text-gray-600">
                {file.content.split('\n').length.toLocaleString()}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Characters</p>
              <p className="text-xs text-gray-600">
                {file.content.length.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}