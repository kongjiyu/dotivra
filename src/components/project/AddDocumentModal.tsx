// src/components/project/AddDocumentModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { mockTemplates } from '../../utils/mockData';
import type { Template } from '../../types';

interface CreateDocumentArgs {
  template: Template;
  category: 'user' | 'developer';
  name: string;
  role: string;
}

interface AddDocumentModalProps {
  isOpen: boolean;
  category: 'user' | 'developer' | null;
  onClose: () => void;
  onCreateDocument: (args: CreateDocumentArgs) => void;
}

const roleOptions = [
  { value: 'user', label: 'User Documentation' },
  { value: 'developer', label: 'Developer Documentation' },
  { value: 'admin', label: 'Admin Documentation' }
];

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  category,
  onClose,
  onCreateDocument
}) => {
  if (!isOpen || !category) return null;

  const [documentName, setDocumentName] = useState('');
  const [selectedRole, setSelectedRole] = useState(roleOptions[0]?.value ?? 'author');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Show all templates regardless of category
  const relevantTemplates = useMemo(
    () => mockTemplates,
    []
  );

  const selectedTemplate = useMemo(
    () => relevantTemplates.find(template => template.id === selectedTemplateId) ?? null,
    [relevantTemplates, selectedTemplateId]
  );

  const resetForm = useCallback(() => {
    setDocumentName('');
    setSelectedTemplateId(null);
    setSelectedRole(roleOptions[0]?.value ?? 'author');
  }, []);

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplateId(template.id);
  };

  const handleCreate = () => {
    if (!selectedTemplate || !documentName.trim()) {
      return;
    }

    onCreateDocument({
      template: selectedTemplate,
      category,
      name: documentName.trim(),
      role: selectedRole
    });

    resetForm();
    onClose();
  };

  const handleCancel = () => {
    resetForm();
    onClose();
  };

  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, category, resetForm]);

  const canCreate = Boolean(selectedTemplate && documentName.trim());

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Create New Document
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Choose a template and role for your document
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          <div className="px-6 py-6 overflow-y-auto">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="document-name">
                    Document Name
                  </label>
                  <input
                    id="document-name"
                    value={documentName}
                    onChange={(event) => setDocumentName(event.target.value)}
                    placeholder="e.g. Getting Started Guide"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    type="text"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="document-role">
                    Document Type
                  </label>
                  <select
                    id="document-role"
                    value={selectedRole}
                    onChange={(event) => setSelectedRole(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {roleOptions.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Document Template</h4>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-96 overflow-y-auto pr-2">
                  {relevantTemplates.map((template) => {
                    const Icon = template.icon;
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateClick(template)}
                        className={`relative rounded-xl p-4 transition-all duration-200 cursor-pointer group border-2 overflow-hidden ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 shadow-lg shadow-blue-100/50 ring-1 ring-blue-200/30'
                            : 'border-gray-200 hover:border-blue-300 hover:shadow-md hover:shadow-gray-100/50 bg-white hover:bg-gray-50/30'
                        }`}
                      >
                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                            <span className="text-white text-xs font-bold">✓</span>
                          </div>
                        )}

                        <div className="space-y-4">
                          {/* Icon and Title Section */}
                          <div className="flex items-start space-x-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${
                              isSelected
                                ? 'bg-blue-500 text-white shadow-blue-200'
                                : 'bg-gray-100 text-gray-600 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-blue-200'
                            }`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-semibold text-base mb-1 transition-colors ${
                                isSelected ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-900'
                              }`}>
                                {template.name}
                              </h4>
                              <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
                                {template.description}
                              </p>
                            </div>
                          </div>

                          {/* Category Badge */}
                          <div className="flex items-center justify-between">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border ${
                              template.category === 'user'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : template.category === 'developer'
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}>
                              {template.category}
                            </span>
                            {isSelected && (
                              <span className="inline-flex items-center text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                                Selected
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Hover overlay effect */}
                        <div className={`absolute inset-0 rounded-xl transition-opacity duration-200 ${
                          isSelected 
                            ? 'opacity-0' 
                            : 'opacity-0 group-hover:opacity-100 bg-gradient-to-br from-blue-500/5 to-blue-600/10'
                        }`} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {selectedTemplate && (
                <div className="text-sm text-gray-600">
                  Selected template:
                  <span className="ml-1 font-medium text-gray-900">{selectedTemplate.name}</span>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!canCreate}
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                    canCreate
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-blue-300 cursor-not-allowed'
                  }`}
                  type="button"
                >
                  Create Document
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AddDocumentModal;
