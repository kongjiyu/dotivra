// src/components/project/AddDocumentModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { X, FileText, Github } from 'lucide-react';
import { templates } from '../../utils/mockData';
import type { Template } from '../../types';

interface CreateDocumentArgs {
  template: Template;
  category: 'user' | 'developer' | 'general';
  name: string;
  role: string;
  githubRepo?: string; // Optional GitHub repository
}

interface AddDocumentModalProps {
  isOpen: boolean;
  category?: 'user' | 'developer' | 'general' | null;
  onClose: () => void;
  onCreateDocument: (args: CreateDocumentArgs) => void;
  projectGithubRepo?: string; // GitHub repo linked to the project
}

const roleOptions = [
  { value: 'user', label: 'User Documentation' },
  { value: 'developer', label: 'Developer Documentation' },
  { value: 'admin', label: 'Admin Documentation' }
];

const AddDocumentModal: React.FC<AddDocumentModalProps> = ({
  isOpen,
  category: initialCategory,
  onClose,
  onCreateDocument,
  projectGithubRepo
}) => {
  if (!isOpen) return null;

  const [documentName, setDocumentName] = useState('');
  const [selectedRole, setSelectedRole] = useState(roleOptions[0]?.value ?? 'author');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'user' | 'developer' | 'general'>(initialCategory || 'user');

  // Filter templates by active tab
  const relevantTemplates = useMemo(
    () => templates.filter(template => template.Category === activeTab),
    [activeTab]
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
    setSelectedTemplateId(template.id || null);
  };

  const handleCreate = () => {
    if (!selectedTemplate || !documentName.trim()) {
      return;
    }

    onCreateDocument({
      template: selectedTemplate,
      category: activeTab,
      name: documentName.trim(),
      role: selectedRole,
      githubRepo: projectGithubRepo || undefined
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
      if (initialCategory) {
        setActiveTab(initialCategory);
      }
    }
  }, [isOpen, initialCategory, resetForm]);

  const canCreate = Boolean(selectedTemplate && documentName.trim());

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col">
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

          <div className="px-6 py-6 overflow-y-auto flex-1">
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

                {/* GitHub Repository - Disabled, shows project repo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="github-repo">
                    GitHub Repository
                  </label>
                  {projectGithubRepo ? (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed">
                      <div className="flex items-center space-x-2">
                        <Github className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700 truncate">{projectGithubRepo}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Project's linked repository
                      </p>
                    </div>
                  ) : (
                    <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed flex items-center space-x-2">
                      <Github className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600">No repository linked</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col min-w-0">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Document Template</h4>
                
                {/* Tab Bar */}
                <div className="flex space-x-1 mb-4 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('user')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === 'user'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      User
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('developer')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === 'developer'
                        ? 'text-purple-600 border-b-2 border-purple-600'
                        : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Developer
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                      activeTab === 'general'
                        ? 'text-gray-700 border-b-2 border-gray-700'
                        : 'text-gray-600 hover:text-gray-900 hover:border-b-2 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      General
                    </div>
                  </button>
                </div>

                {/* Fixed height scrollable container */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 h-[400px] overflow-y-auto pr-2 border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                  {relevantTemplates.map((template) => {
                    const Icon = FileText; // Default icon for all templates
                    const isSelected = selectedTemplateId === template.id;
                    return (
                      <div
                        key={template.id}
                        onClick={() => handleTemplateClick(template)}
                        className={`relative rounded-lg p-3 transition-all duration-200 cursor-pointer group border-2 overflow-hidden h-[140px] flex flex-col ${
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

                        {/* Icon and Title Section */}
                        <div className="flex items-start space-x-3 flex-1">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200 shadow-sm ${
                            isSelected
                              ? 'bg-blue-500 text-white shadow-blue-200'
                              : 'bg-gray-100 text-gray-600 group-hover:bg-blue-500 group-hover:text-white group-hover:shadow-blue-200'
                          }`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className={`font-semibold text-sm mb-1 transition-colors ${
                              isSelected ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-900'
                            }`}>
                              {template.TemplateName}
                            </h4>
                            <p className="text-xs text-gray-600 leading-snug line-clamp-3">
                              {template.Description}
                            </p>
                          </div>
                        </div>

                        {/* Category Badge */}
                        <div className="flex items-center justify-start mt-2 pt-2 border-t border-gray-200">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            template.Category === 'user'
                              ? 'bg-emerald-50 text-emerald-700'
                              : template.Category === 'developer'
                              ? 'bg-purple-50 text-purple-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {template.Category}
                          </span>
                        </div>

                        {/* Hover overlay effect */}
                        <div className={`absolute inset-0 rounded-lg transition-opacity duration-200 pointer-events-none ${
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
                  <span className="ml-1 font-medium text-gray-900">{selectedTemplate.TemplateName}</span>
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
