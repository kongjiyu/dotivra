// src/components/project/DocumentCard.tsx
import React, { useState } from 'react';
import { FileText, Clock, MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import type { Document } from '../../types';

interface DocumentCardProps {
  document: Document;
  onEdit: (document: Document) => void;
  onDelete: (document: Document) => void;
}

const DocumentCard: React.FC<DocumentCardProps> = ({ document, onEdit, onDelete }) => {
  const [showDropdown, setShowDropdown] = useState(false);

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
    console.log('Opening document:', document.name);
    // TODO: Navigate to document editor
  };

  const getCategoryColors = () => {
    if (document.template.category === 'user') {
      return {
        badge: 'bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 border border-emerald-200',
        icon: 'bg-gradient-to-br from-emerald-500 to-green-600',
        hover: 'group-hover:from-emerald-600 group-hover:to-green-700'
      };
    } else if (document.template.category === 'developer') {
      return {
        badge: 'bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 border border-violet-200',
        icon: 'bg-gradient-to-br from-violet-500 to-purple-600',
        hover: 'group-hover:from-violet-600 group-hover:to-purple-700'
      };
    }
    return {
      badge: 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200',
      icon: 'bg-gradient-to-br from-gray-500 to-slate-600',
      hover: 'group-hover:from-gray-600 group-hover:to-slate-700'
    };
  };

  const colors = getCategoryColors();

  return (
    <div
      onClick={handleCardClick}
      className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl p-6 hover:shadow-2xl hover:shadow-blue-100/50 hover:border-blue-300/60 transition-all duration-300 cursor-pointer group transform hover:-translate-y-1 hover:scale-[1.02]"
    >
      {/* Document Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
            <FileText className="h-4 w-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-700 transition-colors">
              {document.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                document.template.category === 'user' 
                  ? 'bg-green-100 text-green-700'
                  : document.template.category === 'developer'
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {document.template.name}
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
            className="p-1 rounded-md hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4 text-gray-400" />
          </button>
          
          {showDropdown && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-10"
                onClick={() => setShowDropdown(false)}
              />
              
              {/* Dropdown Menu */}
              <div className="absolute right-0 top-8 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20">
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

      {/* Document Info */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Edited {document.lastEdited}</span>
        </div>
      </div>

      {/* Open Button - Hidden until hover */}
      <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button className="w-full py-2 text-sm text-blue-600 border border-blue-200 rounded-md hover:bg-blue-50 transition-colors">
          Open Document
        </button>
      </div>
    </div>
  );
};

export default DocumentCard;