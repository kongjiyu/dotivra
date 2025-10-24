import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import {createAppAuth} from "@octokit/auth-app";
import {Octokit} from "@octokit/rest";
import crypto from "crypto";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

setGlobalOptions({maxInstances: 10});

// Gemini balancer initialization with Firebase Admin
// Session storage for dashboard authentication
const dashboardSessions = new Map(); // sessionId -> { createdAt, expiresAt }

// Import Gemini SDK
import {GoogleGenAI} from "@google/genai";

// Helper: Clean expired sessions
function cleanExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of dashboardSessions.entries()) {
    if (now > (session as any).expiresAt) {
      dashboardSessions.delete(sessionId);
    }
  }
}

// Helper: Verify session
function verifySession(sessionId: string | undefined) {
  if (!sessionId) return false;
  const session = dashboardSessions.get(sessionId);
  if (!session) return false;
  if (Date.now() > (session as any).expiresAt) {
    dashboardSessions.delete(sessionId);
    return false;
  }
  return true;
}

// Gemini Balancer for Firebase Functions (Admin SDK compatible)
interface KeyState {
  key: string;
  id: string;
  cooldownUntil: number;
  minuteWindowStart: number;
  dayWindowStart: number;
  rpmUsed: number;
  rpdUsed: number;
  tpmUsed: number;
  lastUsedAt: number;
  totalRequests: number;
  totalTokens: number;
}

class GeminiBalancer {
  private limits: { RPM: number; RPD: number; TPM: number };
  private db: FirebaseFirestore.Firestore;
  private state: { keys: KeyState[]; rrIndex: number; lastPersistAt: number };
  private loadPromise: Promise<void>;
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor(apiKeys: string[], firestore: FirebaseFirestore.Firestore) {
    if (!apiKeys || !apiKeys.length) throw new Error("No GEMINI API keys configured");
    
    this.limits = {
      RPM: Number(process.env.GEMINI_LIMIT_RPM || 5),
      RPD: Number(process.env.GEMINI_LIMIT_RPD || 100),
      TPM: Number(process.env.GEMINI_LIMIT_TPM || 125000),
    };
    
    this.db = firestore;
    this.state = {
      keys: apiKeys.map((key) => ({
        key,
        id: crypto.createHash("sha256").update(String(key)).digest("hex"),
        cooldownUntil: 0,
        minuteWindowStart: 0,
        dayWindowStart: 0,
        rpmUsed: 0,
        rpdUsed: 0,
        tpmUsed: 0,
        lastUsedAt: 0,
        totalRequests: 0,
        totalTokens: 0,
      })),
      rrIndex: 0,
      lastPersistAt: 0,
    };
    
    this.loadPromise = this.load();
  }

  private async load() {
    try {
      logger.info("📦 Loading Gemini usage data from Firebase...");
      
      for (const keyState of this.state.keys) {
        const docRef = this.db.collection("gemini-metrics").doc(keyState.id);
        const doc = await docRef.get();
        
        if (doc.exists) {
          const data = doc.data();
          if (data) {
            Object.assign(keyState, {
              cooldownUntil: data.cooldownTime?.toMillis?.() || 0,
              minuteWindowStart: data.lastUsed?.toMillis?.() || 0,
              dayWindowStart: data.lastUsed?.toMillis?.() || 0,
              rpmUsed: data.RPM || 0,
              rpdUsed: data.RPD || 0,
              tpmUsed: data.TPM || 0,
              lastUsedAt: data.lastUsed?.toMillis?.() || 0,
              totalRequests: data.totalRequest || 0,
              totalTokens: data.totalTokens || 0,
            });
            logger.info(`  ✅ Loaded key ${keyState.id.substring(0, 12)}: ${keyState.totalRequests} requests`);
          }
        } else {
          await this.initializeKey(keyState);
          logger.info(`  🆕 Initialized new key ${keyState.id.substring(0, 12)} in Firebase`);
        }
      }
      
      logger.info("✅ Gemini usage data loaded from Firebase");
    } catch (error) {
      logger.error("❌ Error loading Gemini data from Firebase:", error);
    }
  }

  private async initializeKey(keyState: KeyState) {
    try {
      const docRef = this.db.collection("gemini-metrics").doc(keyState.id);
      await docRef.set({
        RPD: 0,
        RPM: 0,
        TPM: 0,
        cooldownTime: admin.firestore.Timestamp.fromMillis(0),
        lastUsed: admin.firestore.Timestamp.now(),
        totalRequest: 0,
        totalTokens: 0,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      });
    } catch (error) {
      logger.error(`❌ Error initializing key ${keyState.id.substring(0, 12)} in Firebase:`, error);
    }
  }

  private async save() {
    try {
      logger.info("💾 Saving to Firebase...");
      this.state.lastPersistAt = Date.now();
      
      const batch = this.db.batch();
      
      for (const k of this.state.keys) {
        const docRef = this.db.collection("gemini-metrics").doc(k.id);
        batch.set(docRef, {
          RPD: k.rpdUsed,
          RPM: k.rpmUsed,
          TPM: k.tpmUsed,
          cooldownTime: admin.firestore.Timestamp.fromMillis(k.cooldownUntil),
          lastUsed: admin.firestore.Timestamp.fromMillis(k.lastUsedAt || Date.now()),
          totalRequest: k.totalRequests,
          totalTokens: k.totalTokens,
          updatedAt: admin.firestore.Timestamp.now(),
        }, { merge: true });
      }
      
      await batch.commit();
      logger.info("✅ All keys saved to Firebase");
    } catch (error) {
      logger.error("❌ GeminiBalancer persist error:", error);
    }
  }

  private debouncedSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.save(), 500);
  }

  private resetWindowsIfNeeded(k: KeyState) {
    const now = Date.now();
    const minuteStart = Math.floor(now / 60000) * 60000;
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayStartMs = dayStart.getTime();
    
    if (k.minuteWindowStart !== minuteStart) {
      k.minuteWindowStart = minuteStart;
      k.rpmUsed = 0;
      k.tpmUsed = 0;
    }
    if (k.dayWindowStart !== dayStartMs) {
      k.dayWindowStart = dayStartMs;
      k.rpdUsed = 0;
    }
  }

  private keyStatus(k: KeyState): string {
    this.resetWindowsIfNeeded(k);
    const now = Date.now();
    if (k.cooldownUntil && now < k.cooldownUntil) return "cooldown";
    if (k.rpmUsed >= this.limits.RPM) return "rpm-exhausted";
    if (k.rpdUsed >= this.limits.RPD) return "rpd-exhausted";
    if (k.tpmUsed >= this.limits.TPM) return "tpm-exhausted";
    return "ok";
  }

  private pickKey(estimatedTokens: number): { key: KeyState } | null {
    const n = this.state.keys.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.state.rrIndex + i) % n;
      const k = this.state.keys[idx];
      this.resetWindowsIfNeeded(k);
      const status = this.keyStatus(k);
      if (status !== "ok") continue;
      if (k.rpmUsed + 1 > this.limits.RPM) continue;
      if (k.rpdUsed + 1 > this.limits.RPD) continue;
      if (k.tpmUsed + estimatedTokens > this.limits.TPM) continue;
      this.state.rrIndex = (idx + 1) % n;
      return { key: k };
    }
    return null;
  }

  private markUsage(k: KeyState, usedTokens: number) {
    logger.info(`📊 Marking usage for key ${k.id.substring(0, 12)}: ${usedTokens} tokens`);
    this.resetWindowsIfNeeded(k);
    k.rpmUsed += 1;
    k.rpdUsed += 1;
    k.tpmUsed += usedTokens;
    k.totalRequests += 1;
    k.totalTokens += usedTokens;
    k.lastUsedAt = Date.now();
    logger.info(`  📊 New totals: RPM=${k.rpmUsed}, RPD=${k.rpdUsed}, TPM=${k.tpmUsed}`);
    this.debouncedSave();
  }

  private estimateTokens(contents: any[]): number {
    try {
      const text = (contents || [])
        .map((c) => (typeof c === "string" ? c : JSON.stringify(c)))
        .join(" ");
      return Math.ceil((text || "").length / 4);
    } catch {
      return 100;
    }
  }

  async generate(options: {
    model: string;
    contents: any[];
    tools?: any;
    systemInstruction?: any;
    generationConfig?: any;
    safetySettings?: any;
    toolConfig?: any;
  }): Promise<any> {
    await this.loadPromise;
    
    const estimatedTokens = this.estimateTokens(options.contents);
    const maxAttempts = this.state.keys.length;
    let lastError: any;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const picked = this.pickKey(estimatedTokens);
      if (!picked) {
        const err: any = new Error("All API keys are rate-limited or exhausted.");
        err.status = 429;
        throw err;
      }
      
      const keyState = picked.key;
      try {
        const client = new GoogleGenAI({apiKey: keyState.key});
        
        // New API: use client.models.generateContent()
        const resp = await client.models.generateContent({
          model: options.model,
          contents: options.contents,
          config: options.generationConfig,
          safetySettings: options.safetySettings,
          tools: options.tools,
          systemInstruction: options.systemInstruction,
        });
        
        const metadata: any = resp?.usageMetadata || {};
        const usedTokens = Number(metadata.totalTokenCount || 0) || estimatedTokens;
        
        this.markUsage(keyState, usedTokens);
        
        // Extract text from response
        const text = resp?.candidates?.[0]?.content?.parts?.[0]?.text || null;
        
        return {
          text,
          usage: metadata,
          keyId: keyState.id,
          keyIdShort: keyState.id.slice(0, 12),
        };
      } catch (e: any) {
        lastError = e;
        const msg = (e && (e.message || String(e))) || "";
        const isRateLimit = e?.status === 429 || e?.status === 403 || /rate/i.test(msg);
        
        if (isRateLimit) {
          const now = Date.now();
          const minuteEnd = Math.floor(now / 60000) * 60000 + 60000;
          keyState.cooldownUntil = minuteEnd;
          this.debouncedSave();
        }
        
        await new Promise((r) => setTimeout(r, 100));
        continue;
      }
    }
    
    const err: any = new Error(lastError?.message || "Gemini request failed for all keys");
    err.status = lastError?.status || 500;
    throw err;
  }

  async getUsageFromFirebase() {
    try {
      logger.info("📖 Reading from Firebase collection: gemini-metrics");
      const snapshot = await this.db.collection("gemini-metrics").get();
      
      logger.info(`📖 Found ${snapshot.size} documents in Firebase`);
      
      const keys: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        
        const rpmUsed = data.RPM || 0;
        const rpdUsed = data.RPD || 0;
        const tpmUsed = data.TPM || 0;
        
        let status = "available";
        if (rpmUsed >= this.limits.RPM) {
          status = "rpm-limit-reached";
        } else if (rpdUsed >= this.limits.RPD) {
          status = "rpd-limit-reached";
        } else if (tpmUsed >= this.limits.TPM) {
          status = "tpm-limit-reached";
        }
        
        keys.push({
          id: doc.id,
          idShort: doc.id.slice(0, 12),
          RPD: rpdUsed,
          RPM: rpmUsed,
          TPM: tpmUsed,
          status: status,
          totalRequest: data.totalRequest || 0,
          totalTokens: data.totalTokens || 0,
          updatedAt: data.updatedAt || null,
        });
      });

      logger.info(`✅ Retrieved ${keys.length} keys from Firebase`);
      
      return {
        keys,
        limits: this.limits,
        lastSyncedAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("❌ Error reading from Firebase:", error);
      throw error;
    }
  }

  getConfig() {
    return { limits: this.limits, keyCount: this.state.keys.length };
  }
}

// Initialize Gemini balancer
let geminiBalancer: GeminiBalancer | null = null;

function initializeGeminiBalancer() {
  try {
    const raw = (process.env.GEMINI_API_KEYS || "").trim();
    let keys: string[] = [];
    
    if (raw) {
      if (raw.startsWith("[")) {
        try {
          const arr = JSON.parse(raw);
          keys = Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
        } catch {
          keys = raw.replace(/[\[\]\s"\']/g, "").split(",").map((s) => s.trim()).filter(Boolean);
        }
      } else {
        const cleaned = raw.replace(/[\[\]\s"\']/g, "");
        keys = cleaned.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    
    // Fallback to single key if array parsing fails
    if (keys.length === 0 && process.env.VITE_GEMINI_API_KEY) {
      keys = [process.env.VITE_GEMINI_API_KEY];
    }
    
    if (keys.length === 0) {
      logger.warn("⚠️ No Gemini API keys configured");
      return null;
    }
    
    geminiBalancer = new GeminiBalancer(keys, db);
    logger.info(`✅ Gemini balancer initialized with ${keys.length} keys`);
    return geminiBalancer;
  } catch (e) {
    logger.warn("⚠️ Gemini balancer not initialized:", e);
    return null;
  }
}

// Initialize on startup
geminiBalancer = initializeGeminiBalancer();

// Create Express app
const app = express();

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

// CORS configuration - Allow all origins for Firebase Functions
app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json());

// Helper functions
function generateProjectId(): string {
  return "PROJ_" + Math.random().toString(36).substring(2, 15);
}

function generateUserId(): string {
  return "USER_" + Math.random().toString(36).substring(2, 15);
}

// GitHub App configuration
const getGitHubAuth = () => {
  return createAppAuth({
    appId: process.env.GITHUB_APP_ID || "",
    privateKey: (process.env.GITHUB_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  });
};

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({status: "ok", timestamp: new Date().toISOString()});
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

    // Create session with 10 minute expiration
    const sessionId = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + 10 * 60 * 1000; // 10 minutes

    dashboardSessions.set(sessionId, {
      createdAt: now,
      expiresAt: expiresAt,
    });

    // Clean expired sessions
    cleanExpiredSessions();

    logger.info('Dashboard session created:', sessionId.slice(0, 12), '...');
    
    res.json({
      sessionId,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    logger.error('Dashboard auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Generate via Gemini API (using balancer)
app.post('/api/gemini/generate', async (req, res) => {
  try {
    logger.info('🔵 Gemini API Request received');
    logger.info('  Request body keys:', Object.keys(req.body || {}));
    
    if (!geminiBalancer) {
      logger.error('❌ Balancer not configured!');
      return res.status(503).json({ error: 'Balancer not configured' });
    }
    
    const {
      prompt,
      contents,
      model = 'gemini-2.5-pro',
      tools,
      systemInstruction,
      generationConfig,
      safetySettings,
      toolConfig,
    } = req.body || {};

    let effectiveContents = contents;
    if (!effectiveContents && typeof prompt === 'string') {
      effectiveContents = [{ role: 'user', parts: [{ text: String(prompt) }] }];
      logger.info('  Converting prompt to contents format');
    }
    if (!effectiveContents) {
      logger.error('❌ Missing prompt or contents');
      return res.status(400).json({ error: 'Missing prompt or contents' });
    }

    logger.info('  Calling geminiBalancer.generate with model:', model);
    const result = await geminiBalancer.generate({
      model,
      contents: effectiveContents,
      tools,
      systemInstruction,
      generationConfig,
      safetySettings,
      toolConfig,
    });

    logger.info('✅ Gemini generation successful, response length:', result.text?.length || 0);
    res.json({
      ok: true,
      text: result.text,
      usage: result.usage,
      key: { idShort: result.keyIdShort },
      model,
    });
  } catch (error) {
    logger.error('❌ Gemini generate error:', error);
    logger.error('   Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    const status = (error as any)?.status || 500;
    res.status(status).json({ 
      ok: false, 
      error: error instanceof Error ? error.message : 'Failed to generate' 
    });
  }
});

// Dashboard endpoint (requires authentication)
app.get('/api/gemini/dashboard', async (req, res) => {
  try {
    // Check session
    const sessionId = req.headers['x-session-id'] as string;
    if (!verifySession(sessionId)) {
      return res.status(401).json({ error: 'Unauthorized. Please authenticate.' });
    }

    if (!geminiBalancer) {
      return res.status(503).json({ error: 'Balancer not configured' });
    }

    // Read directly from Firebase
    logger.info('📊 Dashboard requested, reading from Firebase...');
    const usage = await geminiBalancer.getUsageFromFirebase();
    logger.info('📊 Dashboard data retrieved:', JSON.stringify(usage, null, 2));
    res.json(usage);
  } catch (error) {
    logger.error('Gemini dashboard error:', error);
    res.status(500).json({ error: 'Failed to get dashboard' });
  }
});

// Verify session endpoint
app.post('/api/gemini/verify-session', (req, res) => {
  try {
    const { sessionId } = req.body;
    const isValid = verifySession(sessionId);
    
    if (isValid) {
      const session = dashboardSessions.get(sessionId) as any;
      res.json({
        valid: true,
        expiresAt: new Date(session.expiresAt).toISOString(),
      });
    } else {
      res.json({ valid: false });
    }
  } catch (error) {
    logger.error('Session verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Logout endpoint
app.post('/api/gemini/logout', (req, res) => {
  try {
    const { sessionId } = req.body;
    if (sessionId) {
      dashboardSessions.delete(sessionId);
      logger.info('Dashboard session ended:', sessionId.slice(0, 12), '...');
    }
    res.json({ success: true });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// ============================================================================
// GITHUB OAUTH ENDPOINTS
// ============================================================================

// GitHub OAuth token exchange endpoint
app.post('/api/github/oauth/token', async (req, res) => {
  try {
    const { code, client_id, client_secret, redirect_uri } = req.body;
    
    if (!code || !client_id || !client_secret) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Exchange code for access token with GitHub
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

    // Return the token data
    res.json(tokenData);
  } catch (error) {
    logger.error('GitHub OAuth error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GitHub API proxy endpoint for authenticated requests
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
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GitHub repository contents endpoint
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
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get GitHub App info and install URL
app.get("/api/github/install-url", async (req, res) => {
  try {
    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({type: "app"});
    const octokit = new Octokit({auth: auth.token});

    const {data: appData} = await octokit.rest.apps.getAuthenticated();

    res.json({
      app_name: appData.name,
      app_slug: appData.slug,
      install_url: `https://github.com/apps/${appData.slug}/installations/new`,
    });
  } catch (error) {
    logger.error("GitHub App error:", error);
    res.status(500).json({
      error: "Failed to get GitHub App info",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get user installations
app.get("/api/github/installations", async (req, res) => {
  try {
    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({type: "app"});
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.apps.listInstallations();

    const installations = data.map((installation) => ({
      id: installation.id,
      account: {
        login: installation.account?.login,
        type: installation.account?.type,
        avatar_url: installation.account?.avatar_url,
      },
      repository_selection: installation.repository_selection,
      created_at: installation.created_at,
      updated_at: installation.updated_at,
    }));

    res.json({installations});
  } catch (error) {
    logger.error("Error fetching installations:", error);
    res.status(500).json({
      error: "Failed to fetch installations",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get repositories for an installation
app.get("/api/github/repositories", async (req, res) => {
  try {
    const {installation_id} = req.query;

    if (!installation_id) {
      return res.status(400).json({error: "installation_id is required"});
    }

    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({
      type: "installation",
      installationId: installation_id as string,
    });
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.apps.listReposAccessibleToInstallation();

    const repositories = data.repositories?.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      private: repo.private,
      html_url: repo.html_url,
      language: repo.language,
      updated_at: repo.updated_at,
    })) || [];

    res.json({repositories});
  } catch (error) {
    logger.error("Error fetching repositories:", error);
    res.status(500).json({
      error: "Failed to fetch repositories",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get repository contents
app.get("/api/github/repository/:owner/:repo/contents", async (req, res) => {
  try {
    const {owner, repo} = req.params;
    const {path = "", installation_id} = req.query;

    if (!installation_id) {
      return res.status(400).json({error: "installation_id is required"});
    }

    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({
      type: "installation",
      installationId: installation_id as string,
    });
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path as string || "",
    });

    res.json(data);
  } catch (error) {
    logger.error("Error fetching repository contents:", error);
    res.status(500).json({
      error: "Failed to fetch repository contents",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get file content
app.get("/api/github/repository/:owner/:repo/file", async (req, res) => {
  try {
    const {owner, repo} = req.params;
    const {path, installation_id} = req.query;

    if (!path || !installation_id) {
      return res.status(400).json({
        error: "path and installation_id are required",
      });
    }

    const githubAuth = getGitHubAuth();
    const auth = await githubAuth({
      type: "installation",
      installationId: installation_id as string,
    });
    const octokit = new Octokit({auth: auth.token});

    const {data} = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: path as string,
    });

    if (Array.isArray(data)) {
      return res.status(400).json({error: "Path points to a directory"});
    }

    if (data.type === "file" && "content" in data && data.content) {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      res.json({
        name: data.name,
        path: data.path,
        content,
        size: data.size,
        sha: data.sha,
      });
    } else {
      res.status(400).json({error: "Path does not point to a file"});
    }
  } catch (error) {
    logger.error("Error fetching file:", error);
    res.status(500).json({
      error: "Failed to fetch file",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// PROJECT MANAGEMENT ENDPOINTS (Firebase Admin)
// ============================================================================

// Create a new project
app.post("/api/projects", async (req, res) => {
  try {
    logger.info("POST /api/projects received:", req.body);
    const {name, description, githubLink, selectedRepo, installationId, userId} = req.body;

    // Validate required fields
    if (!name || !description || !userId) {
      logger.warn("Validation failed: missing required fields");
      return res.status(400).json({
        error: "Name, description, and userId are required",
      });
    }

    // Generate Project ID matching FirestoreService format
    const projectId = generateProjectId();

    // Create the project object matching FirestoreService interface
    const project = {
      Project_Id: projectId,
      ProjectName: name.trim(),
      User_Id: userId,
      Description: description.trim(),
      GitHubRepo: githubLink || "",
      Created_Time: admin.firestore.Timestamp.now(),
    };

    // Add to Firestore Projects collection
    const docRef = await db.collection("Projects").add(project);

    logger.info("Project created with ID:", projectId);

    res.status(201).json({
      success: true,
      project: {
        ...project,
        Created_Time: project.Created_Time.toDate().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error creating project:", error);
    res.status(500).json({
      error: "Failed to create project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get all projects
app.get("/api/projects", async (req, res) => {
  try {
    logger.info("GET /api/projects - fetching from Firestore");

    const querySnapshot = await db.collection("Projects")
      .orderBy("Created_Time", "desc")
      .get();

    const projects = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    }));

    logger.info(`Returning ${projects.length} projects from Firestore`);

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    logger.error("Error fetching projects:", error);
    res.status(500).json({
      error: "Failed to fetch projects",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get a specific project
app.get("/api/projects/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    const requestingUserId = req.query.userId as string; // Get userId from query params
    logger.info("GET /api/projects/" + projectId, { requestingUserId });

    // Query by Project_Id field
    const querySnapshot = await db.collection("Projects")
      .where("Project_Id", "==", projectId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "Project not found"});
    }

    const projectDoc = querySnapshot.docs[0];
    const projectData = projectDoc.data();
    
    // Check if requesting user owns this project
    if (requestingUserId && projectData.User_Id !== requestingUserId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to access this project"
      });
    }

    const project = {
      ...projectData,
      Created_Time: projectData.Created_Time?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    };

    res.json({
      success: true,
      project,
    });
  } catch (error) {
    logger.error("Error fetching project:", error);
    res.status(500).json({
      error: "Failed to fetch project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get projects by user
app.get("/api/projects/user/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;
    logger.info("GET /api/projects/user/" + userId);

    const querySnapshot = await db.collection("Projects")
      .where("User_Id", "==", userId)
      .orderBy("Created_Time", "desc")
      .get();

    const projects = querySnapshot.docs.map((doc) => ({
      ...doc.data(),
      Created_Time: doc.data().Created_Time?.toDate?.()?.toISOString() ||
        new Date().toISOString(),
    }));

    res.json({
      success: true,
      projects,
    });
  } catch (error) {
    logger.error("Error fetching user projects:", error);
    res.status(500).json({
      error: "Failed to fetch user projects",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update project
app.put("/api/projects/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    const updates = req.body;
    const requestingUserId = req.query.userId as string; // Get userId from query params

    // Find document by Project_Id
    const querySnapshot = await db.collection("Projects")
      .where("Project_Id", "==", projectId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "Project not found"});
    }

    const docRef = querySnapshot.docs[0].ref;
    const projectData = querySnapshot.docs[0].data();
    
    // Check if requesting user owns this project
    if (requestingUserId && projectData.User_Id !== requestingUserId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to update this project"
      });
    }

    await docRef.update({
      ...updates,
      Updated_Time: admin.firestore.Timestamp.now(),
    });

    res.json({
      success: true,
      message: "Project updated successfully",
    });
  } catch (error) {
    logger.error("Error updating project:", error);
    res.status(500).json({
      error: "Failed to update project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete project
app.delete("/api/projects/:id", async (req, res) => {
  try {
    const projectId = req.params.id;
    const requestingUserId = req.query.userId as string; // Get userId from query params

    // Find document by Project_Id
    const querySnapshot = await db.collection("Projects")
      .where("Project_Id", "==", projectId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "Project not found"});
    }

    const docRef = querySnapshot.docs[0].ref;
    const projectData = querySnapshot.docs[0].data();
    
    // Check if requesting user owns this project
    if (requestingUserId && projectData.User_Id !== requestingUserId) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to delete this project"
      });
    }

    await docRef.delete();

    res.json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (error) {
    logger.error("Error deleting project:", error);
    res.status(500).json({
      error: "Failed to delete project",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// USER MANAGEMENT ENDPOINTS
// ============================================================================

// Create user
app.post("/api/users", async (req, res) => {
  try {
    const {UserEmail, UserName, UserPw} = req.body;

    if (!UserEmail || !UserName || !UserPw) {
      return res.status(400).json({
        error: "UserEmail, UserName, and UserPw are required",
      });
    }

    // Check if user already exists
    const existingUser = await db.collection("Users")
      .where("UserEmail", "==", UserEmail)
      .get();

    if (!existingUser.empty) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    const userId = generateUserId();
    const user = {
      User_Id: userId,
      UserEmail,
      UserName,
      UserPw, // In production, hash this password!
    };

    await db.collection("Users").add(user);

    // Don't return password in response
    const {UserPw: _, ...userResponse} = user;

    res.status(201).json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    logger.error("Error creating user:", error);
    res.status(500).json({
      error: "Failed to create user",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get user by email (for login)
app.get("/api/users/email/:email", async (req, res) => {
  try {
    const email = req.params.email;

    const querySnapshot = await db.collection("Users")
      .where("UserEmail", "==", email)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({error: "User not found"});
    }

    const user = querySnapshot.docs[0].data();
    // Don't return password
    const {UserPw: _, ...userResponse} = user;

    res.json({
      success: true,
      user: userResponse,
    });
  } catch (error) {
    logger.error("Error fetching user:", error);
    res.status(500).json({
      error: "Failed to fetch user",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ============================================================================
// DOCUMENT MANAGEMENT ENDPOINTS
// ============================================================================

// Get document by ID
app.get('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    
    const docRef = db.collection('Documents').doc(documentId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      CreatedAt: data?.CreatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      UpdatedAt: data?.UpdatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Update document
app.put('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { content, title } = req.body;
    
    const docRef = db.collection('Documents').doc(documentId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const updateData: any = {
      UpdatedAt: admin.firestore.Timestamp.now()
    };
    
    if (content !== undefined) updateData.Content = content;
    if (title !== undefined) updateData.Title = title;
    
    await docRef.update(updateData);
    
    const updatedDoc = await docRef.get();
    const data = updatedDoc.data();
    
    res.json({
      id: updatedDoc.id,
      ...data,
      CreatedAt: data?.CreatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      UpdatedAt: data?.UpdatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
app.delete('/api/documents/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    logger.info('🗑️ DELETE /api/documents/' + documentId);
    
    const docRef = db.collection('Documents').doc(documentId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    await docRef.delete();
    
    logger.info('✅ Document deleted successfully:', documentId);
    
    res.json({
      success: true,
      message: 'Document deleted successfully',
      documentId
    });
  } catch (error) {
    logger.error('❌ Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get documents by project ID
app.get('/api/documents/project/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const querySnapshot = await db.collection('Documents')
      .where('ProjectId', '==', projectId)
      .get();
    
    const documents = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        CreatedAt: data?.CreatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        UpdatedAt: data?.UpdatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      };
    }).sort((a, b) => new Date(b.CreatedAt).getTime() - new Date(a.CreatedAt).getTime());
    
    res.json(documents);
  } catch (error) {
    logger.error('Error fetching project documents:', error);
    res.status(500).json({ error: 'Failed to fetch project documents' });
  }
});

// Get all templates
app.get('/api/templates', async (req, res) => {
  try {
    const templatesRef = db.collection('Templates');
    const snapshot = await templatesRef.get();
    
    const templates = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    logger.info(`GET /api/templates - Returned ${templates.length} templates`);
    res.json({ templates });
  } catch (error) {
    logger.error('GET /api/templates - Error:', error);
    res.status(500).json({
      error: 'Failed to fetch templates',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Create new document
app.post('/api/documents', async (req, res) => {
  try {
    const { title, content, projectId, userId, templateId, documentCategory } = req.body;
    
    if (!title || !projectId || !userId) {
      return res.status(400).json({ error: 'Title, projectId, and userId are required' });
    }
    
    const docData = {
      Title: title,
      DocumentName: title, // Add DocumentName field for display
      Content: content || '<p>Start writing your document...</p>',
      ProjectId: projectId,
      Project_Id: projectId, // Add Project_Id for compatibility
      UserId: userId,
      TemplateId: templateId || null,
      DocumentCategory: documentCategory || 'General',
      CreatedAt: admin.firestore.Timestamp.now(),
      UpdatedAt: admin.firestore.Timestamp.now()
    };
    
    const docRef = await db.collection('Documents').add(docData);
    
    const responseData = {
      id: docRef.id,
      documentId: docRef.id, // Add documentId for consistency
      ...docData,
      CreatedAt: docData.CreatedAt.toDate().toISOString(),
      UpdatedAt: docData.UpdatedAt.toDate().toISOString()
    };
    
    res.status(201).json({
      success: true,
      documentId: docRef.id,
      document: responseData
    });
  } catch (error) {
    logger.error('Error creating document:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Export the Express app as a Firebase Function with secrets
export const api = onRequest(
  {
    secrets: [
      'VITE_GEMINI_API_KEY',
      'GEMINI_API_KEYS',
      'GEMINI_DASHBOARD_PASS',
      'GEMINI_LIMIT_RPM',
      'GEMINI_LIMIT_RPD',
      'GEMINI_LIMIT_TPM'
    ],
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  app
);
