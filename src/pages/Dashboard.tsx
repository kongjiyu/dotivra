// src/components/dashboard/Dashboard.tsx - With navigation
import React, { useState } from 'react';
import { CircleUser, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TemplateGrid from '../components/dashboard/TemplateGrid';
import ProjectList from '../components/dashboard/ProjectList';
import AddProjectModal from '../components/modal/addProject';
import AddDocumentFromTemplate from '../components/modal/addDocumentFromTemplate';
import type { Template } from '../types';


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Debug: Log the modal state
  console.log('🔍 Dashboard component rendered, isModalOpen:', isModalOpen);

  const handleTemplateClick = (template: Template) => {
    console.log('Template clicked:', template.name);
    setSelectedTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleNewProject = () => {
    console.log('🎯 Opening modal from Dashboard...');
    setIsModalOpen(true);
  };

  const handleCreateDocumentFromTemplate = async (data: {
    template: Template;
    projectId?: number;
    newProjectName?: string;
    newProjectDescription?: string;
    selectedRepo?: string;
    documentName: string;
    documentRole: string;
  }) => {
    try {
      console.log('Creating document from template:', data);

      let finalProjectId = data.projectId;

      // If creating a new project, create it first
      if (!finalProjectId && data.newProjectName && data.newProjectDescription) {
        const projectResponse = await fetch('http://localhost:3001/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.newProjectName,
            description: data.newProjectDescription,
            githubLink: data.selectedRepo || null
          }),
        });

        if (!projectResponse.ok) {
          throw new Error('Failed to create project');
        }

        const projectResult = await projectResponse.json();
        finalProjectId = projectResult.project.id;
        console.log('✅ New project created:', projectResult.project);
      }

      // TODO: Create the document in the project
      console.log(`📄 Creating document "${data.documentName}" (${data.documentRole}) in project ${finalProjectId} using template ${data.template.name}`);
      
      // For now, show success message and navigate to project
      alert(`Document "${data.documentName}" will be created with ${data.template.name} template!\n\nRole: ${data.documentRole}\n\n(Document creation API coming soon)`);
      
      // Close modal and navigate to project
      setIsTemplateModalOpen(false);
      setSelectedTemplate(null);
      
      if (finalProjectId) {
        navigate(`/project/${finalProjectId}`);
      }
    } catch (error) {
      console.error('❌ Error creating document:', error);
      alert(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExploreAll = () => {
    console.log('Explore all templates clicked');
    navigate('/ai-generator');
  };

  const handleProjectClick = (projectId: string) => {
    console.log('Navigating to project:', projectId);
    // 🎯 NAVIGATION: Go to project view based on project ID 
    navigate(`/project/${projectId}`);
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
        <ProjectList 
          onProjectClick={handleProjectClick}
          onViewAllProjects={handleViewAllProjects}
          onNewProject={handleNewProject}
        />
      </div>

      {/* AddProjectModal with GitHub Integration */}
      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (projectData) => {
          try {
            console.log('Creating dashboard project:', projectData);
            
            const response = await fetch('http://localhost:3001/api/projects', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(projectData),
            });

            if (!response.ok) {
              throw new Error('Failed to create project');
            }

            const result = await response.json();
            console.log('✅ Dashboard: Project created successfully:', result.project);
            
            // Close modal and navigate to the new project
            setIsModalOpen(false);
            navigate(`/project/${result.project.id}`);
          } catch (err) {
            console.error('❌ Dashboard: Error creating project:', err);
            alert(`Failed to create project: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }}
      />

      {/* AddDocumentFromTemplate Modal */}
      <AddDocumentFromTemplate
        isOpen={isTemplateModalOpen}
        template={selectedTemplate}
        onClose={() => {
          setIsTemplateModalOpen(false);
          setSelectedTemplate(null);
        }}
        onCreateDocument={handleCreateDocumentFromTemplate}
      />
    </div>
  );
};

export default Dashboard;
