// src/components/projects/ProjectsGridView.tsx - Projects grid view
import React from 'react';
import { FolderOpen, Calendar, FileText, Code, ExternalLink, Pencil, Trash2, ShieldAlert } from 'lucide-react';
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
  onProjectDelete,
}) => {
  const formatDate = (value: string) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onProjectClick(project)}
          className="relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all group"
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          <div className="p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-100 transition-colors">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-700">
                    {/* @ts-ignore - Temporary fix for property access */}
                  {project.ProjectName || project.name || 'Untitled Project' || 'Untitled Project'}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="h-3 w-3" />
                    {/* @ts-ignore - Temporary fix for property access */}
                  <span>{formatDate(project.Created_Time || project.lastModified) || 'No date'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectEdit(project);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectDelete(project);
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-full hover:bg-red-100 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </button>
              </div>
            </div>

            <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 min-h-[3.5rem]">
              {project.description || 'No description provided.'}
            </p>

            <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50/70 rounded-lg px-3 py-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                <span>Deleting removes all documents in this project.</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <FileText className="h-4 w-4 text-emerald-600" />
                  <span>{project.userDocsCount}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Code className="h-4 w-4 text-purple-600" />
                  <span>{project.devDocsCount}</span>
                </div>
              </div>
              <span className="text-xs text-gray-500">
                {project.userDocsCount + project.devDocsCount} total docs
              </span>
            </div>

            {project.githubLink && (
              <div className="pt-3 border-t border-gray-100">
                <a
                  href={project.githubLink}
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
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProjectsGridView;
