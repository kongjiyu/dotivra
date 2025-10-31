import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle, Github, ExternalLink } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { githubRepoService, type GitHubRepository as ServiceGitHubRepository } from '../../services/githubRepoService';
import { useNavigate } from 'react-router-dom';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================





interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (projectData: {
    name: string;
    description: string;
    selectedRepo?: string;
  }) => void;
}

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================



const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  // ============================================================================
  // STATE MANAGEMENT - ALL HOOKS MUST BE CALLED CONSISTENTLY
  // ============================================================================

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedRepo: '',
    useGithub: true // New: Toggle for GitHub integration
  });

  const [githubState, setGithubState] = useState({
    repositories: [] as ServiceGitHubRepository[],
    filteredRepositories: [] as ServiceGitHubRepository[],
    isLoadingRepositories: false,
    showRepoDropdown: false
  });

  const [uiState, setUiState] = useState({
    errors: {} as { [key: string]: string },
    isSubmitting: false,
    showAdvanced: false
  });

  // ============================================================================
  // GITHUB API FUNCTIONS
  // ============================================================================







  // ============================================================================
  // FORM VALIDATION & UTILITIES
  // ============================================================================

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    }

    // Only require repository if user chose to use GitHub and repositories are available
    if (formData.useGithub && githubState.filteredRepositories.length > 0 && !formData.selectedRepo.trim()) {
      newErrors.selectedRepo = 'Please select a repository or disable GitHub integration';
    }

    setUiState(prev => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };



  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================



  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (uiState.errors[field]) {
      setUiState(prev => ({
        ...prev,
        errors: { ...prev.errors, [field]: '' }
      }));
    }
  };







  const handleRepoSelect = (repoFullName: string) => {
    setFormData(prev => ({ ...prev, selectedRepo: repoFullName }));

    // Clear any previous repo errors
    if (uiState.errors.selectedRepo) {
      setUiState(prev => ({
        ...prev,
        errors: { ...prev.errors, selectedRepo: '' }
      }));
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setUiState(prev => ({ ...prev, isSubmitting: true }));

    try {
      // Build full GitHub URL if repository is selected
      let githubUrl = undefined;
      if (formData.useGithub && formData.selectedRepo) {
        // Check if it's already a full URL
        if (formData.selectedRepo.startsWith('http://') || formData.selectedRepo.startsWith('https://')) {
          githubUrl = formData.selectedRepo;
        } else {
          // Convert username/repo format to full GitHub URL
          githubUrl = `https://github.com/${formData.selectedRepo}`;
        }
      }

      const projectData = {
        name: formData.name,
        description: formData.description,
        githubLink: githubUrl,
        selectedRepo: formData.selectedRepo
      };


      if (onSubmit) {
        onSubmit(projectData);
      }

      // Success - reset form and close
      setFormData({ name: '', description: '', selectedRepo: '', useGithub: true });
      setGithubState(prev => ({
        ...prev,
        showRepoDropdown: false,
        repositories: [],
        filteredRepositories: [],
        isLoadingRepositories: false
      }));
      setUiState(prev => ({
        ...prev,
        errors: {},
        isSubmitting: false,
        showAdvanced: false
      }));

      onClose();

    } catch (error) {
      console.error('Error creating project:', error);
      setUiState(prev => ({
        ...prev,
        isSubmitting: false,
        errors: { submit: 'Failed to create project. Please try again.' }
      }));
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  // Reset form state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      // Reset form data
      setFormData({ name: '', description: '', selectedRepo: '', useGithub: true });
      setUiState({ errors: {}, isSubmitting: false, showAdvanced: false });
      setGithubState(prev => ({
        ...prev,
        showRepoDropdown: false,
        repositories: [],
        filteredRepositories: [],
        isLoadingRepositories: false
      }));
      // Load repositories
      loadUserRepositories();
    }
  }, [isOpen]);

  // Load user's GitHub repositories using OAuth with proper authentication
  const loadUserRepositories = async () => {
    // Only load repositories if user wants to use GitHub
    if (!formData.useGithub) {
      setGithubState(prev => ({
        ...prev,
        filteredRepositories: [],
        isLoadingRepositories: false
      }));
      return;
    }

    setGithubState(prev => ({ ...prev, isLoadingRepositories: true }));

    try {

      if (!user) {
        setGithubState(prev => ({
          ...prev,
          filteredRepositories: [],
          isLoadingRepositories: false
        }));
        return;
      }

      // Check if user has GitHub connected
      if (!userProfile?.githubUsername) {
        setGithubState(prev => ({
          ...prev,
          filteredRepositories: [],
          isLoadingRepositories: false
        }));
        return;
      }

      // Use the existing githubRepoService which handles authentication properly
      const repositories = await githubRepoService.getUserRepositories(user);


      setGithubState(prev => ({
        ...prev,
        filteredRepositories: repositories,
        isLoadingRepositories: false
      }));

    } catch (error) {

      setGithubState(prev => ({
        ...prev,
        filteredRepositories: [],
        isLoadingRepositories: false
      }));
    }
  };



  // ============================================================================
  // FILTERING & COMPUTED VALUES
  // ============================================================================



  // ============================================================================
  // CONDITIONAL RENDERING - AFTER ALL HOOKS
  // ============================================================================

  if (!isOpen) {
    return null;
  }


  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-lg transform overflow-hidden rounded-xl bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FolderPlus className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Project</h3>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Project Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${uiState.errors.name ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Enter your project name"
                required
              />
              {uiState.errors.name && (
                <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uiState.errors.name}</span>
                </div>
              )}
            </div>

            {/* Project Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${uiState.errors.description ? 'border-red-300' : 'border-gray-300'
                  }`}
                placeholder="Describe what this project is about"
                rows={3}
                required
              />
              {uiState.errors.description && (
                <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uiState.errors.description}</span>
                </div>
              )}
            </div>

            {/* GitHub Integration Toggle */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    GitHub Integration
                  </label>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Link this project to a GitHub repository (optional)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleInputChange('useGithub', !formData.useGithub)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.useGithub ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.useGithub ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            </div>

            {/* Repository Selection - Only show if GitHub is enabled */}
            {formData.useGithub && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GitHub Repository {githubState.filteredRepositories.length > 0 ? '*' : '(Optional)'}
                </label>

                {githubState.isLoadingRepositories ? (
                  <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                      <span className="text-sm text-gray-600">Loading repositories...</span>
                    </div>
                  </div>
                ) : !userProfile?.githubUsername ? (
                  <div className="space-y-3">
                    <div className="w-full px-4 py-4 border border-blue-200 bg-blue-50 rounded-lg">
                      <div className="flex items-start space-x-3">
                        <Github className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">Connect GitHub Account</p>
                          <p className="text-xs text-blue-700 mt-1">
                            To browse and select your repositories, connect your GitHub account first.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              navigate('/profile');
                              onClose();
                            }}
                            className="mt-3 inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                          >
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                            Go to Profile Settings
                          </button>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Or enter repository manually
                      </label>
                      <input
                        type="text"
                        value={formData.selectedRepo}
                        onChange={(e) => handleInputChange('selectedRepo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="e.g., username/repository-name"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Enter repository in format: username/repo-name
                      </p>
                    </div>
                  </div>
                ) : githubState.filteredRepositories.length > 0 ? (
                  <select
                    value={formData.selectedRepo}
                    onChange={(e) => handleRepoSelect(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${uiState.errors.selectedRepo ? 'border-red-300' : 'border-gray-300'
                      }`}
                    required
                  >
                    <option value="">Select a repository ({githubState.filteredRepositories.length} available)</option>
                    {githubState.filteredRepositories.map((repo) => (
                      <option key={repo.id} value={repo.full_name}>
                        {repo.full_name} {repo.private ? '(Private)' : '(Public)'} {repo.language ? `- ${repo.language}` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="space-y-3">
                    <div className="w-full px-4 py-3 border border-yellow-300 bg-yellow-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-yellow-800">No Repositories Found</p>
                          <p className="text-xs text-yellow-700 mt-1">
                            You can enter a repository manually or create the project without GitHub integration.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Enter repository manually (optional)
                      </label>
                      <input
                        type="text"
                        value={formData.selectedRepo}
                        onChange={(e) => handleInputChange('selectedRepo', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="e.g., username/repository-name"
                      />
                    </div>
                  </div>
                )}

                {uiState.errors.selectedRepo && (
                  <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{uiState.errors.selectedRepo}</span>
                  </div>
                )}
              </div>
            )}

            {/* Submit Error */}
            {uiState.errors.submit && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{uiState.errors.submit}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                disabled={uiState.isSubmitting}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={uiState.isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {uiState.isSubmitting && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                )}
                <span>{uiState.isSubmitting ? 'Creating...' : 'Create Project'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddProjectModal;
