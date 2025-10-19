// server/gemini/balancer.js - ESM compatible runtime balancer (no TS import on server)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';

const DEFAULT_LIMITS = {
  RPM: Number(process.env.GEMINI_LIMIT_RPM || 15),
  RPD: Number(process.env.GEMINI_LIMIT_RPD || 1500),
  TPM: Number(process.env.GEMINI_LIMIT_TPM || 20000),
};

// Resolve project root relative to this file (ESM-safe). Assumes file is at server/gemini/balancer.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function estimateTokensFromContents(contents) {
  try {
    const text = (contents || [])
      .map((c) => (typeof c === 'string' ? c : JSON.stringify(c)))
      .join(' ');
    return Math.ceil((text || '').length / 4);
  } catch {
    return 100;
  }
}

export class GeminiBalancer {
  constructor({ apiKeys, persistFile, limits = DEFAULT_LIMITS }) {
    if (!apiKeys || !apiKeys.length) throw new Error('No GEMINI API keys configured');
    this.limits = limits;
    this.persistFile = persistFile;
    ensureDir(path.dirname(persistFile));
    this.state = {
      keys: apiKeys.map((key) => ({
        key,
        id: crypto.createHash('sha256').update(String(key)).digest('hex'),
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
    this._load();
    this._debouncedSave = this._debounce(() => this._save(), 500);
  }

  _debounce(fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  _now() {
    return Date.now();
  }

  _load() {
    try {
      if (fs.existsSync(this.persistFile)) {
        const raw = fs.readFileSync(this.persistFile);
        const json = JSON.parse(raw.toString());
        const byId = new Map((json.keys || []).map((k) => [k.id, k]));
        this.state.keys = this.state.keys.map((k) => ({ ...k, ...(byId.get(k.id) || {}), key: k.key }));
        this.state.rrIndex = json.rrIndex || 0;
      }
    } catch {
      // ignore
    }
  }

  _save() {
    try {
      const safe = {
        rrIndex: this.state.rrIndex,
        lastPersistAt: this.state.lastPersistAt,
        keys: this.state.keys.map((k) => ({
          id: k.id,
          cooldownUntil: k.cooldownUntil,
          minuteWindowStart: k.minuteWindowStart,
          dayWindowStart: k.dayWindowStart,
          rpmUsed: k.rpmUsed,
          rpdUsed: k.rpdUsed,
          tpmUsed: k.tpmUsed,
          lastUsedAt: k.lastUsedAt,
          totalRequests: k.totalRequests,
          totalTokens: k.totalTokens,
        })),
      };
      fs.writeFileSync(this.persistFile, Buffer.from(JSON.stringify(safe, null, 2)));
      this.state.lastPersistAt = this._now();
    } catch (e) {
      console.error('GeminiBalancer persist error:', e.message);
    }
  }

  _resetWindowsIfNeeded(k) {
    const now = this._now();
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

  _keyStatus(k) {
    this._resetWindowsIfNeeded(k);
    const now = this._now();
    if (k.cooldownUntil && now < k.cooldownUntil) return 'cooldown';
    if (k.rpmUsed >= this.limits.RPM) return 'rpm-exhausted';
    if (k.rpdUsed >= this.limits.RPD) return 'rpd-exhausted';
    if (k.tpmUsed >= this.limits.TPM) return 'tpm-exhausted';
    return 'ok';
  }

  _pickKey(estimatedTokens) {
    const n = this.state.keys.length;
    for (let i = 0; i < n; i++) {
      const idx = (this.state.rrIndex + i) % n;
      const k = this.state.keys[idx];
      this._resetWindowsIfNeeded(k);
      const status = this._keyStatus(k);
      if (status !== 'ok') continue;
      if (k.rpmUsed + 1 > this.limits.RPM) continue;
      if (k.rpdUsed + 1 > this.limits.RPD) continue;
      if (k.tpmUsed + estimatedTokens > this.limits.TPM) continue;
      this.state.rrIndex = (idx + 1) % n;
      return { idx, key: k };
    }
    return null;
  }

  _markUsage(k, usedTokens) {
    this._resetWindowsIfNeeded(k);
    k.rpmUsed += 1;
    k.rpdUsed += 1;
    k.tpmUsed += usedTokens;
    k.totalRequests += 1;
    k.totalTokens += usedTokens;
    k.lastUsedAt = this._now();
    this._debouncedSave();
  }

  getUsage() {
    return {
      rrIndex: this.state.rrIndex,
      keys: this.state.keys.map((k) => ({
        id: k.id,
        idShort: k.id.slice(0, 12),
        cooldownUntil: k.cooldownUntil,
        minuteWindowStart: k.minuteWindowStart,
        dayWindowStart: k.dayWindowStart,
        rpmUsed: k.rpmUsed,
        rpdUsed: k.rpdUsed,
        tpmUsed: k.tpmUsed,
        lastUsedAt: k.lastUsedAt,
        totalRequests: k.totalRequests,
        totalTokens: k.totalTokens,
        status: this._keyStatus(k),
      })),
      limits: this.limits,
      lastPersistAt: this.state.lastPersistAt,
    };
  }

  getConfig() {
    return { limits: this.limits, keyCount: this.state.keys.length };
  }

  async generate({ model, contents, tools, systemInstruction, generationConfig, safetySettings, toolConfig, dryRun }) {
    const estimatedTokens = estimateTokensFromContents(contents);
    const maxAttempts = this.state.keys.length;
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const picked = this._pickKey(estimatedTokens);
      if (!picked) {
        const err = new Error('All API keys are rate-limited or exhausted.');
        err.status = 429;
        throw err;
      }
      const { key: keyState } = picked;
      try {
        if (dryRun) {
          // Simulate usage without calling external API
          this._markUsage(keyState, estimatedTokens);
          return {
            text: null,
            raw: { dryRun: true },
            usage: {
              promptTokens: null,
              candidatesTokens: null,
              totalTokens: null,
              estimatedTokens,
            },
            keyId: keyState.id,
            keyIdShort: keyState.id.slice(0, 12),
          };
        }
        const client = new GoogleGenerativeAI(keyState.key);
        const modelClient = client.getGenerativeModel({ model, tools, systemInstruction, generationConfig, safetySettings, toolConfig });
        const resp = await modelClient.generateContent({ contents, generationConfig, safetySettings, tools, toolConfig, systemInstruction });
        const metadata = resp?.response?.usageMetadata || resp?.usageMetadata || {};
        const usedTokens = Number(metadata.totalTokenCount || metadata.candidatesTokenCount || 0) + Number(metadata.promptTokenCount || 0);
        const effectiveTokens = usedTokens > 0 ? usedTokens : estimatedTokens;
        this._markUsage(keyState, effectiveTokens);
        return {
          text: resp?.response?.text?.() ?? resp?.text?.() ?? null,
          raw: resp,
          usage: {
            promptTokens: metadata.promptTokenCount ?? null,
            candidatesTokens: metadata.candidatesTokenCount ?? null,
            totalTokens: usedTokens || null,
            estimatedTokens,
          },
          keyId: keyState.id,
          keyIdShort: keyState.id.slice(0, 12),
        };
      } catch (e) {
        lastError = e;
        const msg = (e && (e.message || String(e))) || '';
        const isRateLimit = e?.status === 429 || e?.status === 403 || /rate/i.test(msg);
        if (isRateLimit) {
          const now = this._now();
          const minuteEnd = Math.floor(now / 60000) * 60000 + 60000;
          keyState.cooldownUntil = minuteEnd;
          this._debouncedSave();
        }
        await sleep(100);
        continue;
      }
    }
    const err = new Error(lastError?.message || 'Gemini request failed for all keys');
    err.status = lastError?.status || 500;
    throw err;
  }
}

export function createBalancerFromEnv() {
  const raw = (process.env.GEMINI_API_KEYS || '').trim();
  let keys = [];
  if (raw) {
    if (raw.startsWith('[')) {
      try {
        const arr = JSON.parse(raw);
        keys = Array.isArray(arr) ? arr.map((s) => String(s).trim()).filter(Boolean) : [];
      } catch {
        keys = raw.replace(/[\[\]\s"\']/g, '').split(',').map((s) => s.trim()).filter(Boolean);
      }
    } else {
      const cleaned = raw.replace(/[\[\]\s"\']/g, '');
      keys = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }
  // Allow GEMINI_USAGE_FILE to be a relative path (resolved from project root) or absolute path.
  const envPath = (process.env.GEMINI_DATA_FILE || '').trim();
  const persistFile = envPath
    ? (path.isAbsolute(envPath) ? envPath : path.join(PROJECT_ROOT, envPath))
    : path.join(PROJECT_ROOT, 'dbconfig', 'gemini_usage.json');
  const limits = {
    RPM: Number(process.env.GEMINI_LIMIT_RPM || DEFAULT_LIMITS.RPM),
    RPD: Number(process.env.GEMINI_LIMIT_RPD || DEFAULT_LIMITS.RPD),
    TPM: Number(process.env.GEMINI_LIMIT_TPM || DEFAULT_LIMITS.TPM),
  };
  return new GeminiBalancer({ apiKeys: keys, persistFile, limits });
}
