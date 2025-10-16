// src/services/apiService.ts
/**
 * Reusable API service functions for document and project operations
 */

import { API_ENDPOINTS } from '@/lib/apiConfig';
import type { Document, Project } from '@/types';

/**
 * Fetch a single document by ID
 */
export const fetchDocument = async (documentId: string): Promise<Document> => {
  console.log('📄 Fetching document:', documentId);
  
  try {
    const response = await fetch(API_ENDPOINTS.document(documentId));
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('📄 Document not found, using mock data for:', documentId);
        // Import mock data dynamically to avoid circular dependencies
        const { getMockDocument, createMockDocument } = await import('@/utils/mockProjectData');
        const mockDoc = getMockDocument(documentId);
        return mockDoc || createMockDocument(documentId);
      }
      throw new Error(`Failed to fetch document: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📄 Document data received:', data);
    
    // Handle both API response formats: direct document data or wrapped in success/document
    const documentData = data.success ? data.document : data;
    
    return documentData;
  } catch (error) {
    // If there's a network error or other issue, fall back to mock data
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('📄 Network error, using mock data for:', documentId);
      const { getMockDocument, createMockDocument } = await import('@/utils/mockProjectData');
      const mockDoc = getMockDocument(documentId);
      return mockDoc || createMockDocument(documentId);
    }
    throw error;
  }
};

/**
 * Fetch project by ID
 */
export const fetchProject = async (projectId: string): Promise<Project> => {
  console.log('🏗️ Fetching project:', projectId);
  
  try {
    const response = await fetch(API_ENDPOINTS.project(projectId));
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('🏗️ Project not found, using mock data for:', projectId);
        const { getMockProject } = await import('@/utils/mockProjectData');
        const mockProject = getMockProject(projectId);
        if (mockProject) {
          return mockProject;
        }
        // Create a default mock project if none exists
        return {
          id: projectId,
          ProjectName: `Sample Project (${projectId})`,
          User_Id: "mock-user-1",
          Description: "This is a mock project created for demonstration purposes when the requested project was not found.",
          GitHubRepo: "https://github.com/sample-org/sample-project",
          Created_Time: new Date('2024-10-15T12:00:00Z'),
          Updated_Time: new Date('2024-10-15T12:00:00Z')
        };
      }
      throw new Error(`Failed to fetch project: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('🏗️ Project data received:', data);
    
    // Handle API response format
    const projectData = data.success ? data.project : data;
    
    return projectData;
  } catch (error) {
    // If there's a network error or other issue, fall back to mock data
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('🏗️ Network error, using mock data for:', projectId);
      const { getMockProject } = await import('@/utils/mockProjectData');
      const mockProject = getMockProject(projectId);
      if (mockProject) {
        return mockProject;
      }
      // Create a default mock project if none exists
      return {
        id: projectId,
        ProjectName: `Sample Project (${projectId})`,
        User_Id: "mock-user-1", 
        Description: "This is a mock project created for demonstration purposes when the requested project was not found.",
        GitHubRepo: "https://github.com/sample-org/sample-project",
        Created_Time: new Date('2024-10-15T12:00:00Z'),
        Updated_Time: new Date('2024-10-15T12:00:00Z')
      };
    }
    throw error;
  }
};

/**
 * Fetch all documents for a project
 */
export const fetchProjectDocuments = async (projectId: string): Promise<Document[]> => {
  console.log('📋 Fetching documents for project:', projectId);
  
  try {
    const response = await fetch(API_ENDPOINTS.projectDocuments(projectId));
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log('📋 Project documents not found, using mock data for:', projectId);
        const { getMockDocumentsByProject } = await import('@/utils/mockProjectData');
        return getMockDocumentsByProject(projectId);
      }
      throw new Error(`Failed to fetch project documents: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📋 Project documents received:', data);
    
    // Handle both array response and object with documents property
    const documents = Array.isArray(data) ? data : (data.documents || []);
    
    return documents;
  } catch (error) {
    // If there's a network error or other issue, fall back to mock data
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.log('📋 Network error, using mock data for project:', projectId);
      const { getMockDocumentsByProject } = await import('@/utils/mockProjectData');
      return getMockDocumentsByProject(projectId);
    }
    throw error;
  }
};

/**
 * Get document and its related project documents
 * This is the main function that combines all the above operations
 */
export const fetchDocumentWithProject = async (documentId: string) => {
  try {
    // 1. Fetch the current document
    const currentDocument = await fetchDocument(documentId);
    
    if (!currentDocument.Project_Id) {
      console.log('📄 Document has no associated project, using default mock project');
      // Use the default mock project for documents without a project
      const { mockProjects } = await import('@/utils/mockProjectData');
      const defaultProject = mockProjects[0]; // Use first mock project as default
      
      return {
        currentDocument,
        project: defaultProject,
        relatedDocuments: [],
        allDocuments: [currentDocument]
      };
    }
    
    // 2. Fetch the project information
    const project = await fetchProject(currentDocument.Project_Id);
    
    // 3. Fetch all documents in the same project
    const allDocuments = await fetchProjectDocuments(currentDocument.Project_Id);
    
    // 4. Filter out the current document from the list of related documents
    const relatedDocuments = allDocuments.filter(doc => doc.id !== documentId);
    
    return {
      currentDocument,
      project,
      relatedDocuments,
      allDocuments
    };
  } catch (error) {
    console.error('❌ Error fetching document with project:', error);
    // If everything fails, return fully mocked data
    console.log('📄 Falling back to complete mock data set');
    const { createMockDocument, mockProjects, getMockDocumentsByProject } = await import('@/utils/mockProjectData');
    
    const mockDocument = createMockDocument(documentId);
    const defaultProject = mockProjects[0];
    const mockRelatedDocuments = getMockDocumentsByProject(defaultProject.id!).filter(doc => doc.id !== documentId);
    
    return {
      currentDocument: mockDocument,
      project: defaultProject,
      relatedDocuments: mockRelatedDocuments,
      allDocuments: [mockDocument, ...mockRelatedDocuments]
    };
  }
};