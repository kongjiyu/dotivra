// src/components/projects/ProjectsGridView.tsx - Projects grid view
import React from 'react';
import { FolderOpen, Calendar, FileText, Code, ExternalLink, MoreHorizontal, Plus } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectsGridViewProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
  onNewProject: () => void;
}

const ProjectsGridView: React.FC<ProjectsGridViewProps> = ({
  projects,
  onProjectClick,
  onNewProject
}) => {
  return (
    <div>
      {/* Header with New Project Button */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Your Projects</h2>
          <p className="text-gray-600 text-sm mt-1">Create and manage your documentation projects</p>
        </div>
        <button
          onClick={onNewProject}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </button>
      </div>

      {/* Projects Grid - Limited to 3 columns max */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
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
                  <Calendar className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{project.lastModified}</span>
                </div>
              </div>
            </div>
            
            {/* Actions Menu */}
            <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  // Show actions menu
                }}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <MoreHorizontal className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Project Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {project.description}
          </p>

          {/* GitHub Link */}
          <div className="mb-4">
            <a
              href={project.githubLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              <span className="truncate">Repository</span>
            </a>
          </div>

          {/* Document Stats */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <FileText className="h-4 w-4 text-green-600" />
                <span className="text-sm text-gray-600">{project.userDocsCount}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Code className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-600">{project.devDocsCount}</span>
              </div>
            </div>
            <span className="text-xs text-gray-500">
              {project.userDocsCount + project.devDocsCount} total
            </span>
          </div>
        </div>
      ))}
      </div>

      {/* Empty State */}
      {projects.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mb-4">
            <FolderOpen className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-600 text-center mb-6 max-w-md">
            Create your first documentation project to get started.
          </p>
          <button
            onClick={onNewProject}
            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create First Project
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectsGridView;