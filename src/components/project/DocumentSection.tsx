// src/components/project/DocumentSection.tsx
import React from 'react';
import { FileText, Code } from 'lucide-react';
import DocumentCard from './DocumentCard';
import type { Document } from '../../types';

interface DocumentSectionProps {
  title: string;
  category: 'user' | 'developer';
  documents: Document[];
  onAddDocument?: (category: 'user' | 'developer') => void;
  onEditDocument: (document: Document) => void;
  onDeleteDocument: (document: Document) => void;
}

const DocumentSection: React.FC<DocumentSectionProps> = ({
  title,
  category,
  documents,
  onEditDocument,
  onDeleteDocument
}) => {
  const getSectionIcon = () => {
    return category === 'user' ? FileText : Code;
  };

  const getSectionColor = () => {
    return 'text-blue-600 bg-blue-50';
  };

  const Icon = getSectionIcon();

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center space-x-3 mb-6">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getSectionColor()}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-600">
            {documents.length} document{documents.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              document={document}
              onEdit={onEditDocument}
              onDelete={onDeleteDocument}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50">
          <Icon className="h-8 w-8 text-blue-500 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            No {category} documents yet
          </h3>
          <p className="text-sm text-gray-500">
            Use the "Add Document" button above to create your first {category} document
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentSection;