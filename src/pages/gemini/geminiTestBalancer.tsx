import { useState } from 'react';
import geminiBalanceService from '@/services/geminiBalance';

export default function GeminiTestBalancer() {
    const [count, setCount] = useState(12);
    const [model, setModel] = useState('gemini-2.5-pro');
    const [dryRun, setDryRun] = useState(true);
    const [running, setRunning] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const run = async () => {
        setRunning(true);
        setError(null);
        try {
            const r = await geminiBalanceService.testBalancer({ count, model, dryRun });
            setResult(r);
        } catch (e: any) {
            setError(e?.message || 'Failed to run test');
        } finally {
            setRunning(false);
        }
    };

    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-semibold mb-4">Gemini Test Balancer</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Requests count</span>
                    <input type="number" min={1} max={200} value={count} onChange={(e) => setCount(Number(e.target.value))} className="border rounded p-2" />
                </label>
                <label className="flex flex-col gap-1">
                    <span className="text-sm text-gray-600">Model</span>
                    <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="border rounded p-2" />
                </label>
                <label className="flex items-center gap-2 mt-6">
                    <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} />
                    Dry run (no external calls)
                </label>
            </div>

            <button onClick={run} disabled={running} className="px-4 py-2 bg-blue-600 text-white rounded">
                {running ? 'Running...' : 'Run test'}
            </button>

            {error && <div className="mt-4 text-red-600">{error}</div>}

            {result && (
                <div className="mt-6">
                    <div className="mb-4 text-gray-700">
                        Ran {result.count} requests against {result.model} (dryRun: {String(result.dryRun)})
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="p-2 border">Key</th>
                                    <th className="p-2 border">Requests</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.distribution.length === 0 && (
                                    <tr><td className="p-2 border" colSpan={2}>No distribution</td></tr>
                                )}
                                {result.distribution.map((d: any) => (
                                    <tr key={d.keyId}>
                                        <td className="p-2 border font-mono">{d.keyIdShort}</td>
                                        <td className="p-2 border">{d.requests}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-4 text-sm text-gray-500">Sample results: {JSON.stringify(result.resultsSample)}</div>
                </div>
            )}
        </div>
    );
}
