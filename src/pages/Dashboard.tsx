import React, { useState } from 'react';
import Header from '../components/header/Header';
import { useNavigate } from 'react-router-dom';
import TemplateGrid from '../components/dashboard/TemplateGrid';
import ProjectList from '../components/dashboard/ProjectList';
import AddProjectModal from '../components/modal/addProject';
import AddDocumentFromTemplate from '../components/modal/addDocumentFromTemplate';
import AIGenerationProgressModal from '../components/modal/AIGenerationProgressModal';
import { API_ENDPOINTS } from '../lib/apiConfig';
import type { Template } from '../types';
import { getUserDisplayInfo } from '../utils/user';
import { useAuth } from '../context/AuthContext';
import { aiService } from '../services/aiService';
import { useFeedback } from '../components/AppLayout';

interface GenerationStep {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  details?: string;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { name: displayName, initials } = getUserDisplayInfo(userProfile, user);
  const { openFeedbackModal } = useFeedback();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  
  // AI Generation Progress Modal State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRepository, setGenerationRepository] = useState('');
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<string>('');

  const handleTemplateClick = (template: Template) => {
    setSelectedTemplate(template);
    setIsTemplateModalOpen(true);
  };

  const handleNewProject = () => {
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
      let finalProjectId = data.projectId;

      // If creating a new project, create it first
      if (data.newProjectName && data.newProjectDescription) {
        
        // For testing, use a mock user ID if not authenticated
        const userId = user?.uid || 'mock-user-' + Date.now();
        if (!user?.uid) {
          console.warn('User not authenticated, using mock user ID:', userId);
        }

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
      }

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

      // Generate AI content if GitHub repository is available
      let documentContent = data.template.TemplatePrompt || `<h1>${data.documentName}</h1><p>Role: ${data.documentRole}</p><p>This document was created using the ${data.template.TemplateName} template.</p>`;
      
      // Determine repository URL - either from modal selection or from existing project
      let repositoryUrl = data.selectedRepo;
      
      // If using existing project and no repo selected in modal, fetch project's GitHub repo
      if (!repositoryUrl && finalProjectId && data.projectId) {
        try {
          console.log('🔍 Fetching GitHub repo for existing project:', finalProjectId);
          const projectResponse = await fetch(API_ENDPOINTS.project(finalProjectId));
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            const project = projectData.success ? projectData.project : projectData;
            repositoryUrl = project.GitHubRepo || project.githubLink || null;
          }
        } catch (error) {
          console.warn('⚠️ Could not fetch project GitHub repo:', error);
        }
      }
      
      if (repositoryUrl && user) {
        try {
          // Parse repository owner and name
          const repoMatch = repositoryUrl.match(/(?:https?:\/\/github\.com\/)?([^\/]+)\/([^\/\s]+)/);
          if (repoMatch) {
            const [, owner, repo] = repoMatch;
            
            // Initialize progress modal
            const repoFullName = `${owner}/${repo}`;
            setGenerationRepository(repoFullName);
            setIsGenerating(true);
            
            // Initialize generation steps
            const steps: GenerationStep[] = [
              { id: 'parse', label: 'Parsing repository information', status: 'completed', details: `Repository: ${repoFullName}` },
              { id: 'structure', label: 'Fetching repository structure', status: 'in-progress', details: 'Analyzing files and directories...' },
              { id: 'analysis', label: 'AI analyzing codebase', status: 'pending', details: 'Understanding project structure...' },
              { id: 'iteration', label: 'AI examining code files', status: 'pending', details: 'Reading relevant files...' },
              { id: 'files', label: 'Processing repository files', status: 'pending', details: 'Gathering context...' },
              { id: 'generate', label: 'Writing documentation', status: 'pending', details: 'AI creating content...' },
              { id: 'done', label: 'Finalizing document', status: 'pending' }
            ];
            setGenerationSteps(steps);
            setCurrentGenerationStep('structure');
            
            // Progress callback for iterative AI
            const handleProgress = (step: string, detail?: string) => {
              setGenerationSteps(prev => prev.map(s => {
                // Mark completed steps based on workflow
                const completedSteps = ['parse'];
                
                if (step === 'analysis' || step === 'iteration' || step === 'files' || step === 'generate' || step === 'done') {
                  completedSteps.push('structure');
                }
                if (step === 'iteration' || step === 'files' || step === 'generate' || step === 'done') {
                  completedSteps.push('analysis');
                }
                if (step === 'files' || step === 'generate' || step === 'done') {
                  completedSteps.push('iteration');
                }
                if (step === 'generate' || step === 'done') {
                  completedSteps.push('files');
                }
                if (step === 'done') {
                  completedSteps.push('generate');
                }
                
                // Mark completed
                if (completedSteps.includes(s.id) && s.id !== step) {
                  return { ...s, status: 'completed' as const };
                }
                
                // Update current step
                if (s.id === step) {
                  return { 
                    ...s, 
                    status: step === 'done' ? 'completed' as const : 'in-progress' as const,
                    details: detail || s.details 
                  };
                }
                
                return s;
              }));
              setCurrentGenerationStep(step);
            };
            
            try {
              // Generate content using NEW iterative AI method
              console.log('🚀 Starting iterative AI generation...');
              documentContent = await aiService.generateDocumentFromTemplateAndRepoIterative(
                user,
                data.template.TemplatePrompt || '',
                { owner, repo, fullName: repoFullName },
                data.documentRole,
                data.documentName,
                handleProgress // Pass progress callback
              );
              console.log('✅ AI generation completed, content length:', documentContent.length);
              console.log('📄 Generated content preview:', documentContent.substring(0, 300));
              
              // Finalize
              handleProgress('done', 'Document ready!');
              await new Promise(resolve => setTimeout(resolve, 500));
              
              console.log('✅ All steps completed, proceeding to create document');
            } catch (aiError) {
              console.error('❌ AI generation failed:', aiError);
              
              // Update steps to show error
              setGenerationSteps(prev => prev.map(step => 
                step.status === 'in-progress' 
                  ? { ...step, status: 'error' as const, details: 'Failed - using fallback' }
                  : step
              ));
              
              // Wait a bit to show error
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
          } else {
            console.warn('⚠️ Could not parse repository URL:', repositoryUrl);
          }
        } catch (error) {
          console.error('❌ Repository processing failed:', error);
          setIsGenerating(false);
        }
      }

      // Prepare document data for API (matching Firebase Cloud Function format)
      const documentData = {
        DocumentName: data.documentName.trim(),
        DocumentType: 'user-manual', // or another appropriate type based on template
        DocumentCategory: documentCategory,
        Content: documentContent,
        Project_Id: finalProjectId,
        User_Id: userId,
        Template_Id: data.template.id || data.template.Template_Id || null,
        IsDraft: false,
      };

      // Create the document
      const documentResponse = await fetch(API_ENDPOINTS.documents(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(documentData),
      });

      if (!documentResponse.ok) {
        const errorText = await documentResponse.text();
        console.error('Document creation failed:', errorText);
        throw new Error(`Failed to create document: ${documentResponse.status} ${documentResponse.statusText}`);
      }

      const documentResult = await documentResponse.json();
      const createdDocument = documentResult.document || documentResult;
      const documentId = createdDocument.id;

      // Close modals and navigate to document
      setIsTemplateModalOpen(false);
      setSelectedTemplate(null);
      setIsGenerating(false); // Close AI generation progress modal
      
      // Navigate to the created document, passing the full document data including content
      // This allows the editor to display content immediately without waiting for Firestore
      if (documentId) {
        navigate(`/document/${documentId}`, {
          state: { documentData: createdDocument }
        });
      } else {
        // Fallback to project view if no document ID
        alert(`Document "${data.documentName}" created successfully!\n\nTemplate: ${data.template.TemplateName}\nRole: ${data.documentRole}\nCategory: ${documentCategory}`);
        if (finalProjectId) {
          navigate(`/project/${finalProjectId}`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating document:', error);
      
      // Close the AI generation modal on error
      setIsGenerating(false);
      setIsTemplateModalOpen(false);
      setSelectedTemplate(null);
      
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
        onFeedbackClick={openFeedbackModal}
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
            console.log('📋 Project fields:', Object.keys(result.project));
            
            // Get the project ID (handle both Project_Id and id field names)
            const projectId = result.project.Project_Id || result.project.id;
            console.log('📍 Navigating to project ID:', projectId);
            
            // Close modal and navigate to the new project
            setIsModalOpen(false);
            
            if (projectId) {
              navigate(`/project/${projectId}`);
            } else {
              console.error('❌ No project ID found in response:', result.project);
              alert('Project created but navigation failed. Please refresh the page.');
            }
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

      {/* AI Generation Progress Modal */}
      <AIGenerationProgressModal
        isOpen={isGenerating}
        repositoryName={generationRepository}
        steps={generationSteps}
        currentStep={currentGenerationStep}
        onCancel={() => {
          setIsGenerating(false);
          setGenerationSteps([]);
        }}
      />
    </div>
  );
};

export default Dashboard;
