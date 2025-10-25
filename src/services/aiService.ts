// src/services/aiService.ts
import { repositoryContextService } from './repositoryContextService';
import type { User } from 'firebase/auth';
import { buildApiUrl } from '@/lib/apiConfig';

const GENERATE_API = buildApiUrl('api/gemini/generate');

class AIService {
    private defaultModel = 'gemini-2.5-pro';

    async generateContent(prompt: string, context?: string): Promise<string> {
        try {
            const fullPrompt = context ? `Context: ${context}\n\nRequest: ${prompt}` : prompt;
            console.log('🚀 Calling Gemini API:', GENERATE_API);
            console.log('📝 Request body:', {
                prompt: fullPrompt.substring(0, 200) + (fullPrompt.length > 200 ? '...' : ''),
                model: this.defaultModel,
                generationConfig: { maxOutputTokens: 2048 }
            });
            
            const resp = await fetch(GENERATE_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: fullPrompt,
                    model: this.defaultModel,
                    generationConfig: { maxOutputTokens: 2048 },
                }),
            });
            
            console.log('📡 Gemini API Response Status:', resp.status);
            console.log('📡 Gemini API Response Headers:', Object.fromEntries(resp.headers.entries()));
            
            // Try to get response body for better error details
            const responseText = await resp.text();
            console.log('📄 Raw response:', responseText.substring(0, 500));
            
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
            console.log('✅ Gemini API Success, response keys:', Object.keys(data));
            console.log('✅ Text length:', data.text?.length || 0);
            
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
   - get_document_content: Retrieve the full content of a document
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
- When you need to understand document content before making changes → Use get_document_content

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

    /**
     * Advanced chat with MCP tool calling capabilities
     * This method uses the backend MCP integration to actually execute tools
     */
    async chatWithToolCalling(
        message: string, 
        documentId?: string,
        documentContent?: string
    ): Promise<{
        text: string;
        toolsUsed: number;
        toolCalls: Array<{
            name: string;
            args: Record<string, any>;
            result?: any;
            success: boolean;
        }>;
    }> {
        try {
            const systemPrompt = `You are an intelligent AI assistant with active document manipulation capabilities.

**ACTIVE TOOL ACCESS:**

You can directly execute these document operations:
- scan_document_content(reason): Analyze document structure
- get_document_content(documentId): Retrieve full content
- search_document_content(query, reason): Find specific text
- append_document_content(content, reason): Add to document end
- insert_document_content(position, content, reason): Insert at position
- replace_document_content(position{from, to}, content, reason): Replace text
- remove_document_content(position{from, to}, reason): Delete text

**WORKFLOW:**
1. Understand what the user wants
2. Execute the appropriate tool(s) automatically
3. Provide clear feedback on what was done

**EXAMPLES:**
- "Add a conclusion section" → Use append_document_content
- "Find all mentions of AI" → Use search_document_content
- "Replace the intro" → Use replace_document_content with appropriate positions
- "Delete the last paragraph" → Use remove_document_content

Be proactive and execute tools when needed!`;

            const response = await fetch(buildApiUrl('api/gemini/generate-with-tools'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: message,
                    documentId,
                    documentContent,
                    systemPrompt,
                    model: this.defaultModel,
                    generationConfig: {
                        maxOutputTokens: 4096,
                        temperature: 0.7
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData?.error || `Tool calling failed: ${response.status}`);
            }

            const data = await response.json();
            
            return {
                text: data.text || '',
                toolsUsed: data.toolsUsed || 0,
                toolCalls: data.toolCalls || []
            };
        } catch (error) {
            console.error('❌ Chat with tool calling error:', error);
            
            // Fallback to regular chat without tool execution
            const fallbackText = await this.chatResponse(message, documentContent);
            return {
                text: fallbackText,
                toolsUsed: 0,
                toolCalls: []
            };
        }
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
- get_document_content: Retrieve full document content
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
            console.log('🔄 Starting iterative AI document generation...');

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
- <h1>Main Title</h1>
- <h2>Section</h2>
- <h3>Subsection</h3>

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
                console.log(`\n${'='.repeat(60)}`);
                console.log(`🔄 ITERATION ${iteration}/${maxIter}`);
                console.log(`${'='.repeat(60)}`);
                
                // More descriptive progress messages
                if (iteration === 1) {
                    onProgress?.('analysis', 'AI analyzing repository structure...');
                } else {
                    onProgress?.('iteration', `AI processing files and generating content...`);
                }

                let prompt = '';
                if (iteration === 1) {
                    prompt = initialPrompt;
                    console.log('📋 Sending initial prompt with repository structure...');
                } else {
                    console.log(`📦 Fetching ${provided.length} requested files...`);
                    const fileContents = await this.getFileContents(user, repositoryInfo, provided);
                    console.log(`✅ Files fetched successfully (${fileContents.length} chars)`);
                    
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
                    console.log('📋 Sending files to AI and asking for next step...');
                }

                console.log(`🤖 Calling Gemini API (prompt length: ${prompt.length} chars)...`);
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
                console.log(`📥 AI Response received (${text.length} chars)`);
                console.log('📄 AI Response preview:', text.substring(0, 200));
                
                let parsed: any;
                try {
                    const match = text.match(/\{[\s\S]*\}/);
                    if (match) {
                        parsed = JSON.parse(match[0]);
                        console.log('✅ Successfully parsed JSON response:', JSON.stringify(parsed, null, 2));
                    } else {
                        console.log('⚠️ No JSON found in response, treating as raw content');
                        parsed = null;
                    }
                } catch (parseError) {
                    console.log('❌ JSON parsing failed:', parseError);
                    console.log('📝 Using raw AI response as content');
                    content = this.cleanHTMLContent(text);
                    break;
                }

                if (!parsed) {
                    console.log('📝 No parsed JSON, using raw text as content');
                    content = this.cleanHTMLContent(text);
                    break;
                }

                if (parsed.needFiles && parsed.files?.length > 0) {
                    console.log(`📂 AI REQUESTED FILES: ${JSON.stringify(parsed.files)}`);
                    console.log(`💭 AI's reason: ${parsed.reason || 'No reason provided'}`);
                    
                    // Show what AI is looking for
                    const filePreview = parsed.files.slice(0, 3).join(', ');
                    const moreCount = parsed.files.length > 3 ? ` and ${parsed.files.length - 3} more` : '';
                    onProgress?.('files', `AI examining: ${filePreview}${moreCount}`);
                    
                    // Clear and set new files to fetch
                    provided.length = 0;
                    provided.push(...parsed.files);
                    console.log(`📋 Files queued for next iteration: ${provided.join(', ')}`);
                } else if (parsed.needFiles === false && parsed.content) {
                    console.log(`✅ AI READY TO GENERATE!`);
                    console.log(`📄 Content received: ${parsed.content.length} chars`);
                    console.log(`📄 Content preview: ${parsed.content.substring(0, 200)}...`);
                    onProgress?.('generate', 'AI writing document content...');
                    content = parsed.content;
                    break;
                } else {
                    console.log(`⚠️ Unexpected AI response format:`, parsed);
                    console.log('📝 Using raw text as fallback');
                    content = text;
                    break;
                }
            }

            if (!content) {
                console.warn(`⚠️ Reached ${maxIter} iterations without generating content, using fallback`);
                onProgress?.('generate', 'Finalizing with template content...');
                content = this.generateFallbackContent(templatePrompt, repositoryInfo, documentName, documentRole);
            } else {
                console.log(`✅ Content generation complete: ${content.length} characters`);
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
            console.log('🔄 Starting TRUE iterative section-by-section generation...');
            onProgress?.('init', 'Preparing iterative generation...');

            // PHASE 1: Collect repository files using existing iterative method
            console.log('📚 PHASE 1: Collecting repository files...');
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

            console.log('📋 Asking AI which files to collect...');
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
                            console.log(`📂 AI requested ${requestedFiles.length} files:`, requestedFiles);
                        }
                    }
                } catch (e) {
                    console.warn('Failed to parse file request, will use README only');
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
                            console.log(`✅ Collected: ${path}`);
                        }
                    } catch (error) {
                        console.warn(`⚠️ Could not fetch ${path}`);
                    }
                }
            }

            console.log(`📦 Collected ${collectedFiles.length} files for context`);

            // PHASE 2: Plan document sections
            console.log('📋 PHASE 2: Planning document sections...');
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
                    console.warn('Failed to parse sections, using defaults');
                }
            }

            // Fallback sections if planning failed
            if (sections.length === 0) {
                sections = ['Introduction', 'Getting Started', 'Core Features', 'Technical Details', 'Conclusion'];
            }

            console.log(`📋 Planned ${sections.length} sections:`, sections);

            // PHASE 3: Generate each section with full 8192 token budget
            console.log('✍️ PHASE 3: Generating sections...');
            const generatedSections: string[] = [];
            const filesContext = collectedFiles.map(f => 
                `**${f.path}** (${f.language}):\n\`\`\`${f.language}\n${f.content}\n\`\`\``
            ).join('\n\n');

            for (let i = 0; i < sections.length; i++) {
                const sectionName = sections[i];
                onProgress?.('generate', `Generating ${i + 1}/${sections.length}: ${sectionName}`);
                console.log(`\n📝 Generating section ${i + 1}/${sections.length}: ${sectionName}`);

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
                    console.warn(`⚠️ Failed to generate section: ${sectionName}, skipping...`);
                    continue;
                }

                const sectionData = await sectionRes.json();
                const sectionContent = String(sectionData.text || '');
                
                // Clean the section content
                const cleaned = this.cleanHTMLContent(sectionContent);
                generatedSections.push(cleaned);
                
                console.log(`✅ Section ${i + 1} generated: ${cleaned.length} characters`);
            }

            // PHASE 4: Combine all sections
            console.log('🔗 PHASE 4: Combining sections...');
            onProgress?.('finalize', 'Combining all sections...');

            const finalDocument = `<h1>${documentName}</h1>
${generatedSections.join('\n\n')}`;

            console.log(`✅ COMPLETE! Total document: ${finalDocument.length} characters`);
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
        
        console.log(`📦 Attempting to fetch ${paths.length} files...`);
        
        for (const path of paths) {
            try {
                console.log(`  Fetching: ${path}...`);
                const file = await repositoryContextService.getFileWithContext(user, repoInfo.owner, repoInfo.repo, path);
                if (file?.content) {
                    const truncated = file.content.length > 5000;
                    const contentToShow = file.content.substring(0, 5000);
                    contents.push(`**${path}** ${truncated ? `(${file.content.length} chars, showing first 5000)` : `(${file.content.length} chars)`}\n\`\`\`${file.language || 'text'}\n${contentToShow}\n\`\`\``);
                    successFiles.push(path);
                    console.log(`  ✅ ${path} - ${file.content.length} chars`);
                } else {
                    contents.push(`**${path}**: ⚠️ File exists but has no content`);
                    failedFiles.push(path);
                    console.log(`  ⚠️ ${path} - No content`);
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                contents.push(`**${path}**: ❌ NOT FOUND (${errorMsg})`);
                failedFiles.push(path);
                console.log(`  ❌ ${path} - ${errorMsg}`);
            }
        }
        
        console.log(`📊 File fetch summary: ${successFiles.length} succeeded, ${failedFiles.length} failed`);
        if (successFiles.length > 0) {
            console.log(`  ✅ Success: ${successFiles.join(', ')}`);
        }
        if (failedFiles.length > 0) {
            console.log(`  ❌ Failed: ${failedFiles.join(', ')}`);
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
            console.log('🤖 Starting AI document generation...');
            console.log('📋 Template:', templatePrompt.substring(0, 100) + '...');
            console.log('📦 Repository:', repositoryInfo.fullName);
            console.log('👤 Role:', documentRole);

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

            console.log('🚀 Sending request to Gemini AI...');
            
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

            console.log('✅ AI generation complete');
            console.log('📄 Generated content length:', htmlContent.length);

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
            console.warn('⚠️ AI returned plain text instead of HTML, wrapping in HTML structure');
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