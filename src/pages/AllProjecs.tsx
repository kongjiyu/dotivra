// src/pages/AllProjects.tsx - Complete All Projects main page
import React, { useMemo, useState } from 'react';
import { AllProjectsHeader, ProjectsGridView } from '../components/allProject';
import { mockProjects } from '../utils/mockData';
import type { Project } from '../types';
import AddProjectModal from '../components/modal/addProject';

const AllProjects: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return mockProjects;
    }

    return mockProjects.filter((project) => {
      const normalizedName = project.name.toLowerCase();
      const normalizedDescription = project.description.toLowerCase();

      return (
        normalizedName.includes(query) ||
        normalizedDescription.includes(query)
      );
    });
  }, [searchQuery]);

  const handleNewProject = () => {
    console.log('Open new project modal');
    setIsModalOpen(true);
  };

  const handleCreateProject = async (projectData: {
    name: string;
    description: string;
    githubLink: string;
  }) => {
    console.log('Creating new project:', projectData);
    // TODO: Add logic to actually create the project
    // For now, just close the modal
  };

  const handleProjectClick = (project: Project) => {
    console.log('Navigate to project:', project.name);
    // TODO: Navigate to project view
    // navigate(`/project/${project.id}`);
  };

  const handleProjectEdit = (project: Project) => {
    console.log('Edit project:', project.name);
    // TODO: Open edit project modal
  };

  const handleProjectDelete = (project: Project) => {
    console.log('Delete project:', project.name);
    // TODO: Show delete confirmation
  };



  return (
    <div className="min-h-screen bg-gray-50">
      <AllProjectsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        projectCount={filteredProjects.length}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {filteredProjects.length > 0 ? (
          <ProjectsGridView
            projects={filteredProjects}
            onProjectClick={handleProjectClick}
            onProjectEdit={handleProjectEdit}
            onProjectDelete={handleProjectDelete}
            onNewProject={handleNewProject}
          />
        ) : (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No projects found' : 'No projects yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? `No projects match "${searchQuery}"`
                : 'Create your first project to get started'
              }
            </p>
            {!searchQuery && (
              <button
                onClick={handleNewProject}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create Project
              </button>
            )}
          </div>
        )}
      </div>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateProject}
      />


    </div>

 

  );
};

export default AllProjects;
