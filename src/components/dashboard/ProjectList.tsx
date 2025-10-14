// src/components/dashboard/ProjectList.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Search, LayoutList, LayoutGrid } from 'lucide-react';
import { API_ENDPOINTS } from '@/lib/apiConfig';
import { useAuth } from '../../context/AuthContext';
import type { Project } from '../../types';

interface ProjectListProps {
  onProjectClick: (projectId: string) => void;
  onViewAllProjects: () => void;
  onNewProject: () => void;
}

type ViewMode = 'list' | 'grid';

const statusOptions = [
  { label: 'Active', badgeClass: 'bg-green-100 text-green-700' },
  { label: 'Draft', badgeClass: 'bg-yellow-100 text-yellow-700' },
  { label: 'Review', badgeClass: 'bg-blue-100 text-blue-700' },
];

const avatarColors = [
  'bg-rose-400',
  'bg-sky-400',
  'bg-indigo-400',
  'bg-amber-400',
  'bg-emerald-400',
  'bg-purple-400',
];

const parseDate = (value: any): Date | null => {
  if (!value) return null;
  // Handle Firestore Timestamp
  if (value?.toDate) return value.toDate();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateOnly = (value: any): string => {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInitials = (text: string): string => {
  if (!text) return 'PR';
  const words = text.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const ProjectList: React.FC<ProjectListProps> = ({
  onProjectClick,
  onViewAllProjects,
  onNewProject,
}) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const showViewToggle = false;

  const loadProjects = async () => {
    try {
      console.log('🔄 ProjectList: Loading projects from Firestore...');
      setLoading(true);
      setError(null);
      
      if (!user) {
        console.warn('⚠️ User not authenticated, cannot load user projects');
        setProjects([]);
        setLoading(false);
        return;
      }
      
      // Use centralized API configuration
      const response = await fetch(API_ENDPOINTS.projects());
      
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Projects request failed (${response.status}): ${text}`);
      }

      const data = await response.json();
      console.log('📋 ProjectList received projects:', data);

      if (data.success) {
        // Keep the raw Project data for Firebase compatibility
        const allProjects = (data.projects || []).map((project: any): Project => {
          return {
            id: project.id,
            Project_Id: project.Project_Id ?? project.id,
            ProjectName: project.ProjectName ?? project.name ?? 'Untitled Project',
            Description: project.Description ?? project.description ?? '',
            GitHubRepo: project.GitHubRepo ?? project.githubLink ?? '',
            Created_Time: project.Created_Time ?? project.lastModified,
            User_Id: project.User_Id ?? 'unknown',
          };
        });

        // Filter projects to show only current user's projects
        const userProjects = allProjects.filter((project: Project) => {
          const projectUserId = project.User_Id;
          return projectUserId === user.uid;
        });

        console.log('📋 ProjectList filtered user projects:', userProjects.length, 'out of', allProjects.length, 'total projects');
        setProjects(userProjects);
      } else {
        throw new Error(data.error || 'Failed to load projects');
      }
    } catch (err) {
      console.error('❌ ProjectList error loading projects:', err);
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = useMemo(() => {
    if (!searchTerm.trim()) return projects;
    const normalized = searchTerm.toLowerCase();
    return projects.filter((project) => {
      const name = project.ProjectName?.toLowerCase() || '';
      const description = project.Description?.toLowerCase() || '';
      return name.includes(normalized) || description.includes(normalized);
    });
  }, [projects, searchTerm]);

  const renderSkeleton = () => (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 pt-8 pb-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mb-2" />
            <div className="h-3 w-52 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="hidden sm:flex gap-3">
            <div className="h-10 w-24 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-10 w-40 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
      <div className="px-6 py-8 space-y-4">
        {[1, 2, 3].map((item) => (
          <div key={item} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    </section>
  );

  if (loading) {
    return renderSkeleton();
  }

  if (error) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 pt-8 pb-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">Recent Projects</h2>
              <p className="text-sm text-gray-500">
                Access your recent projects and collaborate with your team
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-12 text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={loadProjects}
            className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-full hover:bg-blue-50 transition-colors"
          >
            Try again
          </button>
        </div>
      </section>
    );
  }

  const getStatusForIndex = (index: number) => statusOptions[index % statusOptions.length];

  const renderTeamStack = (name: string, index: number) => {
    const initials = getInitials(name);
    const members = [0, 1, 2].map((offset) => ({
      initials,
      color: avatarColors[(index + offset) % avatarColors.length],
    }));

    return (
      <div className="flex items-center -space-x-1">
        {members.map((member, idx) => (
          <div
            key={`${member.initials}-${idx}`}
            className={`w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-medium ${member.color}`}
            title={name}
          >
            {member.initials}
          </div>
        ))}
        <div className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-gray-600 text-xs font-medium bg-gray-200">
          +2
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="px-6 pb-6">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full divide-y divide-gray-100 text-left">
          <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="px-6 py-3">Project</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Team</th>
              <th className="px-6 py-3">Last updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
            {filteredProjects.map((project, index) => {
            const status = getStatusForIndex(index);
            const formattedDate = formatDateOnly(project.Created_Time);

              return (
                <tr
                  key={project.id || `${project.ProjectName}-${index}`}
                  className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  onClick={() => onProjectClick(String(project.id || project.Project_Id))}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium shadow">
                        {getInitials(project.ProjectName)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {project.ProjectName || 'Untitled Project'}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">
                          {project.Description || 'Documentation workspace'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${status.badgeClass}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {renderTeamStack(project.ProjectName, index)}
                  </td>
                  <td className="px-6 py-4 text-gray-500">
                    {formattedDate}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderGridView = () => (
    <div className="px-6 py-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {filteredProjects.map((project, index) => {
          const status = getStatusForIndex(index);
          const formattedDate = formatDateOnly(project.Created_Time);

          return (
            <button
              key={project.id || `${project.ProjectName}-${index}`}
              onClick={() => onProjectClick(String(project.id || project.Project_Id))}
              className="relative text-left bg-white border border-gray-200 rounded-2xl shadow-sm hover:border-blue-200 hover:shadow-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 flex flex-col"
            >
              <div className="absolute top-4 right-4">
                <span
                  className={`inline-flex items-center px-3 py-1 text-xs font-medium rounded-full ${status.badgeClass}`}
                >
                  {status.label}
                </span>
              </div>
              <div className="h-32 bg-gray-50 border-b border-gray-100 flex items-center justify-center">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-lg font-semibold shadow">
                  {getInitials(project.ProjectName)}
                </div>
              </div>
              <div className="p-5 space-y-4 flex-1 flex flex-col">
                <div className="space-y-1">
                  <h3 className="font-medium text-gray-900">
                    {project.ProjectName || 'Untitled Project'}
                  </h3>
                  <p className="text-xs text-gray-500 leading-snug h-[36px] overflow-hidden">
                    {project.Description || 'Documentation workspace'}
                  </p>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 mt-auto">
                  <span>{formattedDate}</span>
                  <span className="flex items-center gap-1 text-blue-600">
                    {project.GitHubRepo ? 'Repo linked' : 'No repo'}
                  </span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <section className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 pt-6 pb-5 border-b border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">Recent projects</h2>
            <p className="text-gray-500 text-sm">
              Access your recent projects and collaborate with your team
            </p>
          </div>
          <div className="relative w-full lg:w-72">
            <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search projects..."
              className="w-full pl-11 pr-3 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {showViewToggle && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-gray-500">
              Showing {filteredProjects.length} project{filteredProjects.length === 1 ? '' : 's'}
            </span>
            <div className="flex items-center bg-white border border-gray-300 rounded-full overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  viewMode === 'list'
                    ? 'bg-blue-600 text-white shadow-inner'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LayoutList className="h-4 w-4" />
                List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-blue-600 text-white shadow-inner'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                Cards
              </button>
            </div>
          </div>
        )}
      </div>

      {filteredProjects.length === 0 ? (
  <div className="px-6 py-10 text-center">
          <h3 className="text-lg font-medium text-gray-800 mb-2">No projects found</h3>
          <p className="text-sm text-gray-500 mb-6">
            Create a new project to start building documentation with your team.
          </p>
          <button
            type="button"
            onClick={onNewProject}
            className="inline-flex items-center px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            Create project
          </button>
        </div>
      ) : viewMode === 'list' ? (
        renderListView()
      ) : (
        <div className="min-h-[360px]">{renderGridView()}</div>
      )}

      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-center">
        <button
          type="button"
          onClick={onViewAllProjects}
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          View all projects
        </button>
      </div>
    </section>
  );
};

export default ProjectList;
