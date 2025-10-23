// src/services/aiService.ts
import { repositoryContextService } from './repositoryContextService';
import type { User } from 'firebase/auth';

const GENERATE_API = '/api/gemini/generate';

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
        let fullPrompt = `
Generate professional content based on this request: "${prompt}"

The content should be:
- Well-structured and professional
- In plain text with minimal formatting (use simple HTML tags only: <h1>, <h2>, <h3>, <p>, <strong>, <em>, <ul>, <ol>, <li>)
- Include appropriate headings and paragraphs
- Be comprehensive but concise
- Do not use complex HTML structures, tables, or nested elements
        `;

        if (documentContext) {
            fullPrompt += `\n\nDocument context for reference:\n${documentContext}`;
        }

        fullPrompt += '\n\nProvide only the content without any explanations or additional text.';

        return this.generateContent(fullPrompt);
    }

    async chatResponse(message: string, documentContent?: string): Promise<string> {
        let prompt = `
You are an AI assistant helping with document editing and writing. Respond to this message: "${message}"

Be helpful, concise, and professional. If the user asks for content generation or editing, provide specific actionable suggestions.
        `;

        if (documentContent) {
            prompt += `\n\nCurrent document content for context:\n${documentContent.substring(0, 2000)}`;
        }

        return this.generateContent(prompt);
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

            let fullPrompt = `You are an AI assistant with access to the repository: ${repositoryInfo.owner}/${repositoryInfo.repo}

USER REQUEST: "${prompt}"
`;

            if (repoContext) {
                const contextFormatted = repositoryContextService.formatContextForAI(repoContext);
                fullPrompt += `\n${contextFormatted}`;
            }

            if (documentContext) {
                fullPrompt += `\n### Current Document Context\n${documentContext.substring(0, 1500)}`;
            }

            fullPrompt += `

INSTRUCTIONS:
- Use the repository context to provide accurate, specific suggestions
- Reference actual files, code patterns, and project structure when relevant
- If suggesting code changes, show specific file paths and line references
- Maintain consistency with the existing codebase style and patterns
- Provide actionable, implementable suggestions
- Use markdown formatting for code snippets with appropriate language tags

Generate a helpful response that leverages the repository knowledge:`;

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
- The template itself defines all content requirements (code examples, validation logic, etc.)
- Include ALL required sections from the template
- Use proper HTML tags as shown in the template (<html>, <body>, <h1>, <h2>, <h3>, <p>, <ul>, <li>, <code>, <pre>, etc.)
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
            console.log('🔄 Falling back to standard iterative generation...');
            
            // Use the proven iterative method instead of experimental section generation
            return await this.generateDocumentFromTemplateAndRepoIterative(
                user,
                templatePrompt,
                repositoryInfo,
                documentRole,
                documentName,
                onProgress
            );

        } catch (error) {
            console.error('❌ Generation error:', error);
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