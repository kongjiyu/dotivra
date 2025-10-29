// src/services/firebaseService.ts
import { FirestoreService } from '../../firestoreService';
import type { 
  Project, 
  User, 
  Document, 
  Template, 
  DocumentHistory, 
  ChatHistory,
  AIGeneration,
  Feedback 
} from '../../firestoreService';

/**
 * Enhanced Firebase service that provides high-level operations
 * Built on top of FirestoreService for better integration with React components
 */
export class FirebaseService {
  
  // Project operations
  static async createProject(
    name: string, 
    description: string, 
    userId: string, 
    githubRepo?: string
  ): Promise<Project> {
    return await FirestoreService.createProject({
      ProjectName: name,
      Description: description,
      User_Id: userId,
      GitHubRepo: githubRepo || ''
    });
  }

  static async getUserProjects(userId: string): Promise<Project[]> {
    return await FirestoreService.getProjectsByUser(userId);
  }

  static async updateProject(projectId: string, updates: {
    name?: string;
    description?: string;
    githubRepo?: string;
  }): Promise<void> {
    const updateData: Partial<Project> = {};
    if (updates.name) updateData.ProjectName = updates.name;
    if (updates.description) updateData.Description = updates.description;
    if (updates.githubRepo) updateData.GitHubRepo = updates.githubRepo;
    
    return await FirestoreService.updateProject(projectId, updateData);
  }

  static async deleteProject(projectId: string): Promise<void> {
    // Delete all documents in the project first
    const documents = await FirestoreService.getDocumentsByProject(projectId);
    await Promise.all(documents.map(doc => 
      doc.id ? FirestoreService.deleteDocument(doc.id) : Promise.resolve()
    ));
    
    return await FirestoreService.deleteProject(projectId);
  }

  // Document operations
  static async createDocument(
    name: string,
    projectId: string,
    userId: string,
    templateId?: string,
    type: string = 'General',
    category: string = 'User'
  ): Promise<Document> {
    return await FirestoreService.createDocument({
      DocumentName: name,
      DocumentType: type,
      DocumentCategory: category,
      Project_Id: projectId,
      Template_Id: templateId || '',
      User_Id: userId,
      Content: '',
      IsDraft: true
    });
  }

  static async updateDocumentContent(
    documentId: string, 
    content: string, 
    isDraft: boolean = false
  ): Promise<void> {
    const hash = await this.generateContentHash(content);
    return await FirestoreService.updateDocument(documentId, {
      Content: content,
      IsDraft: isDraft,
      Hash: hash,
      Updated_Time: new Date()
    });
  }

  static async getProjectDocuments(projectId: string): Promise<Document[]> {
    return await FirestoreService.getDocumentsByProject(projectId);
  }

  static async getDocumentsByCategory(
    projectId: string, 
    category: string
  ): Promise<Document[]> {
    return await FirestoreService.getDocumentsByCategory(projectId, category);
  }

  // Template operations
  static async getTemplates(): Promise<Template[]> {
    return await FirestoreService.getTemplates();
  }

  static async createTemplate(
    name: string, 
    prompt: string, 
    category?: string,
    description?: string
  ): Promise<Template> {
    return await FirestoreService.createTemplate({
      TemplateName: name,
      TemplatePrompt: prompt,
      Category: category,
      Description: description,
      Created_Time: new Date()
    });
  }

  // Version control operations
  static async saveDocumentVersion(
    documentId: string, 
    content: string, 
    version?: string
  ): Promise<DocumentHistory> {
    const latestVersion = version || await FirestoreService.getLatestVersion(documentId);
    const newVersion = this.incrementVersion(latestVersion);
    
    return await FirestoreService.createDocumentHistory(
      documentId, 
      content, 
      newVersion
    );
  }

  static async getDocumentVersions(documentId: string): Promise<DocumentHistory[]> {
    return await FirestoreService.getDocumentHistory(documentId);
  }

  // Chat operations
  static async sendChatMessage(
    documentId: string, 
    message: string, 
    userId?: string,
    role: 'user' | 'assistant' = 'user',
    stage?: 'reasoning' | 'thinking' | 'action' | 'user'
  ): Promise<void> {
    // This would integrate with your server API
    const response = await fetch('/api/document/chat/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        docId: documentId,
        message,
        role
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to send chat message');
    }
  }

  static async getChatHistory(documentId: string): Promise<ChatHistory[]> {
    // This would integrate with your server API
    const response = await fetch(`/api/document/chat/history/${documentId}`);
    if (!response.ok) {
      throw new Error('Failed to get chat history');
    }
    
    const data = await response.json();
    return data.messages || [];
  }

  // AI generation operations
  static async generateAIContent(
    documentId: string, 
    prompt: string
  ): Promise<string> {
    // This would integrate with your AI service
    const response = await fetch('/api/ai/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId,
        prompt
      })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate AI content');
    }
    
    const data = await response.json();
    return data.content;
  }

  // User operations
  static async createUser(userData: {
    email: string;
    name: string;
    password?: string;
    uid?: string;
    provider?: string;
  }): Promise<User> {
    return await FirestoreService.createUser({
      UserEmail: userData.email,
      UserName: userData.name,
      UserPw: userData.password || '',
      uid: userData.uid,
      provider: userData.provider || 'email',
      createdAt: new Date(),
      lastLoginAt: new Date()
    });
  }

  static async getUserByEmail(email: string): Promise<User | null> {
    return await FirestoreService.getUserByEmail(email);
  }

  static async updateUserProfile(
    userId: string, 
    updates: Partial<User>
  ): Promise<void> {
    return await FirestoreService.updateUser(userId, updates);
  }

  // Utility methods
  private static async generateContentHash(content: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private static incrementVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length === 2) {
      const major = parseInt(parts[0]);
      const minor = parseInt(parts[1]) + 1;
      return `${major}.${minor}`;
    }
    return "1.0";
  }

  // Real-time subscriptions (for React components)
  static subscribeToProject(
    projectId: string, 
    callback: (project: Project | null) => void
  ): () => void {
    // Implementation would use Firestore real-time listeners
    // Return unsubscribe function
    return () => {};
  }

  static subscribeToProjectDocuments(
    projectId: string,
    callback: (documents: Document[]) => void
  ): () => void {
    // Implementation would use Firestore real-time listeners
    return () => {};
  }

  static subscribeToDocumentChanges(
    documentId: string,
    callback: (document: Document | null) => void
  ): () => void {
    // Implementation would use Firestore real-time listeners
    return () => {};
  }

  static subscribeToChatHistory(
    documentId: string,
    callback: (messages: ChatHistory[]) => void
  ): () => void {
    // Implementation would use Firestore real-time listeners
    return () => {};
  }

  // Feedback operations
  static async submitFeedback(
    comment: string,
    options?: {
      email?: string;
      pageLink?: string;
      userId?: string;
    }
  ): Promise<void> {
    try {
      await FirestoreService.createFeedback({
        Comment: comment,
        Email: options?.email,
        PageLink: options?.pageLink,
        User_Id: options?.userId,
        Status: 'new'
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      throw new Error('Failed to submit feedback. Please try again.');
    }
  }

  static async getUserFeedback(userId: string): Promise<Feedback[]> {
    return await FirestoreService.getFeedbackByUser(userId);
  }
}

export default FirebaseService;