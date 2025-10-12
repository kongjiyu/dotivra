import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileText, Code } from 'lucide-react';
import ProjectHeader from '../components/project/ProjectHeader';
import DocumentSection from '../components/project/DocumentSection';
import AddDocumentModal from '../components/project/AddDocumentModal';
import EditProjectModal from '@/components/modal/EditProject';
import { API_ENDPOINTS } from '../lib/apiConfig';
import type { Document, Template, Project } from '../types';

type CreateDocumentPayload = {
  template: Template;
  category: 'user' | 'developer' | 'general';
  name: string;
  role: string;
};

const ProjectOverview: React.FC = () => {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editedProjectModalOpen, setEditedProjectModalOpen] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'user' | 'developer' | 'general' | null>(null);
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
        console.log('🔄 Loading documents for project:', currentProjectId);
        const documentsResponse = await fetch(API_ENDPOINTS.projectDocuments(currentProjectId));
        console.log('📡 Documents API response status:', documentsResponse.status);
        
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          console.log('📋 Raw documents data received:', documentsData);
          
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
          console.log('✅ Transformed documents:', transformedDocuments);
          console.log('📊 Document categories:', transformedDocuments.map((doc: any) => ({ name: doc.DocumentName, category: doc.DocumentCategory })));
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
    console.log('Edit project:', project?.ProjectName);
    // TODO: Implement project editing functionality
    // For now, just open the edit modal
    // This requires managing the state for the EditProjectModal
    setEditedProjectModalOpen(true);  
  };

  const handleAddDocument = (category: 'user' | 'developer' | 'general') => {
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
      console.log('✅ Document created successfully:', result.document);

      // Close modal
      setShowAddModal(false);
      setSelectedCategory(null);
      
      // Reload documents to show the new document
      const documentsResponse = await fetch(API_ENDPOINTS.projectDocuments(currentProjectId!));
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
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-medium text-yellow-800">Debug Info:</h4>
            <p className="text-sm text-yellow-700">Project ID: {currentProjectId}</p>
            <p className="text-sm text-yellow-700">Total Documents: {documents.length}</p>
            <p className="text-sm text-yellow-700">User Docs: {userDocs.length}, Dev Docs: {devDocs.length}, General Docs: {generalDocs.length}</p>
          </div>
        )}
        
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
