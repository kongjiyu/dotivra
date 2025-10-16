// src/utils/mockProjectData.ts - Mock data for Document and Project when real data is not found

import type { Document, Project } from '@/types';

// Mock projects
export const mockProjects: Project[] = [
  {
    id: "mock-project-1",
    ProjectName: "Sample Documentation Project",
    User_Id: "mock-user-1",
    Description: "A sample project demonstrating the document management system with various types of technical documentation.",
    GitHubRepo: "https://github.com/sample-org/documentation-project",
    Created_Time: new Date('2024-01-15T10:30:00Z'),
    Updated_Time: new Date('2024-10-14T15:45:00Z')
  },
  {
    id: "mock-project-2", 
    ProjectName: "API Development Guidelines",
    User_Id: "mock-user-1",
    Description: "Comprehensive guidelines and documentation for REST API development standards and best practices.",
    GitHubRepo: "https://github.com/sample-org/api-guidelines",
    Created_Time: new Date('2024-02-20T09:15:00Z'),
    Updated_Time: new Date('2024-10-10T11:20:00Z')
  }
];

// Mock documents for the sample project
export const mockDocuments: Document[] = [
  {
    id: "mock-doc-1",
    DocumentName: "Project Overview & Requirements",
    DocumentType: "SRS",
    DocumentCategory: "general",
    Project_Id: "mock-project-1",
    Template_Id: "2", // SRS Document template
    User_Id: "mock-user-1",
    Content: `
      <h1>Project Overview</h1>
      <p>This is a comprehensive documentation management system designed to help teams organize and maintain their technical documentation efficiently.</p>
      
      <h2>Key Features</h2>
      <ul>
        <li>Document creation and editing with rich text support</li>
        <li>Project-based organization</li>
        <li>Template system for standardized documents</li>
        <li>Version history and change tracking</li>
        <li>Collaborative editing capabilities</li>
      </ul>
      
      <h2>Requirements</h2>
      <ol>
        <li>User authentication and authorization</li>
        <li>Document CRUD operations</li>
        <li>Real-time collaboration</li>
        <li>Export functionality</li>
        <li>Search and filtering</li>
      </ol>
    `,
    Created_Time: new Date('2024-01-15T11:00:00Z'),
    Updated_Time: new Date('2024-10-14T14:30:00Z'),
    EditedBy: "mock-user-1",
    IsDraft: false,
    Hash: "abc123def456"
  },
  {
    id: "mock-doc-2",
    DocumentName: "User Guide - Getting Started", 
    DocumentType: "User Manual",
    DocumentCategory: "user",
    Project_Id: "mock-project-1",
    Template_Id: "3", // User Guide template
    User_Id: "mock-user-1",
    Content: `
      <h1>Getting Started Guide</h1>
      <p>Welcome to the Documentation Management System! This guide will help you get started quickly.</p>
      
      <h2>Creating Your First Project</h2>
      <ol>
        <li>Click the "New Project" button on the dashboard</li>
        <li>Enter your project name and description</li>
        <li>Optionally link your GitHub repository</li>
        <li>Click "Create Project" to proceed</li>
      </ol>
      
      <h2>Adding Documents</h2>
      <p>Once your project is created, you can start adding documents by selecting from our template library or creating custom documents.</p>
      
      <h2>Collaboration Features</h2>
      <ul>
        <li>Real-time editing with multiple users</li>
        <li>Comment system for feedback</li>
        <li>Version history for tracking changes</li>
        <li>Share links for external reviewers</li>
      </ul>
    `,
    Created_Time: new Date('2024-01-16T09:30:00Z'),
    Updated_Time: new Date('2024-10-12T16:15:00Z'),
    EditedBy: "mock-user-1",
    IsDraft: false,
    Hash: "def456ghi789"
  },
  {
    id: "mock-doc-3",
    DocumentName: "API Documentation",
    DocumentType: "Technical Manual",
    DocumentCategory: "developer", 
    Project_Id: "mock-project-1",
    Template_Id: "1", // API Documentation template
    User_Id: "mock-user-1",
    Content: `
      <h1>API Documentation</h1>
      <p>Complete reference for the Documentation System API endpoints.</p>
      
      <h2>Authentication</h2>
      <p>All API requests require authentication via JWT tokens.</p>
      <pre><code>Authorization: Bearer {your-jwt-token}</code></pre>
      
      <h2>Projects Endpoints</h2>
      <h3>GET /api/projects</h3>
      <p>Retrieve all projects for the authenticated user.</p>
      
      <h3>POST /api/projects</h3>
      <p>Create a new project.</p>
      
      <h2>Documents Endpoints</h2>
      <h3>GET /api/documents/{id}</h3>
      <p>Retrieve a specific document by ID.</p>
      
      <h3>PUT /api/documents/{id}</h3>
      <p>Update an existing document.</p>
      
      <h2>Error Responses</h2>
      <ul>
        <li>400 - Bad Request</li>
        <li>401 - Unauthorized</li>
        <li>404 - Not Found</li>
        <li>500 - Internal Server Error</li>
      </ul>
    `,
    Created_Time: new Date('2024-01-18T13:45:00Z'),
    Updated_Time: new Date('2024-10-13T10:20:00Z'),
    EditedBy: "mock-user-1", 
    IsDraft: false,
    Hash: "ghi789jkl012"
  },
  {
    id: "mock-doc-4",
    DocumentName: "Meeting Notes - Sprint Planning",
    DocumentType: "Meeting Notes",
    DocumentCategory: "general",
    Project_Id: "mock-project-1",
    Template_Id: "5", // Meeting Notes template
    User_Id: "mock-user-1",
    Content: `
      <h1>Sprint Planning Meeting</h1>
      <p><strong>Date:</strong> October 14, 2024</p>
      <p><strong>Attendees:</strong> Development Team, Product Owner, Scrum Master</p>
      
      <h2>Sprint Goals</h2>
      <ul>
        <li>Implement document sharing functionality</li>
        <li>Add real-time collaboration features</li>
        <li>Improve performance for large documents</li>
        <li>Fix critical bugs from previous sprint</li>
      </ul>
      
      <h2>User Stories Selected</h2>
      <ol>
        <li>As a user, I want to share documents with external reviewers</li>
        <li>As a team member, I want to see live cursors while editing</li>
        <li>As a power user, I want faster loading for documents over 10MB</li>
      </ol>
      
      <h2>Action Items</h2>
      <ul>
        <li>Setup WebSocket server for real-time features - @dev-team</li>
        <li>Research document chunking strategies - @tech-lead</li>
        <li>Design sharing UI mockups - @designer</li>
      </ul>
      
      <h2>Next Meeting</h2>
      <p>Daily standups at 9 AM, Sprint Review on October 28, 2024</p>
    `,
    Created_Time: new Date('2024-10-14T14:00:00Z'),
    Updated_Time: new Date('2024-10-14T15:30:00Z'),
    EditedBy: "mock-user-1",
    IsDraft: true,
    Hash: "jkl012mno345"
  },
  {
    id: "mock-doc-5",
    DocumentName: "Architecture Overview",
    DocumentType: "Technical Manual",
    DocumentCategory: "developer",
    Project_Id: "mock-project-1", 
    Template_Id: "4", // Technical Manual template
    User_Id: "mock-user-1",
    Content: `
      <h1>System Architecture Overview</h1>
      <p>High-level architecture of the Documentation Management System.</p>
      
      <h2>Technology Stack</h2>
      <ul>
        <li><strong>Frontend:</strong> React + TypeScript + Vite</li>
        <li><strong>Backend:</strong> Node.js + Express</li>
        <li><strong>Database:</strong> Firebase Firestore</li>
        <li><strong>Authentication:</strong> Firebase Auth</li>
        <li><strong>Real-time:</strong> WebSocket</li>
      </ul>
      
      <h2>System Components</h2>
      <h3>Client Application</h3>
      <p>Single-page application built with React, providing rich text editing and project management interfaces.</p>
      
      <h3>API Server</h3>
      <p>RESTful API handling CRUD operations for projects, documents, and user management.</p>
      
      <h3>Database Layer</h3>
      <p>NoSQL document store for flexible schema and real-time synchronization capabilities.</p>
      
      <h2>Security Considerations</h2>
      <ul>
        <li>JWT-based authentication</li>
        <li>Role-based access control</li>
        <li>Document-level permissions</li>
        <li>Input validation and sanitization</li>
      </ul>
    `,
    Created_Time: new Date('2024-01-20T08:15:00Z'),
    Updated_Time: new Date('2024-10-11T12:45:00Z'), 
    EditedBy: "mock-user-1",
    IsDraft: false,
    Hash: "mno345pqr678"
  }
];

// Helper function to get mock project by ID
export const getMockProject = (projectId: string): Project | null => {
  return mockProjects.find(project => project.id === projectId) || null;
};

// Helper function to get mock document by ID  
export const getMockDocument = (documentId: string): Document | null => {
  return mockDocuments.find(doc => doc.id === documentId) || null;
};

// Helper function to get mock documents by project ID
export const getMockDocumentsByProject = (projectId: string): Document[] => {
  return mockDocuments.filter(doc => doc.Project_Id === projectId);
};

// Helper function to create a mock document for any given ID (if not found in predefined mocks)
export const createMockDocument = (documentId: string): Document => {
  return {
    id: documentId,
    DocumentName: `Sample Document (${documentId})`,
    DocumentType: "General Document", 
    DocumentCategory: "general",
    Project_Id: "mock-project-1",
    Template_Id: "2",
    User_Id: "mock-user-1",
    Content: `
      <h1>Sample Document</h1>
      <p>This is a mock document created for demonstration purposes. The requested document with ID <code>${documentId}</code> was not found in the database, so this sample content is being displayed instead.</p>
      
      <h2>About Mock Data</h2>
      <p>This document contains placeholder content to help you understand the structure and features of the documentation system.</p>
      
      <ul>
        <li>Rich text formatting capabilities</li>
        <li>Structured content organization</li>
        <li>Project-based document management</li>
        <li>Template-driven document creation</li>
      </ul>
      
      <p><em>Note: This is mock data. In a real environment, you would see the actual document content here.</em></p>
    `,
    Created_Time: new Date('2024-10-15T12:00:00Z'),
    Updated_Time: new Date('2024-10-15T12:00:00Z'),
    EditedBy: "mock-user-1",
    IsDraft: false,
    Hash: "mock-hash-" + documentId
  };
};