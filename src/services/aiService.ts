// src/services/aiService.ts
import { GoogleGenerativeAI } from '@google/generative-ai';
import { repositoryContextService, type RepositoryContext } from './repositoryContextService';
import type { User } from 'firebase/auth';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

class AIService {
    private genAI: GoogleGenerativeAI;
    private model: any;

    constructor() {
        if (!GEMINI_API_KEY) {
            throw new Error('VITE_GEMINI_API_KEY environment variable is required');
        }
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    }

    async generateContent(prompt: string, context?: string): Promise<string> {
        try {
            const fullPrompt = context ? `Context: ${context}\n\nRequest: ${prompt}` : prompt;
            const result = await this.model.generateContent(fullPrompt);
            const response = await result.response;
            return response.text();
        } catch (error) {
            console.error('❌ AI Generation Error:', error);
            throw new Error('Failed to generate AI content');
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