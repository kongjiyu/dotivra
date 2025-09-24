import React, { useState } from 'react';
import { X, FolderPlus, AlertCircle } from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  private: boolean;
  language: string;
  updated_at: string;
}

interface Installation {
  id: number;
  account: {
    login: string;
    type: string;
    avatar_url: string;
  };
  repository_selection: string;
  created_at: string;
  updated_at: string;
}

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

const API_CONFIG = {
  BASE_URL: 'http://localhost:3001/api',
  ENDPOINTS: {
    INSTALLATIONS: '/github/installations',
    REPOSITORIES: '/github/repositories'
  }
} as const;

const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  // ============================================================================
  // STATE MANAGEMENT - ALL HOOKS MUST BE CALLED CONSISTENTLY
  // ============================================================================
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedRepo: ''
  });

  const [githubState, setGithubState] = useState({
    installations: [] as Installation[],
    repositories: [] as GitHubRepository[],
    filteredRepositories: [] as GitHubRepository[],
    currentInstallationId: null as number | null,
    isLoadingInstallations: false,
    isLoadingRepositories: false,
    showRepoDropdown: false
  });

  const [uiState, setUiState] = useState({
    errors: {} as {[key: string]: string},
    isSubmitting: false,
    showAdvanced: false
  });

  // ============================================================================
  // GITHUB API FUNCTIONS
  // ============================================================================

  const fetchGitHubInstallations = async () => {
    setGithubState(prev => ({ ...prev, isLoadingInstallations: true }));
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INSTALLATIONS}`);
      
      if (response.ok) {
        const data = await response.json();
        const installations = data.installations || [];
        console.log('✅ GitHub installations loaded:', installations.length);
        setGithubState(prev => ({ 
          ...prev, 
          installations: installations as Installation[],
          isLoadingInstallations: false 
        }));
        return installations as Installation[];
      } else {
        console.warn('❌ Failed to fetch GitHub installations:', response.status);
        setGithubState(prev => ({ ...prev, isLoadingInstallations: false }));
        return [];
      }
    } catch (error) {
      console.warn('❌ GitHub API not available:', error);
      setGithubState(prev => ({ ...prev, isLoadingInstallations: false }));
      return [];
    }
  };





  // ============================================================================
  // FORM VALIDATION & UTILITIES
  // ============================================================================

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Project description is required';
    }

    if (!formData.selectedRepo.trim()) {
      newErrors.selectedRepo = 'Please select a repository from the dropdown';
    }

    setUiState(prev => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };



  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================



  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (uiState.errors[field]) {
      setUiState(prev => ({ 
        ...prev, 
        errors: { ...prev.errors, [field]: '' }
      }));
    }
  };

  



  const fetchRepositories = async (installationId: number) => {
    setGithubState(prev => ({ ...prev, isLoadingRepositories: true }));
    
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REPOSITORIES}?installation_id=${installationId}`);
      
      if (response.ok) {
        const data = await response.json();
        const repositories = data.repositories || [];
        console.log('✅ GitHub repositories loaded:', repositories.length);
        setGithubState(prev => ({ 
          ...prev, 
          repositories: repositories as GitHubRepository[],
          isLoadingRepositories: false 
        }));
        return repositories as GitHubRepository[];
      } else {
        console.warn('❌ Failed to fetch GitHub repositories:', response.status);
        setGithubState(prev => ({ ...prev, isLoadingRepositories: false }));
        return [];
      }
    } catch (error) {
      console.warn('❌ GitHub repositories API not available:', error);
      setGithubState(prev => ({ ...prev, isLoadingRepositories: false }));
      return [];
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
      const projectData = {
        name: formData.name,
        description: formData.description,
        githubLink: formData.selectedRepo, // Use selected repository as GitHub link
        selectedRepo: formData.selectedRepo
      };

      console.log('Creating project with GitHub integration:', projectData);
      
      if (onSubmit) {
        onSubmit(projectData);
      }

      // Success - reset form and close
      setFormData({ name: '', description: '', selectedRepo: '' });
      setGithubState(prev => ({
        ...prev,
        showRepoDropdown: false,
        repositories: [],
        filteredRepositories: [],
        currentInstallationId: null,
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

  // Load user's repositories when modal opens
  React.useEffect(() => {
    if (isOpen) {
      loadUserRepositories();
    }
  }, [isOpen]);

  // Load user's GitHub repositories based on their profile
  const loadUserRepositories = async () => {
    setGithubState(prev => ({ ...prev, isLoadingRepositories: true }));
    
    try {
      const installations = await fetchGitHubInstallations();
      
      if (!installations || installations.length === 0) {
        console.warn('No GitHub installations found');
        setGithubState(prev => ({ ...prev, isLoadingRepositories: false }));
        return;
      }

      // Collect all repositories from all installations
      let allRepositories: GitHubRepository[] = [];

      for (const installation of installations) {
        const repositories = await fetchRepositories(installation.id);
        allRepositories = [...allRepositories, ...repositories];
      }

      console.log('📊 Total repositories loaded:', allRepositories.length);
      
      // Show all repositories in dropdown
      setGithubState(prev => ({
        ...prev,
        filteredRepositories: allRepositories,
        isLoadingRepositories: false
      }));
      
    } catch (error) {
      console.error('Error loading user repositories:', error);
      setGithubState(prev => ({ ...prev, isLoadingRepositories: false }));
    }
  };



  // ============================================================================
  // FILTERING & COMPUTED VALUES
  // ============================================================================



  // ============================================================================
  // CONDITIONAL RENDERING - AFTER ALL HOOKS
  // ============================================================================
  
  if (!isOpen) {
    console.log('❌ AddProjectModal NOT rendering - isOpen is false');
    return null;
  }

  console.log('✅ AddProjectModal IS rendering, isOpen:', isOpen);

  // ============================================================================
  // RENDER
  // ============================================================================
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ zIndex: 9999 }}>
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
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
                <p className="text-sm text-gray-600">Set up a new documentation project with GitHub integration</p>
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  uiState.errors.name ? 'border-red-300' : 'border-gray-300'
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
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  uiState.errors.description ? 'border-red-300' : 'border-gray-300'
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

            {/* Repository Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Repository *
              </label>
              
              {githubState.isLoadingRepositories ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm text-gray-600">Loading repositories...</span>
                  </div>
                </div>
              ) : githubState.filteredRepositories.length > 0 ? (
                <select
                  value={formData.selectedRepo}
                  onChange={(e) => handleRepoSelect(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    uiState.errors.selectedRepo ? 'border-red-300' : 'border-gray-300'
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
                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-600">No repositories found. Please connect your GitHub account in your profile settings.</span>
                </div>
              )}
              
              {uiState.errors.selectedRepo && (
                <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uiState.errors.selectedRepo}</span>
                </div>
              )}
            </div>

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
