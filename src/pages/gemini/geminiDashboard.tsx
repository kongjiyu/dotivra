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

    async function load() {
        try {
            const d = await geminiBalanceService.getDashboard();
            setData(d);
            setError(null);
        } catch (e: any) {
            setError(e?.message || 'Failed to load dashboard');
        }
    }

    useEffect(() => {
        load();
    }, []);

    useEffect(() => {
        if (!auto) return;
        const t = setInterval(load, 4000);
        return () => clearInterval(t);
    }, [auto]);

    const limits = data?.limits;
    const keys = data?.keys || [];

    return (
        <div className="p-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-semibold">Gemini Balancer Dashboard</h1>
                <div className="flex items-center gap-3">
                    <button onClick={load} className="px-3 py-2 bg-blue-600 text-white rounded">Refresh</button>
                    <label className="flex items-center gap-2">
                        <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
                        Auto-refresh
                    </label>
                </div>
            </div>
            {error && <div className="mb-4 text-red-600">{error}</div>}

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
                            <th className="p-2 border">Last used</th>
                            <th className="p-2 border">Cooldown</th>
                            <th className="p-2 border">Total req</th>
                            <th className="p-2 border">Total tokens</th>
                        </tr>
                    </thead>
                    <tbody>
                        {keys.length === 0 && (
                            <tr>
                                <td colSpan={9} className="p-4 text-center text-gray-500">No keys configured</td>
                            </tr>
                        )}
                        {keys.map((k) => {
                            const cooldownMs = (k.cooldownUntil || 0) - Date.now();
                            return (
                                <tr key={k.id}>
                                    <td className="p-2 border font-mono">{k.idShort}</td>
                                    <td className="p-2 border">{k.status}</td>
                                    <td className="p-2 border">{k.rpmUsed} / {limits?.RPM ?? '-'}</td>
                                    <td className="p-2 border">{k.rpdUsed} / {limits?.RPD ?? '-'}</td>
                                    <td className="p-2 border">{k.tpmUsed} / {limits?.TPM ?? '-'}</td>
                                    <td className="p-2 border">{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleTimeString() : '-'}</td>
                                    <td className="p-2 border">{cooldownMs > 0 ? msToTime(cooldownMs) : '-'}</td>
                                    <td className="p-2 border">{k.totalRequests}</td>
                                    <td className="p-2 border">{k.totalTokens}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
