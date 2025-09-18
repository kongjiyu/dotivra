// src/components/project/ProjectHeader.tsx
import React from 'react';
import { ExternalLink, FolderOpen } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectHeaderProps {
  project: Project;
  onBackToDashboard: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, onBackToDashboard: _onBackToDashboard }) => {
  const totalDocuments = project.userDocsCount + project.devDocsCount;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600">{project.description}</p>
              <div className="mt-3">
                <a
                  href={project.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm font-medium text-blue-600 transition-colors hover:text-blue-800"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  <span className="truncate">{project.githubLink}</span>
                </a>
              </div>
            </div>
          </div>

          <div className="text-left lg:text-right">
            <div className="mb-1 text-sm text-gray-500">Total Documents</div>
            <div className="text-2xl font-bold text-gray-900">{totalDocuments}</div>
            <div className="mt-1 text-xs text-gray-500">Last updated {project.lastModified}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
