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
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-gray-900">{project.ProjectName}</h1>
                {onEditProject && (
                  <button
                    type="button"
                    onClick={onEditProject}
                    className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    aria-label="Edit project"
                  >
                    <PencilLine className="h-4 w-4" />
                  </button>
                )}
              </div>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600">{project.Description}</p>
              {project.GitHubRepo && (
                <div className="mt-3">
                  <a
                    href={project.GitHubRepo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    <span className="truncate">{project.GitHubRepo}</span>
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center gap-4">

            <button
              onClick={onAddDocument}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
