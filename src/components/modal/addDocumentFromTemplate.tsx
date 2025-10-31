import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FileText, Plus } from 'lucide-react';
import { API_ENDPOINTS } from '../../lib/apiConfig';
import { useAuth } from '../../context/AuthContext';
import { githubRepoService, type GitHubRepository as ServiceGitHubRepository } from '../../services/githubRepoService';
import type { Template, Project } from '../../types';

// Utility function for user-friendly error messages
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
};





interface AddDocumentFromTemplateProps {
  isOpen: boolean;
  template: Template | null;
  onClose: () => void;
  onCreateDocument: (data: {
    template: Template;
    projectId?: string;
    newProjectName?: string;
    newProjectDescription?: string;
    selectedRepo?: string;
    documentName: string;
    documentRole: string;
  }) => void;
}

type ProjectOption = 'new' | 'existing';

const AddDocumentFromTemplate: React.FC<AddDocumentFromTemplateProps> = ({
  isOpen,
  template,
  onClose,
  onCreateDocument
}) => {
  const { user } = useAuth();
  const [projectOption, setProjectOption] = useState<ProjectOption>('new');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<ServiceGitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Load existing projects when modal opens
  useEffect(() => {
    if (isOpen) {
      loadProjects();
      // Reset form when modal opens
      setProjectOption('new');
      setSelectedProjectId(null);
      setNewProjectName('');
      setNewProjectDescription('');
      setSelectedRepo('');
      setDocumentName('');
      setValidationErrors({});
      setErrorMessage('');
      // Load user's GitHub repositories immediately
      loadUserRepositories();
    }
  }, [isOpen]);

  // Auto-fill document name based on template
  useEffect(() => {
    if (template) {
      setDocumentName(template.TemplateName);
    }
  }, [template]);

  // Load user's GitHub repositories based on their profile
  const loadUserRepositories = async () => {
    try {
      setLoading(true);
      setErrorMessage(''); // Clear any previous errors
      
      if (!user) {
        setRepositories([]);
        return;
      }
      
      const repositories = await githubRepoService.getUserRepositories(user);
      setRepositories(repositories);
    } catch (error) {
      const message = getErrorMessage(error);
      setErrorMessage(`Failed to load GitHub repositories: ${message}. Please make sure your GitHub account is connected in your profile.`);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      setLoading(true);
      setErrorMessage(''); // Clear any previous errors
      
      if (!user) {
        setProjects([]);
        return;
      }
      
      const userId = user.uid;
      const response = await fetch(API_ENDPOINTS.projects());
      
      if (response.ok) {
        const data = await response.json();
        
        if (!data || (!data.projects && !Array.isArray(data))) {
          setProjects([]);
          return;
        }
        
        const allProjects = data.projects || data || [];
        
        // Filter projects for the current user
        const userProjects = allProjects.filter((project: any) => {
          const projectUserId = project.User_Id || project.userId || project.user_id;
          return projectUserId === userId;
        });
        
        setProjects(userProjects);
      } else {
        const errorText = await response.text();
        console.error('Failed to load projects:', response.status, errorText);
        setErrorMessage(`Failed to load projects: ${response.status} ${response.statusText}. Please try again later.`);
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
      const message = getErrorMessage(error);
      setErrorMessage(`Error loading projects: ${message}. Please check your connection and try again.`);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!template) return;

    // Validate form
    const errors: Record<string, string> = {};
    
    if (!documentName.trim()) {
      errors.documentName = 'Document name is required';
    }

    if (projectOption === 'new') {
      if (!newProjectName.trim()) {
        errors.newProjectName = 'Project name is required';
      }
      if (!newProjectDescription.trim()) {
        errors.newProjectDescription = 'Project description is required';
      }
      if (!selectedRepo.trim()) {
        errors.selectedRepo = 'Please select a repository';
      }
    } else if (projectOption === 'existing' && !selectedProjectId) {
      errors.selectedProjectId = 'Please select a project';
    }

    setValidationErrors(errors);

    // If there are validation errors, don't proceed
    if (Object.keys(errors).length > 0) {
      return;
    }

    const data = {
      template,
      projectId: projectOption === 'existing' ? selectedProjectId || undefined : undefined,
      newProjectName: projectOption === 'new' ? newProjectName : undefined,
      newProjectDescription: projectOption === 'new' ? newProjectDescription : undefined,
      selectedRepo: projectOption === 'new' ? selectedRepo : undefined,
      documentName,
      documentRole: 'General' // Default role
    };

    onCreateDocument(data);
  };

  const isFormValid = () => {
    const hasDocumentName = documentName.trim();
    
    if (projectOption === 'new') {
      return hasDocumentName && 
             newProjectName.trim() && 
             newProjectDescription.trim() && 
             selectedRepo.trim();
    } else {
      return hasDocumentName && selectedProjectId !== null;
    }
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Create {template.TemplateName}
                </h3>
                <p className="text-sm text-gray-600">{template.Description}</p>
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
            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{errorMessage}</p>
              </div>
            )}
            
            <div className="space-y-6">
              {/* Document Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => {
                    setDocumentName(e.target.value);
                    if (validationErrors.documentName) {
                      setValidationErrors(prev => {
                        const newErrors = { ...prev };
                        delete newErrors.documentName;
                        return newErrors;
                      });
                    }
                  }}
                  className={`w-full px-3 py-2 border ${validationErrors.documentName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                  placeholder="Enter document name"
                />
                {validationErrors.documentName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.documentName}</p>
                )}
              </div>

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
                        onChange={(e) => {
                          setNewProjectName(e.target.value);
                          if (validationErrors.newProjectName) {
                            setValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.newProjectName;
                              return newErrors;
                            });
                          }
                        }}
                        className={`w-full px-3 py-2 border ${validationErrors.newProjectName ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Enter project name"
                      />
                      {validationErrors.newProjectName && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.newProjectName}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Description *
                      </label>
                      <textarea
                        value={newProjectDescription}
                        onChange={(e) => {
                          setNewProjectDescription(e.target.value);
                          if (validationErrors.newProjectDescription) {
                            setValidationErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.newProjectDescription;
                              return newErrors;
                            });
                          }
                        }}
                        rows={3}
                        className={`w-full px-3 py-2 border ${validationErrors.newProjectDescription ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                        placeholder="Describe your project"
                      />
                      {validationErrors.newProjectDescription && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors.newProjectDescription}</p>
                      )}
                    </div>
                    
                    {/* Repository Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Repository *
                      </label>
                      {loading ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                            <span className="text-sm text-gray-600">Loading repositories...</span>
                          </div>
                        </div>
                      ) : repositories.length > 0 ? (
                        <>
                          <select
                            value={selectedRepo}
                            onChange={(e) => {
                              setSelectedRepo(e.target.value);
                              if (validationErrors.selectedRepo) {
                                setValidationErrors(prev => {
                                  const newErrors = { ...prev };
                                  delete newErrors.selectedRepo;
                                  return newErrors;
                                });
                              }
                            }}
                            className={`w-full px-3 py-2 border ${validationErrors.selectedRepo ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                            required
                          >
                            <option value="">Select a repository ({repositories.length} available)</option>
                            {repositories.map((repo) => (
                              <option key={repo.id} value={repo.full_name}>
                                {repo.full_name}
                                {repo.description && ` - ${repo.description}`}
                              </option>
                            ))}
                          </select>
                          {validationErrors.selectedRepo && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.selectedRepo}</p>
                          )}
                        </>
                      ) : (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          <span className="text-sm text-gray-600">No repositories found. Please connect your GitHub account in your profile settings.</span>
                        </div>
                      )}
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
                      <>
                        <div className="max-h-48 overflow-y-auto space-y-2">
                          {projects.map((project) => (
                            <label
                              key={project.id}
                              className="flex items-center p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <input
                                type="radio"
                                name="selectedProject"
                                value={project.id || project.Project_Id}
                                checked={selectedProjectId === (project.id || project.Project_Id)}
                                onChange={() => {
                                  setSelectedProjectId(project.id || project.Project_Id || null);
                                  if (validationErrors.selectedProjectId) {
                                    setValidationErrors(prev => {
                                      const newErrors = { ...prev };
                                      delete newErrors.selectedProjectId;
                                      return newErrors;
                                    });
                                  }
                                }}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                              />
                              <div className="ml-3 flex-1">
                                <div className="font-medium text-gray-900">{project.ProjectName}</div>
                                <div className="text-sm text-gray-600 truncate">{project.Description}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                        {validationErrors.selectedProjectId && (
                          <p className="mt-1 text-sm text-red-600">{validationErrors.selectedProjectId}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end p-6 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={!isFormValid()}
                className={`px-6 py-2 text-sm font-medium rounded-lg transition-colors flex items-center ${
                  isFormValid()
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddDocumentFromTemplate;