// src/components/projects/ProjectsGridView.tsx - Projects grid view
import React from 'react';
import { FolderOpen, Calendar, FileText, Code, ExternalLink, MoreHorizontal } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectsGridViewProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
}

const ProjectsGridView: React.FC<ProjectsGridViewProps> = ({
  projects,
  onProjectClick,
  onProjectEdit,
  onProjectDelete
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
  );
};

export default ProjectsGridView;