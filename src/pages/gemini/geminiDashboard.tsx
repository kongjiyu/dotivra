import { useEffect, useState } from 'react';
import geminiBalanceService, { type GeminiDashboard } from '@/services/geminiBalance';

function msToTime(ms: number) {
    if (!ms || ms < 0) return 'now';
    const s = Math.ceil(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.ceil(s / 60);
    return `${m}m`;
}

export default function GeminiDashboard() {
    const [data, setData] = useState<GeminiDashboard | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [auto, setAuto] = useState(true);
    const [authenticated, setAuthenticated] = useState(false);
    const [passkey, setPasskey] = useState('');
    const [sessionExpiry, setSessionExpiry] = useState<string | null>(null);
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    // Check existing session on mount
    useEffect(() => {
        checkSession();
    }, []);

    // Auto-refresh when authenticated
    useEffect(() => {
        if (!authenticated) return;
        load();
    }, [authenticated]);

    useEffect(() => {
        if (!auto || !authenticated) return;
        const t = setInterval(load, 4000);
        return () => clearInterval(t);
    }, [auto, authenticated]);

    // Check session expiry
    useEffect(() => {
        if (!authenticated || !sessionExpiry) return;
        const interval = setInterval(() => {
            const expiryTime = new Date(sessionExpiry).getTime();
            const now = Date.now();
            if (now >= expiryTime) {
                handleSessionExpired();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [authenticated, sessionExpiry]);

    async function checkSession() {
        try {
            const result = await geminiBalanceService.verifySession();
            if (result.valid) {
                setAuthenticated(true);
                setSessionExpiry(result.expiresAt || null);
            }
        } catch (err) {
            console.error('Session check failed:', err);
        }
    }

    async function handleAuthenticate(e: React.FormEvent) {
        e.preventDefault();
        if (!passkey.trim()) {
            setError('Please enter a passkey');
            return;
        }

        setIsAuthenticating(true);
        setError(null);

        try {
            const session = await geminiBalanceService.authenticate(passkey);
            setAuthenticated(true);
            setSessionExpiry(session.expiresAt);
            setPasskey('');
        } catch (err: any) {
            setError(err.response?.data?.error || err.message || 'Authentication failed');
        } finally {
            setIsAuthenticating(false);
        }
    }

    function handleSessionExpired() {
        setAuthenticated(false);
        setSessionExpiry(null);
        setData(null);
        setError('Session expired. Please authenticate again.');
    }

    async function load() {
        try {
            const d = await geminiBalanceService.getDashboard();
            setData(d);
            setError(null);
        } catch (e: any) {
            if (e.response?.status === 401) {
                handleSessionExpired();
            } else {
                setError(e?.message || 'Failed to load dashboard');
            }
        }
    }

    const limits = data?.limits;
    const keys = data?.keys || [];

    // Authentication UI
    if (!authenticated) {
        return (
            <div className="p-6 max-w-md mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                    <h1 className="text-2xl font-semibold mb-6 text-center">Dashboard Authentication</h1>
                    {error && (
                        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">
                            {error}
                        </div>
                    )}
                    <form onSubmit={handleAuthenticate}>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Passkey
                            </label>
                            <input
                                type="password"
                                value={passkey}
                                onChange={(e) => setPasskey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter passkey"
                                disabled={isAuthenticating}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isAuthenticating}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isAuthenticating ? 'Authenticating...' : 'Authenticate'}
                        </button>
                    </form>
                    <div className="mt-4 text-sm text-gray-500 text-center">
                        Session expires after 10 minutes of authentication
                    </div>
                </div>
            </div>
        );
    }

    // Calculate remaining session time
    const getRemainingTime = () => {
        if (!sessionExpiry) return '';
        const remaining = new Date(sessionExpiry).getTime() - Date.now();
        if (remaining <= 0) return 'Expired';
        return msToTime(remaining);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Gemini Balancer Dashboard</h1>
                <div className="flex items-center gap-3">
                    <div className="text-sm text-gray-600">
                        Session: {getRemainingTime()}
                    </div>
                    <button onClick={load} className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Refresh</button>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                        Auto-refresh
                    </label>
                </div>
            </div>
            {error && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-300">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 border rounded">
                    <div className="text-gray-500">RPM limit</div>
                    <div className="text-xl font-bold">{limits?.RPM ?? '-'} / min</div>
                </div>
                <div className="p-4 border rounded">
                    <div className="text-gray-500">RPD limit</div>
                    <div className="text-xl font-bold">{limits?.RPD ?? '-'} / day</div>
                </div>
                <div className="p-4 border rounded">
                    <div className="text-gray-500">TPM limit</div>
                    <div className="text-xl font-bold">{limits?.TPM ?? '-'} tokens/min</div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-2 border">Key</th>
                            <th className="p-2 border">Status</th>
                            <th className="p-2 border">RPM (used)</th>
                            <th className="p-2 border">RPD (used)</th>
                            <th className="p-2 border">TPM (used)</th>
                            <th className="p-2 border">Total req</th>
                            <th className="p-2 border">Total tokens</th>
                        </tr>
                    </thead>
                    <tbody>
                        {keys.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-4 text-center text-gray-500">No keys configured</td>
                            </tr>
                        )}
                        {keys.map((k) => {
                            // Support both Firebase format (RPD, RPM, TPM) and in-memory format (rpmUsed, rpdUsed, tpmUsed)
                            const rpmUsed = k.RPM ?? k.rpmUsed ?? 0;
                            const rpdUsed = k.RPD ?? k.rpdUsed ?? 0;
                            const tpmUsed = k.TPM ?? k.tpmUsed ?? 0;
                            const totalRequests = k.totalRequest ?? k.totalRequests ?? 0;
                            const totalTokens = k.totalTokens ?? 0;
                            
                            // Status display with proper formatting
                            const status = k.status || 'unknown';
                            let statusDisplay = status;
                            let statusClass = 'text-gray-600';
                            
                            if (status === 'available') {
                                statusDisplay = 'Available';
                                statusClass = 'text-green-600 font-medium';
                            } else if (status.includes('limit')) {
                                statusDisplay = status.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                statusClass = 'text-red-600 font-medium';
                            } else if (status === 'ok') {
                                statusDisplay = 'Available';
                                statusClass = 'text-green-600 font-medium';
                            }
                            
                            return (
                                <tr key={k.id}>
                                    <td className="p-2 border font-mono">{k.idShort}</td>
                                    <td className={`p-2 border ${statusClass}`}>{statusDisplay}</td>
                                    <td className="p-2 border">{rpmUsed} / {limits?.RPM ?? '-'}</td>
                                    <td className="p-2 border">{rpdUsed} / {limits?.RPD ?? '-'}</td>
                                    <td className="p-2 border">{tpmUsed} / {limits?.TPM ?? '-'}</td>
                                    <td className="p-2 border">{totalRequests}</td>
                                    <td className="p-2 border">{totalTokens}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
