import React, { useMemo } from 'react';
import { AlertTriangle, FileText, Image as ImageIcon } from 'lucide-react';
import { getDocumentSizeInfo, MAX_DOCUMENT_SIZE_KB, MAX_IMAGES_PER_DOCUMENT } from '@/services/imageCompressionService';

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

  const getStatusColor = () => {
    if (sizeInfo.exceedsLimit) return 'text-red-600 bg-red-50 border-red-200';
    if (sizeInfo.isNearLimit) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (sizeInfo.percentOfLimit > 50) return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getIcon = () => {
    if (sizeInfo.exceedsLimit || sizeInfo.isNearLimit) {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  const getMessage = () => {
    if (sizeInfo.exceedsLimit) {
      return 'Document exceeds 1MB limit! Remove images or content.';
    }
    if (sizeInfo.isNearLimit) {
      return 'Document approaching size limit. Be careful adding more images.';
    }
    return 'Document size within safe limits';
  };

  const remainingKB = MAX_DOCUMENT_SIZE_KB - sizeInfo.sizeKB;

  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm ${getStatusColor()} ${className}`}>
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">
            {sizeInfo.sizeKB.toFixed(0)} KB / {MAX_DOCUMENT_SIZE_KB} KB
          </span>
          <span className="text-xs opacity-75">
            ({sizeInfo.percentOfLimit.toFixed(1)}% used)
          </span>
        </div>
        
        {(sizeInfo.isNearLimit || sizeInfo.exceedsLimit) && (
          <div className="text-xs mt-0.5 opacity-90">
            {getMessage()}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs opacity-75">
        <ImageIcon className="h-3 w-3" />
        <span>
          {sizeInfo.imageCount}/{MAX_IMAGES_PER_DOCUMENT}
        </span>
      </div>

      {!sizeInfo.exceedsLimit && !sizeInfo.isNearLimit && (
        <div className="text-xs opacity-75 whitespace-nowrap">
          {remainingKB.toFixed(0)} KB free
        </div>
      )}
    </div>
  );
};

export default DocumentSizeIndicator;
