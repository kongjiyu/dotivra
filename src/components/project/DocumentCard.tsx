// src/components/project/DocumentCard.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Clock, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import type { Document } from '../../types';

interface DocumentCardProps {
  document: Document;
  onEdit: (document: Document) => void;
  onDelete: (document: Document) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onEdit, onDelete }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(document);
    setShowDropdown(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(document);
    setShowDropdown(false);
  };

  const handleCardClick = () => {
    console.log('Opening document:', document.DocumentName, 'ID:', document.id);
    if (document.id) {
      navigate(`/document/${document.id}`);
    }
  };

  const getCategoryColor = () => {
    if (document.DocumentCategory === 'User') {
      return 'bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20';
    }
    if (document.DocumentCategory === 'Developer') {
      return 'bg-purple-500/10 text-purple-700 ring-1 ring-purple-500/20';
    }
    return 'bg-gray-500/10 text-gray-700 ring-1 ring-gray-500/20';
  };

  const getIconBgColor = () => {
    if (document.DocumentCategory === 'User') return 'bg-blue-100 group-hover:bg-blue-200';
    if (document.DocumentCategory === 'Developer') return 'bg-purple-100 group-hover:bg-purple-200';
    return 'bg-gray-100 group-hover:bg-gray-200';
  };

  const getIconColor = () => {
    if (document.DocumentCategory === 'User') return 'text-blue-600';
    if (document.DocumentCategory === 'Developer') return 'text-purple-600';
    return 'text-gray-600';
  };

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-300 cursor-pointer group hover:-translate-y-0.5"
    >
      {/* Thumbnail Section */}
      <div className={`relative h-20 flex items-center justify-center ${getIconBgColor()} transition-colors`}>
        <FileText className={`h-8 w-8 ${getIconColor()}`} />
        
        {/* Actions Dropdown - Top Right */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            className="p-1 rounded-lg bg-white/90 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-gray-600" />
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-9 w-32 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-blue-50 flex items-center gap-2 transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Details Section */}
      <div className="p-3.5 space-y-2">
        {/* Document Title */}
        <h3 className="font-semibold text-sm text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[2.5rem] leading-tight">
          {document.DocumentName}
        </h3>

        {/* Template Badge */}
        <div>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor()}`}>
            {document.DocumentType}
          </span>
        </div>

        {/* Last Edited */}
        <div className="flex items-center text-xs text-gray-500 pt-1.5 border-t border-gray-100">
          <Clock className="h-3 w-3 mr-1" />
          <span>
            {document.Updated_Time 
              ? new Date(document.Updated_Time).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric', 
                  year: 'numeric' 
                })
              : 'Never'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;