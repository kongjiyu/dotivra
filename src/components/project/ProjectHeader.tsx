// src/components/project/ProjectHeader.tsx
import React from 'react';
import { FolderOpen, Plus, PencilLine, Trash2 } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectHeaderProps {
  project: Project;
  onBackToDashboard: () => void;
  onAddDocument: () => void;
  onEditProject?: () => void;
  onDeleteProject?: () => void;
}

/**
 * Format GitHub repo URL to ensure it's a valid GitHub link
 */
const formatGitHubUrl = (repoUrl: string): string => {
  if (!repoUrl) return '';
  
  // Already a full GitHub URL
  if (repoUrl.startsWith('http://github.com/') || repoUrl.startsWith('https://github.com/')) {
    return repoUrl;
  }
  
  // If it doesn't start with http, assume it's a username/repo format
  // Keep the repo name as-is (including .github.io if it's part of the actual repo name)
  return `https://github.com/${repoUrl}`;
};

/**
 * Get display text for GitHub repo link
 */
const formatGitHubDisplayText = (repoUrl: string): string => {
  if (!repoUrl) return '';
  
  // Remove protocol and www
  let display = repoUrl.replace(/^https?:\/\/(www\.)?/, '');
  
  // For github.com URLs, just show username/repo
  if (display.startsWith('github.com/')) {
    display = display.replace('github.com/', '');
  }
  
  return display;
};

const ProjectHeader: React.FC<ProjectHeaderProps> = ({
  project,
  onBackToDashboard: _onBackToDashboard,
  onAddDocument,
  onEditProject,
  onDeleteProject
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
                <div className="flex items-center gap-1">
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
                  {onDeleteProject && (
                    <button
                      type="button"
                      onClick={onDeleteProject}
                      className="inline-flex items-center justify-center rounded-md p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      aria-label="Delete project"
                      title="Delete project"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 truncate">{project.Description}</p>
            </div>
          </div>

          {/* Right: GitHub Link and Action */}
          <div className="flex items-center gap-3 shrink-0">
            {project.GitHubRepo && (
              <a
                href={formatGitHubUrl(project.GitHubRepo)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="hidden sm:inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline transition-colors max-w-[250px] cursor-pointer"
                title={formatGitHubDisplayText(project.GitHubRepo)}
              >
                <span className="truncate">{formatGitHubDisplayText(project.GitHubRepo)}</span>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}

            <button
              onClick={onAddDocument}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              <Plus className="h-4 w-4 text-white" />
              <span className="hidden sm:inline text-white">Add Document</span>
              <span className="sm:hidden text-white">Add</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
