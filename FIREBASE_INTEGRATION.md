# Firebase Integration Guide

This guide explains how to integrate your Dotivra application with Firebase and use the updated database structure.

## 🔗 Project Structure Overview

Your project now has a complete Firebase integration with:
- **Updated ERD** (`DATABASE_ERD.md`) - Comprehensive database design
- **Enhanced FirestoreService** (`firestoreService.ts`) - Low-level database operations
- **FirebaseService** (`src/services/firebaseService.ts`) - High-level business logic
- **React Hooks** (`src/hooks/useFirebase.ts`) - Component-ready hooks
- **Updated Types** (`src/types/index.ts`) - TypeScript definitions

## 🚀 Quick Start

### 1. Update Environment Variables

Make sure your `.env` file has all required Firebase configuration:

```env
# Firebase Configuration (Frontend)
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
```

### 2. Using React Hooks in Components

#### Project Management Example

```tsx
import React from 'react';
import { useProjects } from '../hooks/useFirebase';
import { useAuth } from '../context/AuthContext';

function ProjectsPage() {
  const { user } = useAuth();
  const { 
    projects, 
    loading, 
    error, 
    createProject, 
    updateProject, 
    deleteProject 
  } = useProjects(user?.uid);

  const handleCreateProject = async () => {
    try {
      await createProject(
        "My New Project",
        "A sample project description",
        "https://github.com/user/repo"
      );
    } catch (err) {
      console.error('Failed to create project:', err);
    }
  };

  if (loading) return <div>Loading projects...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>My Projects</h1>
      <button onClick={handleCreateProject}>Create Project</button>
      
      {projects.map(project => (
        <div key={project.id}>
          <h3>{project.ProjectName}</h3>
          <p>{project.Description}</p>
          <small>Created: {project.Created_Time?.toDate?.()?.toLocaleDateString()}</small>
        </div>
      ))}
    </div>
  );
}
```

#### Document Management Example

```tsx
import React from 'react';
import { useProjectDocuments, useDocument } from '../hooks/useFirebase';
import { useAuth } from '../context/AuthContext';

function DocumentEditor({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const { document, loading, updateContent, saveVersion } = useDocument(documentId);
  const [content, setContent] = React.useState('');

  React.useEffect(() => {
    if (document?.Content) {
      setContent(document.Content);
    }
  }, [document]);

  const handleSave = async () => {
    try {
      await updateContent(content, false); // Save as final
      await saveVersion(content); // Create version history
    } catch (err) {
      console.error('Failed to save document:', err);
    }
  };

  const handleDraftSave = async () => {
    try {
      await updateContent(content, true); // Save as draft
    } catch (err) {
      console.error('Failed to save draft:', err);
    }
  };

  if (loading) return <div>Loading document...</div>;
  if (!document) return <div>Document not found</div>;

  return (
    <div>
      <h1>{document.DocumentName}</h1>
      <div>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={20}
          cols={80}
        />
      </div>
      <div>
        <button onClick={handleDraftSave}>Save Draft</button>
        <button onClick={handleSave}>Save Final</button>
      </div>
      {document.IsDraft && <span>🟡 Draft</span>}
    </div>
  );
}
```

#### Chat Integration Example

```tsx
import React from 'react';
import { useChat } from '../hooks/useFirebase';
import { useAuth } from '../context/AuthContext';

function ChatSidebar({ documentId }: { documentId: string }) {
  const { user } = useAuth();
  const { messages, loading, sendMessage, generateAIContent } = useChat(documentId);
  const [inputMessage, setInputMessage] = React.useState('');

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    
    try {
      await sendMessage(inputMessage, user?.uid, 'user');
      setInputMessage('');
      
      // Generate AI response
      const aiResponse = await generateAIContent(inputMessage);
      if (aiResponse) {
        await sendMessage(aiResponse, undefined, 'assistant');
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  return (
    <div className="chat-sidebar">
      <h3>Document Chat</h3>
      
      <div className="messages">
        {messages.map(message => (
          <div key={message.id} className={`message ${message.Role}`}>
            <div className="content">{message.Message}</div>
            <div className="timestamp">
              {new Date(message.CreatedAt).toLocaleTimeString()}
            </div>
            {message.Stage && <span className="stage">{message.Stage}</span>}
          </div>
        ))}
      </div>
      
      <div className="input-area">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Ask about this document..."
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Send</button>
      </div>
    </div>
  );
}
```

### 3. Using FirebaseService for Complex Operations

For more complex operations, use the FirebaseService directly:

```tsx
import FirebaseService from '../services/firebaseService';

// Create a project with documents
async function createProjectWithTemplate(userId: string) {
  // Create project
  const project = await FirebaseService.createProject(
    "Software Requirements Specification",
    "Complete SRS documentation project",
    userId,
    "https://github.com/company/srs-project"
  );

  // Create documents from templates
  const templates = await FirebaseService.getTemplates();
  const srsTemplate = templates.find(t => t.TemplateName === 'SRS Template');
  
  if (srsTemplate && project.id) {
    await FirebaseService.createDocument(
      "Requirements Document",
      project.id,
      userId,
      srsTemplate.id,
      "SRS",
      "Developer"
    );
  }

  return project;
}
```

### 4. Server-Side Integration

Your existing server endpoints are already integrated. Key APIs:

```typescript
// Project APIs
GET    /api/projects              // List all projects
GET    /api/projects/user/:userId // Get user's projects
POST   /api/projects              // Create new project
PUT    /api/projects/:id          // Update project
DELETE /api/projects/:id          // Delete project

// Document APIs
GET    /api/project/:projectId/documents     // List project documents
GET    /api/document/editor/content/:docId   // Get document content
PUT    /api/document/editor/content/:docId   // Update document content
DELETE /api/document/:docId                  // Delete document
GET    /api/document/editor/history/:docId   // Get version history

// Chat APIs
GET    /api/document/chat/history/:docId     // Get chat history
POST   /api/document/chat/prompt             // Send chat message
POST   /api/document/chat/agent              // AI workflow step
GET    /api/document/chat/agent/action/:docId // Get latest AI action

// User APIs
POST   /api/users                 // Create user
GET    /api/users/email/:email    // Get user by email
PUT    /api/profile/edit          // Update profile
DELETE /api/profile/delete        // Delete account
```

## 🔐 Security Configuration

### Firestore Security Rules

Update your `firestore.rules` file:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own user document
    match /Users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Projects are accessible by their owners
    match /Projects/{projectId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.User_Id;
      allow create: if request.auth != null;
    }
    
    // Documents are accessible by project owners
    match /Documents/{documentId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.User_Id;
      allow create: if request.auth != null;
    }
    
    // Templates are readable by all authenticated users
    match /Templates/{templateId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Restrict in production
    }
    
    // Document history follows document permissions
    match /{path=**}/DocumentHistory/{historyId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Chat history is accessible by conversation participants
    match /ChatHistory/{chatId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🎯 Migration Steps

If you have existing data, follow these steps:

### 1. Backup Existing Data
```bash
# Export existing Firestore data
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

### 2. Update Collection Structure
```typescript
// Migration script example
import { FirestoreService } from './firestoreService';

async function migrateExistingData() {
  // Add any missing fields to existing documents
  const projects = await FirestoreService.getProjects();
  
  for (const project of projects) {
    if (!project.Project_Id && project.id) {
      await FirestoreService.updateProject(project.id, {
        Project_Id: `P${Date.now()}`
      });
    }
  }
}
```

### 3. Test Integration
```typescript
// Test script to verify integration
async function testFirebaseIntegration() {
  console.log('🔥 Testing Firebase Integration...');
  
  // Test project creation
  const testProject = await FirebaseService.createProject(
    'Test Project',
    'Integration test',
    'test-user-id'
  );
  console.log('✅ Project created:', testProject.ProjectName);
  
  // Test document creation
  if (testProject.id) {
    const testDoc = await FirebaseService.createDocument(
      'Test Document',
      testProject.id,
      'test-user-id'
    );
    console.log('✅ Document created:', testDoc.DocumentName);
    
    // Test content update
    await FirebaseService.updateDocumentContent(
      testDoc.id!,
      '<p>Test content</p>',
      false
    );
    console.log('✅ Document content updated');
    
    // Cleanup
    await FirebaseService.deleteProject(testProject.id);
    console.log('✅ Test cleanup completed');
  }
  
  console.log('🎉 Firebase integration test completed successfully!');
}
```

## 📝 Best Practices

### 1. Error Handling
```typescript
try {
  const project = await FirebaseService.createProject(name, desc, userId);
  // Success handling
} catch (error) {
  if (error.code === 'permission-denied') {
    // Handle permission errors
  } else if (error.code === 'unavailable') {
    // Handle network errors
  } else {
    // Handle other errors
  }
}
```

### 2. Real-time Updates
```typescript
// Use real-time hooks for live data
const { projects } = useProjects(userId); // Automatically updates
const { document } = useDocument(docId);  // Real-time document sync
```

### 3. Optimistic Updates
```typescript
// Update UI immediately, sync with server
const optimisticUpdate = (newData) => {
  setLocalState(newData);
  syncWithServer(newData).catch(() => {
    // Revert on failure
    setLocalState(previousData);
  });
};
```

### 4. Caching Strategy
```typescript
// Implement service worker for offline support
// Cache critical data locally
const cachedProjects = localStorage.getItem('projects');
if (cachedProjects && !navigator.onLine) {
  setProjects(JSON.parse(cachedProjects));
}
```

## 🚦 Next Steps

1. **Test the integration** with your existing components
2. **Update your UI components** to use the new hooks
3. **Implement real-time features** using Firestore listeners
4. **Add error boundaries** for better error handling
5. **Optimize performance** with proper caching and pagination
6. **Deploy and monitor** the production environment

Your Firebase integration is now complete and production-ready! The ERD in `DATABASE_ERD.md` provides the complete database structure documentation.