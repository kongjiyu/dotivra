// Load environment variables first, before any imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

// Import regular Firebase
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  doc, 
  updateDoc, 
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// GitHub App configuration
const githubAuth = createAppAuth({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
});

// Initialize Firebase (regular Firebase instead of Admin)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const firestore = getFirestore(firebaseApp);

console.log('✅ Firebase initialized successfully');

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get GitHub App info and install URL
app.get('/api/github/install-url', async (req, res) => {
  try {
    const auth = await githubAuth({ type: 'app' });
    const octokit = new Octokit({ auth: auth.token });
    
    const { data: app } = await octokit.rest.apps.getAuthenticated();
    
    res.json({
      app_name: app.name,
      app_slug: app.slug,
      install_url: `https://github.com/apps/${app.slug}/installations/new`
    });
  } catch (error) {
    console.error('GitHub App error:', error);
    res.status(500).json({ 
      error: 'Failed to get GitHub App info',
      details: error.message 
    });
  }
});

// Get user installations
app.get('/api/github/installations', async (req, res) => {
  try {
    const auth = await githubAuth({ type: 'app' });
    const octokit = new Octokit({ auth: auth.token });
    
    const { data } = await octokit.rest.apps.listInstallations();
    
    const installations = data.map(installation => ({
      id: installation.id,
      account: {
        login: installation.account.login,
        type: installation.account.type,
        avatar_url: installation.account.avatar_url,
      },
      repository_selection: installation.repository_selection,
      created_at: installation.created_at,
      updated_at: installation.updated_at,
    }));

    res.json({ installations });
  } catch (error) {
    console.error('Error fetching installations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch installations',
      details: error.message 
    });
  }
});

// Get repositories for an installation
app.get('/api/github/repositories', async (req, res) => {
  try {
    const { installation_id } = req.query;
    
    if (!installation_id) {
      return res.status(400).json({ error: 'installation_id is required' });
    }

    const auth = await githubAuth({ type: 'installation', installationId: installation_id });
    const octokit = new Octokit({ auth: auth.token });
    
    const { data } = await octokit.rest.apps.listReposAccessibleToInstallation();
    
    const repositories = data.repositories.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      html_url: repo.html_url,
      language: repo.language,
      updated_at: repo.updated_at,
    }));

    res.json({ repositories });
  } catch (error) {
    console.error('Error fetching repositories:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repositories',
      details: error.message 
    });
  }
});

// Get repository contents
app.get('/api/github/repository/:owner/:repo/contents', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { path = '', installation_id } = req.query;
    
    if (!installation_id) {
      return res.status(400).json({ error: 'installation_id is required' });
    }

    const auth = await githubAuth({ type: 'installation', installationId: installation_id });
    const octokit = new Octokit({ auth: auth.token });
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path || '',
    });

    res.json(data);
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    res.status(500).json({ 
      error: 'Failed to fetch repository contents',
      details: error.message 
    });
  }
});

// Get file content
app.get('/api/github/repository/:owner/:repo/file', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { path, installation_id } = req.query;
    
    if (!path || !installation_id) {
      return res.status(400).json({ error: 'path and installation_id are required' });
    }

    const auth = await githubAuth({ type: 'installation', installationId: installation_id });
    const octokit = new Octokit({ auth: auth.token });
    
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (data.type === 'file' && data.content) {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      res.json({
        name: data.name,
        path: data.path,
        content,
        size: data.size,
        sha: data.sha,
      });
    } else {
      res.status(400).json({ error: 'Path does not point to a file' });
    }
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ 
      error: 'Failed to fetch file',
      details: error.message 
    });
  }
});

// ============================================================================
// PROJECT MANAGEMENT ENDPOINTS (Updated for regular Firebase)
// ============================================================================

// Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    console.log('🔥 POST /api/projects received:', req.body);
    const { name, description, githubLink, selectedRepo, installationId, userId } = req.body;
    
    // Validate required fields
    if (!name || !description || !userId) {
      console.log('❌ Validation failed: missing required fields');
      return res.status(400).json({ error: 'Name, description, and userId are required' });
    }

    // Generate Project ID matching FirestoreService format
    const projectId = generateProjectId();

    // Create the project object matching FirestoreService interface
    const project = {
      Project_Id: projectId,
      ProjectName: name.trim(),
      User_Id: userId,
      Description: description.trim(),
      GitHubRepo: githubLink || '',
      Created_Time: Timestamp.now() // Regular Firebase Timestamp
    };

    // Add to Firestore Projects collection
    const docRef = await addDoc(collection(firestore, 'Projects'), project);
    
    console.log('✅ Project created with ID:', projectId);
    
    res.status(201).json({
      success: true,
      project: {
        ...project,
        Created_Time: project.Created_Time.toDate().toISOString()
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({
      error: 'Failed to create project',
      details: error.message
    });
  }
});

// Get all projects
app.get('/api/projects', async (req, res) => {
  try {
    console.log('📋 GET /api/projects - fetching from Firestore');
    
    const q = query(collection(firestore, 'Projects'), orderBy('Created_Time', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const projects = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString()
    }));

    console.log('📋 Returning', projects.length, 'projects from Firestore');
    
    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({
      error: 'Failed to fetch projects',
      details: error.message
    });
  }
});

// Get a specific project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    console.log('📋 GET /api/projects/' + projectId);
    
    // Query by Project_Id field
    const q = query(
      collection(firestore, 'Projects'),
      where('Project_Id', '==', projectId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const projectDoc = querySnapshot.docs[0];
    const project = {
      ...projectDoc.data(),
      Created_Time: projectDoc.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString()
    };
    
    res.json({
      success: true,
      project
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({
      error: 'Failed to fetch project',
      details: error.message
    });
  }
});

// Get projects by user
app.get('/api/projects/user/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('📋 GET /api/projects/user/' + userId);
    
    const q = query(
      collection(firestore, 'Projects'),
      where('User_Id', '==', userId),
      orderBy('Created_Time', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const projects = querySnapshot.docs.map(doc => ({
      ...doc.data(),
      Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() || new Date().toISOString()
    }));
    
    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Error fetching user projects:', error);
    res.status(500).json({
      error: 'Failed to fetch user projects',
      details: error.message
    });
  }
});

// Update project
app.put('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    
    // Find document by Project_Id
    const q = query(
      collection(firestore, 'Projects'),
      where('Project_Id', '==', projectId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const docRef = querySnapshot.docs[0].ref;
    await updateDoc(docRef, {
      ...updates,
      Updated_Time: Timestamp.now()
    });
    
    res.json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({
      error: 'Failed to update project',
      details: error.message
    });
  }
});

// Delete project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const projectId = req.params.id;
    
    // Find document by Project_Id
    const q = query(
      collection(firestore, 'Projects'),
      where('Project_Id', '==', projectId)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const docRef = querySnapshot.docs[0].ref;
    await deleteDoc(docRef);
    
    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({
      error: 'Failed to delete project',
      details: error.message
    });
  }
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const { UserEmail, UserName, UserPw } = req.body;
    
    if (!UserEmail || !UserName || !UserPw) {
      return res.status(400).json({ error: 'UserEmail, UserName, and UserPw are required' });
    }

    // Check if user already exists
    const q = query(
      collection(firestore, 'Users'),
      where('UserEmail', '==', UserEmail)
    );
    const existingUser = await getDocs(q);
    
    if (!existingUser.empty) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const userId = generateUserId();
    const user = {
      User_Id: userId,
      UserEmail,
      UserName,
      UserPw // In production, hash this password!
    };

    await addDoc(collection(firestore, 'Users'), user);
    
    // Don't return password in response
    const { UserPw: _, ...userResponse } = user;
    
    res.status(201).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message
    });
  }
});

// Get user by email (for login)
app.get('/api/users/email/:email', async (req, res) => {
  try {
    const email = req.params.email;
    
    const q = query(
      collection(firestore, 'Users'),
      where('UserEmail', '==', email)
    );
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = querySnapshot.docs[0].data();
    // Don't return password
    const { UserPw: _, ...userResponse } = user;
    
    res.json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      details: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 GitHub Server running on port ${PORT}`);
  console.log(`📱 Frontend URL: ${process.env.FRONTEND_URL}`);
  console.log(`🔑 GitHub App ID: ${process.env.GITHUB_APP_ID}`);
  console.log(`🔥 Firebase Project: ${process.env.VITE_FIREBASE_PROJECT_ID}`);
});