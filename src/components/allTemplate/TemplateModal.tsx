import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Plus } from 'lucide-react';
import { templates as allTemplates } from '../../utils/mockData';
import { useAuth } from '../../context/AuthContext';
import { githubRepoService, type GitHubRepository as ServiceGitHubRepository } from '../../services/githubRepoService';
import type { Project, Template as FullTemplate } from '../../types';

interface Props {
  id: number;
  onClose: () => void;
  onCreateDocument: (data: {
    template: FullTemplate;
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

const TemplateModal: React.FC<Props> = ({ id, onClose, onCreateDocument }) => {
  const { user } = useAuth();
  const t = allTemplates.find(x => Number(x.id ?? x.Template_Id) === id);
  
  const [step, setStep] = useState<FlowStep>('project-selection');
  const [projectOption, setProjectOption] = useState<ProjectOption>('new');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [selectedRepo, setSelectedRepo] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentRole, setDocumentRole] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [repositories, setRepositories] = useState<ServiceGitHubRepository[]>([]);
  const [loading, setLoading] = useState(false);

  if (!t) return null;

  // Load existing projects when modal opens
  useEffect(() => {
    loadProjects();
    setDocumentName(t.TemplateName || '');
    loadUserRepositories();
  }, [id]);

  // Load user's GitHub repositories
  const loadUserRepositories = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        setRepositories([]);
        return;
      }

      const repos = await githubRepoService.getUserRepositories();
      
      if (repos.length === 0) {
        setRepositories([]);
      } else {
        setRepositories(repos);
      }
    } catch (error) {
      console.error('Error loading repositories:', error);
      setRepositories([]);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      if (!user) return;
      
      const idToken = await user.getIdToken();
      const response = await fetch(`/api/projects`, {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });

      if (!response.ok) throw new Error('Failed to load projects');
      
      const data = await response.json();
      setProjects(data.projects || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const handleNext = () => {
    if (step === 'project-selection') {
      if (projectOption === 'existing' && !selectedProjectId) {
        alert('Please select a project');
        return;
      }
      if (projectOption === 'new' && !newProjectName.trim()) {
        alert('Please enter a project name');
        return;
      }
      setStep('document-details');
    }
  };

  const handleBack = () => {
    setStep('project-selection');
  };

  const handleCreate = () => {
    if (!documentName.trim()) {
      alert('Please enter a document name');
      return;
    }

    if (!documentRole.trim()) {
      alert('Please enter a document role');
      return;
    }

    // Convert to full Template type
    const fullTemplate: FullTemplate = {
      Template_Id: String(t.id ?? t.Template_Id),
      TemplateName: t.TemplateName || '',
      Description: t.Description || '',
      TemplatePrompt: t.TemplatePrompt || '',
      Category: t.Category || 'general'
    };

    onCreateDocument({
      template: fullTemplate,
      projectId: projectOption === 'existing' ? selectedProjectId || undefined : undefined,
      newProjectName: projectOption === 'new' ? newProjectName : undefined,
      newProjectDescription: projectOption === 'new' ? newProjectDescription : undefined,
      selectedRepo,
      documentName,
      documentRole
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">
              {step === 'project-selection' ? 'Choose Project' : 'Document Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {step === 'project-selection' 
                ? 'Select an existing project or create a new one'
                : `Create a new document using ${t.TemplateName}`
              }
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {step === 'project-selection' ? (
            <>
              {/* Project Option Selection */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProjectOption('new')}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                      projectOption === 'new'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                    <span className="font-medium">New Project</span>
                  </button>
                  <button
                    onClick={() => setProjectOption('existing')}
                    className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all ${
                      projectOption === 'existing'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <FolderPlus className="w-5 h-5" />
                    <span className="font-medium">Existing Project</span>
                  </button>
                </div>
              </div>

              {/* New Project Form */}
              {projectOption === 'new' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Project Name *
                    </label>
                    <input
                      type="text"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., My Awesome Project"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Brief description of your project..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Link GitHub Repository (Optional)
                    </label>
                    <select
                      value={selectedRepo}
                      onChange={(e) => setSelectedRepo(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={loading}
                    >
                      <option value="">No repository</option>
                      {repositories.map((repo) => (
                        <option key={repo.id} value={repo.html_url}>
                          {repo.full_name}
                        </option>
                      ))}
                    </select>
                    {loading && <p className="text-xs text-gray-500 mt-1">Loading repositories...</p>}
                  </div>
                </>
              )}

              {/* Existing Project Selection */}
              {projectOption === 'existing' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Project *
                  </label>
                  <select
                    value={selectedProjectId || ''}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Choose a project...</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.ProjectName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : (
            <>
              {/* Document Details */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., User Authentication API"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Document Role *
                </label>
                <input
                  type="text"
                  value={documentRole}
                  onChange={(e) => setDocumentRole(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Backend Developer, Project Manager"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
          {step === 'document-details' && (
            <button
              onClick={handleBack}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Back
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">
            Cancel
          </button>
          {step === 'project-selection' ? (
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleCreate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateModal;
