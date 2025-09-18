// src/components/project/ProjectView.tsx - With URL parameters
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ProjectHeader from '../components/project/ProjectHeader';
import DocumentSection from '../components/project/DocumentSection';
import AddDocumentModal from '../components/project/AddDocumentModal';
import { 
  getProjectById, 
  getUserDocsByProjectId, 
  getDevDocsByProjectId 
} from '../utils/mockData';
import type { Document, Template } from '../types';

type CreateDocumentPayload = {
  template: Template;
  category: 'user' | 'developer';
  name: string;
  role: string;
};

const ProjectOverview: React.FC = () => {
  const navigate = useNavigate();

  // Get the  projectId from URL parameters
  const { projectId } = useParams<{ projectId: string }>();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'user' | 'developer' | null>(null);

  // Get project data from URL parameter (Mock data for now)
  const currentProjectId = projectId ? parseInt(projectId) : 1;
  const project = getProjectById(currentProjectId);
  const userDocs = getUserDocsByProjectId(currentProjectId);
  const devDocs = getDevDocsByProjectId(currentProjectId);

  if (!project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-4">The project you're looking for doesn't exist.</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleBackToDashboard = () => {
    console.log('Navigating back to dashboard');
    // 🎯 NAVIGATION: Go back to dashboard
    navigate('/dashboard');
  };

  const handleAddDocument = (category: 'user' | 'developer') => {
    console.log('Add document for category:', category);
    setSelectedCategory(category);
    setShowAddModal(true);
  };

  const handleEditDocument = (document: Document) => {
    console.log('Navigating to document editor:', document.name);
    // 🎯 NAVIGATION: Go to document editor
    navigate(`/document/${document.id}`);
  };

  const handleDeleteDocument = (document: Document) => {
    console.log('Delete document:', document.name);
    // TODO: Show delete confirmation modal
    alert(`Delete "${document.name}"? (This is just a demo)`);
  };

  const handleCreateDocument = ({
    template,
    category,
    name,
    role
  }: CreateDocumentPayload) => {
    console.log('Creating document with template:', template.name, 'for category:', category, 'name:', name, 'role:', role);
    // TODO: Create new document and navigate to editor
    // For now, just show success message
    alert(`Creating new ${category} document "${name}" (${role}) with ${template.name} template! (This is just a demo)`);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setSelectedCategory(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Project Header */}
      <ProjectHeader 
        project={project}
        onBackToDashboard={handleBackToDashboard}
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* User Documentation Section */}
        <DocumentSection
          title="Users"
          category="user"
          documents={userDocs}
          onAddDocument={handleAddDocument}
          onEditDocument={handleEditDocument}
          onDeleteDocument={handleDeleteDocument}
        />

        {/* Developer Documentation Section */}
        <DocumentSection
          title="Developers"
          category="developer"
          documents={devDocs}
          onAddDocument={handleAddDocument}
          onEditDocument={handleEditDocument}
          onDeleteDocument={handleDeleteDocument}
        />
      </div>

      {/* Add Document Modal */}
      <AddDocumentModal
        isOpen={showAddModal}
        category={selectedCategory}
        onClose={handleCloseModal}
        onCreateDocument={handleCreateDocument}
      />

      {/* Debug Info */}
      <div className="fixed bottom-4 left-4 bg-green-100 p-3 rounded-lg text-sm">
        Current Project ID: {currentProjectId}
      </div>
    </div>
  );
};

export default ProjectOverview;
