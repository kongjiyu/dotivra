// src/components/dashboard/ProjectList.tsx
import React, { useState, useEffect } from 'react';

import { Plus, FolderOpen, ExternalLink, Clock, FileText, Code, ChevronRight } from 'lucide-react';
import type { Project } from '../../types';
import AddProjectModal from '../modal/addProject';

interface ProjectListProps {
  onProjectClick: (projectId: string) => void;
  onViewAllProjects: () => void;
  onNewProject: () => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ 
  onProjectClick, 
  onViewAllProjects, 
  onNewProject 
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects from Firestore
  const loadProjects = async () => {
    try {
      console.log('🔄 ProjectList: Loading projects from Firestore...');
      setLoading(true);
      setError(null);
      
      // Use FirestoreService directly instead of API call
      const projectsData = await FirestoreService.getProjects();
      console.log('📋 ProjectList received projects:', projectsData);
      
      setProjects(projectsData);
    } catch (err) {
      console.error('❌ ProjectList error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  // Load projects on component mount
  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreateProject = (projectData: {
    name: string;
    description: string;
    selectedRepo?: string;
  }) => {
    console.log('Creating new project:', projectData);
    // TODO: Implement actual project creation
  }; 
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Projects</h2>
        </div>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Recent Projects</h2>
        </div>
        <div className="text-red-600 text-center py-4">
          <p>{error}</p>
          <button 
            onClick={loadProjects}
            className="mt-2 text-blue-600 hover:text-blue-800 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Recent Projects</h2>
        <button
          onClick={onNewProject}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No projects yet</p>
          <button
            onClick={onNewProject}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Your First Project
          </button>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {projects.slice(0, 3).map((project) => (
              <div
                key={project.Project_Id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => onProjectClick(project.Project_Id)}
              >
                <div>
                  <h3 className="font-medium text-gray-900">{project.ProjectName}</h3>
                  <p className="text-sm text-gray-600 truncate max-w-md">
                    {project.Description}
                  </p>
                  {project.GitHubRepo && (
                    <p className="text-xs text-blue-600 mt-1">
                      {project.GitHubRepo}
                    </p>
                  )}
                </div>
                <div className="text-right text-sm text-gray-500">
                  <p>
                    {project.Created_Time?.toDate ? 
                      project.Created_Time.toDate().toLocaleDateString() :
                      new Date(project.Created_Time).toLocaleDateString()
                    }
                  </p>
                </div>
              </div>
            ))}
          </div>

          {projects.length > 3 && (
            <div className="mt-4 text-center">
              <button
                onClick={onViewAllProjects}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Projects ({projects.length})
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ProjectList;
