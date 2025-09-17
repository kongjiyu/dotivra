// src/components/dashboard/ProjectGrid.tsx
import React from 'react';
import { FolderOpen, Clock, FileText, Code, ExternalLink, Plus } from 'lucide-react';
import { mockProjects } from '../../utils/mockData';
import type { Project } from '../../types';

interface ProjectGridProps {
  onProjectClick: (project: Project) => void;
  onNewProject: () => void;
}

const ProjectGrid: React.FC<ProjectGridProps> = ({ onProjectClick, onNewProject }) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Recent Projects</h2>
          <p className="text-gray-600 text-sm mt-1">Your documentation projects</p>
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>
    
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockProjects.map((project) => (
          <div
            key={project.id}
            onClick={() => onProjectClick(project)}
            className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
          >
            {/* Project Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                  <FolderOpen className="h-5 w-5 text-gray-600 group-hover:text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate group-hover:text-blue-700">
                    {project.name}
                  </h3>
                  <div className="flex items-center space-x-1 mt-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{project.lastModified}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Project Description */}
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
              {project.description}
            </p>

            {/* GitHub Link */}
            <div className="flex items-center mb-4">
              <a
                href={project.githubLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                <span className="truncate">View Repository</span>
              </a>
            </div>

            {/* Document Stats */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-gray-600">{project.userDocsCount} user</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Code className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-gray-600">{project.devDocsCount} dev</span>
                </div>
              </div>
              <span className="text-xs text-gray-500">
                {project.userDocsCount + project.devDocsCount} total docs
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectGrid;