// src/components/project/DocumentSection.tsx
import React, { useState } from 'react';
import { FileText, Code, ChevronDown } from 'lucide-react';
import DocumentCard from './DocumentCard';
import type { Document } from '../../types';

interface DocumentSectionProps {
  title: string;
  category: 'user' | 'developer' | 'general';
  documents: Document[];
  onAddDocument?: (category: 'user' | 'developer' | 'general') => void;
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const getSectionIcon = () => {
    if (category === 'user') return FileText;
    if (category === 'developer') return Code;
    return FileText; // Default icon for general
  };

  const getSectionColor = () => {
    if (category === 'user') return 'text-blue-600 bg-blue-50';
    if (category === 'developer') return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50'; // Color for general
  };

  const Icon = getSectionIcon();

  return (
    <div className="mb-10">
      {/* Section Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center space-x-3 mb-6 pb-3 border-b border-gray-200 hover:bg-gray-50/50 px-2 py-1 rounded-t-lg transition-colors group focus:outline-none select-none"
      >
        <div className="flex items-center space-x-3 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${getSectionColor()}`}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="text-left">
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              {documents.length} document{documents.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="text-gray-400 group-hover:text-gray-600 transition-all duration-200">
          <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isCollapsed ? '-rotate-90' : 'rotate-0'}`} />
        </div>
      </button>

      {/* Documents Grid - Collapsible with Animation */}
      <div 
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        }`}
      >
        {documents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${getSectionColor()}`}>
              <Icon className="h-8 w-8" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              No {category} documents yet
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              Use the "Add Document" button above to create your first {category} document
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentSection;