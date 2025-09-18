// src/pages/Projects.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AllProjectsHeader from '../components/allProject/AllProjectHeader';
import ProjectsGridView from '../components/allProject/ProjectGridLayout';
import { mockProjects } from '../utils/mockData';
import type { Project } from '../types';
import AddProjectModal from '@/components/modal/addProject';

const Projects: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

  const handleProjectClick = (project: Project) => {
    console.log('Project clicked:', project);
    navigate(`/project/${project.id}`);
  };

  const handleNewProject = () => {
    console.log('New project clicked');
    setIsModalOpen(true);
};

  const handleProjectEdit = (project: Project) => {
    console.log('Edit project:', project);
    // TODO: Show edit project modal or form
  };

  const handleProjectDelete = (project: Project) => {
    console.log('Delete project:', project);
    // TODO: Show delete confirmation modal
  };

  // Filter projects based on search query
  const filteredProjects = mockProjects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AllProjectsHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        projectCount={mockProjects.length}
      />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <ProjectsGridView
          projects={filteredProjects}
          onProjectClick={handleProjectClick}
          onProjectEdit={handleProjectEdit}
          onProjectDelete={handleProjectDelete}
          onNewProject={handleNewProject}
        />
      </div>

        <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleNewProject}
      />


    </div>
  );
};

export default Projects;