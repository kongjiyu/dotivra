// src/components/project/ProjectHeader.tsx
import React from 'react';
import { ExternalLink, FolderOpen, Plus, PencilLine } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectHeaderProps {
  project: Project;
  onBackToDashboard: () => void;
  onAddDocument: () => void;
  onEditProject?: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onBackToDashboard: _onBackToDashboard,
  onAddDocument,
  onEditProject
}) => {


  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Icon and Title */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 shadow-sm">
              <FolderOpen className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <h1 className="text-xl font-semibold text-gray-900 truncate">{project.ProjectName}</h1>
                {onEditProject && (
                  <button
                    type="button"
                    onClick={onEditProject}
                    className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    aria-label="Edit project"
                    title="Edit project details"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-gray-600 truncate">{project.Description}</p>
            </div>
          </div>

          {/* Right: GitHub Link and Action */}
          <div className="flex items-center gap-3 shrink-0">
            {project.GitHubRepo && (
              <a
                href={project.GitHubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span className="max-w-[200px] truncate">{project.GitHubRepo.replace(/^https?:\/\/(www\.)?/, '').split('/').slice(0, 2).join('/')}</span>
              </a>
            )}

            <button
              onClick={onAddDocument}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add Document</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
