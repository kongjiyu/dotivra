// server/app.js - Shared Express application for both local and Firebase Functions
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import crypto from 'crypto';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';

// Session storage for dashboard authentication
const dashboardSessions = new Map();

export function createApp(options = {}) {
  const { 
    db, // Firestore instance (Admin or Client SDK)
    isFirebaseFunction = false,
    geminiBalancer = null,
    logger = console
  } = options;

  const app = express();

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }));

  // CORS configuration
  app.use(cors({
    origin: isFirebaseFunction ? true : (process.env.FRONTEND_URL || 'http://localhost:5173'),
    credentials: true,
  }));

  app.use(express.json());

  // Helper functions
  function generateProjectId() {
    const now = new Date();
    const dateStr = now.getFullYear().toString().slice(-2) + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0');
    const sequence = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
    return "P" + dateStr + sequence;
  }

  function generateUserId() {
    return "USER_" + Math.random().toString(36).substring(2, 15);
  }

  // GitHub App configuration
  const getGitHubAuth = () => {
    return createAppAuth({
      appId: process.env.GITHUB_APP_ID,
      privateKey: (process.env.GITHUB_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    });
  };

  // Session helpers
  function cleanExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, session] of dashboardSessions.entries()) {
      if (now > session.expiresAt) {
        dashboardSessions.delete(sessionId);
      }
    }
  }

  function verifySession(sessionId) {
    if (!sessionId) return false;
    const session = dashboardSessions.get(sessionId);
    if (!session) return false;
    if (Date.now() > session.expiresAt) {
      dashboardSessions.delete(sessionId);
      return false;
    }
    return true;
  }

  // Utility function for hash
  function hashJSON(obj) {
    return "sha256:" + crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex");
  }

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // ============================================================================
  // GEMINI AI ENDPOINTS
  // ============================================================================

  // Authenticate with passkey
  app.post('/api/gemini/auth', (req, res) => {
    try {
      const { passkey } = req.body;
      const expectedPasskey = process.env.GEMINI_DASHBOARD_PASS;

      if (!expectedPasskey) {
        return res.status(500).json({ error: 'Dashboard passkey not configured' });
      }

      if (passkey !== expectedPasskey) {
        return res.status(401).json({ error: 'Invalid passkey' });
      }

      const sessionId = crypto.randomBytes(32).toString('hex');
      const now = Date.now();
      const expiresAt = now + 10 * 60 * 1000;

      dashboardSessions.set(sessionId, { createdAt: now, expiresAt });
      cleanExpiredSessions();

      logger.log('✅ Dashboard session created:', sessionId.slice(0, 12), '...');
      
      res.json({
        sessionId,
        expiresAt: new Date(expiresAt).toISOString(),
      });
    } catch (error) {
      logger.error('❌ Dashboard auth error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  // Generate via Gemini API (using balancer)
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      logger.log('🔵 Gemini API Request received');
      
      if (!geminiBalancer) {
        logger.error('❌ Balancer not configured!');
        return res.status(503).json({ error: 'Balancer not configured' });
      }
      
      const {
        prompt,
        contents,
        model = 'gemini-2.0-flash-exp',
        tools,
        systemInstruction,
        generationConfig,
        safetySettings,
        toolConfig,
      } = req.body || {};

      let effectiveContents = contents;
      if (!effectiveContents && typeof prompt === 'string') {
        effectiveContents = [{ role: 'user', parts: [{ text: String(prompt) }] }];
      }
      if (!effectiveContents) {
        return res.status(400).json({ error: 'Missing prompt or contents' });
      }

      const result = await geminiBalancer.generate({
        model,
        contents: effectiveContents,
        tools,
        systemInstruction,
        generationConfig,
        safetySettings,
        toolConfig,
      });

      logger.log('✅ Gemini generation successful');
      res.json({
        ok: true,
        text: result.text,
        usage: result.usage,
        key: { idShort: result.keyIdShort },
        model,
      });
    } catch (error) {
      logger.error('❌ Gemini generate error:', error);
      const status = error?.status || 500;
      res.status(status).json({ 
        ok: false, 
        error: error?.message || 'Failed to generate' 
      });
    }
  });

  // Dashboard endpoint
  app.get('/api/gemini/dashboard', async (req, res) => {
    try {
      const sessionId = req.headers['x-session-id'];
      if (!verifySession(sessionId)) {
        return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
      }

      if (!geminiBalancer) {
        return res.status(503).json({ error: 'Balancer not configured' });
      }

      const usage = await geminiBalancer.getUsageFromFirebase();
      res.json(usage);
    } catch (error) {
      logger.error('❌ Gemini dashboard error:', error);
      res.status(500).json({ error: 'Failed to get dashboard' });
    }
  });

  // Verify session endpoint
  app.post('/api/gemini/verify-session', (req, res) => {
    try {
      const { sessionId } = req.body;
      const isValid = verifySession(sessionId);
      
      if (isValid) {
        const session = dashboardSessions.get(sessionId);
        res.json({
          valid: true,
          expiresAt: new Date(session.expiresAt).toISOString(),
        });
      } else {
        res.json({ valid: false });
      }
    } catch (error) {
      logger.error('❌ Session verification error:', error);
      res.status(500).json({ error: 'Verification failed' });
    }
  });

  // Logout endpoint
  app.post('/api/gemini/logout', (req, res) => {
    try {
      const { sessionId } = req.body;
      if (sessionId) {
        dashboardSessions.delete(sessionId);
        logger.log('🔓 Dashboard session ended');
      }
      res.json({ success: true });
    } catch (error) {
      logger.error('❌ Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // ============================================================================
  // GITHUB OAUTH ENDPOINTS
  // ============================================================================

  app.post('/api/github/oauth/token', async (req, res) => {
    try {
      const { code, client_id, redirect_uri } = req.body;
      
      if (!code || !client_id) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }

      const client_secret = process.env.GITHUB_CLIENT_SECRET;
      if (!client_secret) {
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Dotivra-App'
        },
        body: JSON.stringify({
          client_id,
          client_secret,
          code,
          redirect_uri
        })
      });

      if (!tokenResponse.ok) {
        throw new Error(`GitHub API error: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        return res.status(400).json({ 
          error: tokenData.error, 
          error_description: tokenData.error_description 
        });
      }

      res.json(tokenData);
    } catch (error) {
      logger.error('GitHub OAuth error:', error);
      res.status(500).json({ 
        error: 'Internal server error', 
        message: error.message 
      });
    }
  });

  app.get('/api/github/user/repos', async (req, res) => {
    try {
      const authorization = req.headers.authorization;
      if (!authorization) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100', {
        headers: {
          'Authorization': authorization,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Dotivra-App'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const repos = await response.json();
      res.json(repos);
    } catch (error) {
      logger.error('GitHub repos fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch repositories', 
        message: error.message 
      });
    }
  });

  app.get('/api/github/repos/:owner/:repo/contents/*', async (req, res) => {
    try {
      const { owner, repo } = req.params;
      const path = req.params[0] || '';
      const authorization = req.headers.authorization;
      
      if (!authorization) {
        return res.status(401).json({ error: 'Authorization header required' });
      }

      const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const response = await fetch(url, {
        headers: {
          'Authorization': authorization,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Dotivra-App'
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const contents = await response.json();
      res.json(contents);
    } catch (error) {
      logger.error('GitHub contents fetch error:', error);
      res.status(500).json({ 
        error: 'Failed to fetch repository contents', 
        message: error.message 
      });
    }
  });

  // More GitHub endpoints would go here...
  // (I'll add a comment to indicate where to add the rest)

  // ============================================================================
  // PROJECT, USER, DOCUMENT ENDPOINTS
  // (To be continued - these would follow the same pattern)
  // ============================================================================

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
