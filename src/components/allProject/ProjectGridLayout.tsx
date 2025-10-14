// src/components/projects/ProjectsGridView.tsx - Projects grid view
import React from 'react';
import { FolderOpen, Calendar, FileText, Code, ExternalLink } from 'lucide-react';
import type { Project } from '../../types';
import { getProjectName, getProjectCreatedTime } from '../../utils/projectUtils';

interface ProjectsGridViewProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onProjectEdit: (project: Project) => void;
  onProjectDelete: (project: Project) => void;
}

const ProjectsGridView: React.FC<ProjectsGridViewProps> = ({
  projects,
  onProjectClick,
}) => {
  

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <div
          key={project.id}
          className="relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all group cursor-pointer h-full"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div 
            onClick={() => onProjectClick(project)}
            className="p-6 flex flex-col h-full"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                <FolderOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-700">
                {getProjectName(project)}
                </h3>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Calendar className="h-3 w-3" />
                <span>{getProjectCreatedTime(project)}</span>
                </div>
              </div>
            </div>

            {/* Description - flexible space */}
            <div className="flex-1 py-4">
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {project.Description || 'No description provided.'}
              </p>
            </div>

            {/* GitHub Repository Link */}
            {project.GitHubRepo && (
              <div className="pt-4 border-t border-gray-100">
                <a
                  href={project.GitHubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span className="truncate">Open repository</span>
                </a>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>0</span>
                </div>
                <div className="flex items-center gap-1">
                  <Code className="h-4 w-4 text-purple-600" />
                  <span>0</span>
                </div>
              </div>
              <span className="text-xs text-gray-500">
                0 total docs
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectsGridView;
