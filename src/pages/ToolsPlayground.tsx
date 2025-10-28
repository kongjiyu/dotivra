import { useEffect, useMemo, useState } from 'react';
import { buildApiUrl } from '@/lib/apiConfig';
import { useDocument } from '@/context/DocumentContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';

type ToolDef = {
  name: string;
  description?: string;
  sampleArgs?: any;
};

const DEFAULT_TOOLS: ToolDef[] = [
  { name: 'get_document_content', description: 'Retrieve full document content', sampleArgs: { documentId: '', reason: 'Inspect current content' } },
  { name: 'scan_document_content', description: 'Analyze structure and counts', sampleArgs: { reason: 'Quick scan' } },
  { name: 'search_document_content', description: 'Search by text query', sampleArgs: { query: 'Introduction', reason: 'Find section' } },
  { name: 'append_document_content', description: 'Append content at end', sampleArgs: { content: '\n\n## New Section\nDetails here...', reason: 'Add section' } },
  { name: 'insert_document_content', description: 'Insert at position', sampleArgs: { position: 0, content: 'Preface... ', reason: 'Insert at start' } },
  { name: 'replace_document_content', description: 'Replace range', sampleArgs: { position: { from: 0, to: 10 }, content: 'Replaced text', reason: 'Fix intro' } },
  { name: 'remove_document_content', description: 'Remove range', sampleArgs: { position: { from: 0, to: 10 }, reason: 'Delete snippet' } },
  { name: 'append_document_summary', description: 'Append summary text', sampleArgs: { content: 'Added summary note', reason: 'Update summary' } },
  { name: 'insert_document_summary', description: 'Insert summary text', sampleArgs: { position: 0, content: 'Summary start - ', reason: 'Insert' } },
  { name: 'replace_doument_summary', description: 'Replace summary range', sampleArgs: { position: { from: 0, to: 10 }, content: 'New summary', reason: 'Replace' } },
  { name: 'remove_document_summary', description: 'Remove summary range', sampleArgs: { position: { from: 0, to: 10 }, reason: 'Delete' } },
  { name: 'search_document_summary', description: 'Search in summary', sampleArgs: { query: 'Overview', reason: 'Find in summary' } },
  { name: 'get_all_documents_metadata_within_project', description: 'List project docs metadata', sampleArgs: { documentId: '', reason: 'Understand project structure' } },
  { name: 'get_document_summary', description: 'Get AI-generated summary', sampleArgs: { documentId: '', reason: 'Review summary' } },
];

export default function ToolsPlayground() {
  const { documentId: ctxDocId } = useDocument();

  const [tools, setTools] = useState<ToolDef[]>(DEFAULT_TOOLS);
  const [loadingTools, setLoadingTools] = useState(false);
  const [tool, setTool] = useState<string>(DEFAULT_TOOLS[0]?.name || 'scan_document_content');
  const [documentId, setDocumentId] = useState<string>('');
  const [argsText, setArgsText] = useState<string>('{}');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [originalContent, setOriginalContent] = useState<string>('');
  const [modifiedContent, setModifiedContent] = useState<string>('');

  // Prefill documentId from context
  useEffect(() => {
    if (ctxDocId && !documentId) setDocumentId(ctxDocId);
  }, [ctxDocId, documentId]);

  // Try to fetch available MCP tools (optional). Fallback to defaults on failure.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingTools(true);
      try {
        const res = await fetch(buildApiUrl('api/mcp/tools'));
        if (!res.ok) throw new Error('Failed to load tools');
        const data = await res.json();
        if (!cancelled && Array.isArray(data?.tools)) {
          const fromServer: ToolDef[] = data.tools.map((t: any) => ({
            name: t.name,
            description: t.description,
          }));
          // Merge defaults to keep sample args
          const merged = fromServer.map((t) => ({
            ...t,
            sampleArgs: DEFAULT_TOOLS.find(d => d.name === t.name)?.sampleArgs,
          }));
          setTools(merged.length ? merged : DEFAULT_TOOLS);
        }
      } catch {
        // ignore; keep defaults
      } finally {
        if (!cancelled) setLoadingTools(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Update sample args when tool changes
  useEffect(() => {
    const def = tools.find(t => t.name === tool);
    if (def?.sampleArgs) {
      const withDoc = { ...def.sampleArgs } as any;
      if ('documentId' in withDoc && documentId) withDoc.documentId = documentId;
      setArgsText(JSON.stringify(withDoc, null, 2));
    }
  }, [tool, tools, documentId]);

  const execEndpoint = useMemo(() => buildApiUrl('api/tools/execute'), []);

  // Fetch original content before modification
  const fetchOriginalContent = async () => {
    if (!documentId) return '';
    try {
      const res = await fetch(execEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'get_document_content',
          args: { documentId, reason: 'Preview before change' },
          documentId,
        }),
      });
      const data = await res.json();
      return data?.content || '';
    } catch {
      return '';
    }
  };

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    setShowPreview(false);
    try {
      let args: any = {};
      try {
        args = JSON.parse(argsText || '{}');
      } catch (e: any) {
        throw new Error('Args must be valid JSON');
      }

      // Check if this is a modifying tool
      const isModifyingTool = [
        'append_document_content',
        'insert_document_content',
        'replace_document_content',
        'remove_document_content',
        'append_document_summary',
        'insert_document_summary',
        'replace_doument_summary',
        'remove_document_summary',
      ].includes(tool);

      // Fetch original content if modifying
      if (isModifyingTool && documentId) {
        const original = await fetchOriginalContent();
        setOriginalContent(original);
      }

      const body = {
        tool,
        args,
        documentId: documentId || 'NOT_SET',
      };

      const res = await fetch(execEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `Request failed: ${res.status}`);
      }
      setResult(data);

      // Fetch modified content for preview
      if (isModifyingTool && documentId && data.success) {
        const modified = await fetchOriginalContent();
        setModifiedContent(modified);
        setShowPreview(true);
      }
    } catch (e: any) {
      setError(e?.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-2">Tools Playground</h1>
      <p className="text-sm text-gray-600 mb-6">Manually call existing document tools with preview mode for modifications.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Tool</span>
          <select
            className="border rounded p-2"
            value={tool}
            onChange={(e) => setTool(e.target.value)}
          >
            {tools.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
          {loadingTools ? <span className="text-xs text-gray-500">Loading tools…</span> : null}
          <span className="text-xs text-gray-500">{tools.find(t => t.name === tool)?.description}</span>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm text-gray-700">Document ID (optional)</span>
          <Input value={documentId} onChange={(e) => setDocumentId(e.target.value)} placeholder="doc_123" />
          <span className="text-xs text-gray-500">Uses current document if provided.</span>
        </label>

        <div className="flex items-end">
          <Button onClick={run} disabled={running} className="w-full">
            {running ? 'Running…' : 'Run Tool'}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-gray-700 mb-1">Args (JSON)</label>
        <Textarea
          value={argsText}
          onChange={(e) => setArgsText(e.target.value)}
          className="w-full h-48 font-mono text-sm"
        />
      </div>

      {error && (
        <div className="text-red-600 text-sm mb-4 p-3 border border-red-300 rounded bg-red-50">{error}</div>
      )}

      {result && (
        <div className="mt-4">
          <h2 className="text-lg font-medium mb-2">Result</h2>
          {typeof result.html === 'string' ? (
            <div className="border rounded p-3 bg-white mb-4" dangerouslySetInnerHTML={{ __html: result.html }} />
          ) : (
            <pre className="border rounded p-3 bg-gray-50 text-sm overflow-x-auto mb-4">{JSON.stringify(result, null, 2)}</pre>
          )}
        </div>
      )}

      {showPreview && (
        <div className="mt-6 border-t pt-6">
          <h2 className="text-lg font-medium mb-4">📊 Content Comparison (Before → After)</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold mb-2 text-blue-700 bg-blue-100 p-2 rounded flex items-center gap-2">
                <span>📄</span> Original Content
              </h3>
              <ScrollArea className="h-96 border-2 border-blue-200 rounded bg-blue-50/30">
                <div className="p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">{originalContent}</pre>
                </div>
              </ScrollArea>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2 text-green-700 bg-green-100 p-2 rounded flex items-center gap-2">
                <span>✅</span> Modified Content
              </h3>
              <ScrollArea className="h-96 border-2 border-green-200 rounded bg-green-50/30">
                <div className="p-4">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-gray-800">{modifiedContent}</pre>
                </div>
              </ScrollArea>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200">
            <h4 className="font-semibold text-sm mb-2 text-gray-700">📈 Statistics</h4>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Original length:</span>
                <span className="ml-2 font-mono font-semibold">{originalContent.length}</span>
                <span className="ml-1 text-gray-500">chars</span>
              </div>
              <div>
                <span className="text-gray-600">Modified length:</span>
                <span className="ml-2 font-mono font-semibold">{modifiedContent.length}</span>
                <span className="ml-1 text-gray-500">chars</span>
              </div>
              <div>
                <span className="text-gray-600">Difference:</span>
                <span className={`ml-2 font-mono font-semibold ${modifiedContent.length - originalContent.length > 0 ? 'text-green-600' : modifiedContent.length - originalContent.length < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                  {modifiedContent.length - originalContent.length > 0 ? '+' : ''}{modifiedContent.length - originalContent.length}
                </span>
                <span className="ml-1 text-gray-500">chars</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

