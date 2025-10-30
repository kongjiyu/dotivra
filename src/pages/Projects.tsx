import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ProjectsGridView from '../components/allProject/ProjectGridLayout';
import type { Project } from '../types';
import AddProjectModal from '../components/modal/addProject';
import EditProjectModal from '../components/modal/EditProject';
import { API_ENDPOINTS } from '../lib/apiConfig';
import { Plus, Search } from 'lucide-react';
import Header from '../components/header/Header';
import { useAuth } from '../context/AuthContext';
import { getUserDisplayInfo } from '../utils/user';
import { useFeedback } from '../components/AppLayout';
import { showError, showSuccess } from '@/utils/sweetAlert';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { openFeedbackModal } = useFeedback();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug: Log the modal state and projects
  console.log('🔍 Projects component rendered, isModalOpen:', isModalOpen);
  console.log('📊 Current allProjects state:', allProjects);

  // Load projects from API
  const loadProjects = async () => {
    try {
      console.log('🔄 Loading projects from API...');
      setLoading(true);
      setError(null);

      // Only fetch projects if user is logged in
      if (!user?.uid) {
        console.warn('⚠️ No user logged in, skipping project fetch');
        setAllProjects([]);
        setLoading(false);
        return;
      }

      // Fetch only the current user's projects
      const response = await fetch(API_ENDPOINTS.userProjects(user.uid));
      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error('Failed to load projects');
      }

      const data = await response.json();
      console.log('📋 Received projects data:', data);
      const normalizedProjects = (data.projects || []).map((project: any): Project => {
        const rawCreated =
          project.Created_Time ??
          project.lastModified ??
          project.updated_at ??
          project.updatedAt ??
          '';

        const lastModified =
          typeof rawCreated === 'string'
            ? rawCreated
            : rawCreated?.toDate?.()
              ? rawCreated.toDate().toISOString()
              : rawCreated
                ? String(rawCreated)
                : '';

        return {
          id: String(project.Project_Id ?? project.id ?? Date.now()),
          ProjectName: project.ProjectName ?? project.name ?? 'Untitled Project',
          Description: project.Description ?? project.description ?? '',
          GitHubRepo: project.GitHubRepo ?? project.githubLink ?? '',
          User_Id: project.User_Id ?? 'unknown',
          Created_Time: rawCreated,
          Updated_Time: rawCreated,
        };
      });

      console.log('📦 Setting projects:', normalizedProjects);
      setAllProjects(normalizedProjects);
    } catch (err) {
      console.error('❌ Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Load projects when user is available
  useEffect(() => {
    if (user?.uid) {
      loadProjects();
    }
  }, [user?.uid]);

  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allProjects;
    return allProjects.filter(project => {
      const name = (project.ProjectName || '').toLowerCase();
      const description = (project.Description || '').toLowerCase();
      return name.includes(query) || description.includes(query);
    });
  }, [searchQuery, allProjects]);

  // Debug filtered projects
  console.log('🔎 Filtered projects:', filteredProjects);

  const handleNewProject = () => {
    console.log('🎯 Opening modal...');
    setIsModalOpen(true);
  };

  const handleProjectClick = (project: Project) => {
    navigate(`/project/${project.id}`);
  };

  const handleProjectEdit = (project: Project) => {
    console.log('Edit project:', project.ProjectName);
    setProjectToEdit(project);
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (data: { name: string; description: string }) => {
    if (!projectToEdit || !projectToEdit.id) return;

    try {
      console.log('Updating project:', projectToEdit.id, data);

      const response = await fetch(API_ENDPOINTS.project(projectToEdit.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ProjectName: data.name,
          Description: data.description,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update project');
      }

      console.log('✅ Project updated successfully');
      showSuccess('Success', 'Project updated successfully');

      // Close modal and reload projects
      setIsEditModalOpen(false);
      setProjectToEdit(null);
      await loadProjects();
    } catch (err) {
      console.error('❌ Error updating project:', err);
      showError(
        'Failed to Update Project',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  const handleProjectDelete = async (project: Project) => {
    if (!project.id) {
      showError('Error', 'Project ID is missing');
      return;
    }

    try {
      console.log('🗑️ Deleting project:', project.ProjectName);

      const response = await fetch(API_ENDPOINTS.deleteProject(project.id), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete project');
      }

      console.log('✅ Project deleted successfully');
      showSuccess('Success', `Project "${project.ProjectName}" deleted successfully`);

      // Reload projects to refresh the list
      await loadProjects();
    } catch (err) {
      console.error('❌ Error deleting project:', err);
      showError(
        'Failed to Delete Project',
        err instanceof Error ? err.message : 'Unknown error'
      );
    }
  };

  const projectSubtitle = `${filteredProjects.length} project${filteredProjects.length === 1 ? '' : 's'} • Manage and organize your documentation`;
  const { name: displayName, initials } = getUserDisplayInfo(userProfile, user);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header userName={displayName} initials={initials} onFeedbackClick={openFeedbackModal} />

      <ScrollArea className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 bg-white shadow-sm"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleNewProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading projects...</p>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 bg-white rounded-lg border border-red-200 mx-4">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-50 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to Load Projects</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                We're having trouble connecting to load your projects. Please check your internet connection and try again.
              </p>
              <div className="space-y-3">
                <button
                  onClick={loadProjects}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Loading
                </button>
                <p className="text-sm text-gray-500">or</p>
                <button
                  onClick={handleNewProject}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Project
                </button>
              </div>
            </div>
          ) : filteredProjects.length > 0 ? (
            <ProjectsGridView
              projects={filteredProjects}
              onProjectClick={handleProjectClick}
              onProjectEdit={handleProjectEdit}
              onProjectDelete={handleProjectDelete}
            />
          ) : (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchQuery ? 'No projects found' : 'No projects yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery ? 'Try adjusting your search terms' : 'Create your first project to get started'}
              </p>
              <button
                onClick={handleNewProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </button>
            </div>
          )}
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>

      {/* AddProjectModal with GitHub Integration */}
      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (projectData) => {
          try {
            console.log('Creating project:', projectData);

            // Add userId to project data (required by backend)
            const projectDataWithUser = {
              ...projectData,
              userId: user?.uid || 'anonymous-user-' + Date.now()
            };

            console.log('Project data with user ID:', projectDataWithUser);

            const response = await fetch(API_ENDPOINTS.projects(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(projectDataWithUser),
            });

            if (!response.ok) {
              throw new Error('Failed to create project');
            }

            const result = await response.json();
            console.log('✅ Project created successfully:', result.project);

            // Close modal and reload projects
            setIsModalOpen(false);
            await loadProjects();

            // Navigate to the new project (handle both Project_Id and id field names)
            const projectId = result.project.Project_Id || result.project.id;
            if (projectId) {
              navigate(`/project/${projectId}`);
            } else {
              console.error('❌ No project ID found in response:', result.project);
              showError(
                'Navigation Failed',
                'Project created but navigation failed. Please refresh the page.'
              );
            }
          } catch (err) {
            console.error('❌ Error creating project:', err);
            showError(
              'Failed to Create Project',
              err instanceof Error ? err.message : 'Unknown error'
            );
          }
        }}
      />

      {/* EditProjectModal */}
      <EditProjectModal
        isOpen={isEditModalOpen}
        initialData={projectToEdit ? {
          name: projectToEdit.ProjectName,
          description: projectToEdit.Description
        } : undefined}
        onClose={() => {
          setIsEditModalOpen(false);
          setProjectToEdit(null);
        }}
        onSubmit={handleEditSubmit}
      />
    </div>
  );
};

export default Projects;
