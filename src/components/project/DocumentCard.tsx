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

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group"
    >

      {/* Thumbnail Section */}
      <div className="relative bg-blue-50 h-32 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
        <FileText className="h-12 w-12 text-blue-500" />

        {/* Actions Dropdown - Top Right */}
        <div className="absolute top-2 right-2">
          {/* Document Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                  {document.DocumentName}
                </h3>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${document.DocumentCategory === 'User'
                    ? 'bg-green-100 text-green-700'
                    : document.DocumentCategory === 'Developer'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>
                    {document.DocumentType}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDropdown(!showDropdown);
                }}
                className="p-1.5 rounded-full bg-white/80 hover:bg-white transition-colors opacity-0 group-hover:opacity-100"
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
                  <div className="absolute right-0 top-10 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20">
                    <button
                      onClick={handleEdit}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Edit className="h-3 w-3 mr-2" />
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-gray-50 flex items-center border-t border-gray-100"
                    >
                      <Trash2 className="h-3 w-3 mr-2" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Details Section */}
          <div className="p-4 space-y-2">
            {/* Document Title */}
            <h3 className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
              {document.DocumentName}
            </h3>

            {/* Template Badge */}
            <div>
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${document.DocumentCategory === 'User'
                ? 'bg-blue-50 text-blue-700'
                : document.DocumentCategory === 'Developer'
                  ? 'bg-purple-50 text-purple-700'
                  : 'bg-gray-50 text-gray-700'
                }`}>
                {document.DocumentType}
              </span>
            </div>

            {/* Last Edited */}
            <div className="flex items-center text-sm text-gray-500">
              <Clock className="h-3 w-3 mr-1" />
              <span>Edited {document.Updated_Time ? new Date(document.Updated_Time).toLocaleDateString() : 'Never'}</span>
            </div>

            {/* Open Button */}
            <button className="w-full py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors mt-3">
              Open Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCard;