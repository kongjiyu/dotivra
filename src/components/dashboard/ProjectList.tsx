// src/components/dashboard/ProjectList.tsx
import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, ExternalLink, Clock, FileText, Code, ChevronRight } from 'lucide-react';
import type { Project } from '../../types';
import AddProjectModal from '../modal/addProject';

interface ProjectListProps {
  onProjectClick: (project: Project) => void;
  onViewAllProjects?: () => void;
  onNewProject?: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ onProjectClick, onViewAllProjects, onNewProject }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects from API
  const loadProjects = async () => {
    try {
      console.log('🔄 Dashboard ProjectList: Loading projects from API...');
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:3001/api/projects');
      console.log('📡 Dashboard API Response status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to load projects');
      }
      
      const data = await response.json();
      console.log('📋 Dashboard received projects data:', data);
      console.log('📦 Dashboard setting projects:', data.projects || []);
      setProjects(data.projects || []);
    } catch (err) {
      console.error('❌ Dashboard error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const handleNewProjectClick = () => {
    if (onNewProject) {
      // Use parent's handler if provided
      onNewProject();
    } else {
      // Fallback to local modal
      setIsModalOpen(true);
    }
  };

  const handleCreateProject = (projectData: {
    name: string;
    description: string;
    githubLink: string;
    selectedRepo?: string;
  }) => {
    console.log('Creating new project:', projectData);
    // TODO: Implement actual project creation
  }; 
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <p className="text-gray-600 text-sm mt-1">Your documentation projects</p>
        </div>
        <button
          onClick={handleNewProjectClick}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>
    
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading projects...</p>
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
        ) : projects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Create your first project to get started with documentation</p>
            <button
              onClick={handleNewProjectClick}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {projects.map((project: Project) => (
            <div
              key={project.id}
              onClick={() => onProjectClick(project)}
              className="group relative px-6 py-5 cursor-pointer hover:bg-gray-50 transition-all duration-200 border-l-4 border-l-transparent hover:border-l-blue-500"
            >
              <div className="flex items-center justify-between">
                {/* Left side - Project info */}
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  {/* Project icon */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
                    <FolderOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  {/* Project details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-1">
                      <h3 className="text-base font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                        {project.name}
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
                        {(project.userDocsCount || 0) + (project.devDocsCount || 0)} docs
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3 line-clamp-1">
                      {project.description}
                    </p>
                    
                    {/* Stats row */}
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-1 text-xs text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>Updated {project.lastModified}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-green-600">
                        <FileText className="h-4 w-4" />
                        <span>{project.userDocsCount} user</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-purple-600">
                        <Code className="h-4 w-4" />
                        <span>{project.devDocsCount} dev</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Right side - Actions */}
                <div className="flex items-center space-x-3">
                  <a
                    href={project.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center space-x-1 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span className="hidden sm:inline">Repository</span>
                  </a>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>

    <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />
      
      {/* Footer with View All Projects button */}
      {onViewAllProjects && projects.length > 0 && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={onViewAllProjects}
            className="px-6 py-2 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all"
          >
            View All Projects
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectList;
