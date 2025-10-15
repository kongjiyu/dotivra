// src/components/dashboard/Dashboard.tsx - With navigation
import React, { useState } from 'react';
import Header from '../components/header/Header';
import { useNavigate } from 'react-router-dom';
import TemplateGrid from '../components/dashboard/TemplateGrid';
import ProjectList from '../components/dashboard/ProjectList';
import AddProjectModal from '../components/modal/addProject';
import AddDocumentFromTemplate from '../components/modal/addDocumentFromTemplate';
import { API_ENDPOINTS } from '../lib/apiConfig';
import type { Template } from '../types';
import { getUserDisplayInfo } from '../utils/user';


const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { name: displayName, initials } = getUserDisplayInfo(userProfile, user);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Debug: Log the modal state
  console.log('🔍 Dashboard component rendered, isModalOpen:', isModalOpen);

  const handleTemplateClick = (template: Template) => {
    console.log('Template clicked:', template.TemplateName);
    setSelectedTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleNewProject = () => {
    console.log('🎯 Opening modal from Dashboard...');
    setIsModalOpen(true);
  };

  const handleCreateDocumentFromTemplate = async (data: {
    template: Template;
    projectId?: string;
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
        console.log('Creating new project...');
        
        // For testing, use a mock user ID if not authenticated
        const userId = user?.uid || 'mock-user-' + Date.now();
        if (!user?.uid) {
          console.warn('User not authenticated, using mock user ID:', userId);
        }

        console.log('Sending project creation request:', {
          name: data.newProjectName,
          description: data.newProjectDescription,
          userId: userId,
          githubLink: data.selectedRepo
        });

        const projectResponse = await fetch(API_ENDPOINTS.projects(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: data.newProjectName,
            description: data.newProjectDescription,
            userId: userId,
            githubLink: data.selectedRepo || null
          }),
        });

        if (!projectResponse.ok) {
          throw new Error('Failed to create project');
        }

        const projectResult = await projectResponse.json();
        finalProjectId = projectResult.project.Project_Id || projectResult.project.id;
        console.log('✅ New project created successfully:', projectResult.project);
        console.log('Using project ID for document:', finalProjectId);
      }

      // Create the document in the project
      console.log(`📄 Creating document "${data.documentName}" (${data.documentRole}) in project ${finalProjectId} using template ${data.template.TemplateName}`);
      
      if (!finalProjectId) {
        throw new Error('Project ID is required to create document');
      }

      // Get user ID for document creation
      const userId = user?.uid || 'mock-user-' + Date.now();
      if (!user?.uid) {
        console.warn('User not authenticated, using mock user ID:', userId);
      }

      // Determine document category based on template or role
      let documentCategory = 'General';
      if (data.template.Category) {
        documentCategory = data.template.Category === 'user' ? 'User' : 
                          data.template.Category === 'developer' ? 'Developer' : 'General';
      } else if (data.documentRole.toLowerCase().includes('user')) {
        documentCategory = 'User';
      } else if (data.documentRole.toLowerCase().includes('developer') || data.documentRole.toLowerCase().includes('api')) {
        documentCategory = 'Developer';
      }

      // Prepare document data for API (matching Firebase Cloud Function format)
      const documentData = {
        title: data.documentName.trim(),
        content: data.template.TemplatePrompt || `# ${data.documentName}\n\nRole: ${data.documentRole}\n\nThis document was created using the ${data.template.TemplateName} template.`,
        projectId: finalProjectId,
        userId: userId,
        templateId: data.template.id || data.template.Template_Id || null,
        documentCategory: documentCategory
      };

      console.log('Sending document creation request:', documentData);

      // Create the document
      const documentResponse = await fetch(API_ENDPOINTS.documents(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
      });

      console.log('Document creation response status:', documentResponse.status);

      if (!documentResponse.ok) {
        const errorText = await documentResponse.text();
        console.error('Document creation failed:', errorText);
        throw new Error(`Failed to create document: ${documentResponse.status} ${documentResponse.statusText}`);
      }

      const documentResult = await documentResponse.json();
      console.log('✅ Document created successfully:', documentResult.document);

      // Close modal and navigate to project
      setIsTemplateModalOpen(false);
      setSelectedTemplate(null);
      
      // Show success message
      alert(`Document "${data.documentName}" created successfully!\n\nTemplate: ${data.template.TemplateName}\nRole: ${data.documentRole}\nCategory: ${documentCategory}`);
      
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
    navigate('/templates');
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
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <Header
        userName={displayName}
        initials={initials}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-8">
        <TemplateGrid 
          onTemplateClick={handleTemplateClick}
          onExploreAll={handleExploreAll}
          onAddProject={handleNewProject}
        />

        <ProjectList 
          onProjectClick={handleProjectClick}
          onViewAllProjects={handleViewAllProjects}
          onNewProject={handleNewProject}
        />
      </main>

      {/* AddProjectModal with GitHub Integration */}
      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={async (projectData) => {
          try {
            console.log('Creating dashboard project:', projectData);
            
            // Add userId to project data
            const projectDataWithUser = {
              ...projectData,
              userId: user?.uid || 'anonymous-user-' + Date.now()
            };
            
            console.log('Project data with user ID:', projectDataWithUser);
            
            const response = await fetch(API_ENDPOINTS.projects(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(projectDataWithUser),
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
