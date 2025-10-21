import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Code } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ProjectHeader from '../components/project/ProjectHeader';
import DocumentSection from '../components/project/DocumentSection';
import AddDocumentModal from '../components/project/AddDocumentModal';
import EditProjectModal from '@/components/modal/EditProject';
import AIGenerationProgressModal from '@/components/modal/AIGenerationProgressModal';
import { API_ENDPOINTS } from '../lib/apiConfig';
import { aiService } from '../services/aiService';
import type { Document, Template, Project } from '../types';

type GenerationStep = {
  id: string;
  label: string;
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  details?: string;
};

type CreateDocumentPayload = {
  template: Template;
  category: 'user' | 'developer' | 'general';
  name: string;
  role: string;
  githubRepo?: string;
};

const ProjectOverview: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user, userProfile } = useAuth();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editedProjectModalOpen, setEditedProjectModalOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'user' | 'developer' | 'general' | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // AI Generation Progress Modal State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationRepository, setGenerationRepository] = useState('');
  const [generationSteps, setGenerationSteps] = useState<GenerationStep[]>([]);
  const [currentGenerationStep, setCurrentGenerationStep] = useState<string>('');

  // Get project data from URL parameter
  const currentProjectId = projectId; // Keep as string, don't parse as integer
  
  // Load project data and documents from API
  useEffect(() => {
    const loadProjectAndDocuments = async () => {
      if (!currentProjectId) {
        setError('No project ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Load project data
        const projectResponse = await fetch(API_ENDPOINTS.project(currentProjectId));
        if (!projectResponse.ok) {
          if (projectResponse.status === 404) {
            throw new Error('Project not found');
          }
          throw new Error('Failed to load project');
        }
        
        const projectData = await projectResponse.json();
        setProject(projectData.project);
        
        // Load documents for this project
        const documentsResponse = await fetch(API_ENDPOINTS.projectDocuments(currentProjectId));
        
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          
          // Handle both array response and object with documents property
          const rawDocuments = Array.isArray(documentsData) ? documentsData : (documentsData.documents || []);
          
          // Transform Cloud Function document format to expected frontend format
          const transformedDocuments = rawDocuments.map((doc: any) => {
            // Map template IDs to their correct categories (based on mockData.ts)
            const templateCategoryMap: { [key: string]: string } = {
              '1': 'Developer', // API Documentation - developer template (Category: 'developer')
              '2': 'General',   // SRS Document - general template (Category: 'general')
              '3': 'User',      // User Guide - user template (Category: 'user')
              '4': 'Developer', // Technical Manual - developer template (Category: 'developer')
            };
            
            // Use the stored category, but if it's "General" and we have a template mapping, use the template's category
            let documentCategory = doc.DocumentCategory || 'General';
            if (documentCategory === 'General' && doc.TemplateId && templateCategoryMap[doc.TemplateId]) {
              documentCategory = templateCategoryMap[doc.TemplateId];
            }
            
            return {
              id: doc.id,
              DocumentName: doc.Title || doc.DocumentName || 'Untitled Document',
              DocumentType: doc.DocumentType || 'Document',
              DocumentCategory: documentCategory,
              Project_Id: doc.ProjectId || doc.Project_Id,
              Template_Id: doc.TemplateId || doc.Template_Id,
              User_Id: doc.UserId || doc.User_Id,
              Content: doc.Content || '',
              Created_Time: doc.CreatedAt || doc.Created_Time,
              Updated_Time: doc.UpdatedAt || doc.Updated_Time,
              IsDraft: doc.IsDraft !== undefined ? doc.IsDraft : true,
              EditedBy: doc.EditedBy || doc.UserId || doc.User_Id
            };
          });
          
          setDocuments(transformedDocuments);
        } else {
          const errorText = await documentsResponse.text();
          console.error('❌ Failed to load documents:', documentsResponse.status, errorText);
          console.warn('Continuing without documents');
          setDocuments([]);
        }
        
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProjectAndDocuments();
  }, [currentProjectId]);
  
  // Filter documents by category
  const userDocs: Document[] = documents.filter(doc => doc.DocumentCategory === 'User');
  const devDocs: Document[] = documents.filter(doc => doc.DocumentCategory === 'Developer');
  const generalDocs: Document[] = documents.filter(doc => doc.DocumentCategory === 'General');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {error || 'Project Not Found'}
          </h2>
          <p className="text-gray-600 mb-4">
            {error === 'Project not found' 
              ? "The project you're looking for doesn't exist."
              : "There was an error loading the project."
            }
          </p>
          <button
            onClick={() => navigate('/projects')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleAddDocumentClick = () => {
    setShowCategoryModal(true);
  };

  const handleEditProject = () => {
    setEditedProjectModalOpen(true);  
  };

  const handleAddDocument = (category: 'user' | 'developer' | 'general') => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
    setShowAddModal(true);
  };

  const handleEditDocument = (document: Document) => {
    navigate(`/document/${document.id}`);
  };

  const handleDeleteDocument = (document: Document) => {
    alert(`Delete "${document.DocumentName}"? (This is just a demo)`);
  };

  const handleCreateDocument = async ({
    template,
    category,
    name,
    role,
    githubRepo
  }: CreateDocumentPayload) => {
    try {
      if (!project?.id && !project?.Project_Id) {
        throw new Error('Project ID not available');
      }

      if (!user || !userProfile) {
        throw new Error('User must be logged in to create documents');
      }

      const projectId = project.Project_Id || project.id;
      const userId = user.uid || userProfile.uid;
      const documentCategory = category === 'user' ? 'User' : category === 'developer' ? 'Developer' : 'General';
      
      // Initialize content with template
      let documentContent = template.TemplatePrompt || '';
      
      // Get repository URL from project or use provided githubRepo
      let repositoryUrl = githubRepo || project.GitHubRepo || null;
      
      // If repository exists and user is authenticated, use AI to generate content
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
              // Call iterative AI generation
              documentContent = await aiService.generateDocumentFromTemplateAndRepoIterative(
                user,
                template.TemplatePrompt || '',
                { owner, repo, fullName: repoFullName },
                role,
                name,
                handleProgress
              );
              
              setGenerationSteps(prev => prev.map(s => 
                s.id === 'generate' 
                  ? { ...s, status: 'completed' as const, details: 'AI content ready' }
                  : s
              ));
              setGenerationSteps(prev => prev.map(s => 
                s.id === 'done' 
                  ? { ...s, status: 'completed' as const, details: 'Document ready!' }
                  : s
              ));
              
              // Wait a bit to show completion
              await new Promise(resolve => setTimeout(resolve, 800));
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

      // Create document data matching API expectations
      const documentData = {
        title: name,
        content: documentContent,
        projectId: projectId,
        userId: userId,
        templateId: template.id || template.Template_Id,
        documentCategory: documentCategory,
      };

      const response = await fetch(API_ENDPOINTS.documents(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(documentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to create document: ${errorData.error || response.statusText}`);
      }

      const result = await response.json();
      const createdDocument = result.document || result;
      const documentId = createdDocument.id;

      // Close modals
      setShowAddModal(false);
      setSelectedCategory(null);
      setIsGenerating(false);
      
      // Navigate to the new document, passing the full document data including content
      // This allows the editor to display content immediately without waiting for Firestore
      navigate(`/document/${documentId}`, {
        state: { documentData: createdDocument }
      });
      
    } catch (error) {
      console.error('❌ Error creating document:', error);
      setIsGenerating(false);
      alert(`Failed to create document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedCategory(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader 
        project={project}
        onBackToDashboard={handleBackToDashboard}
        onAddDocument={handleAddDocumentClick}
        onEditProject={handleEditProject}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <DocumentSection
          title="Users"
          category="user"
          documents={userDocs}
          onEditDocument={handleEditDocument}
          onDeleteDocument={handleDeleteDocument}
        />

        <DocumentSection
          title="Developers"
          category="developer"
          documents={devDocs}
          onEditDocument={handleEditDocument}
          onDeleteDocument={handleDeleteDocument}
        />

        <DocumentSection
          title="General"
          category="general"
          documents={generalDocs}
          onEditDocument={handleEditDocument}
          onDeleteDocument={handleDeleteDocument}
        />
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative w-full max-w-md transform overflow-hidden rounded-xl bg-white shadow-xl">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Document Type</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => handleAddDocument('user')}
                    className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-blue-600 mr-3" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">User Documentation</div>
                      <div className="text-sm text-gray-600">For end users and customers</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAddDocument('developer')}
                    className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <Code className="h-5 w-5 text-purple-600 mr-3" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">Developer Documentation</div>
                      <div className="text-sm text-gray-600">For developers and technical users</div>
                    </div>
                  </button>
                  <button
                    onClick={() => handleAddDocument('general')}
                    className="w-full flex items-center p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <FileText className="h-5 w-5 text-gray-600 mr-3" />
                    <div className="text-left">
                      <div className="font-medium text-gray-900">General Documentation</div>
                      <div className="text-sm text-gray-600">For general information and mixed content</div>
                    </div>
                  </button>
                </div>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="w-full mt-4 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddDocumentModal
        isOpen={showAddModal}
        category={selectedCategory}
        onClose={handleCloseModal}
        onCreateDocument={handleCreateDocument}
        projectGithubRepo={project?.GitHubRepo || undefined}
      />

      <EditProjectModal
        isOpen={editedProjectModalOpen}
        initialData={project ? {
          name: project.ProjectName,
          description: project.Description
        } : undefined}
        onClose={() => setEditedProjectModalOpen(false)}
        onSubmit={(updatedProject) => {
          console.log('Updated project:', updatedProject);
          alert('Project updated! (This is just a demo)');
        }}
      />

      <AIGenerationProgressModal
        isOpen={isGenerating}
        repositoryName={generationRepository}
        steps={generationSteps}
        currentStep={currentGenerationStep}
      />

    </div>
  );
};

export default ProjectOverview;
