// src/components/projects/ProjectsGridView.tsx - Simplified Projects grid view
import React from 'react';
import { FolderOpen, Calendar, ExternalLink, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../ui/dropdown-menu";
import type { Project } from '../../types';
import { getProjectCreatedTime } from '../../utils/projectUtils';
import { showDeleteConfirm } from '../../utils/sweetAlert';

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
  

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {projects.map((project) => (
        <div
          key={project.id}
          onClick={() => onProjectClick(project)}
          className="relative bg-white border border-gray-200 rounded-lg overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 group cursor-pointer"
        >
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-700">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900 leading-tight">
                    {project.ProjectName || 'Untitled Project'}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{getProjectCreatedTime(project.Updated_Time)}</span>
                  </div>
                </div>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="Open project menu"
                    title="Actions"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-40">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onProjectEdit(project);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={async (e) => {
                      e.stopPropagation();
                      const result = await showDeleteConfirm(project.ProjectName || 'Untitled Project');
                      if (result.isConfirmed) {
                        onProjectDelete(project);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-2">
              {project.Description || 'No description provided.'}
            </p>

           
            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                {project.GitHubRepo ? (
                  <span className="text-green-600">Repo connected</span>
                ) : (
                  <span>No repository</span>
                )}
              </div>
              
              {project.GitHubRepo && (
                <a
                  href={project.GitHubRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </a>
              )}
            </div>
          </div>

          {/* Simple hover indicator (must not block interactions) */}
          <div className="absolute inset-0 pointer-events-none border border-transparent group-hover:border-gray-300 rounded-lg transition-colors" />
        </div>
      ))}
    </div>
  );
};

export default ProjectsGridView;