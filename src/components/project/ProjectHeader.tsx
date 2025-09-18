// src/components/project/ProjectHeader.tsx
import React from 'react';
import { ArrowLeft, ExternalLink, FolderOpen } from 'lucide-react';
import type { Project } from '../../types';

interface ProjectHeaderProps {
  project: Project;
  onBackToDashboard: () => void;
}

const ProjectHeader: React.FC<ProjectHeaderProps> = ({ project, onBackToDashboard }) => {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Back Button */}
        <button
          onClick={onBackToDashboard}
          className="flex items-center text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        {/* Project Info */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {project.name}
              </h1>
              <p className="mt-2 text-gray-600 text-base leading-relaxed max-w-3xl">
                {project.description}
              </p>
              
              {/* GitHub Link */}
              <div className="mt-3">
                <a
                  href={project.githubLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">{project.githubLink}</span>
                </a>
              </div>
            </div>
          </div>

          {/* Project Stats */}
          <div className="text-left lg:text-right">
            <div className="text-sm text-gray-500 mb-1">Total Documents</div>
            <div className="text-2xl font-bold text-gray-900">
              {project.userDocsCount + project.devDocsCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Last updated {project.lastModified}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectHeader;
