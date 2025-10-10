// src/types/index.ts - All type definitions aligned with Firebase

// Re-export Firebase types for consistency
export type {
  Project,
  User,
  Document,
  Template,
  DocumentHistory,
  ChatHistory,
  AIGeneration,
  ChatboxHistory
} from '../../firestoreService';

// Legacy interfaces for backward compatibility (deprecated - use Firebase types above)
export interface LegacyProject {
  id: number;
  name: string;
  description: string;
  githubLink: string;
  lastModified: string;
  userDocsCount: number;
  devDocsCount: number;
}

export interface LegacyTemplate {
  id: number;
  name: string;
  description: string;
  icon: any; // LucideIcon type
  category: 'user' | 'developer' | 'general';
}

export interface LegacyDocument {
  id: number;
  name: string;
  lastEdited: string;
  template: LegacyTemplate;
  category: 'user' | 'developer';
  projectId: number;
}

// Enhanced chat types for AI workflow
export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: string;
  stage?: 'reasoning' | 'thinking' | 'action' | 'user';
}

export interface ChatSession {
  id: string;
  documentId: string;
  messages: ChatMessage[];
  isActive: boolean;
}

// Auth types from Firebase Auth integration
export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  provider: string;
  createdAt: any;
  lastLoginAt: any;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Import types for use in interfaces
import type { Project, Document } from '../../firestoreService';

export interface ProjectsResponse extends ApiResponse<Project[]> {
  projects?: Project[];
}

export interface DocumentsResponse extends ApiResponse<Document[]> {
  documents?: Document[];
}