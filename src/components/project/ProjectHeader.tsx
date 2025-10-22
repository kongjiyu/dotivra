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
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col gap-6">
          {/* Header with Icon and Title */}
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30">
              <FolderOpen className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900 truncate">{project.ProjectName}</h1>
                {onEditProject && (
                  <button
                    type="button"
                    onClick={onEditProject}
                    className="inline-flex items-center justify-center rounded-lg p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200"
                    aria-label="Edit project"
                    title="Edit project details"
                  >
                    <PencilLine className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-base leading-relaxed text-gray-600 max-w-3xl">{project.Description}</p>
            </div>
          </div>

          {/* GitHub Link and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2">
            <div className="flex-1">
              {project.GitHubRepo && (
                <a
                  href={project.GitHubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-all duration-200 group"
                >
                  <ExternalLink className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="truncate max-w-xs">{project.GitHubRepo.replace(/^https?:\/\/(www\.)?/, '')}</span>
                </a>
              )}
            </div>

            <button
              onClick={onAddDocument}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              Add Document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
