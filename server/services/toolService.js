
// Firestore will be passed in from the main server file
let firestore = null;
// Initialize firestore reference
export const initFirestore = (firestoreInstance) => {
    firestore = firestoreInstance;
};


// Track tool usage for chat sidebar
const toolUsageLog = [];

// Helper to log tool usage
const logToolUsage = (toolName, args, result, documentId = null) => {
    const logEntry = {
        tool: toolName,
        timestamp: new Date().toISOString(),
        documentId,
        args: { ...args },
        result: {
            success: result.success,
            operation: result.operation || toolName.replace('_document_content', ''),
            summary: getResultSummary(toolName, result)
        }
    };

    toolUsageLog.push(logEntry);

    // Keep only last 50 entries
    if (toolUsageLog.length > 50) {
        toolUsageLog.shift();
    }


    return logEntry;
};

// Get human-readable summary of tool result
const getResultSummary = (toolName, result) => {
    switch (toolName) {
        case 'scan_document_content':
            return `Scanned: ${result.analysis?.total_lines || 0} lines, ${result.analysis?.total_words || 0} words, ${result.analysis?.headings_count || 0} headings`;
        case 'search_document_content':
            return `Found ${result.matches_count || 0} matches for "${result.query}"`;
        case 'append_document_content':
            return `Appended ${result.appended_length || 0} characters`;
        case 'insert_document_content':
            return `Inserted ${result.inserted_length || 0} characters at position ${result.position}`;
        case 'replace_document_content':
            return `Replaced ${result.removed_length || 0} characters with ${result.inserted_length || 0} characters`;
        case 'remove_document_content':
            return `Removed ${result.removed_length || 0} characters`;
        default:
            return 'Operation completed';
    }
};

// Export tool usage log getter
export const getToolUsageLog = () => {
    return [...toolUsageLog];
};

// Export tool usage log clearer
export const clearToolUsageLog = () => {
    toolUsageLog.length = 0;
};

/**
 * Get tool service instance with methods for tool operations
 */
export const getToolService = () => {
    return {
        async getAvailableTools() {
            const registry = await getToolsRegistry();
            return registry.tools;
        },

        async executeTool(toolName, parameters) {
            const toolMap = {
                'get_document_content': get_document_content,
                'scan_document_content': scan_document_content,
                'search_document_content': search_document_content,
                'append_document_content': append_document_content,
                'insert_document_content': insert_document_content,
                'replace_document_content': replace_document_content,
                'remove_document_content': remove_document_content,
                'append_document_summary': append_document_summary,
                'insert_document_summary': insert_document_summary,
                'replace_doument_summary': replace_doument_summary,
                'remove_document_summary': remove_document_summary,
                'search_document_summary': search_document_summary,
                'get_all_documents_metadata_within_project': get_all_documents_metadata_within_project,
                'get_document_summary': get_document_summary,
                'get_repo_structure': get_repo_structure,
                'get_repo_commits': get_repo_commits,
            };

            const tool = toolMap[toolName];
            if (!tool) {
                return {
                    success: false,
                    html: `<div class="error-message">Sorry, I couldn't find the requested tool. Please try again with a different request.</div>`
                };
            }

            try {
                return await tool(parameters);
            } catch (err) {
                console.error(`❌ Error executing tool ${toolName}:`, err);
                return {
                    success: false,
                    html: `<div class="error-message">Error: ${err.message || 'Something went wrong'}. Please try again.</div>`,
                    error: err.message
                };
            }
        }
    };
};

export const getToolsRegistry = async () => {
    return {
        baseUrl: 'api/tool',
        version: '1.0.0',
        description: 'Text document editing operations.',
        tools: [
            {
                name: 'append_document_content',
                description: 'Append new text at end of document.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        content: { type: 'string', description: 'Text to append' },
                        reason: { type: 'string', description: 'Why the addition is made' }
                    },
                    required: ['content', 'reason']
                },
                annotations: {
                    title: 'Append Text',
                    idempotentHint: false,
                    destructiveHint: false
                }
            },
            {
                name: 'insert_document_content',
                description: 'Insert text at specific character position.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        position: { type: 'number', description: '0-based index' },
                        content: { type: 'string', description: 'Text to insert' },
                        reason: { type: 'string', description: 'Why insertion is needed' }
                    },
                    required: ['position', 'content', 'reason']
                },
                annotations: { title: 'Insert Text', idempotentHint: false, destructiveHint: false }
            },
            {
                name: 'insert_document_content_at_location',
                description: 'Insert content at a specific location in the document by searching for a target string or heading. Useful for adding content at meaningful positions.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        target: { type: 'string', description: 'Target string or heading to find (e.g., "</h1>", "Introduction", specific text)' },
                        position: {
                            type: 'string',
                            enum: ['before', 'after'],
                            description: 'Insert before or after the target'
                        },
                        content: { type: 'string', description: 'HTML content to insert' },
                        reason: { type: 'string', description: 'Why insertion is needed' }
                    },
                    required: ['target', 'position', 'content', 'reason']
                },
                annotations: { title: 'Insert at Location', idempotentHint: false, destructiveHint: false }
            },
            {
                name: 'replace_document_content',
                description: 'Replace text in a given range with new content.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        position: {
                            type: 'object',
                            properties: {
                                from: { type: 'number' },
                                to: { type: 'number' }
                            },
                            required: ['from', 'to']
                        },
                        content: { type: 'string', description: 'Replacement text' },
                        reason: { type: 'string', description: 'Reason for replacement' }
                    },
                    required: ['position', 'content', 'reason']
                },
                annotations: { title: 'Replace Text', destructiveHint: true, idempotentHint: false }
            },
            {
                name: 'remove_document_content',
                description: 'Remove text in a specified range or by matching a query string.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        position: {
                            oneOf: [
                                {
                                    type: 'object',
                                    properties: { from: { type: 'number' }, to: { type: 'number' } },
                                    required: ['from', 'to']
                                },
                                {
                                    type: 'string',
                                    description: 'Optional text pattern or heading name to locate and remove automatically.'
                                }
                            ]
                        },
                        reason: { type: 'string', description: 'Why the removal is performed' }
                    },
                    required: ['position', 'reason']
                },
                annotations: { title: 'Delete Text', destructiveHint: true, idempotentHint: false }
            },
            {
                name: 'scan_document_content',
                description: 'Read the document content for analysis or review.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        reason: { type: 'string', description: 'What is being analyzed' }
                    },
                    required: ['reason']
                },
                annotations: { title: 'Read Document', readOnlyHint: true, idempotentHint: true }
            },
            {
                name: 'search_document_content',
                description: 'Search the document content for specific information.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        reason: { type: 'string', description: 'Why the search is being performed' }
                    },
                    required: ['query']
                },
                annotations: { title: 'Search Document', readOnlyHint: true, idempotentHint: true }
            },
            {
                name: 'verify_document_change',
                description: 'Compare pre- and post-operation states to confirm successful modification.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        reason: { type: 'string' }
                    },
                    required: ['reason']
                }
            },
            {
                name: 'get_document_content',
                description: 'Retrieve the full document content. MUST be called FIRST before any document manipulation operation.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        reason: { type: 'string', description: 'Why retrieving the document content' }
                    },
                    required: ['reason']
                },
                annotations: { title: 'Get Document', readOnlyHint: true, idempotentHint: true }
            },
            {
                name: 'get_all_documents_metadata_within_project',
                description: 'Get metadata of all documents within the same project (excluding content and summary). Useful for understanding project structure.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        documentId: { type: 'string', description: 'Current document ID to find related project documents' },
                        reason: { type: 'string', description: 'Why retrieving project documents metadata' }
                    },
                    required: ['documentId', 'reason']
                },
                annotations: { title: 'Get Project Metadata', readOnlyHint: true, idempotentHint: true }
            },
            {
                name: 'get_document_summary',
                description: 'Retrieve the AI-generated summary of a specific document.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        documentId: { type: 'string', description: 'Document ID to get summary for' },
                        reason: { type: 'string', description: 'Why retrieving the document summary' }
                    },
                    required: ['documentId', 'reason']
                },
                annotations: { title: 'Get Document Summary', readOnlyHint: true, idempotentHint: true }
            },
            {
                name: 'replace_doument_summary',
                description: 'Replace text in the Summary field over a given range.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        position: {
                            type: 'object',
                            properties: { from: { type: 'number' }, to: { type: 'number' } },
                            required: ['from', 'to']
                        },
                        content: { type: 'string', description: 'Replacement text' },
                        reason: { type: 'string', description: 'Reason for replacement' }
                    },
                    required: ['position', 'content', 'reason']
                },
                annotations: { title: 'Replace Summary Text', destructiveHint: true, idempotentHint: false }
            },
            {
                name: 'remove_document_summary',
                description: 'Remove text from the Summary field within a specified range.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        position: {
                            type: 'object',
                            properties: { from: { type: 'number' }, to: { type: 'number' } },
                            required: ['from', 'to']
                        },
                        reason: { type: 'string', description: 'Why the removal is performed' }
                    },
                    required: ['position', 'reason']
                },
                annotations: { title: 'Delete Summary Text', destructiveHint: true, idempotentHint: false }
            },
            {
                name: 'search_document_summary',
                description: 'Search the Summary field for a specific query string.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: { type: 'string', description: 'Search query' },
                        reason: { type: 'string', description: 'Why the search is being performed' }
                    },
                    required: ['query']
                },
                annotations: { title: 'Search Summary', readOnlyHint: true, idempotentHint: true }
            },
            {
                name: 'get_repo_structure',
                description: 'Get the file structure of a GitHub repository. Returns a complete tree of files and directories.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repoLink: { type: 'string', description: 'GitHub repository URL (e.g., https://github.com/owner/repo) or owner/repo format' },
                        branch: { type: 'string', description: 'Branch name (default: main)', default: 'main' },
                        reason: { type: 'string', description: 'Why retrieving the repository structure' }
                    },
                    required: ['repoLink', 'reason']
                },
                annotations: { title: 'Get Repo Structure', readOnlyHint: true, idempotentHint: true }
            },
            {
                name: 'get_repo_commits',
                description: 'Get commit history from a GitHub repository with pagination support.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        repoLink: { type: 'string', description: 'GitHub repository URL or owner/repo format' },
                        branch: { type: 'string', description: 'Branch name (default: main)', default: 'main' },
                        page: { type: 'number', description: 'Page number for pagination (default: 1)', default: 1 },
                        per_page: { type: 'number', description: 'Number of commits per page (default: 30, max: 100)', default: 30 },
                        reason: { type: 'string', description: 'Why retrieving the commit history' }
                    },
                    required: ['repoLink', 'reason']
                },
                annotations: { title: 'Get Repo Commits', readOnlyHint: true, idempotentHint: true }
            }
        ]
    }
}

// Global document state (linked to Firebase)
let currentDocumentId = null;
let currentDocumentContent = '';

// Set current document from Firebase
export const setCurrentDocument = async (documentId) => {
    try {
        if (!documentId) {
            currentDocumentId = null;
            currentDocumentContent = '';
            return { success: true, content: '' };
        }

        if (!firestore) {
            throw new Error('Firestore not initialized in toolService');
        }


        // For regular Firebase SDK
        const { doc, getDoc } = await import('firebase/firestore');

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Document fetch timeout (10s)')), 10000);
        });

        const docRef = doc(firestore, 'Documents', documentId);

        const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);

        if (!docSnap.exists()) {
            throw new Error(`Document ${documentId} not found in Firestore collection`);
        }

        const docData = docSnap.data();
        currentDocumentId = documentId;
        currentDocumentContent = docData.Content || '';


        return {
            success: true,
            documentId,
            content: currentDocumentContent,
            documentName: docData.DocumentName
        };
    } catch (error) {
        console.error('❌ Error setting current document:', error);
        throw error;
    }
};

// Sync document content back to Firebase
const syncToFirebase = async () => {
    if (!currentDocumentId || !firestore) {
        // This is OK for testing or read-only operations
        return { success: false, error: 'No document set or firestore not initialized' };
    }

    try {
        // For regular Firebase SDK, use doc() and updateDoc()
        const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
        const docRef = doc(firestore, 'Documents', currentDocumentId);

        // Update document with new content and mark as modified (draft)
        await updateDoc(docRef, {
            Content: currentDocumentContent,
            Updated_Time: Timestamp.now(),
            IsDraft: true // Mark as draft when AI modifies content
        });

        return { success: true };
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
        return { success: false, error: error.message };
    }
};

export const get_document_content = async ({ documentId, reason }) => {
    try {

        // If documentId provided, fetch from Firebase
        if (documentId && documentId !== currentDocumentId) {
            await setCurrentDocument(documentId);
        }

        const result = {
            success: true,
            reason: reason || 'Getting document content',
            operation: 'get_content',
            documentId: currentDocumentId,
            content: currentDocumentContent,
            length: currentDocumentContent.length
        };

        logToolUsage('get_document_content', { documentId, reason }, result, currentDocumentId);
        return result;
    } catch (error) {
        const result = {
            success: false,
            reason: reason || 'Getting document content',
            error: error.message
        };
        logToolUsage('get_document_content', { documentId, reason }, result, currentDocumentId);
        throw error;
    }
};

export const scan_document_content = async ({ reason }) => {
    const lines = currentDocumentContent.split('\n');
    const words = currentDocumentContent.split(/\s+/).filter(w => w.length > 0);
    const characters = currentDocumentContent.length;

    // Extract headings
    const headings = lines
        .filter(line => line.trim().startsWith('#'))
        .map(line => {
            const match = line.match(/^(#{1,6})\s+(.+)/);
            return match ? { level: match[1].length, text: match[2] } : null;
        })
        .filter(h => h !== null);

    const result = {
        success: true,
        reason,
        analysis: {
            total_lines: lines.length,
            total_words: words.length,
            total_characters: characters,
            headings_count: headings.length,
            headings: headings,
            has_content: currentDocumentContent.length > 0
        },
        preview: currentDocumentContent.substring(0, 200) + (currentDocumentContent.length > 200 ? '...' : '')
    };

    logToolUsage('scan_document_content', { reason }, result, currentDocumentId);
    return result;
}

export const search_document_content = async ({ query, reason }) => {

    try {
        // Validate inputs
        if (!query || typeof query !== 'string') {
            throw new Error('Search query is required and must be a string');
        }

        if (!currentDocumentContent || currentDocumentContent.trim().length === 0) {
            return {
                success: true,
                query,
                reason: reason || 'Search requested',
                matches_count: 0,
                matches: [],
                total_matches: 0,
                note: 'No content to search (document is empty).'
            };
        }

        const matches = [];
        const lowerQuery = query.toLowerCase();
        const lowerContent = currentDocumentContent.toLowerCase();


        // Parse HTML elements using regex (no JSDOM needed)
        // Match HTML elements: p, h1-h6, blockquote, li, td, th, code, pre
        const elementRegex = /<(p|h[1-6]|blockquote|li|td|th|code|pre)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;

        let elementMatch;
        let elementIndex = 0;
        const processedPositions = new Set(); // Avoid duplicate matches


        while ((elementMatch = elementRegex.exec(currentDocumentContent)) !== null) {
            try {
                const elementHTML = elementMatch[0];
                const elementTag = elementMatch[1].toLowerCase();
                const elementPosition = elementMatch.index;

                // Skip if we already processed this position
                if (processedPositions.has(elementPosition)) {
                    continue;
                }

                // Extract text content from HTML (remove tags)
                const textContent = elementHTML.replace(/<[^>]+>/g, '').trim();

                // Check if this element contains the search query
                if (textContent.toLowerCase().includes(lowerQuery)) {
                    // Get context (50 chars before and after element)
                    const contextStart = Math.max(0, elementPosition - 50);
                    const contextEnd = Math.min(currentDocumentContent.length, elementPosition + elementHTML.length + 50);
                    const context = currentDocumentContent.substring(contextStart, contextEnd);

                    matches.push({
                        element_index: elementIndex,
                        element_tag: elementTag,
                        element_html: elementHTML,
                        element_position: elementPosition,
                        element_length: elementHTML.length,
                        text_content: textContent.substring(0, 200),
                        context: context,
                        context_start: contextStart,
                        context_end: contextEnd
                    });

                    processedPositions.add(elementPosition);
                    elementIndex++;
                }
            } catch (elementError) {
                console.error('❌ Error processing element:', elementError);
                // Continue with next element
            }
        }


        const result = {
            success: true,
            query,
            reason: reason || 'Search requested',
            matches_count: matches.length,
            matches: matches.slice(0, 10), // Limit to first 10 matches
            total_matches: matches.length,
            note: 'Results show HTML element details. Use element_position for precise operations.'
        };

        logToolUsage('search_document_content', { query, reason }, result, currentDocumentId);
        return result;
    } catch (error) {
        console.error('❌ Error in search_document_content:', error);
        console.error('Stack trace:', error.stack);

        const result = {
            success: false,
            error: error.message || 'Unknown error occurred',
            query,
            reason: reason || 'Search requested',
            note: 'Search failed. Check server logs for details.'
        };

        logToolUsage('search_document_content', { query, reason }, result, currentDocumentId);
        throw error; // Re-throw to be caught by executeTool
    }
}

export const append_document_content = async ({ content, reason }) => {
    if (typeof content !== 'string' || !content.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, no content was provided to append. Please try again.</div>`
        };
    }
    currentDocumentContent = currentDocumentContent + content;
    const result = {
        success: true,
        html: `<div class="tool-success">Added <b>${content.length}</b> characters to your document.</div>`
    };
    logToolUsage('append_document_content', { content, reason }, result, currentDocumentId);
    await syncToFirebase();
    return result;
}

export const insert_document_content = async ({ position, content, reason }) => {
    if (typeof position !== 'number' || position < 0 || position > currentDocumentContent.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, we couldn't find the right place to insert your text. Please try again with a different request.</div>`
        };
    }
    if (typeof content !== 'string' || !content.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, no content was provided to insert. Please try again.</div>`
        };
    }
    currentDocumentContent = currentDocumentContent.slice(0, position) + content + currentDocumentContent.slice(position);
    const result = {
        success: true,
        html: `<div class="tool-success">Inserted <b>${content.length}</b> characters at position <b>${position}</b>.</div>`,
        position: { from: position, to: position + content.length }
    };
    logToolUsage('insert_document_content', { position, content, reason }, result, currentDocumentId);
    await syncToFirebase();
    return result;
}

export const insert_document_content_at_location = async ({ target, position, content, reason }) => {
    if (typeof target !== 'string' || !target.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, no target location was provided. Please specify where to insert the content.</div>`
        };
    }
    if (typeof content !== 'string' || !content.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, no content was provided to insert. Please try again.</div>`
        };
    }
    if (position !== 'before' && position !== 'after') {
        return {
            success: false,
            html: `<div class="error-message">Position must be either 'before' or 'after'.</div>`
        };
    }

    // Find the target in the document
    const targetIndex = currentDocumentContent.indexOf(target);
    if (targetIndex === -1) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, couldn't find "${target.substring(0, 50)}" in the document. Please try a different target.</div>`
        };
    }

    // Calculate insertion position
    let insertPosition;
    if (position === 'before') {
        insertPosition = targetIndex;
    } else {
        insertPosition = targetIndex + target.length;
    }

    // Insert the content
    currentDocumentContent = currentDocumentContent.slice(0, insertPosition) + content + currentDocumentContent.slice(insertPosition);

    const result = {
        success: true,
        html: `<div class="tool-success">Inserted <b>${content.length}</b> characters ${position} "${target.substring(0, 30)}${target.length > 30 ? '...' : ''}".</div>`,
        position: { from: insertPosition, to: insertPosition + content.length },
        targetFound: target.substring(0, 100),
        insertedAt: insertPosition
    };

    logToolUsage('insert_document_content_at_location', { target, position, content, reason }, result, currentDocumentId);
    await syncToFirebase();
    return result;
}

export const replace_document_content = async ({ position, content, reason }) => {
    if (!position || typeof position !== 'object' || typeof position.from !== 'number' || typeof position.to !== 'number') {
        return {
            success: false,
            html: `<div class="error-message">Sorry, we couldn't find the part of your document to replace. Please try again with a different request.</div>`
        };
    }
    if (typeof content !== 'string') {
        return {
            success: false,
            html: `<div class="error-message">Sorry, no content was provided to replace. Please try again.</div>`
        };
    }
    const { from, to } = position;

    // Validate and sanitize positions
    const safeFrom = Math.max(0, Math.min(from, currentDocumentContent.length));
    const safeTo = Math.max(safeFrom, Math.min(to, currentDocumentContent.length));

    // Safety check: prevent replacing too much content accidentally
    const replacementLength = safeTo - safeFrom;
    const totalLength = currentDocumentContent.length;

    if (replacementLength > totalLength * 0.8 && content.length < replacementLength * 0.1) {
        return {
            success: false,
            html: `<div class="error-message">Cannot replace more than 80% of document with significantly smaller content. This looks like accidental deletion. Please be more specific.</div>`
        };
    }

    const removedText = currentDocumentContent.slice(safeFrom, safeTo);
    currentDocumentContent = currentDocumentContent.slice(0, safeFrom) + content + currentDocumentContent.slice(safeTo);
    const result = {
        success: true,
        html: `<div class="tool-success">Replaced <b>${safeTo - safeFrom}</b> characters with <b>${content.length}</b> new characters.</div>`,
        removed_length: safeTo - safeFrom,
        inserted_length: content.length,
        position: { from: safeFrom, to: safeTo }
    };
    logToolUsage('replace_document_content', { position, content, reason }, result, currentDocumentId);
    await syncToFirebase();
    return result;
}

export const remove_document_content = async ({ position, reason }) => {
    if (!position || typeof position !== 'object' || typeof position.from !== 'number' || typeof position.to !== 'number') {
        return {
            success: false,
            html: `<div class="error-message">Sorry, we couldn't find the part of your document to remove. Please try again with a different request.</div>`
        };
    }
    const { from, to } = position;

    // Validate position bounds
    const safeFrom = Math.max(0, Math.min(from, currentDocumentContent.length));
    const safeTo = Math.max(safeFrom, Math.min(to, currentDocumentContent.length));

    // Safety check: prevent removing too much content accidentally
    const removalLength = safeTo - safeFrom;
    const totalLength = currentDocumentContent.length;

    if (removalLength > totalLength * 0.8) {
        return {
            success: false,
            html: `<div class="error-message">Cannot remove more than 80% of document content in a single operation. Please be more specific about what you want to remove.</div>`
        };
    }

    const removedText = currentDocumentContent.slice(safeFrom, safeTo);
    currentDocumentContent = currentDocumentContent.slice(0, safeFrom) + currentDocumentContent.slice(safeTo);
    const result = {
        success: true,
        html: `<div class="tool-success">Removed <b>${safeTo - safeFrom}</b> characters from your document.</div>`,
        removed_length: safeTo - safeFrom,
        position: { from: safeFrom, to: safeTo },
        removedContent: removedText.substring(0, 100) + (removedText.length > 100 ? '...' : '') // Preview of removed content
    };
    logToolUsage('remove_document_content', { position, reason }, result, currentDocumentId);
    await syncToFirebase();
    return result;
}

// New tool: Get all documents metadata within the same project
// Append to Summary field
export const append_document_summary = async ({ content, reason }) => {
    if (!currentDocumentId || !firestore) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, we couldn't find your document summary. Please try again.</div>`
        };
    }
    if (typeof content !== 'string' || !content.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, no summary content was provided to append. Please try again.</div>`
        };
    }
    const { doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');
    const docRef = doc(firestore, 'Documents', currentDocumentId);
    const docSnap = await getDoc(docRef);
    let summary = '';
    if (docSnap.exists()) {
        summary = docSnap.data().Summary || '';
    }
    const newSummary = summary + content;
    await updateDoc(docRef, { Summary: newSummary, Updated_Time: Timestamp.now() });
    return {
        success: true,
        html: `<div class="tool-success">Added <b>${content.length}</b> characters to your document summary.</div>`
    };
};

// Insert into Summary field at position
export const insert_document_summary = async ({ position, content, reason }) => {
    if (!currentDocumentId || !firestore) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, we couldn't find your document summary. Please try again.</div>`
        };
    }
    const { doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');
    const docRef = doc(firestore, 'Documents', currentDocumentId);
    const docSnap = await getDoc(docRef);
    let summary = '';
    if (docSnap.exists()) {
        summary = docSnap.data().Summary || '';
    }
    if (typeof position !== 'number' || position < 0 || position > summary.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, we couldn't find the right place to insert your summary text. Please try again.</div>`
        };
    }
    if (typeof content !== 'string' || !content.length) {
        return {
            success: false,
            html: `<div class="error-message">Sorry, no summary content was provided to insert. Please try again.</div>`
        };
    }
    const newSummary = summary.slice(0, position) + content + summary.slice(position);
    await updateDoc(docRef, { Summary: newSummary, Updated_Time: Timestamp.now() });
    return {
        success: true,
        html: `<div class="tool-success">Inserted <b>${content.length}</b> characters into your document summary.</div>`
    };
};

// Replace range in Summary field
export const replace_doument_summary = async ({ position, content, reason }) => {
    if (!currentDocumentId || !firestore) {
        return { success: false, html: `<div class="error-message">Sorry, we couldn't find your document summary. Please try again.</div>` };
    }
    if (!position || typeof position !== 'object' || typeof position.from !== 'number' || typeof position.to !== 'number') {
        return { success: false, html: `<div class="error-message">Missing or invalid position. Provide { position: { from, to } }.</div>` };
    }
    if (typeof content !== 'string') {
        return { success: false, html: `<div class="error-message">Sorry, no summary content was provided to replace. Please try again.</div>` };
    }
    const { doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');
    const docRef = doc(firestore, 'Documents', currentDocumentId);
    const docSnap = await getDoc(docRef);
    const currentSummary = docSnap.exists() ? (docSnap.data().Summary || '') : '';
    const { from, to } = position;
    const safeFrom = Math.max(0, Math.min(from, currentSummary.length));
    const safeTo = Math.max(safeFrom, Math.min(to, currentSummary.length));
    const newSummary = currentSummary.slice(0, safeFrom) + content + currentSummary.slice(safeTo);
    await updateDoc(docRef, { Summary: newSummary, Updated_Time: Timestamp.now() });
    return { success: true, html: `<div class="tool-success">Replaced <b>${safeTo - safeFrom}</b> characters in the summary.</div>` };
};

// Remove range from Summary field
export const remove_document_summary = async ({ position, reason }) => {
    if (!currentDocumentId || !firestore) {
        return { success: false, html: `<div class="error-message">Sorry, we couldn't find your document summary. Please try again.</div>` };
    }
    if (!position || typeof position !== 'object' || typeof position.from !== 'number' || typeof position.to !== 'number') {
        return { success: false, html: `<div class="error-message">Missing or invalid position. Provide { position: { from, to } }.</div>` };
    }
    const { doc, getDoc, updateDoc, Timestamp } = await import('firebase/firestore');
    const docRef = doc(firestore, 'Documents', currentDocumentId);
    const docSnap = await getDoc(docRef);
    const currentSummary = docSnap.exists() ? (docSnap.data().Summary || '') : '';
    const { from, to } = position;
    const safeFrom = Math.max(0, Math.min(from, currentSummary.length));
    const safeTo = Math.max(safeFrom, Math.min(to, currentSummary.length));
    const newSummary = currentSummary.slice(0, safeFrom) + currentSummary.slice(safeTo);
    await updateDoc(docRef, { Summary: newSummary, Updated_Time: Timestamp.now() });
    return { success: true, html: `<div class="tool-success">Removed <b>${safeTo - safeFrom}</b> characters from the summary.</div>` };
};

// Search within Summary field
export const search_document_summary = async ({ query, reason }) => {
    if (!currentDocumentId || !firestore) {
        return { success: false, html: `<div class="error-message">Sorry, we couldn't access your document summary. Please try again.</div>` };
    }
    const { doc, getDoc } = await import('firebase/firestore');
    const docRef = doc(firestore, 'Documents', currentDocumentId);
    const docSnap = await getDoc(docRef);
    const summary = docSnap.exists() ? (docSnap.data().Summary || '') : '';

    const matches = [];
    const lowerQuery = (query || '').toLowerCase();

    // Parse HTML to find element-level matches in summary using regex (no JSDOM)
    try {
        if (!summary || summary.trim().length === 0) {
            return {
                success: true,
                query,
                matches_count: 0,
                matches: [],
                total_matches: 0,
                note: 'No summary content to search.'
            };
        }

        // Match HTML elements using regex
        const elementRegex = /<(p|h[1-6]|blockquote|li|td|th|code|pre)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi;

        let elementMatch;
        let elementIndex = 0;
        const processedPositions = new Set();

        while ((elementMatch = elementRegex.exec(summary)) !== null) {
            const elementHTML = elementMatch[0];
            const elementTag = elementMatch[1].toLowerCase();
            const elementPosition = elementMatch.index;

            // Skip if we already processed this position
            if (processedPositions.has(elementPosition)) {
                continue;
            }

            // Extract text content from HTML (remove tags)
            const textContent = elementHTML.replace(/<[^>]+>/g, '').trim();

            // Check if this element contains the search query
            if (textContent.toLowerCase().includes(lowerQuery)) {
                const contextStart = Math.max(0, elementPosition - 50);
                const contextEnd = Math.min(summary.length, elementPosition + elementHTML.length + 50);
                const context = summary.substring(contextStart, contextEnd);

                matches.push({
                    element_index: elementIndex,
                    element_tag: elementTag,
                    element_html: elementHTML,
                    element_position: elementPosition,
                    element_length: elementHTML.length,
                    text_content: textContent.substring(0, 200),
                    context: context,
                    context_start: contextStart,
                    context_end: contextEnd
                });

                processedPositions.add(elementPosition);
                elementIndex++;
            }
        }
    } catch (e) {
        console.error('Error parsing summary HTML:', e);
    }

    return {
        success: true,
        query,
        matches_count: matches.length,
        matches: matches.slice(0, 10),
        total_matches: matches.length,
        note: 'Results show HTML element details. Use element_position for precise operations.'
    };
};
export const get_all_documents_metadata_within_project = async ({ documentId, reason }) => {

    try {
        if (!firestore) {
            throw new Error('Firestore not initialized');
        }

        const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');

        // Use provided documentId or fall back to currentDocumentId
        const targetDocId = documentId || currentDocumentId;

        if (!targetDocId) {
            return {
                success: false,
                reason,
                error: 'No document ID provided',
                documents: []
            };
        }

        // First, get the current document to find its ProjectID
        const docRef = doc(firestore, 'Documents', targetDocId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return {
                success: false,
                reason,
                error: 'Document not found',
                documents: []
            };
        }

        const docData = docSnap.data();
        const projectId = docData.ProjectID || docData.Project_Id;

        if (!projectId) {
            return {
                success: false,
                reason,
                error: 'Document does not belong to a project',
                documents: [],
                debugInfo: {
                    documentId: targetDocId,
                    availableFields: Object.keys(docData)
                }
            };
        }

        // Query all documents with the same ProjectID
        const documentsRef = collection(firestore, 'Documents');
        const q = query(documentsRef, where('ProjectID', '==', projectId));
        const querySnapshot = await getDocs(q);

        const documents = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            documents.push({
                documentId: doc.id,
                documentName: data.DocumentName || 'Untitled',
                description: data.Description || '',
                createdAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
                updatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
                // Explicitly exclude Content and Summary as requested
            });
        });

        const result = {
            success: true,
            reason,
            operation: 'get_project_metadata',
            projectId,
            documentsCount: documents.length,
            documents
        };

        logToolUsage('get_all_documents_metadata_within_project', { documentId, reason }, result, currentDocumentId);
        return result;

    } catch (error) {
        console.error('❌ Error getting project documents metadata:', error);
        return {
            success: false,
            reason,
            error: error.message,
            documents: []
        };
    }
};

// New tool: Get document summary
export const get_document_summary = async ({ documentId, reason }) => {

    try {
        if (!firestore) {
            throw new Error('Firestore not initialized');
        }

        const { doc, getDoc } = await import('firebase/firestore');

        const docRef = doc(firestore, 'Documents', documentId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            return {
                success: false,
                reason,
                error: 'Document not found',
                summary: ''
            };
        }

        const data = docSnap.data();
        const summary = data.Summary || '';

        if (!summary) {
            return {
                success: true,
                reason,
                operation: 'get_summary',
                documentId,
                summary: '',
                message: 'No summary available for this document'
            };
        }

        const result = {
            success: true,
            reason,
            operation: 'get_summary',
            documentId,
            documentName: data.DocumentName || 'Untitled',
            summary,
            summaryLength: summary.length
        };

        logToolUsage('get_document_summary', { documentId, reason }, result, currentDocumentId);
        return result;

    } catch (error) {
        console.error('❌ Error getting document summary:', error);
        return {
            success: false,
            reason,
            error: error.message,
            summary: ''
        };
    }
};

// Helper function to set document content for testing
export const setDocumentContent = (content) => {
    currentDocumentContent = content;
}

// Helper function to reset document
export const resetDocument = () => {
    currentDocumentId = null;
    currentDocumentContent = '';
}

// Parse GitHub repository link to extract owner and repo
const parseGitHubRepo = (repoLink) => {
    // Handle both full URLs and owner/repo format
    if (repoLink.includes('github.com')) {
        const match = repoLink.match(/github\.com\/([^\/]+)\/([^\/]+)/);
        if (match) {
            return { owner: match[1], repo: match[2].replace('.git', '') };
        }
    } else if (repoLink.includes('/')) {
        const [owner, repo] = repoLink.split('/');
        return { owner, repo: repo.replace('.git', '') };
    }
    throw new Error('Invalid GitHub repository link format. Use "owner/repo" or full GitHub URL');
};

// Tool: Get repository structure
export const get_repo_structure = async ({ repoLink, branch = 'main', reason }) => {

    try {
        const { owner, repo } = parseGitHubRepo(repoLink);

        // Import node-fetch for server-side API calls
        const fetch = (await import('node-fetch')).default;

        // Get branch to find tree SHA
        const branchUrl = `https://api.github.com/repos/${owner}/${repo}/branches/${branch}`;
        const branchResponse = await fetch(branchUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Dotivra-Document-App'
            }
        });

        if (!branchResponse.ok) {
            const error = await branchResponse.json().catch(() => ({}));
            throw new Error(error.message || `Failed to fetch branch: ${branchResponse.statusText}`);
        }

        const branchData = await branchResponse.json();
        const treeSha = branchData.commit.commit.tree.sha;

        // Get tree recursively
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`;
        const treeResponse = await fetch(treeUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Dotivra-Document-App'
            }
        });

        if (!treeResponse.ok) {
            const error = await treeResponse.json().catch(() => ({}));
            throw new Error(error.message || `Failed to fetch tree: ${treeResponse.statusText}`);
        }

        const treeData = await treeResponse.json();

        // Format tree structure for readability
        const formattedTree = treeData.tree.map(item => ({
            path: item.path,
            type: item.type, // 'blob' (file) or 'tree' (directory)
            size: item.size || 0
        }));

        const result = {
            success: true,
            reason,
            operation: 'get_repo_structure',
            owner,
            repo,
            branch,
            totalItems: formattedTree.length,
            tree: formattedTree,
            truncated: treeData.truncated
        };

        logToolUsage('get_repo_structure', { repoLink, branch, reason }, result);
        return result;

    } catch (error) {
        console.error('❌ Error getting repo structure:', error);
        return {
            success: false,
            reason,
            error: error.message,
            tree: []
        };
    }
};

// Tool: Get repository commits
export const get_repo_commits = async ({ repoLink, branch = 'main', page = 1, per_page = 30, reason }) => {
    try {
        const { owner, repo } = parseGitHubRepo(repoLink);

        // Validate pagination parameters
        const validPage = Math.max(1, parseInt(page) || 1);
        const validPerPage = Math.min(100, Math.max(1, parseInt(per_page) || 30));

        // Import node-fetch for server-side API calls
        const fetch = (await import('node-fetch')).default;

        const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&page=${validPage}&per_page=${validPerPage}`;
        const response = await fetch(commitsUrl, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Dotivra-Document-App'
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.message || `Failed to fetch commits: ${response.statusText}`);
        }

        const commits = await response.json();

        // Format commits for readability
        const formattedCommits = commits.map(commit => ({
            sha: commit.sha.substring(0, 7), // Short SHA
            message: commit.commit.message.split('\n')[0], // First line only
            author: commit.commit.author.name,
            email: commit.commit.author.email,
            date: commit.commit.author.date,
            url: commit.html_url
        }));

        const result = {
            success: true,
            reason,
            operation: 'get_repo_commits',
            owner,
            repo,
            branch,
            page: validPage,
            per_page: validPerPage,
            commitsCount: formattedCommits.length,
            commits: formattedCommits
        };

        logToolUsage('get_repo_commits', { repoLink, branch, page, per_page, reason }, result);
        return result;

    } catch (error) {
        console.error('❌ Error getting repo commits:', error);
        return {
            success: false,
            reason,
            error: error.message,
            commits: []
        };
    }
};
