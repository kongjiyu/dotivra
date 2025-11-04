import React, { useEffect, useState } from 'react';
import { buildApiUrl } from '../../lib/apiConfig';

const ToolsTest: React.FC = () => {
  const [tools, setTools] = useState<string[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [argsText, setArgsText] = useState<string>('{}');
  const [documentId, setDocumentId] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(buildApiUrl('api/tools/registry'))
      .then((r) => r.json())
      .then((j) => {
        if (j && Array.isArray(j.tools)) {
          setTools(j.tools);
          setSelected(j.tools[0] || '');
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  const execute = async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    let args;
    try {
      args = argsText ? JSON.parse(argsText) : {};
    } catch (e) {
      setError('Invalid JSON in args');
      setLoading(false);
      return;
    }

    try {
      const resp = await fetch(buildApiUrl('api/tools/execute'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: selected, args, documentId: documentId || undefined }),
      });
      const json = await resp.json();
      setResult(json);
      if (!resp.ok) setError(json?.error || 'Tool execution failed');
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Tools Test</h2>

      {error && <div className="mb-4 text-red-600">{error}</div>}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Tool</label>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full p-2 border rounded">
          {tools.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Document ID (optional)</label>
        <input value={documentId} onChange={(e) => setDocumentId(e.target.value)} className="w-full p-2 border rounded" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Args (JSON)</label>
        <textarea value={argsText} onChange={(e) => setArgsText(e.target.value)} rows={8} className="w-full p-2 border rounded font-mono text-sm" />
      </div>

      <div className="flex items-center gap-2">
        <button onClick={execute} disabled={!selected || loading} className="px-4 py-2 bg-blue-600 text-white rounded">
          {loading ? 'Running...' : 'Execute'}
        </button>
        <button onClick={() => { setArgsText('{}'); setResult(null); setError(null); }} className="px-3 py-2 border rounded">Reset</button>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-2">Result</h3>
        <pre className="p-4 bg-gray-100 rounded text-sm overflow-auto">
          {result ? JSON.stringify(result, null, 2) : 'No result yet'}
        </pre>
      </div>
    </div>
  );
};

export default ToolsTest;
