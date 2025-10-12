import { 
    collection, 
    doc, 
    getDocs, 
    getDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    where,
    Timestamp
} from 'firebase/firestore';
import { db } from './src/config/firebase';

// Collections - matching your Firestore database
const PROJECTS_COLLECTION = 'Projects';
const DOCUMENTS_COLLECTION = 'Documents';
const TEMPLATES_COLLECTION = 'Templates';
const USERS_COLLECTION = 'Users';
const DOCUMENT_HISTORY_COLLECTION = 'Document History';
const CHATBOX_HISTORY_COLLECTION = 'Chatbox History';
const CHAT_HISTORY_COLLECTION = 'ChatHistory';
const AI_GENERATION_COLLECTION = 'AI';

// Updated interfaces - using Firestore auto-generated IDs as primary keys and foreign keys
export interface Project {
    id?: string; // Firestore auto-generated ID (will be set after creation)
    Project_Id?: string; // Custom Project ID for compatibility
    ProjectName: string;
    User_Id: string; // Foreign key - references User's Firestore document ID
    Description: string;
    GitHubRepo?: string;
    Created_Time: any; // Firestore Timestamp
    Updated_Time?: any; // Firestore Timestamp
}

export interface User {
    id?: string; // Firestore auto-generated ID (will be set after creation)
    uid?: string; // Firebase Auth UID
    User_Id?: string; // Custom User ID for compatibility
    UserEmail: string;
    UserName: string;
    UserPw?: string; // Optional for OAuth users
    displayName?: string;
    photoURL?: string;
    provider?: string; // 'email', 'google', 'github'
    createdAt?: any; // Firestore Timestamp
    lastLoginAt?: any; // Firestore Timestamp
}

export interface Document {
    id?: string; // Firestore auto-generated ID (will be set after creation)
    DocumentName: string;
    DocumentType: string; // 'SRS', 'User Manual', etc.
    DocumentCategory?: string; // 'User', 'Developer'
    Project_Id: string; // Foreign key - references Project's Firestore document ID
    Template_Id?: string; // Foreign key - references Template's Firestore document ID
    User_Id: string; // Foreign key - references User's Firestore document ID
    Content?: string; // HTML content
    Created_Time?: any; // Firestore Timestamp
    Updated_Time?: any; // Firestore Timestamp
    EditedBy?: string; // User ID who last edited
    IsDraft?: boolean;
    Hash?: string; // Content hash for change detection
}

export interface Template {
    id?: string; // Firestore auto-generated ID (will be set after creation)
    Template_Id?: string; // Custom Template ID for compatibility
    TemplateName: string;
    TemplatePrompt: string;
    Category?: string; // 'user', 'developer', 'general'
    Description?: string;
    Created_Time?: any; // Firestore Timestamp
}

export interface DocumentHistory {
    id?: string; // Firestore auto-generated ID (will be set after creation)
    Document_Id: string; // Foreign key - references Document's Firestore document ID
    Content: string;
    Version: string;
    Edited_Time: any; // Firestore Timestamp
}

export interface ChatboxHistory {
    id?: string; // Firestore auto-generated ID (will be set after creation)
    ReferDoc: string; // Foreign key - references Document's Firestore document ID
    Content: string;
}

// Enhanced Chat History for AI workflow
export interface ChatHistory {
    id?: string; // Firestore auto-generated ID
    UserID?: string; // Foreign key - references User ID (nullable for AI messages)
    DocID: string; // Foreign key - references Document's Firestore document ID
    Message: string; // Chat message content
    Role: 'user' | 'assistant'; // Message sender type
    Stage?: 'reasoning' | 'thinking' | 'action' | 'user'; // AI workflow stage
    CreatedAt: string; // ISO timestamp
}

// AI Generation interface for tracking AI-generated content
export interface AIGeneration {
    id?: string; // Firestore auto-generated ID
    DocumentID: string; // Foreign key - references Document's Firestore document ID
    PromptText: string; // User's input prompt
    GeneratedContent: string; // AI-generated content
    createdAt: string; // ISO timestamp
}

export class FirestoreService {
    // --------------------------
    // Project operations
    // --------------------------
    static async createProject(
        projectData: Omit<Project, 'id' | 'Created_Time'>
    ): Promise<Project> {
        try {
            const newProject = {
                ...projectData,
                Created_Time: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, PROJECTS_COLLECTION), newProject);
            
            return {
                id: docRef.id, // Firestore auto-generated ID
                ...newProject
            };
        } catch (error) {
            console.error('Error creating project:', error);
            throw error;
        }
    }

    static async getProjects(): Promise<Project[]> {
        try {
            const q = query(collection(db, PROJECTS_COLLECTION), orderBy('Created_Time', 'desc'));
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id, // Include Firestore document ID
                ...docSnap.data()
            } as Project));
        } catch (error) {
            console.error('Error fetching projects:', error);
            throw error;
        }
    }

    static async getProject(projectId: string): Promise<Project | null> {
        try {
            const docRef = doc(db, PROJECTS_COLLECTION, projectId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as Project;
            }
            return null;
        } catch (error) {
            console.error('Error fetching project:', error);
            throw error;
        }
    }

    static async getProjectsByUser(userId: string): Promise<Project[]> {
        try {
            const q = query(
                collection(db, PROJECTS_COLLECTION),
                where('User_Id', '==', userId),
                orderBy('Created_Time', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as Project));
        } catch (error) {
            console.error('Error fetching user projects:', error);
            throw error;
        }
    }

    static async updateProject(projectId: string, updates: Partial<Project>): Promise<void> {
        try {
            const docRef = doc(db, PROJECTS_COLLECTION, projectId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error('Error updating project:', error);
            throw error;
        }
    }

    static async deleteProject(projectId: string): Promise<void> {
        try {
            const docRef = doc(db, PROJECTS_COLLECTION, projectId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting project:', error);
            throw error;
        }
    }

    // --------------------------
    // User operations
    // --------------------------
    static async createUser(userData: Omit<User, 'id'>): Promise<User> {
        try {
            const docRef = await addDoc(collection(db, USERS_COLLECTION), userData);
            
            return {
                id: docRef.id, // Firestore auto-generated ID
                ...userData
            };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    static async getUser(userId: string): Promise<User | null> {
        try {
            const docRef = doc(db, USERS_COLLECTION, userId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as User;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }

    static async getUserByEmail(email: string): Promise<User | null> {
        try {
            const q = query(
                collection(db, USERS_COLLECTION),
                where('UserEmail', '==', email)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as User;
            }
            return null;
        } catch (error) {
            console.error('Error fetching user:', error);
            throw error;
        }
    }

    static async getAllUsers(): Promise<User[]> {
        try {
            const querySnapshot = await getDocs(collection(db, USERS_COLLECTION));
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as User));
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        }
    }

    static async updateUser(userId: string, updates: Partial<User>): Promise<void> {
        try {
            const docRef = doc(db, USERS_COLLECTION, userId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    static async deleteUser(userId: string): Promise<void> {
        try {
            const docRef = doc(db, USERS_COLLECTION, userId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // --------------------------
    // Document operations
    // --------------------------
    static async createDocument(
        documentData: Omit<Document, 'id' | 'Created_Time'>
    ): Promise<Document> {
        try {
            const newDocument = {
                ...documentData,
                Created_Time: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, DOCUMENTS_COLLECTION), newDocument);
            
            return {
                id: docRef.id, // Firestore auto-generated ID
                ...newDocument
            };
        } catch (error) {
            console.error('Error creating document:', error);
            throw error;
        }
    }

    static async getDocument(documentId: string): Promise<Document | null> {
        try {
            const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as Document;
            }
            return null;
        } catch (error) {
            console.error('Error fetching document:', error);
            throw error;
        }
    }

    static async getDocumentsByProject(projectId: string): Promise<Document[]> {
        try {
            const q = query(
                collection(db, DOCUMENTS_COLLECTION), 
                where('Project_Id', '==', projectId),
                orderBy('Created_Time', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as Document));
        } catch (error) {
            console.error('Error fetching documents:', error);
            throw error;
        }
    }

    static async getDocumentsByCategory(projectId: string, category: string): Promise<Document[]> {
        try {
            const q = query(
                collection(db, DOCUMENTS_COLLECTION), 
                where('Project_Id', '==', projectId),
                where('DocumentCategory', '==', category),
                orderBy('Created_Time', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as Document));
        } catch (error) {
            console.error('Error fetching documents by category:', error);
            throw error;
        }
    }

    static async updateDocument(documentId: string, updates: Partial<Document>): Promise<void> {
        try {
            const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error('Error updating document:', error);
            throw error;
        }
    }

    static async deleteDocument(documentId: string): Promise<void> {
        try {
            const docRef = doc(db, DOCUMENTS_COLLECTION, documentId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting document:', error);
            throw error;
        }
    }

    // --------------------------
    // Template operations
    // --------------------------
    static async createTemplate(templateData: Omit<Template, 'id'>): Promise<Template> {
        try {
            const docRef = await addDoc(collection(db, TEMPLATES_COLLECTION), templateData);
            
            return {
                id: docRef.id, // Firestore auto-generated ID
                ...templateData
            };
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    }

    static async getTemplate(templateId: string): Promise<Template | null> {
        try {
            const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as Template;
            }
            return null;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    }

    static async getTemplates(): Promise<Template[]> {
        try {
            const querySnapshot = await getDocs(collection(db, TEMPLATES_COLLECTION));
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as Template));
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    }

    static async getTemplateByName(templateName: string): Promise<Template | null> {
        try {
            const q = query(
                collection(db, TEMPLATES_COLLECTION),
                where('TemplateName', '==', templateName)
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const docSnap = querySnapshot.docs[0];
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as Template;
            }
            return null;
        } catch (error) {
            console.error('Error fetching template:', error);
            throw error;
        }
    }

    static async updateTemplate(templateId: string, updates: Partial<Template>): Promise<void> {
        try {
            const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    }

    static async deleteTemplate(templateId: string): Promise<void> {
        try {
            const docRef = doc(db, TEMPLATES_COLLECTION, templateId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    }

    // --------------------------
    // Document History operations
    // --------------------------
    static async createDocumentHistory(
        documentId: string, 
        content: string,
        version: string
    ): Promise<DocumentHistory> {
        try {
            const newHistory = {
                Document_Id: documentId, // Foreign key to Document's Firestore ID
                Content: content,
                Version: version,
                Edited_Time: Timestamp.now()
            };

            const docRef = await addDoc(collection(db, DOCUMENT_HISTORY_COLLECTION), newHistory);
            
            return {
                id: docRef.id, // Firestore auto-generated ID
                ...newHistory
            };
        } catch (error) {
            console.error('Error creating document history:', error);
            throw error;
        }
    }

    static async getDocumentHistory(documentId: string): Promise<DocumentHistory[]> {
        try {
            const q = query(
                collection(db, DOCUMENT_HISTORY_COLLECTION),
                where('Document_Id', '==', documentId),
                orderBy('Edited_Time', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as DocumentHistory));
        } catch (error) {
            console.error('Error fetching document history:', error);
            throw error;
        }
    }

    static async getLatestVersion(documentId: string): Promise<string> {
        try {
            const q = query(
                collection(db, DOCUMENT_HISTORY_COLLECTION),
                where('Document_Id', '==', documentId),
                orderBy('Edited_Time', 'desc')
            );
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                const latestHistory = querySnapshot.docs[0].data() as DocumentHistory;
                return latestHistory.Version;
            }
            return "1.0";
        } catch (error) {
            console.error('Error fetching latest version:', error);
            return "1.0";
        }
    }

    static async updateDocumentHistory(historyId: string, updates: Partial<DocumentHistory>): Promise<void> {
        try {
            const docRef = doc(db, DOCUMENT_HISTORY_COLLECTION, historyId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error('Error updating document history:', error);
            throw error;
        }
    }

    static async deleteDocumentHistory(historyId: string): Promise<void> {
        try {
            const docRef = doc(db, DOCUMENT_HISTORY_COLLECTION, historyId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting document history:', error);
            throw error;
        }
    }

    // --------------------------
    // Chatbox History operations
    // --------------------------
    static async createChatboxHistory(
        referDocId: string, // Document's Firestore ID
        content: string
    ): Promise<ChatboxHistory> {
        try {
            const newChatboxHistory = {
                ReferDoc: referDocId, // Foreign key to Document's Firestore ID
                Content: content
            };

            const docRef = await addDoc(collection(db, CHATBOX_HISTORY_COLLECTION), newChatboxHistory);
            
            return {
                id: docRef.id, // Firestore auto-generated ID
                ...newChatboxHistory
            };
        } catch (error) {
            console.error('Error creating chatbox history:', error);
            throw error;
        }
    }

    static async getChatboxHistory(chatboxId: string): Promise<ChatboxHistory | null> {
        try {
            const docRef = doc(db, CHATBOX_HISTORY_COLLECTION, chatboxId);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                return {
                    id: docSnap.id,
                    ...docSnap.data()
                } as ChatboxHistory;
            }
            return null;
        } catch (error) {
            console.error('Error fetching chatbox history:', error);
            throw error;
        }
    }

    static async getChatboxHistoryByDocument(referDocId: string): Promise<ChatboxHistory[]> {
        try {
            const q = query(
                collection(db, CHATBOX_HISTORY_COLLECTION),
                where('ReferDoc', '==', referDocId)
            );
            const querySnapshot = await getDocs(q);
            
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as ChatboxHistory));
        } catch (error) {
            console.error('Error fetching chatbox history:', error);
            throw error;
        }
    }

    static async getAllChatboxHistory(): Promise<ChatboxHistory[]> {
        try {
            const querySnapshot = await getDocs(collection(db, CHATBOX_HISTORY_COLLECTION));
            return querySnapshot.docs.map(docSnap => ({
                id: docSnap.id,
                ...docSnap.data()
            } as ChatboxHistory));
        } catch (error) {
            console.error('Error fetching all chatbox history:', error);
            throw error;
        }
    }

    static async updateChatboxHistory(chatboxId: string, updates: Partial<ChatboxHistory>): Promise<void> {
        try {
            const docRef = doc(db, CHATBOX_HISTORY_COLLECTION, chatboxId);
            await updateDoc(docRef, updates);
        } catch (error) {
            console.error('Error updating chatbox history:', error);
            throw error;
        }
    }

    static async deleteChatboxHistory(chatboxId: string): Promise<void> {
        try {
            const docRef = doc(db, CHATBOX_HISTORY_COLLECTION, chatboxId);
            await deleteDoc(docRef);
        } catch (error) {
            console.error('Error deleting chatbox history:', error);
            throw error;
        }
    }
}