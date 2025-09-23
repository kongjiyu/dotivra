import React, { useState } from 'react';
import { X, FolderPlus, Github, AlertCircle } from 'lucide-react';

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
    githubLink: string;
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
    githubLink: '',
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

    if (!formData.githubLink.trim()) {
      newErrors.githubLink = 'GitHub URL is required';
    } else if (!isValidGithubUrl(formData.githubLink)) {
      newErrors.githubLink = 'Please enter a valid GitHub repository URL';
    }

    if (githubState.showRepoDropdown && !formData.selectedRepo.trim()) {
      newErrors.selectedRepo = 'Please select a repository from the dropdown';
    }

    setUiState(prev => ({ ...prev, errors: newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const isValidGithubUrl = (url: string) => {
    const patterns = [
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/,
      /^git@github\.com:[\w.-]+\/[\w.-]+\.git$/,
      /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\.git$/
    ];
    return patterns.some(pattern => pattern.test(url.trim()));
  };

  const parseGithubUrl = (url: string) => {
    const match = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
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

  const handleGithubUrlChange = async (url: string) => {
    setFormData(prev => ({ ...prev, githubLink: url, selectedRepo: '' }));

    // Clear any previous GitHub errors
    if (uiState.errors.githubLink) {
      setUiState(prev => ({
        ...prev,
        errors: { ...prev.errors, githubLink: '' }
      }));
    }
    
    // Only validate and fetch if URL looks like a valid GitHub URL
    if (url.trim() && isValidGithubUrl(url.trim())) {
      // Parse URL to extract repository info
      const parsed = parseGithubUrl(url);
      if (parsed) {
        console.log('GitHub URL detected:', parsed);
        await findMatchingRepositories(parsed.owner, parsed.repo);
      }
    } else {
      setGithubState(prev => ({ 
        ...prev, 
        showRepoDropdown: false,
        filteredRepositories: [],
        currentInstallationId: null
      }));
    }
  };

  const findMatchingRepositories = async (owner: string, repo: string) => {
    try {
      // First, get all installations
      const installations = await fetchGitHubInstallations();
      
      if (!installations || installations.length === 0) {
        console.warn('No GitHub installations found');
        setGithubState(prev => ({ ...prev, showRepoDropdown: false }));
        return;
      }

      // Collect all repositories from all installations
      let allRepositories: GitHubRepository[] = [];
      let targetInstallationId: number | null = null;
      let matchingRepo: GitHubRepository | null = null;

      for (const installation of installations) {
        const repositories = await fetchRepositories(installation.id);
        console.log(`Installation ${installation.id} (${installation.account.login}):`, repositories.length, 'repositories');
        
        // Add all repositories to the list
        allRepositories = [...allRepositories, ...repositories];
        
        // Look for the specific repository that matches the URL
        const foundRepo = repositories.find(r => 
          r.full_name.toLowerCase() === `${owner}/${repo}`.toLowerCase()
        );
        
        if (foundRepo && !matchingRepo) {
          matchingRepo = foundRepo;
          targetInstallationId = installation.id;
          console.log('✅ Found matching repository:', foundRepo.full_name, 'in installation:', installation.id);
        }
      }

      console.log('📊 Total repositories found:', allRepositories.length);
      console.log('🎯 Target repository:', `${owner}/${repo}`, matchingRepo ? 'FOUND' : 'NOT FOUND');
      
      // Show all repositories in dropdown
      setGithubState(prev => ({
        ...prev,
        filteredRepositories: allRepositories,
        currentInstallationId: targetInstallationId,
        showRepoDropdown: true
      }));

      // Auto-select the matching repository if found
      if (matchingRepo) {
        setFormData(prev => ({ ...prev, selectedRepo: matchingRepo.full_name }));
      }
      
    } catch (error) {
      console.error('Error finding matching repositories:', error);
      setGithubState(prev => ({ ...prev, showRepoDropdown: false }));
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
        githubLink: formData.githubLink,
        selectedRepo: formData.selectedRepo
      };

      console.log('Creating project with GitHub integration:', projectData);
      
      if (onSubmit) {
        onSubmit(projectData);
      }

      // Success - reset form and close
      setFormData({ name: '', description: '', githubLink: '', selectedRepo: '' });
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

  // Remove auto-loading - only load when user enters GitHub URL



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

            {/* GitHub Repository URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GitHub Repository URL *
              </label>
              
              {/* GitHub validation status */}
              {githubState.isLoadingRepositories && formData.githubLink && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                    <span className="text-sm text-blue-700">Loading repositories...</span>
                  </div>
                </div>
              )}

              {/* GitHub URL Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Github className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="url"
                  value={formData.githubLink}
                  onChange={(e) => handleGithubUrlChange(e.target.value)}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    uiState.errors.githubLink ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="https://github.com/username/repository"
                  required
                />
              </div>
              {uiState.errors.githubLink && (
                <div className="mt-1 flex items-center space-x-1 text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{uiState.errors.githubLink}</span>
                </div>
              )}
            </div>



            
            

            {/* Repository Selection Dropdown */}
            {githubState.showRepoDropdown && (
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
                    <span className="text-sm text-gray-600">No repositories found. Please ensure you have GitHub App access.</span>
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
