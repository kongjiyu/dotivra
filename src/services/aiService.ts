// src/services/aiService.ts
import { repositoryContextService } from './repositoryContextService';
import { FirestoreService } from '../../firestoreService';
import type { User } from 'firebase/auth';
import { buildApiUrl } from '@/lib/apiConfig';

const GENERATE_API = buildApiUrl('api/gemini/generate');
const TOOLS_EXECUTE_API = buildApiUrl('api/tools/execute');
const FUNCTIONS_BASE = 'https://us-central1-dotivra.cloudfunctions.net';

class AIService {
    private defaultModel = 'gemini-2.5-pro';

    /**
     * AI Agent with multi-polling approach - sends to /api/gemini/generate
     * Handles JSON parsing with retry logic
     */
    async *executeAIAgent(
        prompt: string,
        documentId?: string,
        conversationHistory?: Array<{role: string; content: string}>,
        selectedText?: string,
        signal?: AbortSignal
    ): AsyncGenerator<{stage: string; content: any; thought?: string; toolExecutions?: any[]}> {
        const toolExecutions: any[] = []; // Track all tool executions with input/output

        type CachedDocument = {
            id: string;
            data: Awaited<ReturnType<typeof FirestoreService.getDocument>>;
        } | null;

        let cachedDocument: CachedDocument = null;

        const loadDocumentData = async (docId?: string) => {
            if (!docId) {
                return null;
            }

            if (cachedDocument && cachedDocument.id === docId) {
                return cachedDocument.data;
            }

            try {
                const documentData = await FirestoreService.getDocument(docId);
                cachedDocument = { id: docId, data: documentData };
                return documentData;
            } catch (err) {
                console.error('Error loading document data:', err);
                cachedDocument = null;
                return null;
            }
        };
        
        try {
            // Build system prompt with tool descriptions and stage format
            const systemPrompt = `
            ## Persona
You are a helpful, structured, and friendly AI assistant who collaborates with users on documents and repositories. Communicate warmly using everyday language, guiding both technical and non-technical users with clear explanations.

## Goals
- Understand each request quickly and accurately.
- Plan and execute document or repository actions through the available tools.
- Provide concise, human-readable summaries of what you did.
- Maintain layout integrity, divider rules, and structural safety for all document changes.

## Available Runtime Variables
- \`{{DOCUMENT_ID}}\`: Active document identifier.
- \`{{REPOLINK}}\`: Active repository link.
- \`{{DOCUMENT_LAST_UPDATED}}\`: ISO timestamp (UTC) of the document's most recent update, or \`"UNKNOWN"\` when missing.
- \`{{TEMPLATE_TITLE}}\`: Current task title or template name.
Always substitute these placeholders with their runtime values inside tool calls or explanations.

## Response Contract (Critical)
Return **exactly one JSON object** per turn — no surrounding text, no additional objects. Escape special characters (use \`\n\`, \`\"\`, etc.). The object must follow:
\`\`\`
{"stage":"STAGE_NAME","thought":"internal reasoning","content":"user-facing text or tool payload","nextStage":"NEXT_STAGE_NAME"}
\`\`\`

Important: Do NOT wrap the JSON object in markdown code fences (for example, do not return \`\`\`json  MY_JSON_CONTENT \`\`\`). Return the raw JSON object only so it can be parsed directly. When providing tool arguments in the \`content\` field, supply raw JSON objects/strings — never include triple-backtick wrappers.

## Stage Flow
You will be invoked multiple times. Progress strictly in this order without repeating stages unless explicitly required:

- Your very first response in every session must use the **Planning** stage. Never begin with a different stage, even if you think you already know the answer.

1. **Planning**
	- Interpret the user's latest request and confirm the objective in plain language.
	- Set \`nextStage\` to \`"reasoning"\`.

2. **Reasoning**
	- Reference the planning insight and decide on your approach.
	- Determine which tool to use first (or if no tool is needed).
	- Set \`nextStage\` to:
	  - \`"toolUsed"\` when a tool call is required.
	  - \`"summary"\` when the task is trivial and needs no tools.
	  - \`"done"\` only if work is complete after reacting to a previous tool result.

3. **ToolUsed**
	- Issue the tool request.
	- \`content\` must be an object: \`{"tool":"tool_name","args":{...},"description":"friendly explanation"}\`.
	- Choose \`nextStage\` based on what remains (\`"reasoning"\`, \`"toolUsed"\`, or \`"summary"\`).

4. **Summary**
	- Produce a short markdown summary (start with \`## Title\`).
	- Recap what changed in natural language.
	- Set \`nextStage\` to \`"done"\`.

5. **Done**
	- Terminal state. No additional content beyond the JSON object.

## Tool Catalogue (Argument Shapes Must Match Exactly)
- **get_document_content**
	- Purpose: Load the active document into cache and return its full content with metadata.
	- Usage: \`{"tool":"get_document_content","args":{"documentId":"{{DOCUMENT_ID}}","reason":"Reviewing the entire document"},"description":"Reading your document..."}\`
	- Signature: \`{documentId, reason}\` → \`{success, content, length}\`
- **scan_document_content**
	- Purpose: Gather quick document metrics (headings, word counts) without mutating content.
	- Usage: \`{"tool":"scan_document_content","args":{"reason":"Checking structure before edits"},"description":"Scanning the document layout..."}\`
	- Signature: \`{reason}\` → \`{success, analysis, preview}\`
- **search_document_content**
	- Purpose: Retrieve exact positions for specific text to guide precise edits.
	- Usage: \`{"tool":"search_document_content","args":{"query":"## Introduction","reason":"Locating the introduction heading"},"description":"Looking for the introduction section..."}\`
	- Signature: \`{query, reason}\` → \`{success, matches, total_matches}\`
- **append_document_content**
	- Purpose: Append normalized content to the end of the document with safe spacing.
    - Usage: \`{"tool":"append_document_content","args":{"content":"<h2>Next Steps</h2><hr class=\"tiptap-divider\" />...","reason":"Adding a closing section"},"description":"Adding your closing section at the end..."}\`
	- Signature: \`{content, reason}\` → \`{success, appended_length, html}\`
- **insert_document_content**
	- Purpose: Insert content at an exact character offset you supply via \`position\`.
	- Usage: \`{"tool":"insert_document_content","args":{"position":1024,"content":"<p>New paragraph</p>","reason":"Placing content in the overview"},"description":"Inserting the requested paragraph..."}\`
	- Signature: \`{position, content, reason}\` → \`{success, inserted_length, html}\`
- **insert_document_content_at_location**
	- Purpose: Find a target string and insert content before or after it while respecting layout boundaries.
	- Usage: \`{"tool":"insert_document_content_at_location","args":{"target":"<h2>Features</h2>","position":"after","content":"<p>Updated feature list...</p>","reason":"Extending the features section"},"description":"Adding your updates after the Features heading..."}\`
	- Signature: \`{target, position, content, reason}\` → \`{success, inserted_length, html}\`
- **replace_document_content**
	- Purpose: Swap a character span with new normalized content and return what changed.
	- Usage: \`{"tool":"replace_document_content","args":{"position":{"from":250,"to":410},"content":"<p>Revised copy...</p>","reason":"Refreshing the introduction paragraph"},"description":"Replacing the introduction paragraph..."}\`
	- Signature: \`{position:{from,to}, content, reason}\` → \`{success, removed_length, inserted_length, html}\`
- **remove_document_content**
	- Purpose: Delete a character range and audit the removed snippet.
	- Usage: \`{"tool":"remove_document_content","args":{"position":{"from":500,"to":620},"reason":"Removing redundant bullet list"},"description":"Clearing the redundant list..."}\`
	- Signature: \`{position:{from,to}, reason}\` → \`{success, removed_length, html}\`
- **append_document_summary**
	- Purpose: Add text to the Firestore summary associated with the active document.
	- Usage: \`{"tool":"append_document_summary","args":{"content":"Added deployment checklist.","reason":"Logging updates in the summary"},"description":"Updating the summary with your notes..."}\`
	- Signature: \`{content, reason}\` → \`{success, html}\`
- **insert_document_summary**
	- Purpose: Insert summary text at a specific character offset.
	- Usage: \`{"tool":"insert_document_summary","args":{"position":120,"content":"Include mission statement.","reason":"Enhancing the summary"},"description":"Adjusting the summary content..."}\`
	- Signature: \`{position, content, reason}\` → \`{success, html}\`
- **replace_doument_summary**
	- Purpose: Replace part of the summary with new wording (tool name retains legacy spelling).
	- Usage: \`{"tool":"replace_doument_summary","args":{"position":{"from":0,"to":75},"content":"Updated executive overview.","reason":"Refreshing the summary opening"},"description":"Rewriting the start of the summary..."}\`
	- Signature: \`{position:{from,to}, content, reason}\` → \`{success, html}\`
- **remove_document_summary**
	- Purpose: Remove a summary range and return the removed text for confirmation.
	- Usage: \`{"tool":"remove_document_summary","args":{"position":{"from":200,"to":260},"reason":"Cleaning outdated summary content"},"description":"Trimming the outdated summary details..."}\`
	- Signature: \`{position:{from,to}, reason}\` → \`{success, html}\`
- **search_document_summary**
	- Purpose: Locate terms within the summary to guide targeted revisions.
	- Usage: \`{"tool":"search_document_summary","args":{"query":"deployment","reason":"Checking summary for deployment notes"},"description":"Searching the summary for deployment references..."}\`
	- Signature: \`{query, reason}\` → \`{success, matches, total_matches}\`
- **get_all_documents_metadata_within_project**
	- Purpose: Retrieve metadata for every document tied to the same project as the active document.
	- Usage: \`{"tool":"get_all_documents_metadata_within_project","args":{"documentId":"{{DOCUMENT_ID}}","reason":"Reviewing related project documents"},"description":"Gathering related project documents..."}\`
	- Signature: \`{documentId, reason}\` → \`{success, documentsCount, documents}\`
- **get_document_summary**
	- Purpose: Fetch the summary content for the active or specified document.
	- Usage: \`{"tool":"get_document_summary","args":{"documentId":"{{DOCUMENT_ID}}","reason":"Confirming existing summary"},"description":"Fetching the document summary..."}\`
	- Signature: \`{documentId, reason}\` → \`{success, summary, summaryLength}\`
- **verify_document_change**
	- Purpose: Confirm that previous tool operations generated the expected results.
	- Usage: \`{"tool":"verify_document_change","args":{"reason":"Ensuring the recent edits persisted"},"description":"Double-checking the recent edits..."}\`
	- Signature: \`{reason}\` → change verification payload
- **get_repo_structure**
	- Purpose: Inspect the repository tree to understand file layout before editing.
	- Usage: \`{"tool":"get_repo_structure","args":{"repoLink":"{{REPOLINK}}","reason":"Understanding repository structure before editing"},"description":"Reviewing the repository structure..."}\`
	- Signature: \`{repoLink, branch?, reason}\` → \`{success, tree, totalItems}\`
- **get_repo_commits**
	- Purpose: Review recent repository commits for additional context on ongoing work.
	- Usage: \`{"tool":"get_repo_commits","args":{"repoLink":"{{REPOLINK}}","per_page":5,"reason":"Reviewing the latest work"},"description":"Checking recent repository updates..."}\`
	- Signature: \`{repoLink, branch?, page?, per_page?, reason}\` → \`{success, commits, commitsCount}\`

All tool names and argument keys are case-sensitive — do not invent new ones.

## Repository Context Mandate
When \`{{REPOLINK}}\` is available and you plan to modify a document, first call:
1. \`get_repo_structure\` with reason “Understanding repository structure before editing”.
2. \`get_repo_commits\` with reason “Reviewing the latest work”.
Reference the returned structure/commits in later reasoning unless the repo link changes.
- If the document already contains a "Repository Structure Overview" section, refresh that existing section instead of creating a new heading when updating repository details.

## Freshness Validation
- Treat \`{{DOCUMENT_LAST_UPDATED}}\` as the document's current last-edited timestamp. If it resolves to \`"UNKNOWN"\`, note that the recency is unclear.
- When commit data is available (for example after \`get_repo_commits\`), compare the newest commit's timestamp with \`{{DOCUMENT_LAST_UPDATED}}\` to detect documentation drift.
- Surface the result of that comparison in your reasoning and summary: flag if the repository is ahead, or confirm alignment when timestamps match or the document is newer.
- Use this comparison to justify whether additional documentation updates are required.
## Fallback Context Handling
- If \`{{REPOLINK}}\` is missing, explicitly set to \`"NOT_SET"\`, or repository tools return an authorization error, skip the repository context requirement.
- Note in your reasoning that repository context is unavailable, then proceed directly to document scanning or reading as needed.
- Resume the repository mandate if a valid repo link becomes available later in the session.

## Context Checks for Rewrites or Improvements
Before improving or rewriting content, ensure you understand the surrounding context. Use scanning/search tools or summaries if needed. If context is missing, ask the user for clarification instead of guessing.

## Section-Based Insertion Workflow
1. \`search_document_content\` to locate the referenced heading.
2. Find the section boundary (usually the next heading of equal or higher level).
3. Compute exact positions from search results.
4. Only then execute the insert/append call.

## Layout Safety Rules
- Never overflow unrelated elements. When unsure, insert before or after the element rather than inside.
- Every \`<h1>\` or \`<h2>\` must be followed by exactly one \`<hr class="tiptap-divider" />\`. If a divider already exists, ensure there is only one.
- Rely on tool metadata (positions, ranges) to avoid corrupting structure.

## Formatting Consistency Checks
- Before inserting or replacing blocks, scan the surrounding markup to ensure headings stay at their intended hierarchy. If you encounter a heading such as "5. Frontend Setup", make sure it is not nested inside a list item and aligns with sibling headings like "4. Backend Setup".
- When editing ordered lists, close the list before introducing a new heading and reopen it afterward if needed. Never wrap block-level headings (\`<h1>\`–\`<h3>\`, numbered headings, etc.) inside \`<li>\` elements.
- Preserve numbering coherence whenever you adjust step-by-step instructions. Confirm that new content does not shift existing numbering or indent levels unintentionally.
- Ensure subsection numbering (for example, \`8.1\`) matches the nearest parent heading (such as \`8.\`). Update existing numbering rather than creating duplicates or conflicting sequences.

## Content Scope Restrictions
- Keep suggestions, recommendations, and optional follow-up actions inside your chat responses. Do not append guidance such as "Next Steps" or best-practice tips into the document content unless the user explicitly requests that exact section in the document.
- Before adding a new numbered heading or checklist, search for an existing counterpart. Update or extend the existing section instead of creating duplicate numbering or resetting the sequence.
- Whenever you add an \`<h1>\` or \`<h2>\`, ensure a single \`<hr class="tiptap-divider" />\` immediately follows it. If that divider already exists, leave it untouched and do not append another.
- Do not insert dividers after other heading levels unless the user explicitly requests that placement.

## Markup Safety Rules
- Keep new text outside of tag declarations. Never insert user content between a tag name and the closing angle bracket (avoid structures like \`<mark USER TEXT>\`). Place content between the opening and closing tags instead.
- Avoid creating or editing markup that splits paired tags across instructions. Always preserve balanced opening and closing tags surrounding the content you modify.

## Precise Range Requirement
For \`remove_document_content\` and \`replace_document_content\`:
1. Always run \`search_document_content\` first.
2. Use \`character_position\` and \`match_length\` to compute \`from\`/\`to\`.
3. For multi-line regions, search for both start and end markers; use their positions to define the span.
4. Double-check: \`to - from\` equals the length of text being removed.

## Search Result Interpretation
- Treat \`search_document_content\` outputs as the source of truth for absolute character offsets. Use \`character_position\` for the start index and add \`match_length\` to derive the end.
- When inserting adjacent to a match, derive the insertion point from \`character_position\` (start) or \`character_position + match_length\` (end) rather than guessing.
- If multiple matches exist, rely on \`element_index\` and the provided context snippet to confirm you are acting on the correct occurrence before computing ranges or issuing tool calls.

## Tool Result Handling
- After each tool execution you will receive a \`toolResult\` payload.
- If \`success\` is \`false\`, retry or adjust your strategy immediately.
- If \`success\` is \`true\`, incorporate the returned data into the next reasoning stage.

## Communication Style
- Speak conversationally (“I'm checking your document now”).
- Avoid technical jargon and keep explanations brief but clear.
- Do not ask for permission before running tools when you already have enough context.

## Proactive Execution
- During reasoning, if the next tool call is obvious and inputs are ready, move straight to \`toolUsed\` without asking the user.
- Only ask follow-up questions when information is genuinely missing.

## Summary Guidelines
- Use a heading (\`## ...\`) followed by a short recap of completed actions.
- Focus on outcomes, not internal reasoning.
- When citing AI Preview Changes output, list each referenced item separately instead of combining them into a single link or reference.

## Consistency Checks
- Preserve existing highlights or formatting not introduced by AI preview changes.
- Maintain divider rules and block padding as enforced by the tool service metadata.
            
            `;

            const getRepoLinkForDocument = async (docId?: string): Promise<string | null> => {
                if (!docId) return null;
                try {
                    const document = await loadDocumentData(docId);
                    if (!document || !document.Project_Id) return null;
                    const project = await FirestoreService.getProject(document.Project_Id);
                    let repoLink: string | undefined | null = project?.GitHubRepo || (project as any)?.githubLink || null;
                    if (!repoLink) return null;
                    repoLink = String(repoLink).trim();
                    
                    // Extract owner/repo format from various formats
                    // Format: owner/repo (e.g., kongjiyu/battlecatsinfo.github.io)
                    if (repoLink.includes('github.com/')) {
                        // Extract from URL: https://github.com/owner/repo
                        const match = repoLink.match(/github\.com\/([^\/]+\/[^\/\s]+)/);
                        if (match) {
                            repoLink = match[1].replace('.git', '');
                        }
                    } else if (/^[^\/\s]+\/[^\/\s]+$/.test(repoLink)) {
                        // Already in owner/repo format
                        repoLink = repoLink.replace('.git', '');
                    } else {
                        // Unknown format - return null
                        return null;
                    }
                    
                    return repoLink;
                } catch (err) {
                    console.error('Error fetching repo link for document:', err);
                    return null;
                }
            };

            const getProjectNameForDocument = async (docId?: string, repo?: string | null): Promise<string | null> => {
                // Prefer repository-derived project name (repo name). If not available, fall back to document title.
                try {
                    if (repo && typeof repo === 'string' && repo.includes('/')) {
                        const parts = repo.split('/');
                        const repoName = parts[1] || parts[0];
                        // Convert common repo-name separators to spaces for nicer presentation
                        const pretty = String(repoName).replace(/[-_]+/g, ' ').trim();
                        return pretty || repoName;
                    }

                    if (!docId) return null;
                    const doc = await loadDocumentData(docId);
                    if (!doc) return null;
                    return (doc.DocumentName as string) || (doc.Title as string) || null;
                } catch (err) {
                    console.error('Error deriving project name for document:', err);
                    return null;
                }
            };

            const getTemplateTitleForDocument = async (docId?: string): Promise<string | null> => {
                if (!docId) {
                    return null;
                }

                try {
                    const document = await loadDocumentData(docId);
                    if (!document) {
                        return null;
                    }

                    if (document.Template_Id) {
                        const template = await FirestoreService.getTemplate(document.Template_Id);
                        if (template?.TemplateName) {
                            return template.TemplateName;
                        }
                    }

                    return document.DocumentName || document.Title || null;
                } catch (err) {
                    console.error('Error fetching template title for document:', err);
                    return null;
                }
            };

            const normalizeTimestampToIso = (value: unknown): string | null => {
                if (!value) {
                    return null;
                }

                if (typeof value === 'string') {
                    const parsed = Date.parse(value);
                    if (!Number.isNaN(parsed)) {
                        return new Date(parsed).toISOString();
                    }
                    return value;
                }

                if (value instanceof Date) {
                    return value.toISOString();
                }

                if (typeof value === 'number' && Number.isFinite(value)) {
                    return new Date(value).toISOString();
                }

                if (value && typeof value === 'object') {
                    const maybeTimestamp = value as { toDate?: () => Date; seconds?: number; nanoseconds?: number };

                    if (typeof maybeTimestamp?.toDate === 'function') {
                        try {
                            const asDate = maybeTimestamp.toDate();
                            if (asDate) {
                                return asDate.toISOString();
                            }
                        } catch {
                            // ignore invalid timestamp conversion attempts
                        }
                    }

                    if (typeof maybeTimestamp?.seconds === 'number') {
                        const seconds = maybeTimestamp.seconds;
                        const nanos = typeof maybeTimestamp.nanoseconds === 'number' ? maybeTimestamp.nanoseconds : 0;
                        const millis = seconds * 1000 + Math.floor(nanos / 1e6);
                        return new Date(millis).toISOString();
                    }
                }

                return null;
            };

            const getDocumentLastUpdated = async (docId?: string): Promise<string | null> => {
                if (!docId) {
                    return null;
                }

                try {
                    const documentData = await loadDocumentData(docId);
                    if (!documentData) {
                        return null;
                    }

                    const candidateKeys = [
                        'UpdatedAt',
                        'updatedAt',
                        'Updated_At',
                        'updated_at',
                        'Updated_Time',
                        'updated_Time',
                        'updated_time',
                        'UpdatedTime',
                        'updatedTime',
                        'Edited_Time',
                        'editedTime',
                        'lastUpdated',
                        'LastUpdated'
                    ];

                    const asRecord = documentData as unknown as Record<string, unknown>;
                    for (const key of candidateKeys) {
                        const iso = normalizeTimestampToIso(asRecord?.[key]);
                        if (iso) {
                            return iso;
                        }
                    }

                    const metadata = (asRecord?.Metadata || asRecord?.metadata) as Record<string, unknown> | undefined;
                    if (metadata) {
                        for (const key of candidateKeys) {
                            const iso = normalizeTimestampToIso(metadata[key]);
                            if (iso) {
                                return iso;
                            }
                        }
                    }

                    return null;
                } catch (err) {
                    console.error('Error deriving document last updated timestamp:', err);
                    return null;
                }
            };

            // Build full prompt with selected text
            let fullPrompt = prompt;
            if (selectedText) {
                fullPrompt = `Selected text from document: "${selectedText}"\n\nUser request: ${prompt}`;
            }

            const templateTitle = await getTemplateTitleForDocument(documentId);
            const repoLink = await getRepoLinkForDocument(documentId);
            const documentLastUpdated = await getDocumentLastUpdated(documentId);
            const projectName = await getProjectNameForDocument(documentId, repoLink);

            // Inject runtime metadata into system prompt
            const systemPromptWithDocId = systemPrompt.replace(/\{\{DOCUMENT_ID\}\}/g, documentId || 'NOT_SET');
            const systemPromptWithLastUpdated = systemPromptWithDocId.replace(/\{\{DOCUMENT_LAST_UPDATED\}\}/g, documentLastUpdated || 'UNKNOWN');
            const systemPromptWithTemplate = systemPromptWithLastUpdated.replace(/\{\{TEMPLATE_TITLE\}\}/g, templateTitle || 'NOT_SET');
            const systemPromptWithProject = systemPromptWithTemplate.replace(/\{\{PROJECT_NAME\}\}/g, projectName || (templateTitle || 'NOT_SET'));
            const systemPromptResolved = systemPromptWithProject.replace(/\{\{REPOLINK\}\}/g, repoLink || 'NOT_SET');

            // Add conversation history (limit and prioritize current message)
            const limitedHistory = (conversationHistory || []).slice(-6);
            const messages = [...limitedHistory, { role: 'user', content: fullPrompt }];

            let continueExecution = true;
            let retryCount = 0;
            const maxRetries = 3;
            let toolExecutionCount = 0;
            const maxToolExecutions = 50;
            let currentStage = 'planning';
            let stageHistory: string[] = []; // Track stages we've been through
            let lastToolResult: any = null; // Track last tool execution result

            // Don't yield the initial "Starting..." message - keep it
            // yield { stage: 'planning', content: 'Starting AI agent execution...' };

            while (continueExecution && toolExecutionCount < maxToolExecutions) {
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay between polls

                // Build context from previous stages for better continuity
                let stageContext = '';
                if (stageHistory.length > 0) {
                    stageContext = `\n\nPREVIOUS STAGES COMPLETED: ${stageHistory.join(' → ')}`;
                    stageContext += `\nCURRENT STAGE TO EXECUTE: ${currentStage}`;
                    stageContext += '\nRemember: Review the conversation history to see what you analyzed in previous stages. Build on that analysis.';
                }

                // Prepare prompt for current iteration
                const iterationPrompt = messages.map(m => 
                    `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
                ).join('\n\n') + stageContext + '\n\nSystem: ' + systemPromptResolved;

                // Dynamic token allocation based on stage
                let maxTokens = 2048; // Default
                if (currentStage === 'summary') {
                    maxTokens = 8192; // More tokens for detailed summary
                } else if (currentStage === 'planning') {
                    maxTokens = 1024; // Less tokens for planning
                } else if (currentStage === 'reasoning') {
                    maxTokens = 2048; // Standard for reasoning
                } else if (currentStage === 'toolUsed') {
                    maxTokens = 1024; // Tool requests are usually short
                }

                // Call Gemini API
                const response = await fetch(GENERATE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: iterationPrompt,
                        model: 'gemini-2.5-pro',
                        generationConfig: {
                            temperature: 0.3,
                            maxOutputTokens: maxTokens
                        }
                    }),
                    signal: signal // Add abort signal
                });

                if (!response.ok) {
                    throw new Error(`Gemini API failed: ${response.status}`);
                }

                const data = await response.json();
                const aiResponse = data.text || '';
                // Try to parse JSON from response with robust cleanup
                let parsed: any;
                try {
                    // Preprocess: if the model returned a fenced block (``` or ```json), prefer inner content
                    let candidate = aiResponse;
                    const fenceMatch = aiResponse.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
                    if (fenceMatch) {
                        candidate = fenceMatch[1];
                    }

                    // Helper: attempt to parse, with a repair pass that removes trailing commas
                    const tryParseWithRepairs = (text: string) => {
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            // Remove trailing commas before } or ]
                            try {
                                const cleaned = text.replace(/,\s*(?=[}\]])/g, '');
                                return JSON.parse(cleaned);
                            } catch (e2) {
                                return null;
                            }
                        }
                    };

                    // First, try to find the first {...} block and parse it
                    const firstObjectMatch = candidate.match(/\{[\s\S]*\}/);
                    if (firstObjectMatch) {
                        parsed = tryParseWithRepairs(firstObjectMatch[0]);
                    }

                    // If still not parsed, try the whole candidate
                    if (!parsed) {
                        parsed = tryParseWithRepairs(candidate);
                    }

                    // Additional heuristic: split into lines and try single-line JSON entries
                    if (!parsed) {
                        const lines: string[] = candidate.trim().split('\n').map((ln: string) => ln.trim()).filter(Boolean);
                        for (const line of lines) {
                            if (line.startsWith('{') && line.endsWith('}')) {
                                parsed = tryParseWithRepairs(line);
                                if (parsed) break;
                            }
                        }
                    }

                    if (!parsed) {
                        throw new Error('No valid JSON found after cleanup');
                    }

                    // Validate required fields
                    if (!parsed.stage || parsed.content === undefined) {
                        throw new Error('Invalid JSON structure - missing stage or content');
                    }
                    
                    // Ensure thought field exists (can be empty)
                    if (!parsed.thought) {
                        parsed.thought = parsed.stage;
                    }

                    // Validate nextStage field (should always be present)
                    if (!parsed.nextStage) {
                        // Infer nextStage based on current stage
                        if (parsed.stage === 'planning') {
                            parsed.nextStage = 'reasoning';
                        } else if (parsed.stage === 'reasoning') {
                            parsed.nextStage = 'toolUsed';
                        } else if (parsed.stage === 'toolUsed') {
                            parsed.nextStage = 'reasoning';
                        } else if (parsed.stage === 'summary') {
                            parsed.nextStage = 'done';
                        }
                    }

                    // Track stage in history
                    stageHistory.push(parsed.stage);
                    // Reset retry count on success
                    retryCount = 0;

                } catch (parseError) {
                    retryCount++;
                    console.error(`❌ JSON parse error (attempt ${retryCount}/${maxRetries}):`, parseError);
                    console.error('Raw response:', aiResponse);

                    if (retryCount >= maxRetries) {
                        yield { 
                            stage: 'error', 
                            content: 'Failed to get valid JSON response after 3 attempts. Please try again.' 
                        };
                        break;
                    }

                    // Add error feedback to conversation with clearer instructions
                    messages.push({
                        role: 'assistant',
                        content: aiResponse
                    });
                    messages.push({
                        role: 'user',
                        content: `ERROR: Your response was not valid JSON. Please respond with EXACTLY ONE JSON object on a single line in the format: {"stage":"...","thought":"...","content":"...","nextStage":"..."} - NO NEWLINES, NO MULTIPLE OBJECTS. MUST include nextStage field.`
                    });

                    continue;
                }

                // Add AI response to conversation
                messages.push({
                    role: 'assistant',
                    content: JSON.stringify(parsed)
                });

                // Yield the stage to client with tool executions
                yield { ...parsed, toolExecutions: [...toolExecutions] };

                // Update currentStage based on nextStage
                // If nextStage is 'done', trigger summary stage first
                if (parsed.nextStage === 'done' && parsed.stage !== 'summary') {
                    currentStage = 'summary';
                } else {
                    currentStage = parsed.nextStage || 'done';
                }

                // Handle different stages
                if (parsed.stage === 'done' || (parsed.stage === 'summary' && parsed.nextStage === 'done')) {
                    continueExecution = false;
                    break;
                }

                if (parsed.stage === 'toolUsed') {
                    toolExecutionCount++;
                    
                    const toolData = parsed.content;
                    // Execute actual tool via API
                    try {
                        // Sanitize args to remove triple-backtick wrappers if present (common when AI returns fenced blocks)
                        const sanitizeArgs = (args: any) => {
                            if (!args) return args;
                            const copy = JSON.parse(JSON.stringify(args));

                            const tryParseOrUnwrap = (s: any) => {
                                if (typeof s !== 'string') return s;

                                const str = String(s);
                                // If the entire string is a single fenced block, try to parse inner as JSON first
                                const singleFence = str.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
                                if (singleFence) {
                                    const inner = singleFence[1];
                                    try {
                                        return JSON.parse(inner);
                                    } catch {
                                        return inner;
                                    }
                                }

                                // Otherwise unwrap any fenced blocks globally
                                const unwrapped = str.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, (_m, inner) => inner);
                                const trimmed = unwrapped.trim();

                                // If the unwrapped content looks like JSON, attempt to parse it
                                if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                                    try {
                                        return JSON.parse(trimmed);
                                    } catch {
                                        // fall through to return unwrapped string
                                    }
                                }

                                return unwrapped;
                            };

                            // Sanitize top-level content field if present
                            if (typeof (copy as any).content === 'string') {
                                (copy as any).content = tryParseOrUnwrap((copy as any).content);
                            }

                            // Shallow sanitize other string fields and common nested structures
                            for (const k of Object.keys(copy)) {
                                if (typeof copy[k] === 'string') {
                                    copy[k] = tryParseOrUnwrap(copy[k]);
                                } else if (copy[k] && typeof copy[k] === 'object') {
                                    // If nested object has a content key, sanitize it
                                    if (typeof (copy[k] as any).content === 'string') {
                                        (copy[k] as any).content = tryParseOrUnwrap((copy[k] as any).content);
                                    }
                                }
                            }

                            return copy;
                        };

                        const sanitizedArgs = sanitizeArgs(toolData.args);

                        let toolResponse = await fetch(TOOLS_EXECUTE_API, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                tool: toolData.tool,
                                args: sanitizedArgs,
                                documentId: documentId
                            })
                        });
                        if (toolResponse.status === 404) {
                            const endpoint = 'api/tools/execute';
                            const fallbackUrl = `${FUNCTIONS_BASE}/${endpoint}`;
                            toolResponse = await fetch(fallbackUrl, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    tool: toolData.tool,
                                    args: toolData.args,
                                    documentId: documentId
                                })
                            });
                        }

                        let toolResult: any;
                        if (!toolResponse.ok) {
                            console.error(`❌ Tool execution failed: ${toolResponse.status}`);
                            toolResult = {
                                success: false,
                                tool: toolData.tool,
                                error: `Tool execution failed with status ${toolResponse.status}`,
                                result: null
                            };
                        } else {
                            const toolData_response = await toolResponse.json();
                            toolResult = {
                                success: true,
                                tool: toolData.tool,
                                result: toolData_response
                            };
                        }

                        // Track this tool execution with input and output
                        toolExecutions.push({
                            tool: toolData.tool,
                            args: sanitizedArgs,
                            result: toolResult.result,
                            success: toolResult.success,
                            timestamp: Date.now()
                        });

                        // Store the result for validation
                        lastToolResult = toolResult;
                        
                        // Yield tool result to client with tool executions history
                        yield {
                            stage: 'toolResult',
                            content: toolResult,
                            toolExecutions: [...toolExecutions] // Send copy of executions
                        };

                        // Add complete tool result to conversation for next reasoning stage
                        const resultMessage = toolResult.success 
                            ? `Tool "${toolResult.tool}" executed successfully.\n\nCOMPLETE RESULT:\n${JSON.stringify(toolResult.result, null, 2)}\n\nValidate this result and decide your next action. If the task is complete, set nextStage to "done".`
                            : `Tool "${toolResult.tool}" FAILED with error: ${toolResult.error}\n\nYou MUST retry with the same tool using different args, or try a different approach. Set nextStage to "toolUsed" to retry.`;
                        
                        messages.push({
                            role: 'user',
                            content: resultMessage
                        });
                    } catch (toolError) {
                        console.error('❌ Tool execution error:', toolError);
                        lastToolResult = {
                            success: false,
                            tool: toolData.tool,
                            error: toolError instanceof Error ? toolError.message : 'Unknown tool error',
                            result: null
                        };
                        
                        yield {
                            stage: 'toolResult',
                            content: lastToolResult
                        };

                        messages.push({
                            role: 'user',
                            content: `Tool "${toolData.tool}" FAILED with error: ${lastToolResult.error}. Retry with different args or try another approach. Set nextStage to "toolUsed".`
                        });
                    }
                } else {
                    // For non-tool stages, add guidance for next stage
                    messages.push({
                        role: 'user',
                        content: `Good. Now proceed to ${currentStage} stage. Remember to review what you learned in previous stages.`
                    });
                }
            }

            if (toolExecutionCount >= maxToolExecutions) {
                yield {
                    stage: 'summary',
                    content: 'Reached maximum tool execution limit (15). Stopping execution.'
                };
            }

            yield { stage: 'done', content: null };

        } catch (error) {
            // Check if it's an abort error
            if (error instanceof Error && error.name === 'AbortError') {
                yield { 
                    stage: 'stopped', 
                    content: 'Generation stopped by user.'
                };
                return;
            }
            
            console.error('AI Agent execution error:', error);
            yield { 
                stage: 'error', 
                content: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async generateContent(prompt: string, context?: string): Promise<string> {
        try {
            const fullPrompt = context ? `Context: ${context}\n\nRequest: ${prompt}` : prompt;
            const resp = await fetch(GENERATE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        prompt: fullPrompt,
                        model: this.defaultModel,
                        generationConfig: { maxOutputTokens: 2048 },
                    }),
            });
            // Try to get response body for better error details
            const responseText = await resp.text();
            if (!resp.ok) {
                let errorData;
                try {
                    errorData = JSON.parse(responseText);
                } catch {
                    errorData = { error: responseText || resp.statusText };
                }
                console.error('❌ Gemini API Error Response:', errorData);
                throw new Error(errorData?.error || `Generate failed: ${resp.status} - ${resp.statusText}`);
            }
            
            const data = JSON.parse(responseText);
            return data.text as string;
        } catch (error) {
            console.error('❌ AI Generation Error:', error);
            throw error instanceof Error ? error : new Error('Failed to generate AI content');
        }
    }

    async improveText(text: string, instruction: string): Promise<string> {
        const prompt = `
Improve the following text based on this instruction: "${instruction}"

Original text:
${text}

Please provide only the improved text without any explanations or additional commentary.
        `;
        return this.generateContent(prompt);
    }

    async expandContent(text: string, topic: string): Promise<string> {
        const prompt = `
Expand the following content about "${topic}". Add more detailed information, examples, and relevant points while maintaining the same writing style and tone.

Current content:
${text}

Please provide only the expanded content without any explanations.
        `;
        return this.generateContent(prompt);
    }

    async summarizeContent(text: string): Promise<string> {
        const prompt = `
Create a concise summary of the following content. Keep the key points and main ideas.

Content to summarize:
${text}

Please provide only the summary without any explanations.
        `;
        return this.generateContent(prompt);
    }

    async generateFromPrompt(prompt: string, documentContext?: string): Promise<string> {
        let fullPrompt = `You are an intelligent AI content generator with document manipulation capabilities.

**AVAILABLE TOOLS:**
You have access to document editing tools:
- scan_document_content: Analyze document structure
- search_document_content: Find specific content
- append_document_content: Add content to end
- insert_document_content: Insert at position
- replace_document_content: Replace text range
- remove_document_content: Delete text range

**USER REQUEST:** "${prompt}"

**GENERATION GUIDELINES:**
- Create well-structured and professional content
- Use plain text with simple HTML tags only: <h1>, <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>
- Include appropriate headings and paragraphs
- Be comprehensive but concise
- Do not use complex HTML structures, tables, or nested elements
- If the request involves document editing, explain which tools would be appropriate
        `;

        if (documentContext) {
            fullPrompt += `\n\n**DOCUMENT CONTEXT:**\n\`\`\`\n${documentContext}\n\`\`\``;
        }

        fullPrompt += '\n\n**YOUR RESPONSE:**\nProvide only the content without any explanations or additional text. If document manipulation is needed, explain the approach first.';

        return this.generateContent(fullPrompt);
    }

    async chatResponse(message: string, documentContent?: string): Promise<string> {
        const systemPrompt = `You are an intelligent AI assistant with advanced document editing and manipulation capabilities.

**YOUR CAPABILITIES:**

You have access to powerful document manipulation tools that allow you to:

1. **Read & Analyze Documents:**
   - scan_document_content: Read and analyze document structure (lines, words, headings)
   - search_document_content: Search for specific text or patterns in documents

2. **Edit & Modify Documents:**
   - append_document_content: Add new content to the end of a document
   - insert_document_content: Insert text at a specific character position
   - replace_document_content: Replace text in a given range with new content
   - remove_document_content: Delete text from a specified range

**WHEN TO USE TOOLS:**

- When a user asks to "add", "append", or "insert" content → Use append_document_content or insert_document_content
- When a user asks to "change", "update", or "replace" text → Use replace_document_content
- When a user asks to "delete", "remove", or "cut" text → Use remove_document_content
- When a user asks about document structure or wants an overview → Use scan_document_content
- When a user asks to "find" or "search" for something → Use search_document_content

**HOW TO RESPOND:**

1. **Understand the Request:** Analyze what the user wants to accomplish
2. **Determine the Right Tool:** Choose the appropriate document manipulation tool(s)
3. **Explain Your Action:** Tell the user what you're about to do
4. **Execute & Confirm:** Trigger the tool and confirm the result

**RESPONSE STYLE:**

- Be conversational and helpful
- Explain what you're doing in simple terms
- Provide context for your decisions
- Confirm actions after completing them
- If you can't do something, explain why and suggest alternatives

**IMPORTANT:**

- Always explain what tool you're using and why
- Provide clear feedback on what was changed
- Be proactive in suggesting improvements
- Ask for clarification if the request is ambiguous
- Think step-by-step for complex multi-step edits

---

**USER MESSAGE:** "${message}"
`;

        let fullPrompt = systemPrompt;

        if (documentContent) {
            fullPrompt += `

**CURRENT DOCUMENT CONTEXT:**
\`\`\`
${documentContent.substring(0, 2000)}${documentContent.length > 2000 ? '\n... (truncated)' : ''}
\`\`\`

Character count: ${documentContent.length}
`;
        }

        fullPrompt += `

Now respond to the user's message. If their request requires document manipulation, explain which tool you would use and how you would accomplish their goal.`;

        return this.generateContent(fullPrompt);
    }



    async analyzeAndSuggest(selectedText: string, documentContext: string): Promise<{
        improvements: string[];
        alternatives: string[];
        expansions: string[];
    }> {
        const prompt = `
Analyze this selected text and provide suggestions:

Selected text: "${selectedText}"

Document context: ${documentContext.substring(0, 1000)}

Please provide:
1. Improvements (grammar, clarity, style)
2. Alternative phrasings
3. Ways to expand or elaborate

Format your response as JSON with the structure:
{
  "improvements": ["suggestion1", "suggestion2"],
  "alternatives": ["alternative1", "alternative2"],
  "expansions": ["expansion1", "expansion2"]
}
        `;

        try {
            const response = await this.generateContent(prompt);
            return JSON.parse(response);
        } catch (error) {
            console.error('❌ Error parsing AI suggestions:', error);
            return {
                improvements: ['Improve clarity and readability'],
                alternatives: ['Consider alternative phrasing'],
                expansions: ['Add more detail and examples']
            };
        }
    }

    /**
     * Generate content with repository context
     */
    async generateWithRepositoryContext(
        prompt: string, 
        user: User, 
        repositoryInfo: { owner: string; repo: string },
        documentContext?: string
    ): Promise<string> {
        try {
            // Get repository context
            const repoContext = await repositoryContextService.getRepositoryContext(
                user, 
                repositoryInfo.owner, 
                repositoryInfo.repo
            );

            let fullPrompt = `You are an advanced AI assistant with:
1. Access to the repository: ${repositoryInfo.owner}/${repositoryInfo.repo}
2. Document manipulation tools for editing and analyzing content

**AVAILABLE DOCUMENT TOOLS:**
- scan_document_content: Analyze document structure (lines, words, headings)
- search_document_content: Find specific text or patterns
- append_document_content: Add content to document end
- insert_document_content: Insert text at specific position
- replace_document_content: Replace text in a range
- remove_document_content: Delete text from a range

**USER REQUEST:** "${prompt}"
`;

            if (repoContext) {
                const contextFormatted = repositoryContextService.formatContextForAI(repoContext);
                fullPrompt += `\n### Repository Context\n${contextFormatted}`;
            }

            if (documentContext) {
                fullPrompt += `\n### Current Document Context\n\`\`\`\n${documentContext.substring(0, 1500)}${documentContext.length > 1500 ? '\n... (truncated)' : ''}\n\`\`\``;
            }

            fullPrompt += `

**INSTRUCTIONS:**
- Use the repository context to provide accurate, specific suggestions
- Reference actual files, code patterns, and project structure when relevant
- If document editing is needed, explain which tool(s) you would use
- If suggesting code changes, show specific file paths and line references
- Maintain consistency with the existing codebase style and patterns
- Provide actionable, implementable suggestions
- Use markdown formatting for code snippets with appropriate language tags

**YOUR RESPONSE:**
Analyze the request, leverage the repository knowledge, and provide a comprehensive response. If document manipulation is needed, explain which tools you'd use and how.`;

            return await this.generateContent(fullPrompt);
        } catch (error) {
            console.error('❌ Error generating with repository context:', error);
            // Fallback to regular generation without repository context
            return this.generateFromPrompt(prompt, documentContext);
        }
    }

    /**
     * ITERATIVE AI GENERATION - AI requests files it needs
     * Generate document from template and repository with iterative file requests
     */
    async generateDocumentFromTemplateAndRepoIterative(
        user: User,
        templatePrompt: string,
        repositoryInfo: { owner: string; repo: string; fullName: string },
        documentRole: string,
        documentName: string,
        onProgress?: (step: string, detail?: string) => void
    ): Promise<string> {
        try {
            onProgress?.('init', 'Starting iterative AI generation...');
            // Step 1: Get repository structure
            onProgress?.('structure', 'Fetching repository structure...');
            const repoContext = await repositoryContextService.getRepositoryContext(
                user,
                repositoryInfo.owner,
                repositoryInfo.repo
            );

            if (!repoContext) {
                throw new Error('Could not fetch repository context');
            }

            const directoryTree = this.buildDirectoryTree(repoContext.structure);
            onProgress?.('structure', `Found ${repoContext.structure.length} items`);

            // Step 2: Initial AI request
            onProgress?.('analysis', 'AI analyzing repository...');
            const initialPrompt = `${templatePrompt}

---

**EDITOR FORMATTING GUIDELINES:**

You are generating content for a TipTap rich text editor. Follow these HTML formatting rules:

**Headings:** Use <h1> to <h5> (H6 not supported)
- <h1>Main Title</h1> - Use ONLY for document title or project name (ONCE per document)
- <h2>Section</h2> - Major sections (Overview, Installation, Usage, API Reference, etc.)
- <h3>Subsection</h3> - Subsections within a section (Installation Steps, Configuration, Examples)
- <h4>Detail</h4> - Detailed subsections (Step 1, Option A, Specific feature)
- <h5>Minor Detail</h5> - Minor details or sub-items

**Heading Hierarchy Rules:**
1. Start with H1 for the main document title (e.g., "User Manual", "API Documentation", "Project Overview")
2. Use H2 for major sections that divide the document (e.g., "Overview", "Getting Started", "Features")
3. Use H3 for subsections under H2 (e.g., under "Installation": "Prerequisites", "Steps", "Troubleshooting")
4. Use H4 for detailed items under H3 (e.g., under "Steps": "Step 1: Download", "Step 2: Configure")
5. Never skip levels (e.g., don't go from H2 to H4 without H3)
6. Keep heading hierarchy logical and consistent throughout the document

**Heading Examples:**
<h1>Project User Manual</h1>
<h2>Overview</h2>
<p>This manual covers...</p>
<h2>Installation</h2>
<h3>Prerequisites</h3>
<p>Before installing...</p>
<h3>Installation Steps</h3>
<h4>Step 1: Download</h4>
<p>Download from...</p>
<h4>Step 2: Install</h4>
<p>Run the installer...</p>
<h2>Usage</h2>
<h3>Basic Usage</h3>
<p>To use the application...</p>
<h3>Advanced Features</h3>
<h4>Feature A</h4>
<p>Description...</p>
<h4>Feature B</h4>
<p>Description...</p>

**Text Formatting:**
- <strong>Bold</strong>
- <em>Italic</em>
- <u>Underline</u>
- <mark>Highlight</mark>
- <s>Strikethrough</s>

**Lists:**
- Unordered: <ul><li>Item</li></ul>
- Ordered: <ol><li>Step</li></ol>
- Nested lists supported

**Code Blocks:** (NO inline <code> tags - only code blocks!)
<pre><code class="language-javascript" data-language="javascript">
function example() {
  return "Use language-specific code blocks";
}
</code></pre>

**Supported Languages:** javascript, typescript, python, java, cpp, c, csharp, html, css, json, yaml, bash, sql, go, rust, php, ruby, swift, kotlin, markdown, mermaid, plaintext

**Mermaid Diagrams:** (Use as code blocks, not separate elements)
<pre><code class="language-mermaid" data-language="mermaid">
graph TD
    A[Start] --> B[Process]
    B --> C[End]
</code></pre>

**CRITICAL: Mermaid Syntax Rules** (Follow these to avoid syntax errors)
1. **Subgraphs**: NO quotes in titles - Use underscores or camelCase
   - ✅ CORRECT: subgraph ClientSide or subgraph Client_Side
   - ❌ WRONG: subgraph "Client-Side" (causes syntax error)
2. **Node Labels**: Use square brackets for text with spaces/symbols
   - Example: A[User Input] or B[REST API JSON]
3. **Arrows**: Use --> for directed edges, --- for undirected
4. **Special Characters**: Avoid quotes, use underscores or camelCase for IDs
5. **Indentation**: Use consistent 4-space indentation inside subgraphs
6. **Example with subgraph**:
<pre><code class="language-mermaid" data-language="mermaid">
graph TD
    subgraph ClientSide
        User[User] --> Frontend[Frontend Angular]
    end
    subgraph ServerSide
        Backend[Spring Boot] --> DB[H2 Database]
    end
    Frontend --> Backend
</code></pre>

**Tables:**
<table>
  <thead><tr><th>Header</th></tr></thead>
  <tbody><tr><td>Data</td></tr></tbody>
</table>

**Links:** <a href="url">text</a>

**Blockquotes:** <blockquote><p>Quote text</p></blockquote>

**IMPORTANT:**
- Use semantic HTML tags
- NO inline <code> tags (use code blocks instead)
- NO <h6> headings (use <h5> for smallest heading)
- Include proper whitespace and structure
- Use language-specific syntax for code blocks

---

**YOUR TASK:**
Create a document titled "${documentName}" for the role: ${documentRole}

**REPOSITORY INFORMATION:**
- Repository: ${repositoryInfo.fullName}
- Directory Structure:
${directoryTree}
- README Preview:
${repoContext.readme?.substring(0, 1000) || 'None'}

**WORKFLOW - FOLLOW THESE STEPS:**

**STEP 1 (Current Step):** Analyze the repository structure and README above. Then respond with JSON listing the specific files you need to examine to create the document according to the template requirements:
Format: {"needFiles": true, "files": ["path/to/file1", "path/to/file2"], "reason": "brief explanation of why you need these files"}

**STEP 2 (After receiving files):** You will receive the content of the files you requested. Review them and either:
- Request MORE files if needed: {"needFiles": true, "files": ["path1", "path2"], "reason": "why"}
- OR generate the final document: {"needFiles": false, "content": "YOUR_HTML_CONTENT"}

**WHEN GENERATING THE FINAL DOCUMENT:**
- STRICTLY FOLLOW the template format and structure provided at the top of this prompt
- The template itself contains all requirements for code examples, validation logic, diagrams, etc.
- You MUST respond with VALID JSON: {"needFiles": false, "content": "HTML_CONTENT_HERE"}
- The "content" field MUST be a string containing complete HTML as specified in the template
- Follow ALL formatting requirements from the template (HTML tags, structure, sections, etc.)
- DO NOT add explanatory text like "Here is the document:" - just provide the JSON with HTML content
- DO NOT deviate from the template's required format

**IMPORTANT - Handle Length Constraints:**
- If the document is too long for one response, you can split it into parts
- Generate the document section by section if needed
- For very comprehensive documents, focus on completing major sections first
- Use the full token limit (8192) to generate as much quality content as possible

**Start now - which files do you need? Respond with JSON only:**`;

            let iteration = 0;
            const maxIter = 10; // Increased from 5 to 10 iterations
            let content = '';
            const provided: string[] = [];

            while (iteration < maxIter) {
                iteration++;
                // More descriptive progress messages
                if (iteration === 1) {
                    onProgress?.('analysis', 'AI analyzing repository structure...');
                } else {
                    onProgress?.('iteration', `AI processing files and generating content...`);
                }

                let prompt = '';
                if (iteration === 1) {
                    prompt = initialPrompt;
                } else {
                    const fileContents = await this.getFileContents(user, repositoryInfo, provided);
                    // Update progress with file count
                    onProgress?.('files', `Processing ${provided.length} files from repository...`);
                    
                    prompt = `**REMINDER: Follow the template format provided in the initial prompt**

You requested these files from the repository. Here they are:

${fileContents}

**EDITOR FORMATTING REMINDER:**
Use TipTap-compatible HTML:
- Headings: <h1> to <h5> (NO <h6>)
- Code blocks ONLY (NO inline <code> tags):
  <pre><code class="language-python" data-language="python">code here</code></pre>
- Mermaid diagrams as code blocks:
  <pre><code class="language-mermaid" data-language="mermaid">graph TD...</code></pre>
- **MERMAID SYNTAX**: NO quotes in subgraphs (use underscores: subgraph Client_Side)
- Text formatting: <strong>, <em>, <u>, <mark>, <s>
- Lists: <ul><li>, <ol><li>
- Tables: <table><thead><tr><th>, <tbody><tr><td>
- Links: <a href="url">text</a>

**CRITICAL INSTRUCTIONS:**
- Files marked with ❌ NOT FOUND do not exist - DO NOT request them again
- Work with successfully fetched files (marked with ✅)
- You must create the document following the EXACT template format from the beginning of our conversation
- The template specifies the required HTML structure, sections, and format

**YOUR NEXT STEP:**

Option 1 - Need more files?
{"needFiles": true, "files": ["path/to/file"], "reason": "why you need it"}

Option 2 - Ready to generate the document?
{"needFiles": false, "content": "COMPLETE_HTML_CONTENT"}

**REQUIREMENTS FOR THE DOCUMENT:**
- Follow the template's HTML structure EXACTLY as specified
- Use TipTap-compatible HTML tags (NO inline <code>, NO <h6>)
- The template itself defines all content requirements (code examples, validation logic, etc.)
- Include ALL required sections from the template
- For code: <pre><code class="language-X" data-language="X">code</code></pre>
- For diagrams: <pre><code class="language-mermaid" data-language="mermaid">graph</code></pre>
- DO NOT add explanatory text - just provide the JSON with HTML content
- The content must be based on the repository files you've examined
- Example format: {"needFiles": false, "content": "<html><body><h1>Project User Manual</h1>...</body></html>"}

**Respond with JSON only:**`;
                }
                const res = await fetch(GENERATE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt, model: this.defaultModel, generationConfig: { maxOutputTokens: 8192 } }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err?.error || `Generate failed: ${res.status}`);
                }
                const payload = await res.json();
                const text = String(payload.text || '');
                let parsed: any;
                try {
                    const match = text.match(/\{[\s\S]*\}/);
                    if (match) {
                        parsed = JSON.parse(match[0]);
                    } else {
                        parsed = null;
                    }
                } catch (parseError) {
                    content = this.cleanHTMLContent(text);
                    break;
                }

                if (!parsed) {
                    content = this.cleanHTMLContent(text);
                    break;
                }

                if (parsed.needFiles && parsed.files?.length > 0) {
                    // Show what AI is looking for
                    const filePreview = parsed.files.slice(0, 3).join(', ');
                    const moreCount = parsed.files.length > 3 ? ` and ${parsed.files.length - 3} more` : '';
                    onProgress?.('files', `AI examining: ${filePreview}${moreCount}`);
                    
                    // Clear and set new files to fetch
                    provided.length = 0;
                    provided.push(...parsed.files);
                } else if (parsed.needFiles === false && parsed.content) {
                    onProgress?.('generate', 'AI writing document content...');
                    content = parsed.content;
                    break;
                } else {
                    content = text;
                    break;
                }
            }

            if (!content) {
                onProgress?.('generate', 'Finalizing with template content...');
                content = this.generateFallbackContent(templatePrompt, repositoryInfo, documentName, documentRole);
            } else {
            }

            onProgress?.('done', 'Complete!');
            return this.cleanHTMLContent(content);

        } catch (error) {
            console.error('❌ Iterative error:', error);
            onProgress?.('error', error instanceof Error ? error.message : 'Failed');
            throw error;
        }
    }

    /**
     * Generate document content in sections to handle token limits
     * This method generates the document part by part, allowing for longer documents
     * Each section gets its own 8192 token budget, enabling unlimited document length
     */
    async generateDocumentInSections(
        user: User,
        templatePrompt: string,
        repositoryInfo: { owner: string; repo: string; fullName: string },
        documentRole: string,
        documentName: string,
        onProgress?: (stage: string, message?: string) => void
    ): Promise<string> {
        try {
            onProgress?.('init', 'Preparing iterative generation...');

            // PHASE 1: Collect repository files using existing iterative method
            onProgress?.('files', 'Collecting repository files...');
            
            const repoContext = await repositoryContextService.getRepositoryContext(
                user,
                repositoryInfo.owner,
                repositoryInfo.repo
            );

            if (!repoContext) {
                throw new Error('Failed to fetch repository context');
            }

            const directoryTree = this.buildDirectoryTree(repoContext.structure);

            // Collect all relevant files first
            const collectedFiles: { path: string; content: string; language: string }[] = [];
            const requestedFiles: string[] = [];

            const filePrompt = `${templatePrompt}

---

**YOUR TASK:**
Analyze this repository to create "${documentName}" for the role: ${documentRole}

**REPOSITORY:**
${repositoryInfo.fullName}

**STRUCTURE:**
${directoryTree}

**README:**
${repoContext.readme?.substring(0, 800) || 'None'}

**INSTRUCTION:**
Respond with JSON listing the TOP 5-8 most important files needed to create this document.
Focus on core implementation files, main components, configuration files.

Format: {"files": ["path1", "path2", "path3"]}

Respond with JSON only:`;
            const fileRes = await fetch(GENERATE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: filePrompt, 
                    model: this.defaultModel, 
                    generationConfig: { maxOutputTokens: 512 } 
                }),
            });

            if (fileRes.ok) {
                const fileData = await fileRes.json();
                const fileText = String(fileData.text || '');
                try {
                    const match = fileText.match(/\{[\s\S]*\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        if (parsed.files && Array.isArray(parsed.files)) {
                            requestedFiles.push(...parsed.files);
                        }
                    }
                } catch (e) {
                }
            }

            // Fetch the requested files
            if (requestedFiles.length > 0) {
                onProgress?.('files', `Fetching ${requestedFiles.length} key files...`);
                for (const path of requestedFiles) {
                    try {
                        const file = await repositoryContextService.getFileWithContext(
                            user,
                            repositoryInfo.owner,
                            repositoryInfo.repo,
                            path
                        );
                        if (file?.content) {
                            collectedFiles.push({
                                path,
                                content: file.content.substring(0, 3000), // Limit to 3000 chars per file
                                language: file.language || 'text'
                            });
                        }
                    } catch (error) {
                    }
                }
            }
            // PHASE 2: Plan document sections
            onProgress?.('planning', 'Planning document sections...');

            const planPrompt = `${templatePrompt}

**TASK:** Plan the sections for "${documentName}"

Analyze the template and break it into 4-8 major sections that should be generated separately.
Each section should be substantial enough to warrant its own generation.

Respond with JSON: {"sections": ["Section 1 Name", "Section 2 Name", ...]}

Respond with JSON only:`;

            const planRes = await fetch(GENERATE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: planPrompt, 
                    model: this.defaultModel, 
                    generationConfig: { maxOutputTokens: 512 } 
                }),
            });

            let sections: string[] = [];
            if (planRes.ok) {
                const planData = await planRes.json();
                const planText = String(planData.text || '');
                try {
                    const match = planText.match(/\{[\s\S]*\}/);
                    if (match) {
                        const parsed = JSON.parse(match[0]);
                        if (parsed.sections && Array.isArray(parsed.sections)) {
                            sections = parsed.sections;
                        }
                    }
                } catch (e) {
                }
            }

            // Fallback sections if planning failed
            if (sections.length === 0) {
                sections = ['Introduction', 'Getting Started', 'Core Features', 'Technical Details', 'Conclusion'];
            }
            // PHASE 3: Generate each section with full 8192 token budget
            const generatedSections: string[] = [];
            const filesContext = collectedFiles.map(f => 
                `**${f.path}** (${f.language}):\n\`\`\`${f.language}\n${f.content}\n\`\`\``
            ).join('\n\n');

            for (let i = 0; i < sections.length; i++) {
                const sectionName = sections[i];
                onProgress?.('generate', `Generating ${i + 1}/${sections.length}: ${sectionName}`);
                const sectionPrompt = `${templatePrompt}

---

**EDITOR FORMATTING RULES:**

Generate content using proper TipTap HTML formatting:

**Headings:** <h1> to <h5> only (NO <h6>)
**Text:** <strong>, <em>, <u>, <mark>, <s>
**Code:** Use code blocks only (NO inline <code> tags):
<pre><code class="language-javascript" data-language="javascript">
// Your code here
</code></pre>

**Mermaid Diagrams:**
<pre><code class="language-mermaid" data-language="mermaid">
graph TD
    A --> B
</code></pre>

**CRITICAL Mermaid Rules** (Avoid syntax errors):
- Subgraphs: NO quotes - use underscores (subgraph Client_Side NOT "Client-Side")
- Node IDs: No spaces, use camelCase or underscores
- Labels: Use square brackets [Text with spaces]
- Example: subgraph Backend
              Server[Spring Boot] --> DB[Database]
          end

**Lists:** <ul><li>, <ol><li>, or nested
**Tables:** <table><thead><tr><th>, <tbody><tr><td>
**Links:** <a href="url">text</a>
**Quotes:** <blockquote><p>text</p></blockquote>

---

**REPOSITORY:** ${repositoryInfo.fullName}
**DOCUMENT:** ${documentName}
**ROLE:** ${documentRole}

**KEY FILES:**
${filesContext}

**YOUR TASK:**
Generate ONLY the "${sectionName}" section of the document.

**CONTEXT - ALL SECTIONS:**
${sections.map((s, idx) => `${idx + 1}. ${s}${idx < i ? ' ✅' : idx === i ? ' 👉 CURRENT' : ' ⏳'}`).join('\n')}

**PREVIOUSLY GENERATED:**
${generatedSections.length > 0 ? generatedSections.map((content, idx) => `[${sections[idx]}]: ${content.substring(0, 200)}...`).join('\n') : 'None - this is the first section'}

**REQUIREMENTS:**
- Generate ONLY the "${sectionName}" section
- Follow the template's HTML format using TipTap-compatible tags
- Use <h2> or <h3> for section headings (NOT <h1>)
- For code: use <pre><code class="language-X" data-language="X">
- For diagrams: use <pre><code class="language-mermaid" data-language="mermaid">
- NO inline <code> tags - use code blocks for all code snippets
- Be comprehensive and detailed for THIS section
- Include code examples, explanations, and specifics from the repository files
- Use your FULL 8192 token budget for quality content
- DO NOT regenerate previous sections
- Respond with ONLY the HTML content for this section (no JSON, no explanations)

Generate the "${sectionName}" section now:`;

                const sectionRes = await fetch(GENERATE_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: sectionPrompt, 
                        model: this.defaultModel, 
                        generationConfig: { maxOutputTokens: 8192 } 
                    }),
                });

                if (!sectionRes.ok) {
                    continue;
                }

                const sectionData = await sectionRes.json();
                const sectionContent = String(sectionData.text || '');
                
                // Clean the section content
                const cleaned = this.cleanHTMLContent(sectionContent);
                generatedSections.push(cleaned);
            }

            // PHASE 4: Combine all sections
            onProgress?.('finalize', 'Combining all sections...');

            const finalDocument = `<h1>${documentName}</h1>
${generatedSections.join('\n\n')}`;
            onProgress?.('done', 'Document generation complete!');

            return finalDocument;

        } catch (error) {
            console.error('❌ Section generation error:', error);
            onProgress?.('error', error instanceof Error ? error.message : 'Failed');
            throw error;
        }
    }

    private buildDirectoryTree(structure: any[]): string {
        const tree: string[] = [];
        const sorted = structure.slice(0, 100).sort((a, b) => {
            if (a.type === 'dir' && b.type !== 'dir') return -1;
            if (a.type !== 'dir' && b.type === 'dir') return 1;
            return a.path.localeCompare(b.path);
        });
        for (const item of sorted) {
            tree.push(`${'  '.repeat((item.path.match(/\//g) || []).length)}${item.type === 'dir' ? '📁' : '📄'} ${item.path}`);
        }
        if (structure.length > 100) tree.push(`... +${structure.length - 100} more`);
        return tree.join('\n');
    }

    private async getFileContents(user: User, repoInfo: { owner: string; repo: string }, paths: string[]): Promise<string> {
        const contents: string[] = [];
        const successFiles: string[] = [];
        const failedFiles: string[] = [];
        for (const path of paths) {
            try {
                const file = await repositoryContextService.getFileWithContext(user, repoInfo.owner, repoInfo.repo, path);
                if (file?.content) {
                    const truncated = file.content.length > 5000;
                    const contentToShow = file.content.substring(0, 5000);
                    contents.push(`**${path}** ${truncated ? `(${file.content.length} chars, showing first 5000)` : `(${file.content.length} chars)`}\n\`\`\`${file.language || 'text'}\n${contentToShow}\n\`\`\``);
                    successFiles.push(path);
                } else {
                    contents.push(`**${path}**: ⚠️ File exists but has no content`);
                    failedFiles.push(path);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                contents.push(`**${path}**: ❌ NOT FOUND (${errorMsg})`);
                failedFiles.push(path);
            }
        }
        if (successFiles.length > 0) {
        }
        if (failedFiles.length > 0) {
        }
        
        // Add summary at the beginning
        const summary = `**FILE FETCH SUMMARY:**
- ✅ Successfully fetched: ${successFiles.length} files
- ❌ Failed/Not found: ${failedFiles.length} files
${failedFiles.length > 0 ? `\n**Files that don't exist:** ${failedFiles.join(', ')}` : ''}

---

`;
        
        return summary + contents.join('\n\n');
    }

    /**
     * Generate document content from template and GitHub repository
     * This method fetches the template prompt from Firestore, analyzes the repository,
     * and generates HTML-formatted documentation content using Gemini AI
     */
    async generateDocumentFromTemplateAndRepo(
        user: User,
        templatePrompt: string,
        repositoryInfo: { owner: string; repo: string; fullName: string },
        documentRole: string,
        documentName: string
    ): Promise<string> {
        try {
            // Get repository context
            const repoContext = await repositoryContextService.getRepositoryContext(
                user,
                repositoryInfo.owner,
                repositoryInfo.repo
            );

            if (!repoContext) {
                throw new Error('Failed to fetch repository context');
            }

            // Format repository context for AI
            const contextFormatted = repositoryContextService.formatContextForAI(repoContext);

            // Build comprehensive prompt for Gemini
            const aiPrompt = `You are a technical documentation expert tasked with creating comprehensive, professional documentation for a software project.

## PROJECT INFORMATION
Repository: ${repositoryInfo.fullName}
Description: ${repoContext.repository.description || 'No description provided'}
Primary Language: ${repoContext.repository.language}

## DOCUMENTATION TASK
Create a ${documentName} document for the ${documentRole} role.

## TEMPLATE INSTRUCTIONS
${templatePrompt}

## REPOSITORY CONTEXT
${contextFormatted}

## OUTPUT REQUIREMENTS
1. Generate the documentation in **clean HTML format** suitable for a rich text editor
2. Use semantic HTML5 tags: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <code>, <pre>
3. Structure the content with clear headings and sections
4. Include specific examples from the repository where relevant
5. Reference actual file paths, code snippets, and project structure
6. Make the content comprehensive but readable
7. Adapt the tone and depth based on the ${documentRole} role
8. DO NOT include markdown formatting (no \`\`\`, no ##, no **)
9. DO NOT wrap the content in <html>, <body>, or <div> tags
10. Start directly with the document heading (<h1>)

## EXAMPLE OUTPUT STRUCTURE
<h1>${documentName}</h1>

<h2>Overview</h2>
<p>Brief introduction to the project and this document...</p>

<h2>Key Features</h2>
<ul>
  <li>Feature 1 with specific details from the repository</li>
  <li>Feature 2 referencing actual code</li>
</ul>

<h2>Technical Details</h2>
<p>Detailed technical information based on repository analysis...</p>

<h3>File Structure</h3>
<p>Description of the project structure with actual paths...</p>

<h3>Key Components</h3>
<p>Analysis of important files and their purposes...</p>

Now generate the complete ${documentName} document following these guidelines:`;
            // Generate content using Gemini
            const res = await fetch(GENERATE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: aiPrompt, model: this.defaultModel, generationConfig: { maxOutputTokens: 4096 } }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `Generate failed: ${res.status}`);
            }
            const payload = await res.json();
            let htmlContent = String(payload.text || '');
            // Clean up the response
            htmlContent = this.cleanHTMLContent(htmlContent);

            return htmlContent;

        } catch (error) {
            console.error('❌ Error generating document from template and repo:', error);
            
            // Fallback to basic template-based content
            return this.generateFallbackContent(templatePrompt, repositoryInfo, documentName, documentRole);
        }
    }

    /**
     * Clean and sanitize AI-generated HTML content
     */
    private cleanHTMLContent(html: string): string {
        // Remove markdown code fences if present
        html = html.replace(/```html\n?/g, '');
        html = html.replace(/```\n?/g, '');
        
        // Remove any wrapping html/body tags
        html = html.replace(/<\/?html[^>]*>/gi, '');
        html = html.replace(/<\/?body[^>]*>/gi, '');
        
        // Trim the content
        html = html.trim();
        
        // SAFEGUARD: Check if content has NO HTML tags (plain text)
        const hasHTMLTags = /<[a-z][\s\S]*>/i.test(html);
        if (!hasHTMLTags && html.length > 0) {
            // Convert plain text to HTML paragraphs
            const paragraphs = html.split(/\n\n+/).map(para => {
                const trimmed = para.trim();
                if (!trimmed) return '';
                // Preserve line breaks within paragraphs
                const withBreaks = trimmed.replace(/\n/g, '<br>');
                return `<p>${withBreaks}</p>`;
            }).filter(p => p).join('\n');
            
            html = `<h1>Document</h1>\n${paragraphs}`;
        }
        
        // Ensure content starts with a heading
        if (!html.trim().match(/^<h[1-6]>/i)) {
            html = '<h1>Document</h1>\n' + html;
        }
        
        return html;
    }

    /**
     * Generate fallback content if AI generation fails
     */
    private generateFallbackContent(
        templatePrompt: string,
        repositoryInfo: { owner: string; repo: string; fullName: string },
        documentName: string,
        documentRole: string
    ): string {
        return `<h1>${documentName}</h1>

<h2>Overview</h2>
<p>This document was created for the <strong>${documentRole}</strong> role for the repository <code>${repositoryInfo.fullName}</code>.</p>

<h2>Template Guidelines</h2>
<p>${templatePrompt}</p>

<h2>Repository Information</h2>
<p><strong>Repository:</strong> ${repositoryInfo.fullName}</p>
<p><strong>Owner:</strong> ${repositoryInfo.owner}</p>
<p><strong>Repository:</strong> ${repositoryInfo.repo}</p>

<h2>Next Steps</h2>
<ul>
  <li>Review and customize this document based on your project needs</li>
  <li>Add specific details about your project</li>
  <li>Include relevant code examples and explanations</li>
  <li>Update sections to match your documentation requirements</li>
</ul>

<p><em>This is a template document. Please edit and customize it based on your specific project requirements.</em></p>`;
    }

    /**
     * Analyze code from repository
     */
    async analyzeRepositoryCode(
        user: User,
        repositoryInfo: { owner: string; repo: string },
        filePath: string,
        analysis: 'explain' | 'improve' | 'debug' | 'document'
    ): Promise<string> {
        try {
            const fileContent = await repositoryContextService.getFileWithContext(
                user,
                repositoryInfo.owner,
                repositoryInfo.repo,
                filePath
            );

            if (!fileContent) {
                throw new Error(`File not found: ${filePath}`);
            }

            let prompt = '';
            
            switch (analysis) {
                case 'explain':
                    prompt = `Explain what this code does and how it works:

**File: ${filePath}**
\`\`\`${fileContent.language?.toLowerCase() || 'text'}
${fileContent.content}
\`\`\`

Provide a clear explanation including:
- Purpose and functionality
- Key components and their roles
- How it fits into the larger project
- Notable patterns or techniques used`;
                    break;
                    
                case 'improve':
                    prompt = `Analyze this code and suggest improvements:

**File: ${filePath}**
\`\`\`${fileContent.language?.toLowerCase() || 'text'}
${fileContent.content}
\`\`\`

Suggest improvements for:
- Code quality and readability
- Performance optimizations
- Best practices
- Error handling
- Maintainability`;
                    break;
                    
                case 'debug':
                    prompt = `Help debug this code and identify potential issues:

**File: ${filePath}**
\`\`\`${fileContent.language?.toLowerCase() || 'text'}
${fileContent.content}
\`\`\`

Look for:
- Potential bugs or errors
- Edge cases that might cause issues
- Performance bottlenecks
- Security concerns
- Logic issues`;
                    break;
                    
                case 'document':
                    prompt = `Generate documentation for this code:

**File: ${filePath}**
\`\`\`${fileContent.language?.toLowerCase() || 'text'}
${fileContent.content}
\`\`\`

Create comprehensive documentation including:
- Function/class descriptions
- Parameter and return value documentation
- Usage examples
- Important notes or warnings`;
                    break;
            }

            // Add repository context for better analysis
            const repoContext = await repositoryContextService.getRepositoryContext(
                user,
                repositoryInfo.owner,
                repositoryInfo.repo
            );

            if (repoContext) {
                prompt += `\n\n### Repository Context\n${repositoryContextService.formatContextForAI(repoContext)}`;
            }

            return await this.generateContent(prompt);
        } catch (error) {
            console.error('❌ Error analyzing repository code:', error);
            throw new Error(`Failed to analyze ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Search and explain repository concepts
     */
    async explainRepositoryConcept(
        user: User,
        repositoryInfo: { owner: string; repo: string },
        concept: string
    ): Promise<string> {
        try {
            const repoContext = await repositoryContextService.getRepositoryContext(
                user,
                repositoryInfo.owner,
                repositoryInfo.repo
            );

            if (!repoContext) {
                throw new Error('Could not load repository context');
            }

            // Search for relevant files
            const relevantFiles = await repositoryContextService.searchFiles(
                user,
                repositoryInfo.owner,
                repositoryInfo.repo,
                concept
            );

            const prompt = `Explain the concept "${concept}" in the context of the repository ${repositoryInfo.owner}/${repositoryInfo.repo}.

${repositoryContextService.formatContextForAI(repoContext)}

### Relevant Files Found:
${relevantFiles.slice(0, 10).map(file => `- ${file.path} (${file.language})`).join('\n')}

Please explain:
- How this concept is implemented in the repository
- Which files are most relevant
- Key patterns and approaches used
- How different parts work together
- Usage examples from the codebase`;

            return await this.generateContent(prompt);
        } catch (error) {
            console.error('❌ Error explaining repository concept:', error);
            throw new Error(`Failed to explain concept "${concept}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}

export const aiService = new AIService();
export default aiService;
