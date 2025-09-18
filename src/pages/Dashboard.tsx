// src/components/dashboard/Dashboard.tsx - With navigation
import React, { useState } from 'react';
import { CircleUser, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TemplateGrid from '../components/dashboard/TemplateGrid';
import ProjectGrid from '../components/dashboard/ProjectList';
import type { Template, Project } from '../types';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const handleTemplateClick = (template: Template) => {
    console.log('Template clicked:', template.name);
    // TODO: Show project selection modal or navigate to template creation
    setSelectedTemplate(template);
  };

  const handleExploreAll = () => {
    console.log('Explore all templates clicked');
    navigate('/ai-generator');
  };

  const handleProjectClick = (project: Project) => {
    console.log('Navigating to project:', project.name);
    // 🎯 NAVIGATION: Go to project view based on project ID 
    navigate(`/project/${project.id}`);
  };

  const handleNewProject = () => {
    console.log('New project clicked');
    // TODO: Show create project modal or form
  };

  const handleViewAllProjects = () => {
    console.log('View all projects clicked');
    // Navigate to a dedicated projects page
    navigate('/projects');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-9 w-9 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dotriva</h1>
                <p className="text-gray-600 mt-1">Create and manage developer documentation with AI assistance</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/profile')}
              aria-label="Open profile"
              className="p-2 text-gray-500 rounded-full hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <CircleUser className="h-8 w-8" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Templates Section - Top */}
        <TemplateGrid 
          onTemplateClick={handleTemplateClick}
          onExploreAll={handleExploreAll}
        />

        {/* Projects Section - Bottom */}
        <ProjectGrid 
          onProjectClick={handleProjectClick}
          onNewProject={handleNewProject}
          onViewAllProjects={handleViewAllProjects}
        />
      </div>

      {/* Debug Info - Remove in production */}
      {selectedTemplate && (
        <div className="fixed bottom-4 right-4 bg-blue-100 p-3 rounded-lg text-sm">
          Selected Template: {selectedTemplate.name}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
