// src/types/index.ts - All type definitions

// Project related types
export interface Project {
  id: number;
  name: string;
  description: string;
  githubLink: string;
  lastModified: string;
  userDocsCount: number;
  devDocsCount: number;
}

// Template related types
export interface Template {
  id: number;
  name: string;
  description: string;
  icon: any; // LucideIcon type
  category: 'user' | 'developer' | 'general';
}

// Document related types
export interface Document {
  id: number;
  name: string;
  lastEdited: string;
  template: Template;
  category: 'user' | 'developer';
  projectId: number;
}

// Chat related types
export interface ChatMessage {
  id: number;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
}

export interface ChatSession {
  id: number;
  documentId: number;
  messages: ChatMessage[];
  isActive: boolean;
}