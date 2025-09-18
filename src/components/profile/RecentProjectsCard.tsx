// src/components/profile/RecentProjectsCard.tsx - Recent projects section
import React from 'react';
import { FolderOpen, Calendar, ExternalLink } from 'lucide-react';
import type { Project } from '../../types';

interface RecentProjectsCardProps {
  projects: Project[];
  onViewAllProjects: () => void;
  onProjectClick: (project: Project) => void;
}

const RecentProjectsCard: React.FC<RecentProjectsCardProps> = ({ 
  projects, 
  onViewAllProjects, 
  onProjectClick 
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Projects</h2>
          <p className="text-sm text-gray-600 mt-1">Your 3 most recently updated projects</p>
        </div>
        <button 
          onClick={onViewAllProjects}
          className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          View All
        </button>
      </div>

      {/* Projects List - Limited to 3 most recent */}
      {projects.length > 0 ? (
        <div className="space-y-4">
          {projects.slice(0, 3).map((project) => (
            <div
              key={project.id}
              onClick={() => onProjectClick(project)}
              className="border border-gray-200 rounded-lg p-5 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group bg-white hover:bg-blue-50/30"
            >
              {/* Project Content */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1 min-w-0">
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <FolderOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 text-base mb-1">
                      {project.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2 line-clamp-1">
                      {project.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{project.lastModified}</span>
                      </div>
                      <span>•</span>
                      <span>{project.userDocsCount + project.devDocsCount} documents</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <a
                    href={project.githubLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>View Repo</span>
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-8">
          <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No projects yet</h3>
          <p className="text-gray-500 mb-4">You haven't participated in any projects yet</p>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Create Your First Project
          </button>
        </div>
      )}
    </div>
  );
};

export default RecentProjectsCard;