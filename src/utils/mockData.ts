// src/utils/mockData.ts - Template definitions (reusable across projects)
import type { Template } from '../types';

// Document templates - these are reusable across all projects
export const templates: Template[] = [
  {
    id: "1",
    TemplateName: "API Documentation",
    TemplatePrompt: "REST API endpoints, parameters, and responses",
    Description: "REST API endpoints, parameters, and responses",
    Category: 'developer'
  },
  {
    id: "2", 
    TemplateName: "SRS Document",
    TemplatePrompt: "Software Requirements Specification template",
    Description: "Software Requirements Specification template",
    Category: 'general'
  },
  {
    id: "3",
    TemplateName: "User Guide",
    TemplatePrompt: "Step-by-step user instructions and tutorials",
    Description: "Step-by-step user instructions and tutorials",
    Category: 'user'
  },
  {
    id: "4",
    TemplateName: "Technical Manual", 
    TemplatePrompt: "Technical implementation and architecture docs",
    Description: "Technical implementation and architecture docs",
    Category: 'developer'
  },
  {
    id: "5",
    TemplateName: "Meeting Notes",
    TemplatePrompt: "Meeting minutes and action items template",
    Description: "Meeting minutes and action items template",
    Category: 'general'
  },
  {
    id: "6",
    TemplateName: "User Stories",
    TemplatePrompt: "User story and acceptance criteria template",
    Description: "User story and acceptance criteria template",
    Category: 'general'
  },
  {
    id: "7",
    TemplateName: "Commit Log",
    TemplatePrompt: "A commit Log template to track changes and updates",
    Description: "A commit Log template to track changes and updates",
    Category: 'developer'
  }
];

// Legacy export for backward compatibility
export const mockTemplates = templates;
