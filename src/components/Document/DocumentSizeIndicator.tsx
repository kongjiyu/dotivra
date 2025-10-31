import React, { useMemo } from 'react';
import { FileText, Image as ImageIcon } from 'lucide-react';
import { getDocumentSizeInfo } from '@/services/imageCompressionService';

interface DocumentSizeIndicatorProps {
  content: string;
  className?: string;
}

export const DocumentSizeIndicator: React.FC<DocumentSizeIndicatorProps> = ({ content, className = '' }) => {
  const sizeInfo = useMemo(() => getDocumentSizeInfo(content), [content]);

  // Don't show if document is small
  if (sizeInfo.sizeKB < 100) {
    return null;
  }

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm text-gray-600 bg-gray-50 border-gray-200 ${className}`}>
      <FileText className="h-4 w-4" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">
            {sizeInfo.sizeMB.toFixed(2)} MB
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs opacity-75">
        <ImageIcon className="h-3 w-3" />
        <span>
          {sizeInfo.imageCount} {sizeInfo.imageCount === 1 ? 'image' : 'images'}
        </span>
      </div>
    </div>
  );
};

export default DocumentSizeIndicator;
