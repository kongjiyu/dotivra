// src/services/geminiBalance.ts - client service for dashboard/test
import axios from 'axios';

const API_BASE = '/api/gemini';

export type GeminiKeyUsage = {
  id: string;
  idShort: string;
  cooldownUntil: number;
  minuteWindowStart: number;
  dayWindowStart: number;
  rpmUsed: number;
  rpdUsed: number;
  tpmUsed: number;
  lastUsedAt: number;
  totalRequests: number;
  totalTokens: number;
  status: string;
};

export type GeminiDashboard = {
  rrIndex: number;
  keys: GeminiKeyUsage[];
  limits: { RPM: number; RPD: number; TPM: number };
  lastPersistAt: number;
};

export const geminiBalanceService = {
  async getDashboard(): Promise<GeminiDashboard> {
    const { data } = await axios.get(`${API_BASE}/dashboard`);
    return data;
  },
  async testBalancer(params: { count?: number; model?: string; dryRun?: boolean } = {}) {
    const { data } = await axios.post(`${API_BASE}/test-balancer`, params);
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
