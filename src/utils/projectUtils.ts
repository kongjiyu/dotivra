// src/utils/projectUtils.ts
/**
 * Utility functions for safe project property access
 * Handles both old interface properties and new Firestore document structure
 */

import type { Project } from '@/types';

// Safe property getters
export const getProjectName = (project: Project): string => {
  return project.ProjectName || (project as any).name || 'Untitled Project';
};

export const getProjectDescription = (project: Project): string => {
  return project.Description || (project as any).description || 'No description available';
};

export const getProjectCreatedTime = (project: Project): string => {
  const created = project.Created_Time;
  if (created) {
    // Handle Firestore timestamp
    if (created.toDate && typeof created.toDate === 'function') {
      return created.toDate().toLocaleDateString();
    }
    // Handle ISO string
    if (typeof created === 'string') {
      return new Date(created).toLocaleDateString();
    }
  }
  // Fallback to legacy property or default
  return (project as any).lastModified || 'No date';
};

export const getProjectGithubLink = (project: Project): string => {
  return project.GitHubRepo || (project as any).githubLink || '';
};

// Document count getters (with defaults)
export const getProjectUserDocsCount = (project: Project): number => {
  return (project as any).userDocsCount || 0;
};

export const getProjectDevDocsCount = (project: Project): number => {
  return (project as any).devDocsCount || 0;
};

export const getProjectTotalDocsCount = (project: Project): number => {
  return getProjectUserDocsCount(project) + getProjectDevDocsCount(project);
};

// Create a safe project object for display (for legacy components)
export const createSafeProject = (project: Project) => ({
  ...project,
  name: getProjectName(project),
  description: getProjectDescription(project),
  lastModified: getProjectCreatedTime(project),
  githubLink: getProjectGithubLink(project),
  userDocsCount: getProjectUserDocsCount(project),
  devDocsCount: getProjectDevDocsCount(project),
});