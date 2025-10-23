// src/lib/apiConfig.ts
/**
 * Centralized API configuration for production and development environments
 * 
 * Development: http://localhost:3001
 * Production: https://us-central1-dotivra.cloudfunctions.net/api
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Common API endpoints
export const API_ENDPOINTS = {
  // Projects
  projects: () => buildApiUrl('api/projects'),
  userProjects: (userId: string) => buildApiUrl(`api/projects/user/${userId}`),
  project: (id: string, userId?: string) => {
    const url = buildApiUrl(`api/projects/${id}`);
    return userId ? `${url}?userId=${userId}` : url;
  },
  updateProject: (id: string, userId?: string) => {
    const url = buildApiUrl(`api/projects/${id}`);
    return userId ? `${url}?userId=${userId}` : url;
  },
  deleteProject: (id: string, userId?: string) => {
    const url = buildApiUrl(`api/projects/${id}`);
    return userId ? `${url}?userId=${userId}` : url;
  },
  
  // Documents  
  documents: () => buildApiUrl('api/documents'),
  document: (id: string) => buildApiUrl(`api/documents/${id}`),
  deleteDocument: (id: string) => buildApiUrl(`api/documents/${id}`),
  projectDocuments: (projectId: string) => buildApiUrl(`api/documents/project/${projectId}`),
  
  // Templates
  templates: () => buildApiUrl('api/templates'),
  template: (id: string) => buildApiUrl(`api/templates/${id}`),
  
  // GitHub
  githubOauth: () => buildApiUrl('api/github/oauth/token'),
  githubRepos: () => buildApiUrl('api/github/user/repos'),
  
  // Auth (if needed)
  auth: () => buildApiUrl('api/auth'),
} as const;

// Environment info for debugging
export const getEnvironmentInfo = () => ({
  apiBaseUrl: API_BASE_URL,
  isProduction: import.meta.env.PROD,
  isDevelopment: import.meta.env.DEV,
  mode: import.meta.env.MODE,
});

// Log configuration on first import (dev only)
if (import.meta.env.DEV) {
  console.log('🔧 API Config:', getEnvironmentInfo());
}