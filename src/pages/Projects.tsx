import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AllProjectsHeader from '../components/allProject/AllProjectHeader';
import ProjectsGridView from '../components/allProject/ProjectGridLayout';
import type { Project } from '../types';
import AddProjectModal from '../components/modal/addProject';
import { Plus } from 'lucide-react';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      
      const response = await fetch('http://localhost:3001/api/projects');
      console.log('📡 API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      
      const data = await response.json();
      console.log('📋 Received projects data:', data);
      console.log('📦 Setting projects:', data.projects || []);
      setAllProjects(data.projects || []);
    } catch (err) {
      console.error('❌ Error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);
  
  // Filter projects based on search
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allProjects;
    return allProjects.filter(project => 
      project.name.toLowerCase().includes(query) ||
      project.description.toLowerCase().includes(query)
    );
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
    console.log('Edit project:', project.name);
  };

  const handleProjectDelete = (project: Project) => {
    console.log('Delete project:', project.name);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AllProjectsHeader 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        projectCount={filteredProjects.length}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
       
        {/* Add Project Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleNewProject}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading projects...</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Projects</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadProjects}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
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
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create Project
            </button>
          </div>
        )}
      </div>

      {/* AddProjectModal with GitHub Integration */}
      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (projectData) => {
          try {
            console.log('Creating project:', projectData);
            
            const response = await fetch('http://localhost:3001/api/projects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(projectData),
            });

            if (!response.ok) {
              throw new Error('Failed to create project');
            }

            const result = await response.json();
            console.log('✅ Project created successfully:', result.project);
            
            // Close modal and reload projects
            setIsModalOpen(false);
            await loadProjects();
            
            // Navigate to the new project
            navigate(`/project/${result.project.id}`);
          } catch (err) {
            console.error('❌ Error creating project:', err);
            alert(`Failed to create project: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }}
      />
    </div>
  );
};

export default Projects;
