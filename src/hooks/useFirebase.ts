// src/hooks/useFirebase.ts
import { useState, useEffect } from 'react';
import { onSnapshot, doc, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import FirebaseService from '../services/firebaseService';
import type { Project, Document, User, Template, ChatHistory } from '../../firestoreService';

/**
 * Hook for managing projects
 */
export function useProjects(userId?: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    FirebaseService.getUserProjects(userId)
      .then(setProjects)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  const createProject = async (name: string, description: string, githubRepo?: string) => {
    if (!userId) throw new Error('User ID required');
    const newProject = await FirebaseService.createProject(name, description, userId, githubRepo);
    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = async (projectId: string, updates: {
    name?: string;
    description?: string;
    githubRepo?: string;
  }) => {
    await FirebaseService.updateProject(projectId, updates);
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, ...updates, ProjectName: updates.name || p.ProjectName }
        : p
    ));
  };

  const deleteProject = async (projectId: string) => {
    await FirebaseService.deleteProject(projectId);
    setProjects(prev => prev.filter(p => p.id !== projectId));
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject,
    refetch: () => {
      if (userId) {
        setLoading(true);
        FirebaseService.getUserProjects(userId)
          .then(setProjects)
          .catch(err => setError(err.message))
          .finally(() => setLoading(false));
      }
    }
  };
}

/**
 * Hook for managing documents within a project
 */
export function useProjectDocuments(projectId?: string) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    FirebaseService.getProjectDocuments(projectId)
      .then(setDocuments)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const createDocument = async (
    name: string, 
    userId: string, 
    templateId?: string,
    type?: string,
    category?: string
  ) => {
    if (!projectId) throw new Error('Project ID required');
    const newDoc = await FirebaseService.createDocument(
      name, projectId, userId, templateId, type, category
    );
    setDocuments(prev => [newDoc, ...prev]);
    return newDoc;
  };

  const updateDocument = async (documentId: string, content: string, isDraft = false) => {
    await FirebaseService.updateDocumentContent(documentId, content, isDraft);
    setDocuments(prev => prev.map(d => 
      d.id === documentId 
        ? { ...d, Content: content, IsDraft: isDraft, Updated_Time: new Date() }
        : d
    ));
  };

  return {
    documents,
    loading,
    error,
    createDocument,
    updateDocument,
    userDocs: documents.filter(d => d.DocumentCategory === 'User'),
    devDocs: documents.filter(d => d.DocumentCategory === 'Developer'),
    refetch: () => {
      if (projectId) {
        setLoading(true);
        FirebaseService.getProjectDocuments(projectId)
          .then(setDocuments)
          .catch(err => setError(err.message))
          .finally(() => setLoading(false));
      }
    }
  };
}

/**
 * Hook for real-time document editing
 */
export function useDocument(documentId?: string) {
  const [document, setDocument] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setDocument(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'Documents', documentId),
      (docSnap) => {
        if (docSnap.exists()) {
          setDocument({
            id: docSnap.id,
            ...docSnap.data()
          } as Document);
        } else {
          setDocument(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [documentId]);

  const updateContent = async (content: string, isDraft = false) => {
    if (!documentId) return;
    await FirebaseService.updateDocumentContent(documentId, content, isDraft);
  };

  const saveVersion = async (content: string, version?: string) => {
    if (!documentId) return;
    return await FirebaseService.saveDocumentVersion(documentId, content, version);
  };

  return {
    document,
    loading,
    error,
    updateContent,
    saveVersion
  };
}

/**
 * Hook for managing templates
 */
export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    FirebaseService.getTemplates()
      .then(setTemplates)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const createTemplate = async (
    name: string, 
    prompt: string, 
    category?: string,
    description?: string
  ) => {
    const newTemplate = await FirebaseService.createTemplate(name, prompt, category, description);
    setTemplates(prev => [...prev, newTemplate]);
    return newTemplate;
  };

  return {
    templates,
    loading,
    error,
    createTemplate,
    userTemplates: templates.filter(t => t.Category === 'user'),
    devTemplates: templates.filter(t => t.Category === 'developer'),
    generalTemplates: templates.filter(t => t.Category === 'general')
  };
}

/**
 * Hook for chat functionality
 */
export function useChat(documentId?: string) {
  const [messages, setMessages] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    FirebaseService.getChatHistory(documentId)
      .then(setMessages)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [documentId]);

  const sendMessage = async (
    message: string, 
    userId?: string,
    role: 'user' | 'assistant' = 'user'
  ) => {
    if (!documentId) return;
    
    await FirebaseService.sendChatMessage(documentId, message, userId, role);
    
    // Add optimistic update
    const newMessage: ChatHistory = {
      id: Date.now().toString(),
      UserID: userId,
      DocID: documentId,
      Message: message,
      Role: role,
      CreatedAt: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, newMessage]);
  };

  const generateAIContent = async (prompt: string) => {
    if (!documentId) return '';
    return await FirebaseService.generateAIContent(documentId, prompt);
  };

  return {
    messages,
    loading,
    error,
    sendMessage,
    generateAIContent,
    userMessages: messages.filter(m => m.Role === 'user'),
    aiMessages: messages.filter(m => m.Role === 'assistant')
  };
}

/**
 * Hook for user management
 */
export function useUser(userId?: string) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      doc(db, 'Users', userId),
      (docSnap) => {
        if (docSnap.exists()) {
          setUser({
            id: docSnap.id,
            ...docSnap.data()
          } as User);
        } else {
          setUser(null);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [userId]);

  const updateProfile = async (updates: Partial<User>) => {
    if (!userId) return;
    await FirebaseService.updateUserProfile(userId, updates);
  };

  return {
    user,
    loading,
    error,
    updateProfile
  };
}

/**
 * Hook for real-time project updates
 */
export function useRealtimeProject(projectId?: string) {
  const [project, setProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setProject(null);
      setDocuments([]);
      setLoading(false);
      return;
    }

    // Subscribe to project changes
    const unsubscribeProject = onSnapshot(
      doc(db, 'Projects', projectId),
      (docSnap) => {
        if (docSnap.exists()) {
          setProject({
            id: docSnap.id,
            ...docSnap.data()
          } as Project);
        }
      }
    );

    // Subscribe to documents changes
    const documentsQuery = query(
      collection(db, 'Documents'),
      where('Project_Id', '==', projectId),
      orderBy('Created_Time', 'desc')
    );

    const unsubscribeDocuments = onSnapshot(
      documentsQuery,
      (querySnapshot) => {
        const docs = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Document));
        setDocuments(docs);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeProject();
      unsubscribeDocuments();
    };
  }, [projectId]);

  return {
    project,
    documents,
    loading,
    userDocs: documents.filter(d => d.DocumentCategory === 'User'),
    devDocs: documents.filter(d => d.DocumentCategory === 'Developer')
  };
}