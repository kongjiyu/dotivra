// src/services/geminiBalance.ts - client service for dashboard/test
import axios from 'axios';
import { buildApiUrl } from '@/lib/apiConfig';

const API_BASE = buildApiUrl('api/gemini');

// Session storage
const SESSION_KEY = 'gemini_dashboard_session';

export type GeminiKeyUsage = {
  id: string;
  idShort: string;
  cooldownUntil?: number;
  minuteWindowStart?: number;
  dayWindowStart?: number;
  rpmUsed?: number;
  rpdUsed?: number;
  tpmUsed?: number;
  lastUsedAt?: number;
  totalRequests?: number;
  totalTokens?: number;
  status?: string;
  // Firebase fields
  RPD?: number;
  RPM?: number;
  TPM?: number;
  cooldownTime?: number | null;
  lastUsed?: number | null;
  totalRequest?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type GeminiDashboard = {
  rrIndex?: number;
  keys: GeminiKeyUsage[];
  limits: { RPM: number; RPD: number; TPM: number };
  lastPersistAt?: number;
  lastSyncedAt?: string;
};

export type SessionInfo = {
  sessionId: string;
  expiresAt: string;
};

// Helper: Get session from localStorage
function getSession(): string | null {
  try {
    const sessionData = localStorage.getItem(SESSION_KEY);
    if (!sessionData) return null;
    const { sessionId, expiresAt } = JSON.parse(sessionData);
    // Check if expired
    if (new Date(expiresAt) < new Date()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return sessionId;
  } catch {
    return null;
  }
}

// Helper: Save session to localStorage
function saveSession(sessionInfo: SessionInfo) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(sessionInfo));
}

// Helper: Clear session
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export const geminiBalanceService = {
  async authenticate(passkey: string): Promise<SessionInfo> {
    const { data } = await axios.post(`${API_BASE}/auth`, { passkey });
    saveSession(data);
    return data;
  },

  async verifySession(): Promise<{ valid: boolean; expiresAt?: string }> {
    const sessionId = getSession();
    if (!sessionId) return { valid: false };
    
    try {
      const { data } = await axios.post(`${API_BASE}/verify-session`, { sessionId });
      return data;
    } catch {
      clearSession();
      return { valid: false };
    }
  },

  async logout(): Promise<void> {
    const sessionId = getSession();
    if (sessionId) {
      try {
        await axios.post(`${API_BASE}/logout`, { sessionId });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }
    clearSession();
  },

  getSessionId(): string | null {
    return getSession();
  },

  async getDashboard(): Promise<GeminiDashboard> {
    const sessionId = getSession();
    if (!sessionId) {
      throw new Error('No valid session. Please authenticate.');
    }

    const { data } = await axios.get(`${API_BASE}/dashboard`, {
      headers: { 'x-session-id': sessionId }
    });
    return data;
  },

  async testBalancer(params: { count?: number; model?: string; dryRun?: boolean } = {}) {
    const sessionId = getSession();
    const headers = sessionId ? { 'x-session-id': sessionId } : {};

    const { data } = await axios.post(`${API_BASE}/test-balancer`, params, { headers });
    return data as {
      count: number;
      model: string;
      dryRun: boolean;
      distribution: Array<{ keyId: string; keyIdShort: string; requests: number }>;
      resultsSample: Array<{ ok: boolean; keyIdShort?: string; error?: string }>;
      usage: GeminiDashboard;
    };
  },
};

export default geminiBalanceService;
