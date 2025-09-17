// src/utils/mockData.ts - Static mock data
import { FileText, Code, BookOpen, FileCheck, Settings, Users } from 'lucide-react';
import type { Project, Template, Document } from '../types';

// 6 Templates as requested
export const mockTemplates: Template[] = [
  {
    id: 1,
    name: "API Documentation",
    description: "REST API endpoints, parameters, and responses",
    icon: Code,
    category: 'developer'
  },
  {
    id: 2,
    name: "SRS Document",
    description: "Software Requirements Specification template",
    icon: FileCheck,
    category: 'general'
  },
  {
    id: 3,
    name: "User Guide",
    description: "Step-by-step user instructions and tutorials",
    icon: BookOpen,
    category: 'user'
  },
  {
    id: 4,
    name: "Technical Manual",
    description: "Technical implementation and architecture docs",
    icon: Settings,
    category: 'developer'
  },
  {
    id: 5,
    name: "Meeting Notes",
    description: "Meeting minutes and action items template",
    icon: FileText,
    category: 'general'
  },
  {
    id: 6,
    name: "User Stories",
    description: "User story and acceptance criteria template",
    icon: Users,
    category: 'general'
  }
];

// Mock Projects
export const mockProjects: Project[] = [
  {
    id: 1,
    name: "E-commerce Platform",
    description: "Complete online shopping platform with payment integration and inventory management",
    githubLink: "https://github.com/company/ecommerce-platform",
    lastModified: "2 hours ago",
    userDocsCount: 5,
    devDocsCount: 8
  },
  {
    id: 2,
    name: "Mobile Banking App",
    description: "Secure mobile banking application with biometric authentication and real-time transactions",
    githubLink: "https://github.com/company/mobile-banking",
    lastModified: "1 day ago",
    userDocsCount: 7,
    devDocsCount: 12
  },
  {
    id: 3,
    name: "Analytics Dashboard",
    description: "Real-time data visualization dashboard for business intelligence and reporting",
    githubLink: "https://github.com/company/analytics-dashboard",
    lastModified: "3 days ago",
    userDocsCount: 3,
    devDocsCount: 6
  },
  {
    id: 4,
    name: "AI Chat Assistant",
    description: "Intelligent chatbot with natural language processing and context awareness",
    githubLink: "https://github.com/company/ai-assistant",
    lastModified: "1 week ago",
    userDocsCount: 4,
    devDocsCount: 9
  },
  {
    id: 5,
    name: "Document Management System",
    description: "Secure document storage, sharing, and collaboration platform with version control",
    githubLink: "https://github.com/company/doc-management",
    lastModified: "2 weeks ago",
    userDocsCount: 6,
    devDocsCount: 7
  },
  {
    id: 6,
    name: "IoT Device Controller",
    description: "Smart home device management system with real-time monitoring and automation",
    githubLink: "https://github.com/company/iot-controller",
    lastModified: "1 month ago",
    userDocsCount: 8,
    devDocsCount: 15
  }
];

// Mock Documents for projects
export const mockDocuments: Document[] = [
  // E-commerce Platform docs
  {
    id: 1,
    name: "Shopping Cart User Guide",
    lastEdited: "2 hours ago",
    template: mockTemplates[2], // User Guide
    category: 'user',
    projectId: 1
  },
  {
    id: 2,
    name: "Payment API Documentation",
    lastEdited: "5 hours ago",
    template: mockTemplates[0], // API Documentation
    category: 'developer',
    projectId: 1
  },
  {
    id: 3,
    name: "Product Management Guide",
    lastEdited: "1 day ago",
    template: mockTemplates[2], // User Guide
    category: 'user',
    projectId: 1
  },
  {
    id: 4,
    name: "Database Schema Documentation",
    lastEdited: "2 days ago",
    template: mockTemplates[3], // Technical Manual
    category: 'developer',
    projectId: 1
  },

  // Mobile Banking App docs
  {
    id: 5,
    name: "Account Setup Guide",
    lastEdited: "1 day ago",
    template: mockTemplates[2], // User Guide
    category: 'user',
    projectId: 2
  },
  {
    id: 6,
    name: "Authentication API",
    lastEdited: "2 days ago",
    template: mockTemplates[0], // API Documentation
    category: 'developer',
    projectId: 2
  },
  {
    id: 7,
    name: "Security Implementation",
    lastEdited: "3 days ago",
    template: mockTemplates[3], // Technical Manual
    category: 'developer',
    projectId: 2
  },

  // Analytics Dashboard docs
  {
    id: 8,
    name: "Dashboard User Manual",
    lastEdited: "3 days ago",
    template: mockTemplates[2], // User Guide
    category: 'user',
    projectId: 3
  },
  {
    id: 9,
    name: "Data Visualization API",
    lastEdited: "4 days ago",
    template: mockTemplates[0], // API Documentation
    category: 'developer',
    projectId: 3
  }
];

// Helper functions
export const getProjectById = (id: number): Project | undefined => {
  return mockProjects.find(project => project.id === id);
};

export const getDocumentsByProjectId = (projectId: number): Document[] => {
  return mockDocuments.filter(doc => doc.projectId === projectId);
};

export const getUserDocsByProjectId = (projectId: number): Document[] => {
  return mockDocuments.filter(doc => doc.projectId === projectId && doc.category === 'user');
};

export const getDevDocsByProjectId = (projectId: number): Document[] => {
  return mockDocuments.filter(doc => doc.projectId === projectId && doc.category === 'developer');
};