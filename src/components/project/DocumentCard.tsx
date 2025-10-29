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
    console.log('Opening document:', document.Title || document.DocumentName, 'ID:', document.id);
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
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg hover:border-gray-300 transition-all duration-200 cursor-pointer group"
    >
      {/* Compact Thumbnail Section - Google Docs style */}
      <div className={`relative h-32 flex items-center justify-center ${getIconBgColor()} transition-colors border-b border-gray-200`}>
        <FileText className={`h-10 w-10 ${getIconColor()}`} />

        {/* Actions Dropdown - Top Right */}
        <div className="absolute top-2 right-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDropdown(!showDropdown);
            }}
            className="p-1.5 rounded-md bg-white/80 hover:bg-white shadow-sm transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-600" />
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 top-9 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20 overflow-hidden">
                <button
                  onClick={handleEdit}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                >
                  <Edit className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Compact Details Section - Google Docs style */}
      <div className="p-3">
        {/* Document Title - Smaller, truncated */}
        <h3 className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate mb-2">
          {document.Title || document.DocumentName}
        </h3>

        {/* Bottom Row: Badge and Date */}
        <div className="flex items-center justify-between gap-2">
          {/* Template Badge - Smaller */}
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor()}`}>
            {document.DocumentType}
          </span>

          {/* Last Edited - Compact */}
          <div className="flex items-center text-xs text-gray-400">
            <Clock className="h-3 w-3 mr-1" />
            <span className="hidden sm:inline">
              {document.Updated_Time
                ? new Date(document.Updated_Time).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })
                : 'Never'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;