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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get project data from URL parameter
  const currentProjectId = projectId ? parseInt(projectId) : null;
  
  // Load project data from API
  useEffect(() => {
    const loadProject = async () => {
      if (!currentProjectId) {
        setError('No project ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`http://localhost:3001/api/projects/${currentProjectId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Project not found');
          }
          throw new Error('Failed to load project');
        }
        
        const data = await response.json();
        setProject(data.project);
      } catch (err) {
        console.error('Error loading project:', err);
        setError(err instanceof Error ? err.message : 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [currentProjectId]);
  
  // For now, documents are empty (will be implemented later)
  const userDocs: Document[] = [];
  const devDocs: Document[] = [];

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
    console.log('Edit project:', project?.name);
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
    console.log('Navigate to document editor:', document.name);
    navigate(`/document/${document.id}`);
  };

  const handleDeleteDocument = (document: Document) => {
    console.log('Delete document:', document.name);
    alert(`Delete "${document.name}"? (This is just a demo)`);
  };

  const handleCreateDocument = async ({
    template,
    category,
    name,
    role
  }: CreateDocumentPayload) => {
    try {
      console.log('Calling document add API...');
      
      const response = await fetch('http://localhost:3001/api/document/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: currentProjectId,
          templateId: template.id,
          templateName: template.name,
          category,
          documentName: name,
          role,
          createdAt: new Date().toISOString()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Document add API response:', data);
        alert(`Document "${name}" created successfully!`);
        // TODO: Refresh documents list or add to local state
      } else {
        console.error('Document add failed:', data.error);
        alert('Failed to create document. Please try again.');
      }
    } catch (error) {
      console.error('Document add API error:', error);
      alert('Network error. Please check your connection and try again.');
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
        initialData={project}
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
