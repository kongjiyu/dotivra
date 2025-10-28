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
import {WebSocketServer} from "ws";

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();


import {createGeminiWithMcp} from "./gemini/geminiMcpIntegration";

type GeminiWithMcp = {
  setDocument: (documentId: string) => Promise<any>;
  generateWithTools: (params: {
    prompt: string;
    history?: any[];
    systemInstruction?: string;
    generationConfig?: any;
    documentId?: string;
  }) => Promise<string>;
  streamWithTools: (params: {
    prompt: string;
    history?: any[];
    systemInstruction?: string;
    generationConfig?: any;
    documentId?: string;
    onChunk: (chunk: string) => void;
  }) => Promise<string>;
  getAvailableTools: () => any[];
};

let geminiWithMcp: GeminiWithMcp | null = null;

setGlobalOptions({maxInstances: 10});

// Gemini balancer initialization with Firebase Admin
// Session storage for dashboard authentication
const dashboardSessions = new Map(); // sessionId -> { createdAt, expiresAt }

// Import Gemini SDK
import {GoogleGenAI} from "@google/genai";

// Simple retry helper for transient upstream errors (e.g., 503)
async function fetchWithRetry(
  input: string,
  init?: RequestInit,
  opts?: { retries?: number; backoffMs?: number }
): Promise<Response> {
  const retries = opts?.retries ?? 2;
  const baseBackoff = opts?.backoffMs ?? 300;
  let attempt = 0;

  while (true) {
    try {
      const res = await fetch(input, init as any);
      // Retry on common transient server errors
      if ([502, 503, 504].includes(res.status) && attempt < retries) {
        const delay = baseBackoff * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
        await new Promise((r) => setTimeout(r, delay));
        attempt++;
        continue;
      }
      return res;
    } catch (err: any) {
      if (attempt >= retries) throw err;
      const delay = baseBackoff * Math.pow(2, attempt) + Math.floor(Math.random() * 100);
      await new Promise((r) => setTimeout(r, delay));
      attempt++;
      continue;
    }
  }
}

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
        
        // Use client.models.generateContent with robust field mapping
        const generateParams: any = {
          model: options.model,
          contents: options.contents,
          generationConfig: options.generationConfig,
          tools: options.tools,
          toolConfig: options.toolConfig,
          safetySettings: options.safetySettings,
        };

        // Add systemInstruction if provided
        if (options.systemInstruction) {
          generateParams.systemInstruction = options.systemInstruction;
        }

        const resp = await client.models.generateContent(generateParams);

        const metaSrc: any = (resp as any)?.usageMetadata || {};
        const usedTokens = Number(metaSrc.totalTokenCount || metaSrc.candidatesTokenCount || 0) + Number(metaSrc.promptTokenCount || 0) || estimatedTokens;
        
        this.markUsage(keyState, usedTokens);
        
        // Extract text from response (handle multiple SDK shapes)
        const responseObj: any = (resp as any)?.response ?? resp;
        let text: string | null = null;
        try {
          if (typeof responseObj?.text === 'function') {
            text = responseObj.text();
          }
        } catch {}
        if (!text) {
          const cands = responseObj?.candidates || [];
          const parts = cands?.[0]?.content?.parts || [];
          text = (parts.map((p: any) => p?.text).filter(Boolean).join(' ')) || null;
        }
        
        return {
          text,
          usage: metaSrc,
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

// Initialize MCP integration if balancer is available
if (geminiBalancer) {
  try {
    geminiWithMcp = createGeminiWithMcp(geminiBalancer, db);
    logger.info("✅ MCP integration initialized with 7 document tools");
  } catch (error) {
    logger.error("❌ Failed to initialize MCP integration:", error);
  }
}

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

app.post('/api/gemini/reasoning', async (req, res) => {
  try {
    logger.info("🧠 Reasoning API Request received");
    const {
      prompt,
      contents,
      model = "gemini-2.5-pro",
      tools,
      systemInstruction,
      generationConfig,
      safetySettings,
      toolConfig,
    } = req.body || {};

    if (!geminiBalancer) {
      logger.error("❌ geminiBalancer not initialized");
      return res.status(503).json({ error: "Balancer not configured" });
    }

    let effectiveContents = contents;
    if (!effectiveContents && typeof prompt === "string") {
      effectiveContents = [
        {
          role: "user",
          parts: [
            {
              text: `You are a reasoning AI agent. Follow this process:\n\nTHINK → PLAN → EXECUTE → REVIEW\n\nRespond using short, natural explanations for each phase, prefixed by emojis (🧠, 🧩, ⚙️, ✅).\n\nUser prompt: ${prompt}`,
            },
          ],
        },
      ];
    }

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Note: Streaming implementation would need to be adapted for Firebase Functions
    // For now, return a placeholder
    res.write(`data: ${JSON.stringify({ phase: "message", message: "Reasoning endpoint requires streaming support" })}\n\n`);
    res.write(`data: ${JSON.stringify({ phase: "done", message: "Reasoning completed." })}\n\n`);
    res.end();
  } catch (error) {
    logger.error("❌ Reasoning error:", error);
    res.write(`data: ${JSON.stringify({ phase: "error", message: error instanceof Error ? error.message : "Unknown error" })}\n\n`);
    res.end();
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


// Generate document recommendations
app.post('/api/gemini/recommendations', async (req, res) => {
  try {
    const { documentId, content } = req.body;

    if (!documentId || !content) {
      return res.status(400).json({ error: 'Missing documentId or content' });
    }

    logger.info('🎯 Generating recommendations for document:', documentId);

    if (!geminiBalancer) {
      return res.status(503).json({ error: 'Gemini balancer not initialized' });
    }

    // Generate recommendations using Gemini
    const prompt = `Analyze this document and provide exactly 4 actionable recommendations.

Document Content:
${content}

Provide 4 specific, actionable recommendations for improving or extending this document. Each recommendation should be:
- Brief (1-2 sentences)
- Actionable (user can immediately act on it)
- Relevant to the document content

Format your response as JSON:
{
  "recommendations": [
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." },
    { "title": "...", "description": "..." }
  ]
}`;

    const result = await geminiBalancer.generate({
      model: 'gemini-2.5-pro',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024
      }
    });

    // Parse JSON from response
    let recommendations;
    try {
      const parsed = JSON.parse(result.text);
      recommendations = parsed.recommendations || [];
    } catch (parseError) {
      logger.error('Failed to parse recommendations JSON:', parseError);
      // Fallback: extract text recommendations
      recommendations = [
        { title: 'Review Content', description: 'Review and verify the generated recommendations' },
        { title: 'Add Details', description: 'Consider adding more specific details based on the context' },
        { title: 'Improve Structure', description: 'Enhance document structure for better readability' },
        { title: 'Add Examples', description: 'Include practical examples where appropriate' }
      ];
    }

    logger.info(`✅ Generated ${recommendations.length} recommendations`);
    res.json({ recommendations });

  } catch (error) {
    logger.error('❌ Recommendations generation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Generate with tools (fallback to regular generation)
app.post('/api/gemini/generate-with-tools', async (req, res) => {
  try {
    logger.info('🔧 Gemini API with Tools Request received');

    const {
      prompt,
      model = 'gemini-2.5-pro',
      generationConfig = {},
    } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    if (!geminiBalancer) {
      return res.status(503).json({ error: 'Gemini balancer not initialized' });
    }

    // Fallback to regular generation (MCP removed)
    const result = await geminiBalancer.generate({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig
    });

    return res.json({
      success: true,
      text: result.text,
      toolCalls: [],
      toolsUsed: 0,
      model
    });
  } catch (error: any) {
    logger.error('❌ Gemini generate with tools error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Failed to generate with tools'
    });
  }
});

// AI Agent - Standard HTTP with multi-step execution
// Store active sessions for multi-step execution
const aiAgentSessions = new Map<string, any>();

app.post('/api/ai-agent/execute', async (req, res) => {
  try {
    logger.info('🤖 AI Agent Execute - Request received');

    // AI Agent not available in Firebase Functions deployment
    return res.status(503).json({ 
      error: 'AI Agent not available in production. Please use local development server.' 
    });

  } catch (error: any) {
    logger.error('❌ AI Agent execute error:', error);
    res.status(500).json({
      stage: 'error',
      content: error?.message || 'AI Agent execution failed',
      sessionId: null
    });
  }
});

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
    const tokenResponse = await fetchWithRetry('https://github.com/login/oauth/access_token', {
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
    }, { retries: 2 });

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

    const response = await fetchWithRetry('https://api.github.com/user/repos?sort=updated&per_page=100', {
      headers: {
        'Authorization': authorization,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Dotivra-App'
      }
    }, { retries: 2 });

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
    const response = await fetchWithRetry(url, {
      headers: {
        'Authorization': authorization,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Dotivra-App'
      }
    }, { retries: 2 });

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
// Create document endpoint - supports both old and new field naming conventions
app.post('/api/documents', async (req, res) => {
  try {
    console.log('🔥 POST /api/documents received:', req.body);
    
    // Support both old (lowercase) and new (capital) field names for backwards compatibility
    const { 
      DocumentName, 
      title,
      DocumentType,
      DocumentCategory,
      documentCategory,
      Project_Id,
      projectId,
      Template_Id,
      templateId,
      User_Id,
      userId,
      Content,
      content,
      IsDraft
    } = req.body;
    
    // Use new field names with fallback to old names
    const documentName = DocumentName || title;
    const documentType = DocumentType || 'user-manual';
    const category = DocumentCategory || documentCategory || 'General';
    const projectIdValue = Project_Id || projectId;
    const userIdValue = User_Id || userId;
    const templateIdValue = Template_Id || templateId || null;
    const contentValue = Content || content || '<p>Start writing your document...</p>';
    const isDraft = IsDraft !== undefined ? IsDraft : true;
    
    // Validate required fields
    if (!documentName || !projectIdValue || !userIdValue) {
      console.log('❌ Document validation failed: missing required fields');
      return res.status(400).json({ 
        error: 'DocumentName, Project_Id, and User_Id are required',
        received: { 
          DocumentName: !!documentName,
          Project_Id: !!projectIdValue,
          User_Id: !!userIdValue
        }
      });
    }

    console.log('✅ Document validation passed, creating document...');
    
    const docData = {
      DocumentName: documentName,
      DocumentType: documentType,
      DocumentCategory: category,
      Project_Id: projectIdValue,
      Template_Id: templateIdValue,
      User_Id: userIdValue,
      Content: contentValue,
      IsDraft: isDraft,
      EditedBy: userIdValue,
      Created_Time: admin.firestore.Timestamp.now(),
      Updated_Time: admin.firestore.Timestamp.now(),
      Hash: null
    };
    
    console.log('Creating document in Firestore:', docData);
    
    const docRef = await db.collection('Documents').add(docData);
    
    console.log('✅ Document created with Firestore ID:', docRef.id);
    
    const responseData = {
      id: docRef.id,
      ...docData,
      Created_Time: docData.Created_Time.toDate().toISOString(),
      Updated_Time: docData.Updated_Time.toDate().toISOString()
    };
    
    res.status(201).json({
      success: true,
      document: responseData
    });
  } catch (error) {
    logger.error('Error creating document:', error);
    res.status(500).json({ 
      error: 'Failed to create document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// PROFILE MANAGEMENT ENDPOINTS
// ============================================================================

// Update user profile
app.put('/api/profile/edit', async (req, res) => {
  try {
    logger.info('✏️ PUT /api/profile/edit received:', req.body);
    const { userId, UserName, UserEmail, currentPassword, newPassword } = req.body;

    // Validate required fields
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Find the user by User_Id
    const querySnapshot = await db.collection('Users')
      .where('User_Id', '==', userId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // If password is being changed, verify current password
    if (newPassword && currentPassword) {
      if (userData.UserPw !== currentPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
    }

    // Prepare update data
    const updateData: any = {};
    if (UserName) updateData.UserName = UserName;
    if (UserEmail) updateData.UserEmail = UserEmail;
    if (newPassword) updateData.UserPw = newPassword; // In production, hash this!

    // Update the user document
    await userDoc.ref.update(updateData);

    // Return updated user data (without password)
    const updatedUser = { ...userData, ...updateData };
    const { UserPw: _, ...userResponse } = updatedUser;

    logger.info('✅ Profile updated successfully for user:', userId);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    logger.error('❌ Error updating profile:', error);
    res.status(500).json({
      error: 'Failed to update profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete user profile
app.delete('/api/profile/delete', async (req, res) => {
  try {
    logger.info('🗑️ DELETE /api/profile/delete received:', req.body);
    const { userId, password } = req.body;

    // Validate required fields
    if (!userId || !password) {
      return res.status(400).json({ error: 'userId and password are required' });
    }

    // Find the user by User_Id
    const querySnapshot = await db.collection('Users')
      .where('User_Id', '==', userId)
      .get();

    if (querySnapshot.empty) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();

    // Verify password before deletion
    if (userData.UserPw !== password) {
      return res.status(401).json({ error: 'Incorrect password. Cannot delete profile.' });
    }

    // Delete the user document
    await userDoc.ref.delete();

    logger.info('✅ Profile deleted successfully for user:', userId);
    res.json({
      success: true,
      message: 'Profile deleted successfully'
    });
  } catch (error) {
    logger.error('❌ Error deleting profile:', error);
    res.status(500).json({
      error: 'Failed to delete profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ============================================================================
// DOCUMENT EDITOR & VERSION HISTORY ENDPOINTS
// ============================================================================

// Get all documents for a project (legacy path)
app.get("/api/project/:projectId/documents", async (req, res) => {
  try {
    const { projectId } = req.params;
    const docsSnapshot = await db.collection("Documents")
      .where("Project_Id", "==", projectId)
      .get();

    const documents = docsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ documents });
  } catch (err) {
    logger.error("Error fetching project documents:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Get single document content (legacy path)
app.get("/api/document/editor/content/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const docSnap = await db.collection("Documents").doc(docId).get();

    if (!docSnap.exists) return res.status(404).json({ error: "NOT_FOUND" });
    res.json({ id: docSnap.id, ...docSnap.data() });
  } catch (err) {
    logger.error("Error fetching document content:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Update document content (legacy path)
app.put("/api/document/editor/content/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const { content, isDraft } = req.body;

    const updateData: any = {
      Content: content,
      IsDraft: isDraft,
      Updated_Time: admin.firestore.Timestamp.now(),
    };

    // Add hash if crypto is available
    if (content) {
      updateData.Hash = "sha256:" + crypto.createHash("sha256").update(JSON.stringify(content)).digest("hex");
    }

    await db.collection("Documents").doc(docId).update(updateData);

    res.json({ status: "ok" });
  } catch (err) {
    logger.error("Error updating document content:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Delete document (legacy path with cleanup)
app.delete("/api/document/:docId", async (req, res) => {
  try {
    const { docId } = req.params;

    // Delete the document
    await db.collection("Documents").doc(docId).delete();

    // Cleanup related records
    const batch = db.batch();

    const chatSnap = await db.collection("ChatHistory").where("Document_Id", "==", docId).get();
    chatSnap.forEach((d) => batch.delete(d.ref));

    const histSnap = await db.collection("DocumentHistory").where("Document_Id", "==", docId).get();
    histSnap.forEach((d) => batch.delete(d.ref));

    await batch.commit();

    res.json({ status: "deleted", docId });
  } catch (err) {
    logger.error("Error deleting document:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Get document version history
app.get("/api/document/editor/history/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    logger.info('📜 Fetching version history for document:', docId);

    const historySnapshot = await db.collection("DocumentHistory")
      .where("Document_Id", "==", docId)
      .orderBy("Version", "desc")
      .get();

    logger.info('📊 Found', historySnapshot.docs.length, 'versions matching docId:', docId);
    const versions = historySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ versions });
  } catch (err) {
    logger.error('❌ Error fetching version history:', err);
    res.status(500).json({ error: "SERVER_ERROR", details: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Save document history snapshot
app.post("/api/document/history", async (req, res) => {
  try {
    const { Document_Id, Content, Version, Edited_Time } = req.body;

    if (!Document_Id || !Content || !Version) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    logger.info('💾 Saving document history snapshot:', Document_Id, Version);

    const historyData = {
      Document_Id,
      Content,
      Version,
      Edited_Time: Edited_Time || new Date().toISOString()
    };

    const historyRef = await db.collection("DocumentHistory").add(historyData);

    logger.info('✅ Document history saved with ID:', historyRef.id);
    res.status(201).json({
      success: true,
      id: historyRef.id,
      ...historyData
    });
  } catch (err) {
    logger.error('❌ Error saving document history:', err);
    res.status(500).json({ error: "SERVER_ERROR", details: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Get latest summary (assistant reply)
app.get("/api/document/editor/summary/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const snapshot = await db.collection("ChatHistory")
      .where("Document_Id", "==", docId)
      .where("Role", "==", "assistant")
      .orderBy("Created_Time", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) return res.json({ summary: null });

    const summary = snapshot.docs[0].data();
    res.json({ summary: summary.Message });
  } catch (err) {
    logger.error("Error fetching summary:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ============================================================================
// CHAT HISTORY ENDPOINTS
// ============================================================================

// Get normal chat history
app.get("/api/document/chat/history/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const snapshot = await db.collection("ChatHistory")
      .where("Document_Id", "==", docId)
      .orderBy("Created_Time", "asc")
      .get();

    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ messages });
  } catch (err) {
    logger.error("Error fetching chat history:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Add chat message (user/assistant)
app.post("/api/document/chat/prompt", async (req, res) => {
  try {
    const { userId, docId, message, role } = req.body;

    const newMsg = {
      User_Id: userId || null,
      Document_Id: docId,
      Message: message,
      Role: role || "user",
      Created_Time: admin.firestore.Timestamp.now(),
    };

    const ref = await db.collection("ChatHistory").add(newMsg);
    res.status(201).json({ id: ref.id, ...newMsg });
  } catch (err) {
    logger.error("Error adding chat message:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ============================================================================
// AI AGENT WORKFLOW ENDPOINTS
// ============================================================================

// Get workflow messages (reasoning → thinking → action)
app.get("/api/document/chat/agent/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const snapshot = await db.collection("ChatHistory")
      .where("Document_Id", "==", docId)
      .orderBy("Created_Time", "asc")
      .get();

    const messages = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ workflow: messages });
  } catch (err) {
    logger.error("Error fetching agent workflow:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Add AI agent step
app.post("/api/document/chat/agent", async (req, res) => {
  try {
    const { docId, stage, message, userId } = req.body;

    if (!["reasoning", "thinking", "action", "user"].includes(stage)) {
      return res.status(400).json({ error: "INVALID_STAGE" });
    }

    const newMsg = {
      User_Id: userId || null,
      Document_Id: docId,
      Stage: stage,
      Message: message,
      Role: stage === "user" ? "user" : "assistant",
      Created_Time: admin.firestore.Timestamp.now(),
    };

    const ref = await db.collection("ChatHistory").add(newMsg);

    // Auto-log Action step to DocumentHistory
    if (stage === "action") {
      await db.collection("DocumentHistory").add({
        Document_Id: docId,
        ActionID: ref.id,
        Content: message,
        Created_Time: admin.firestore.Timestamp.now(),
        Version: Date.now(),
      });
    }

    res.status(201).json({ id: ref.id, ...newMsg });
  } catch (err) {
    logger.error("Error adding agent step:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// Get latest Action only
app.get("/api/document/chat/agent/action/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const snapshot = await db.collection("ChatHistory")
      .where("Document_Id", "==", docId)
      .where("Stage", "==", "action")
      .orderBy("Created_Time", "desc")
      .limit(1)
      .get();

    if (snapshot.empty) return res.json({ action: null });

    const action = snapshot.docs[0].data();
    res.json({ action });
  } catch (err) {
    logger.error("Error fetching latest action:", err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

// ============================================================================
// LINK PREVIEW ENDPOINT
// ============================================================================

app.get('/api/link-preview', async (req, res) => {
  try {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate URL
    let validUrl;
    try {
      validUrl = new URL(url);
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported' });
      }
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }

    // Fetch webpage
    const response = await fetchWithRetry(validUrl.href, {
      method: 'GET',
      headers: {
        'User-Agent': 'Dotivra-Bot/1.0 (+https://dotivra.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    }, { retries: 2, backoffMs: 400 });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/html')) {
      return res.json({
        url: validUrl.href,
        title: validUrl.hostname,
        error: 'Content is not HTML'
      });
    }

    const html = await response.text();

    // Helper function to extract meta content
    const extractMetaContent = (html: string, regex: RegExp): string | null => {
      const match = html.match(regex);
      return match ? match[1].trim() : null;
    };

    // Parse HTML metadata
    const metadata = {
      url: validUrl.href,
      title: extractMetaContent(html, /<title[^>]*>([^<]+)<\/title>/i) ||
        extractMetaContent(html, /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
        validUrl.hostname,
      description: extractMetaContent(html, /<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
        extractMetaContent(html, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i),
      image: extractMetaContent(html, /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i),
      siteName: extractMetaContent(html, /<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i),
      favicon: `${validUrl.protocol}//${validUrl.hostname}/favicon.ico`
    };

    // Clean up the title
    if (metadata.title) {
      metadata.title = metadata.title.trim().replace(/\s+/g, ' ')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
    }

    // Limit description length
    if (metadata.description && metadata.description.length > 200) {
      metadata.description = metadata.description.substring(0, 200) + '...';
    }

    res.json(metadata);
  } catch (error) {
    logger.error('Link preview error:', error);

    const urlStr = typeof req.query.url === 'string' ? req.query.url : '';
    let hostname = 'Unknown';
    try {
      const urlObj = new URL(urlStr);
      hostname = urlObj.hostname;
    } catch {}

    res.json({
      url: urlStr,
      title: hostname,
      error: error instanceof Error ? error.message : 'Failed to fetch preview'
    });
  }
});

// ============================================================================
// MCP TEST ENDPOINTS
// ============================================================================

// POST /api/mcp/document - Load a document by ID
app.post('/api/mcp/document', async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    logger.info(`📄 Loading document: ${documentId}`);

    if (!geminiWithMcp) {
      return res.status(503).json({
        success: false,
        error: 'MCP not initialized'
      });
    }

    // Set document and get content
    const result = await geminiWithMcp.setDocument(documentId);

    res.json({
      success: true,
      documentId,
      content: result.content || '',
      documentName: result.documentName || ''
    });
  } catch (error) {
    logger.error('❌ Error loading document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load document',
      details: (error as Error).message
    });
  }
});

// GET /api/mcp/tools - Get all available MCP tools
app.get('/api/mcp/tools', async (req, res) => {
  try {
    if (!geminiWithMcp) {
      return res.status(503).json({
        success: false,
        error: 'MCP not initialized'
      });
    }

    const tools = geminiWithMcp.getAvailableTools();

    res.json({
      success: true,
      count: tools.length,
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
    });
  } catch (error) {
    logger.error('❌ Error fetching MCP tools:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch MCP tools',
      details: (error as Error).message
    });
  }
});

// POST /api/mcp/generate - Test generation with MCP tools
app.post('/api/mcp/generate', async (req, res) => {
  try {
    const { prompt, documentId, model = 'gemini-2.5-pro' } = req.body;
    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    logger.info(`📝 MCP Generate request - Prompt: "${prompt.substring(0, 50)}..." Document: ${documentId || 'none'}`);

    if (!geminiWithMcp) {
      return res.status(503).json({
        success: false,
        error: 'MCP not initialized'
      });
    }

    // Get available tools for debugging
    const availableTools = geminiWithMcp.getAvailableTools();
    logger.info(`📋 Available tools (${availableTools.length}):`, availableTools.map(t => t.name).join(', '));

    const systemPrompt = `You are a document manipulation assistant with access to MCP (Model Context Protocol) tools.

CRITICAL RULES:
1. When users ask to perform ANY document operation, you MUST call the appropriate function tool
2. DO NOT explain what you would do - IMMEDIATELY CALL THE FUNCTION
3. DO NOT ask for confirmation - JUST DO IT
4. DO NOT suggest alternatives - USE THE TOOLS

DOCUMENT EDITOR HTML FORMATTING RULES:
When creating or replacing content, you MUST follow these strict HTML formatting rules:

**Text Elements:**
- Paragraphs: Use <p> tag with font-size: 18px, font-family: "Times New Roman"
  Example: <p style="font-size: 18px; font-family: 'Times New Roman', Times, serif;">Your text here</p>
- Headings: Use <h1> through <h6> with appropriate sizes:
  * <h1>: 2rem (32px), font-weight: 700
  * <h2>: 1.5rem (24px), font-weight: 600
  * <h3>: 1.17rem, font-weight: 600
  * <h4>: 1rem (16px), font-weight: 600
  * <h5>: 0.83rem, font-weight: 600
  * <h6>: 0.67rem, font-weight: 600

**Inline Formatting:**
- Bold: <strong>text</strong>
- Italic: <em>text</em>
- Underline: <u>text</u>
- Strikethrough: <s>text</s>
- Inline code: <code>text</code> (styled as kbd with gray background)
- Highlight: <mark data-color="[color]">text</mark> (colors: gray, yellow, green, blue, red, purple, pink, orange)

**Block Elements:**
- Blockquote: <blockquote><p>Quote text</p></blockquote> (with blue left border)
- Horizontal rule: <hr> (2px solid line)
- Code block: <pre><code class="language-[type]">code here</code></pre>
  Supported languages: javascript, typescript, python, java, html, css, json, markdown, plaintext

**Lists:**
- Ordered list: <ol><li>Item 1</li><li>Item 2</li></ol>
- Unordered list: <ul><li>Item 1</li><li>Item 2</li></ul>
- Task list: <ul data-type="taskList"><li data-type="taskItem" data-checked="false"><label><input type="checkbox"/></label><div><p>Task text</p></div></li></ul>

**Links:**
- Link: <a href="url" class="tiptap-link">link text</a> (black text with underline)

**Images:**
- Image: <img src="url" alt="description" class="tiptap-image" style="width: [width]px; height: auto;" />

**Tables:**
- Table: <table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Data</td></tr></tbody></table>
- Apply custom background colors: style="background-color: #color;"

**Indentation:**
- Use data-indent attribute: <p data-indent="1">Indented text</p>
- Maximum 21 levels, each level = 2rem margin-left
- Works on paragraphs and headings

**CRITICAL:** Always generate complete, valid HTML with proper closing tags and attributes. Never use plain text without HTML tags.

Available tools and when to use them:
- scan_document_content(reason) → User says: "scan", "analyze", "check", "review", "examine" the document
- search_document_content(query, reason) → User says: "find", "search", "locate", "look for" + text
  Returns: element_index, element_tag, element_html (complete HTML), element_position, text_content
- append_document_content(content, reason) → User says: "add", "append", "put at end", "add to bottom"
  Content MUST be valid HTML following formatting rules above
- insert_document_content(position, content, reason) → User says: "insert at", "add at position", "put at line"
  Content MUST be valid HTML. Use element_position from search results for accurate insertion
- replace_document_content(position, content, reason) → User says: "replace", "change", "update", "modify" + text
  Content MUST be valid HTML. Use element_position and element_length from search results
- remove_document_content(position, reason) → User says: "delete", "remove", "erase", "clear" + text
  Use element_position and element_length from search results for accurate removal

${documentId ? `\nCurrent document ID: ${documentId}\nDocument is loaded and ready. EXECUTE OPERATIONS IMMEDIATELY.` : '\nNo document loaded. If user asks for operations, tell them to open a document first.'}`;

    logger.info(`🤖 Generating with model: ${model}`);

    const result = await geminiWithMcp.generateWithTools({
      prompt,
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096
      },
      documentId
    });

    logger.info(`✅ Generation complete`);

    res.json({
      success: true,
      text: result,
      model
    });
  } catch (error) {
    logger.error('❌ MCP generate error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate',
      details: (error as Error).message
    });
  }
});

// POST /api/mcp/set-document - Set current document context
app.post('/api/mcp/set-document', async (req, res) => {
  try {
    const { documentId } = req.body;

    if (!documentId) {
      return res.status(400).json({
        success: false,
        error: 'Document ID is required'
      });
    }

    if (!geminiWithMcp) {
      return res.status(503).json({
        success: false,
        error: 'MCP not initialized'
      });
    }

    logger.info(`📄 Setting document context: ${documentId}`);
    const result = await geminiWithMcp.setDocument(documentId);

    res.json({
      success: true,
      documentId,
      documentName: result.documentName || '',
      contentLength: result.content?.length || 0
    });
  } catch (error) {
    logger.error('❌ Error setting document:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to set document',
      details: (error as Error).message
    });
  }
});

// GET /api/mcp/health - System health check
app.get('/api/mcp/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    mcp: {
      initialized: geminiWithMcp !== null,
      toolCount: geminiWithMcp ? geminiWithMcp.getAvailableTools().length : 0
    },
    balancer: {
      initialized: geminiBalancer !== null
    },
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// DOCUMENT TOOLS EXECUTION API
// ============================================================================

// POST /api/tools/execute - Execute document manipulation tools
app.post('/api/tools/execute', async (req, res) => {
  try {
    logger.info('🔧 Tool execution request received');

    const { tool, args, documentId } = req.body;

    if (!tool) {
      return res.status(400).json({
        success: false,
        html: `<div class="error-message">Sorry, no tool was specified. Please try again.</div>`
      });
    }

    if (!args || typeof args !== 'object') {
      return res.status(400).json({
        success: false,
        html: `<div class="error-message">Sorry, the tool arguments are missing or invalid. Please try again.</div>`
      });
    }

    // Pre-validate required args for known tools to provide clearer errors
    const needsRange = tool === 'replace_document_content' || tool === 'remove_document_content' || tool === 'replace_doument_summary' || tool === 'remove_document_summary';
    if (needsRange) {
      const pos = args?.position;
      if (!pos || typeof pos.from !== 'number' || typeof pos.to !== 'number') {
        const errorHtml = `<div class="error-message">Missing required position range. Provide { position: { from: number, to: number } }.</div>`;
        // Log system error to ChatHistory when we have a document context
        try {
          if (documentId) {
            await db.collection('ChatHistory').add({
              DocID: documentId,
              Role: 'system-error',
              Message: 'Tool argument error: position.from/to is required',
              CreatedAt: new Date().toISOString(),
            });
          }
        } catch (e: any) {
          logger.warn('⚠️ Failed to log system-error:', e?.message || e);
        }
        return res.status(400).json({ success: false, html: errorHtml, tool });
      }
    }

    logger.info(`🔧 Executing tool: ${tool}`);
    logger.info(`📄 Document ID: ${documentId || 'NOT_SET'}`);
    logger.info(`📋 Args:`, JSON.stringify(args, null, 2));

    // Import toolService
    const toolService = await import('./services/toolService.js');

    // Set document context if documentId provided
    if (documentId && documentId !== 'NOT_SET') {
      try {
        logger.info(`📂 Setting current document context: ${documentId}`);
        await toolService.setCurrentDocument(documentId);
        logger.info(`✅ Document context set successfully`);
      } catch (error: any) {
        logger.error(`❌ Failed to set document context:`, error);
        return res.status(500).json({
          success: false,
          html: `<div class="error-message">Sorry, we couldn't load your document. Please try again.</div>`
        });
      }
    }

    // Execute the tool
    let result;
    try {
      result = await toolService.executeTool(tool, args);
      logger.info(`✅ Tool executed successfully: ${tool}`);
      logger.info(`📊 Result:`, JSON.stringify(result, null, 2));
    } catch (toolError: any) {
      logger.error(`❌ Tool execution error:`, toolError);
      // Log system error
      try {
        if (documentId) {
          await db.collection('ChatHistory').add({
            DocID: documentId,
            Role: 'system-error',
            Message: `Tool execution error for ${tool}: ${toolError?.message || toolError}`,
            CreatedAt: new Date().toISOString(),
          });
        }
      } catch (e: any) {
        logger.warn('⚠️ Failed to log system-error:', e?.message || e);
      }
      return res.status(500).json({
        success: false,
        html: `<div class="error-message">Sorry, something went wrong while running the tool. Please try again.</div>`,
        tool: tool
      });
    }

    // If tool returned an error, store it as system-error
    if (!result?.success && documentId) {
      try {
        await db.collection('ChatHistory').add({
          DocID: documentId,
          Role: 'system-error',
          Message: typeof result?.html === 'string' ? result.html.replace(/<[^>]*>/g, '') : (result?.error || 'Tool returned an error'),
          CreatedAt: new Date().toISOString(),
        });
      } catch (e: any) {
        logger.warn('⚠️ Failed to log system-error:', e?.message || e);
      }
    }

    // Return the result
    res.json(result);

  } catch (error: any) {
    logger.error('❌ Tool execution endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Tool execution failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});


// ============================================================================
// WEBSOCKET SERVER FOR REAL-TIME DOCUMENT COLLABORATION
// ============================================================================

// Initialize WebSocket server with noServer mode for Firebase Functions
const wss = new WebSocketServer({ noServer: true });

// Store document rooms: documentId -> Set<WebSocket>
const documentRooms = new Map<string, Set<any>>();

wss.on("connection", (ws: any) => {
  logger.info("WebSocket client connected ✅");
  let currentDocumentId: string | null = null;

  ws.on("message", async (msg: any) => {
    try {
      const data = JSON.parse(msg.toString());
      logger.info("WebSocket received:", data.type, data.documentId);

      switch (data.type) {
        case 'join':
          // Join document room
          currentDocumentId = data.documentId;
          if (!documentRooms.has(currentDocumentId)) {
            documentRooms.set(currentDocumentId, new Set());
          }
          documentRooms.get(currentDocumentId)!.add(ws);
          logger.info(`📄 Client joined document: ${currentDocumentId}`);
          ws.send(JSON.stringify({ type: 'joined', documentId: currentDocumentId }));
          break;

        case 'sync_request':
          // Client requesting current document state (for reconnection)
          try {
            const syncDocId = data.documentId;
            const syncChannel = data.channel; // 'content' or 'summary'
            const docRef = db.collection('Documents').doc(syncDocId);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
              const docData = docSnap.data();
              
              // Ensure Summary field exists, add if missing
              if (!docData?.Summary) {
                await docRef.update({ Summary: '' });
                logger.info(`➕ Added missing Summary field to document: ${syncDocId}`);
              }
              
              // Send appropriate content based on channel
              let content = '';
              if (syncChannel === 'summary') {
                content = docData?.Summary || '';
              } else {
                content = docData?.Content || '';
              }
              
              ws.send(JSON.stringify({
                type: 'sync_response',
                documentId: syncDocId,
                content: content,
                version: docData?.version || 0,
                channel: syncChannel,
              }));
              logger.info(`🔄 Sync response sent for document: ${syncDocId}, channel: ${syncChannel}, version: ${docData?.version || 0}`);
            } else {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Document not found',
                documentId: syncDocId
              }));
            }
          } catch (error) {
            logger.error('Error handling sync_request:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to sync document',
              documentId: data.documentId
            }));
          }
          break;

        case 'edit':
          // OT protocol: Handle edit with version checking
          const { documentId: editDocId, content: editContent, baseVersion, seq, channel: editChannel } = data;
          const editIsSummary = editChannel === 'summary';
          
          logger.info(`📝 Processing edit. DocId: ${editDocId}, Seq: ${seq}, BaseVersion: ${baseVersion}, Channel: ${editChannel}`);
          
          try {
            const docRef = db.collection('Documents').doc(editDocId);
            const docSnap = await docRef.get();
            
            if (!docSnap.exists) {
              logger.error(`❌ Document not found: ${editDocId}`);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Document not found',
                documentId: editDocId
              }));
              break;
            }
            
            const docData = docSnap.data();
            const currentVersion = docData?.version || 0;
            
            // Ensure Summary field exists if we're editing summary
            if (editIsSummary && !docData?.Summary) {
              await docRef.update({ Summary: '' });
              logger.info(`➕ Added missing Summary field to document: ${editDocId}`);
            }
            
            logger.info(`📊 Current document version: ${currentVersion}, Incoming baseVersion: ${baseVersion}`);
            
            // Check if baseVersion matches current version
            if (baseVersion !== currentVersion) {
              // Reject stale edit
              logger.info(`⚠️ Rejecting stale edit. Base: ${baseVersion}, Current: ${currentVersion}`);
              ws.send(JSON.stringify({
                type: 'reject',
                documentId: editDocId,
                seq,
                currentVersion,
                reason: 'stale_base_version'
              }));
              break;
            }
            
            // Version matches, apply edit
            const newVersion = currentVersion + 1;
            const updateData: any = {
              Updated_Time: admin.firestore.Timestamp.now(),
              version: newVersion
            };
            
            if (editIsSummary) {
              updateData.Summary = editContent;
              logger.info(`💾 Updating Summary field (channel: ${editChannel})`);
            } else {
              updateData.Content = editContent;
              logger.info(`💾 Updating Content field (channel: ${editChannel})`);
            }
            
            logger.info(`🔄 Saving to Firestore...`);
            await docRef.update(updateData);
            logger.info(`💾 Firestore updated successfully`);
            
            // Send acknowledgment to sender
            const ackMessage = {
              type: 'ack',
              documentId: editDocId,
              seq,
              newVersion,
              channel: editChannel
            };
            logger.info(`📤 Sending ACK:`, ackMessage);
            ws.send(JSON.stringify(ackMessage));
            
            logger.info(`✅ Edit applied. Seq: ${seq}, New version: ${newVersion}, Channel: ${editChannel}`);
            
            // Broadcast to other clients in the same document room
            if (documentRooms.has(editDocId)) {
              const clients = documentRooms.get(editDocId)!;
              clients.forEach(client => {
                if (client !== ws && client.readyState === 1) { // 1 = OPEN
                  client.send(JSON.stringify({
                    type: 'update',
                    documentId: editDocId,
                    content: editContent,
                    version: newVersion,
                    channel: editChannel
                  }));
                }
              });
            }
          } catch (error) {
            logger.error('Error handling edit:', error);
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Failed to save edit',
              documentId: editDocId,
              seq
            }));
          }
          break;

        case 'update':
          // Legacy: Save document update and broadcast to other clients
          const { documentId, content, isSummary } = data;
          
          try {
            const docRef = db.collection('Documents').doc(documentId);
            const docSnap = await docRef.get();
            const currentVersion = docSnap.exists ? (docSnap.data()?.version || 0) : 0;
            const newVersion = currentVersion + 1;
            
            const updateData: any = {
              Updated_Time: admin.firestore.Timestamp.now(),
              version: newVersion
            };
            
            if (isSummary) {
              updateData.Summary = content;
            } else {
              updateData.Content = content;
            }
            
            await docRef.update(updateData);
            
            // Send acknowledgment to sender
            ws.send(JSON.stringify({ 
              type: 'synced', 
              documentId 
            }));
            
            // Broadcast to other clients in the same document room
            if (documentRooms.has(documentId)) {
              const clients = documentRooms.get(documentId)!;
              clients.forEach(client => {
                if (client !== ws && client.readyState === 1) {
                  client.send(JSON.stringify({
                    type: 'update',
                    documentId,
                    content,
                    version: newVersion,
                    isSummary
                  }));
                }
              });
            }
            
            logger.info(`💾 Document ${documentId} saved and synced (legacy mode)`);
          } catch (error) {
            logger.error('Error saving document:', error);
            ws.send(JSON.stringify({ 
              type: 'error', 
              message: 'Failed to save document',
              documentId
            }));
          }
          break;

        default:
          logger.info("Unknown message type:", data.type);
      }
    } catch (error) {
      logger.error('Error processing WebSocket message:', error);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: 'Invalid message format' 
      }));
    }
  });

  ws.on('close', () => {
    // Remove client from document room
    if (currentDocumentId && documentRooms.has(currentDocumentId)) {
      documentRooms.get(currentDocumentId)!.delete(ws);
      if (documentRooms.get(currentDocumentId)!.size === 0) {
        documentRooms.delete(currentDocumentId);
      }
      logger.info(`📄 Client left document: ${currentDocumentId}`);
    }
    logger.info("WebSocket client disconnected ❌");
  });

  ws.send(JSON.stringify({ type: "connected" }));
});

// Wrap Express app to handle WebSocket upgrades
const requestHandler = (req: any, res: any) => {
  // Check if this is a WebSocket upgrade request
  if (req.headers.upgrade === 'websocket') {
    logger.info('🔌 WebSocket upgrade request detected');
    // Handle WebSocket upgrade
    wss.handleUpgrade(req, req.socket, Buffer.alloc(0), (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    // Normal HTTP request - pass to Express
    app(req, res);
  }
};

// Export the wrapped handler as a Firebase Function with secrets
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
  requestHandler
);
