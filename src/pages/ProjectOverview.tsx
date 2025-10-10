import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Code } from 'lucide-react';
import ProjectHeader from '../components/project/ProjectHeader';
import DocumentSection from '../components/project/DocumentSection';
import AddDocumentModal from '../components/project/AddDocumentModal';
import EditProjectModal from '@/components/modal/EditProject';
import type { Document, Template, Project } from '../types';

type CreateDocumentPayload = {
  template: Template;
  category: 'user' | 'developer';
  name: string;
  role: string;
};

const ProjectOverview: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editedProjectModalOpen, setEditedProjectModalOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'user' | 'developer' | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        const projectResponse = await fetch(`http://localhost:3001/api/projects/${currentProjectId}`);
        if (!projectResponse.ok) {
          if (projectResponse.status === 404) {
            throw new Error('Project not found');
          }
          throw new Error('Failed to load project');
        }
        
        const projectData = await projectResponse.json();
        setProject(projectData.project);
        
        // Load documents for this project
        const documentsResponse = await fetch(`http://localhost:3001/api/documents/project/${currentProjectId}`);
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          setDocuments(documentsData.documents || []);
          console.log('Loaded documents:', documentsData.documents);
        } else {
          console.warn('Failed to load documents, continuing without them');
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
    console.log('Edit project:', project?.ProjectName);
    // TODO: Implement project editing functionality
    // For now, just open the edit modal
    // This requires managing the state for the EditProjectModal
    setEditedProjectModalOpen(true);  
  };

  const handleAddDocument = (category: 'user' | 'developer') => {
    setSelectedCategory(category);
    setShowCategoryModal(false);
    setShowAddModal(true);
  };

  const handleEditDocument = (document: Document) => {
    console.log('Navigate to document editor:', document.DocumentName);
    navigate(`/document/${document.id}`);
  };

  const handleDeleteDocument = (document: Document) => {
    console.log('Delete document:', document.DocumentName);
    alert(`Delete "${document.DocumentName}"? (This is just a demo)`);
  };

  const handleCreateDocument = async ({
    template,
    category,
    name,
    role
  }: CreateDocumentPayload) => {
    try {
      console.log('Creating document with template:', template.TemplateName, 'for category:', category, 'name:', name, 'role:', role);
      
      if (!project?.id && !project?.Project_Id) {
        throw new Error('Project ID not available');
      }

      // Create document data
      const documentData = {
        DocumentName: name,
        DocumentType: template.TemplateName || 'Custom Document',
        DocumentCategory: category === 'user' ? 'User' : 'Developer',
        Project_Id: project.id || project.Project_Id, // Use Firestore ID or custom Project_Id
        Template_Id: template.id || template.Template_Id,
        User_Id: 'current-user-id', // TODO: Get from auth context
        Content: template.TemplatePrompt || '', // Initial content from template
        IsDraft: true
      };

      console.log('Sending document creation request:', documentData);

      const response = await fetch('http://localhost:3001/api/documents', {
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
      console.log('✅ Document created successfully:', result.document);

      // Close modal
      setShowAddModal(false);
      setSelectedCategory(null);
      
      // Reload documents to show the new document
      const documentsResponse = await fetch(`http://localhost:3001/api/documents/project/${currentProjectId}`);
      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        setDocuments(documentsData.documents || []);
      }
      
      alert(`Document "${name}" created successfully!`);
      
      // Optionally navigate to document editor
      // navigate(`/document/${result.document.id}`);
      
    } catch (error) {
      console.error('❌ Error creating document:', error);
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
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCategoryModal(false)} />
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

      


    </div>
  );
};

export default ProjectOverview;
