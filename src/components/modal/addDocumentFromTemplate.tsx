import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FileText, Plus } from 'lucide-react';
import type { Template, Project, LegacyTemplate } from '../../types';

// Combined template type to handle both legacy and Firebase templates
type CombinedTemplate = Template | (LegacyTemplate & { icon?: any });

// GitHub functionality temporarily disabled



interface AddDocumentFromTemplateProps {
  isOpen: boolean;
  template: any | null; // Use any to handle both template types
  onClose: () => void;
  onCreateDocument: (data: {
    template: any;
    projectId?: string;
    newProjectName?: string;
    newProjectDescription?: string;
    selectedRepo?: string;
    documentName: string;
    documentRole: string;
  }) => void;
}

type FlowStep = 'project-selection' | 'document-details';
type ProjectOption = 'new' | 'existing';

const AddDocumentFromTemplate: React.FC<AddDocumentFromTemplateProps> = ({
  isOpen,
  template,
  onClose,
  onCreateDocument
}) => {
  const [step, setStep] = useState<FlowStep>('project-selection');
  const [projectOption, setProjectOption] = useState<ProjectOption>('new');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentRole, setDocumentRole] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // Load existing projects when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      // Reset form when modal opens
      setStep('project-selection');
      setProjectOption('new');
      setSelectedProjectId(null);
      setNewProjectName('');
      setNewProjectDescription('');
      setSelectedRepo('');
      setDocumentName('');
      setDocumentRole('');
      // GitHub functionality temporarily disabled
    }
  }, [isOpen]);

  // Auto-fill document name based on template
  useEffect(() => {
    if (template) {
      setDocumentName(template.name || template.TemplateName || 'New Document');
    }
  }, [template]);

  // GitHub functionality temporarily disabled

  const loadProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'project-selection') {
      setStep('document-details');
    }
  };

  const handleBack = () => {
    if (step === 'document-details') {
      setStep('project-selection');
    }
  };

  const handleSubmit = () => {
    if (!template) return;

    const data = {
      template,
      projectId: projectOption === 'existing' ? selectedProjectId || undefined : undefined,
      newProjectName: projectOption === 'new' ? newProjectName : undefined,
      newProjectDescription: projectOption === 'new' ? newProjectDescription : undefined,
      selectedRepo: projectOption === 'new' && selectedRepo ? selectedRepo : undefined,
      documentName,
      documentRole
    };

    console.log('Submitting document creation data:', data);
    onCreateDocument(data);
  };

  const isStepValid = () => {
    if (step === 'project-selection') {
      if (projectOption === 'new') {
        // GitHub repository is now optional, only require name and description
        return newProjectName.trim() && 
               newProjectDescription.trim();
      } else {
        return selectedProjectId !== null;
      }
    } else if (step === 'document-details') {
      return documentName.trim() && documentRole.trim();
    }
    return false;
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                {template.icon ? <template.icon className="h-5 w-5 text-blue-600" /> : <FileText className="h-5 w-5 text-blue-600" />}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Create {template.name || template.TemplateName}
                </h3>
                <p className="text-sm text-gray-600">{template.description || template.Description}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {step === 'project-selection' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-4">
                    Where would you like to add this document?
                  </h4>
                  
                  <div className="space-y-3">
                    {/* Create New Project Option */}
                    <label className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="projectOption"
                        value="new"
                        checked={projectOption === 'new'}
                        onChange={(e) => setProjectOption(e.target.value as ProjectOption)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <FolderPlus className="h-5 w-5 text-blue-600 mr-2" />
                          <span className="font-medium text-gray-900">Create New Project</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Start a new project and add this document to it
                        </p>
                      </div>
                    </label>

                    {/* Select Existing Project Option */}
                    <label className="flex items-start p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors">
                      <input
                        type="radio"
                        name="projectOption"
                        value="existing"
                        checked={projectOption === 'existing'}
                        onChange={(e) => setProjectOption(e.target.value as ProjectOption)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="ml-3 flex-1">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-green-600 mr-2" />
                          <span className="font-medium text-gray-900">Add to Existing Project</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Add this document to one of your existing projects
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* New Project Form */}
                {projectOption === 'new' && (
                  <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Name *
                      </label>
                      <input
                        type="text"
                        value={newProjectName}
                        onChange={(e) => setNewProjectName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter project name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Description *
                      </label>
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => setNewProjectDescription(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe your project"
                      />
                    </div>
                    
                    {/* GitHub Integration - Temporarily Disabled */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                      <p className="text-sm text-yellow-700">
                        📝 <strong>Note:</strong> GitHub integration is temporarily disabled. Creating Firebase-only projects for now.
                      </p>
                    </div>
                  </div>
                )}

                {/* Existing Projects List */}
                {projectOption === 'existing' && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Select Project *
                    </label>
                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="text-sm text-gray-600 mt-2">Loading projects...</p>
                      </div>
                    ) : projects.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <p>No projects found. Create a new project instead.</p>
                      </div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto space-y-2">
                        {projects.map((project) => (
                          <label
                            key={project.id}
                            className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                          >
                            <input
                              type="radio"
                              name="selectedProject"
                              value={project.id}
                              checked={selectedProjectId === project.id}
                              onChange={() => setSelectedProjectId(project.id || null)}
                              className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <div className="ml-3 flex-1">
                              <div className="font-medium text-gray-900">{project.ProjectName}</div>
                              <div className="text-sm text-gray-600 truncate">{project.Description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {step === 'document-details' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-medium text-gray-900 mb-4">
                    Document Details
                  </h4>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Name *
                      </label>
                      <input
                        type="text"
                        value={documentName}
                        onChange={(e) => setDocumentName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter document name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Role/Purpose *
                      </label>
                      <input
                        type="text"
                        value={documentRole}
                        onChange={(e) => setDocumentRole(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., Frontend Developer, API Integration, User Guide"
                      />
                    </div>

                    {/* Template Info */}
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center">
                        {template.icon ? <template.icon className="h-5 w-5 text-blue-600 mr-2" /> : <FileText className="h-5 w-5 text-blue-600 mr-2" />}
                        <div>
                          <div className="font-medium text-blue-900">Template: {template.name || template.TemplateName}</div>
                          <div className="text-sm text-blue-700">{template.description || template.Description}</div>
                          <div className="text-xs text-blue-600 mt-1 capitalize">
                            Category: {template.category || template.Category || 'General'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center text-sm text-gray-500">
              Step {step === 'project-selection' ? '1' : '2'} of 2
            </div>
            
            <div className="flex items-center space-x-3">
              {step === 'document-details' && (
                <button
                  onClick={handleBack}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back
                </button>
              )}
              
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              {step === 'project-selection' ? (
                <button
                  onClick={handleNext}
                  disabled={!isStepValid()}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!isStepValid()}
                  className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Document
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDocumentFromTemplate;