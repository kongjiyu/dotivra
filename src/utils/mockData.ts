// src/utils/mockData.ts - Template definitions (reusable across projects)
import { FileText, Code, BookOpen, FileCheck, Settings, Users } from 'lucide-react';
import type { Template } from '../types';

// Document templates - these are reusable across all projects
export const templates: Template[] = [
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
  },
  {
    id: 7,
    name: "Commit Log",
    description: "A commit Log template to track changes and updates",
    icon: BookOpen,
    category: 'developer'
  }
];

// Legacy export for backward compatibility
export const mockTemplates = templates;
