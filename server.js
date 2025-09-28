// Load environment variables first, before any imports
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

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
// PROJECT MANAGEMENT ENDPOINTS
// ============================================================================

// In-memory storage for projects (replace with database later)
let projects = [];
let projectIdCounter = 1;

// Create a new project
app.post('/api/projects', async (req, res) => {
  try {
    console.log('🔥 POST /api/projects received:', req.body);
    const { name, description, githubLink, selectedRepo, installationId } = req.body;
    
    // Validate required fields
    if (!name || !description) {
      console.log('❌ Validation failed: missing name or description');
      return res.status(400).json({ error: 'Name and description are required' });
    }

    // Create the project object
    const project = {
      id: projectIdCounter++,
      name: name.trim(),
      description: description.trim(),
      githubLink: githubLink || null,
      selectedRepo: selectedRepo || null,
      installationId: installationId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      documents: [], // Will hold project documents
      status: 'active'
    };

    // Add to in-memory storage
    projects.push(project);

    console.log('✅ Project created:', project.name);
    
    res.status(201).json({
      success: true,
      project
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
app.get('/api/projects', (req, res) => {
  try {
    console.log('📋 GET /api/projects - returning', projects.length, 'projects');
    res.json({
      success: true,
      projects: projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
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
app.get('/api/projects/:id', (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
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

// ============================================================================
// BASIC API ENDPOINTS FOR FRONTEND CONNECTION
// ============================================================================

// Profile edit endpoint
app.put('/api/profile/edit', (req, res) => {
  try {
    console.log('📝 PUT /api/profile/edit - Connection established');
    console.log('Request body:', req.body);
    
    res.json({
      success: true,
      message: 'Profile edit endpoint connected successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Profile edit error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile edit endpoint error',
      details: error.message
    });
  }
});

// Profile delete endpoint
app.delete('/api/profile/delete', (req, res) => {
  try {
    console.log('🗑️ DELETE /api/profile/delete - Connection established');
    console.log('Request body:', req.body);
    
    res.json({
      success: true,
      message: 'Profile delete endpoint connected successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Profile delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile delete endpoint error',
      details: error.message
    });
  }
});

// Document add endpoint
app.post('/api/document/add', (req, res) => {
  try {
    console.log('📄 POST /api/document/add - Connection established');
    console.log('Request body:', req.body);
    
    res.json({
      success: true,
      message: 'Document add endpoint connected successfully',
      data: req.body
    });
  } catch (error) {
    console.error('Document add error:', error);
    res.status(500).json({
      success: false,
      error: 'Document add endpoint error',
      details: error.message
    });
  }
});

// ============================================================================
// AUTHENTICATION ENDPOINTS
// ============================================================================

// Sign up endpoint
app.post('/api/auth/signup', (req, res) => {
  try {
    console.log('🔐 POST /api/auth/signup - Connection established');
    console.log('Request body:', req.body);
    
    const { name, email, password, githubUsername } = req.body;
    
    // Basic validation logging
    if (!name || !email || !password) {
      console.log('❌ Sign up validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required',
        details: 'Missing required fields'
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Sign up validation failed: Invalid email format');
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }
    
    // TODO: In a real implementation, you would:
    // - Check if email already exists in database
    // - Hash the password
    // - Save user to database
    // - Generate JWT token
    // - Send welcome email
    
    console.log('✅ Sign up successful for:', email);
    
    res.status(201).json({
      success: true,
      message: 'Sign up endpoint connected successfully',
      user: {
        id: Math.floor(Math.random() * 1000) + 1, // Mock ID
        name: name,
        email: email.toLowerCase(),
        githubUsername: githubUsername || null,
        createdAt: new Date().toISOString()
      },
      token: 'mock-jwt-token-' + Date.now(), // Mock token
      data: req.body
    });
  } catch (error) {
    console.error('Sign up error:', error);
    res.status(500).json({
      success: false,
      error: 'Sign up endpoint error',
      details: error.message
    });
  }
});

// Sign in endpoint
app.post('/api/auth/signin', (req, res) => {
  try {
    console.log('🔑 POST /api/auth/signin - Connection established');
    console.log('Request body:', { ...req.body, password: '[HIDDEN]' });
    
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      console.log('❌ Sign in validation failed: Missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
        details: 'Missing credentials'
      });
    }
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('❌ Sign in validation failed: Invalid email format');
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
        details: 'Please provide a valid email address'
      });
    }
    
    // TODO: In a real implementation, you would:
    // - Query database for user by email
    // - Compare hashed password
    // - Generate JWT token
    // - Update last login timestamp
    // - Return user data and token
    
    // Mock authentication check
    if (email === 'test@example.com' && password === 'password') {
      console.log('✅ Sign in successful for:', email);
      
      res.json({
        success: true,
        message: 'Sign in successful',
        user: {
          id: 1,
          name: 'Test User',
          email: email.toLowerCase(),
          githubUsername: 'testuser',
          joinedDate: 'January 2024'
        },
        token: 'mock-jwt-token-' + Date.now(),
        data: { email }
      });
    } else {
      console.log('❌ Sign in failed: Invalid credentials for:', email);
      
      res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        details: 'Email or password is incorrect'
      });
    }
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({
      success: false,
      error: 'Sign in endpoint error',
      details: error.message
    });
  }
});

// Sign out endpoint
app.post('/api/auth/signout', (req, res) => {
  try {
    console.log('🚪 POST /api/auth/signout - Connection established');
    console.log('Request body:', req.body);
    
    // TODO: In a real implementation, you would:
    // - Invalidate JWT token
    // - Clear any refresh tokens
    // - Log the sign out activity
    
    console.log('✅ Sign out successful');
    
    res.json({
      success: true,
      message: 'Sign out successful',
      data: req.body
    });
  } catch (error) {
    console.error('Sign out error:', error);
    res.status(500).json({
      success: false,
      error: 'Sign out endpoint error',
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
});