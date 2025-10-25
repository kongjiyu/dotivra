// Firestore will be passed in from the main server file
let firestore = null;

// Initialize firestore reference
export const initFirestore = (firestoreInstance) => {
    firestore = firestoreInstance;
    console.log('✅ Firestore initialized in toolService');
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

    console.log(`🔧 Tool used: ${toolName}`, logEntry.result.summary);

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
        case 'get_document_content':
            return `Retrieved document: ${result.length || 0} characters`;
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

export const getToolsRegistry = async () => {
    return {
        baseUrl: 'api/tool',
        version: '1.0.0',
        description: 'Text document editing operations.',
        tools: [
            {
                name: 'get_document_content',
                description: 'Retrieve the content of a document.',
                inputSchema: {
                    type: 'object',
                    properties: {
                        documentId: { type: 'string', description: 'ID of the document to retrieve' },
                    },
                    required: ['documentId']
                },
                annotations: {
                    title: 'Get Document Content',
                    idempotentHint: true,
                    destructiveHint: false
                }
            },
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

        console.log(`📄 Attempting to load document: ${documentId}`);

        // For regular Firebase SDK
        const { doc, getDoc } = await import('firebase/firestore');

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Document fetch timeout (10s)')), 10000);
        });

        const docRef = doc(firestore, 'Documents', documentId);
        console.log(`📄 Fetching from Firestore collection: Documents/${documentId}`);

        const docSnap = await Promise.race([getDoc(docRef), timeoutPromise]);

        if (!docSnap.exists()) {
            throw new Error(`Document ${documentId} not found in Firestore collection`);
        }

        const docData = docSnap.data();
        currentDocumentId = documentId;
        currentDocumentContent = docData.Content || '';

        console.log(`✅ Document loaded successfully: ${documentId} (${currentDocumentContent.length} chars)`);

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
        console.log('ℹ️  No document context set - changes will not be persisted to Firebase');
        return { success: false, error: 'No document set or firestore not initialized' };
    }

    try {
        // For regular Firebase SDK, use doc() and updateDoc()
        const { doc, updateDoc, Timestamp } = await import('firebase/firestore');
        const docRef = doc(firestore, 'Documents', currentDocumentId);
        await updateDoc(docRef, {
            Content: currentDocumentContent,
            Updated_Time: Timestamp.now()
        });

        console.log(`💾 Synced to Firebase: ${currentDocumentId} (${currentDocumentContent.length} chars)`);
        return { success: true };
    } catch (error) {
        console.error('❌ Firebase sync error:', error);
        return { success: false, error: error.message };
    }
};

export const get_document_content = async ({ documentId }) => {
    try {
        // If documentId provided, fetch from Firebase
        if (documentId && documentId !== currentDocumentId) {
            await setCurrentDocument(documentId);
        }

        const result = {
            success: true,
            documentId: currentDocumentId,
            content: currentDocumentContent,
            length: currentDocumentContent.length
        };

        logToolUsage('get_document_content', { documentId }, result, currentDocumentId);
        return result;
    } catch (error) {
        const result = {
            success: false,
            error: error.message
        };
        logToolUsage('get_document_content', { documentId }, result, currentDocumentId);
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
    const lines = currentDocumentContent.split('\n');
    const matches = [];

    lines.forEach((line, index) => {
        if (line.toLowerCase().includes(query.toLowerCase())) {
            matches.push({
                line_number: index + 1,
                line_content: line,
                match_position: line.toLowerCase().indexOf(query.toLowerCase())
            });
        }
    });

    const result = {
        success: true,
        query,
        reason: reason || 'Search requested',
        matches_count: matches.length,
        matches: matches.slice(0, 10) // Limit to first 10 matches
    };

    logToolUsage('search_document_content', { query, reason }, result, currentDocumentId);
    return result;
}

export const append_document_content = async ({ content, reason }) => {
    const oldContent = currentDocumentContent;
    currentDocumentContent = currentDocumentContent + content;

    const result = {
        success: true,
        reason,
        operation: 'append',
        appended_length: content.length,
        new_total_length: currentDocumentContent.length,
        updated_content: currentDocumentContent
    };

    logToolUsage('append_document_content', { content, reason }, result, currentDocumentId);

    // Sync to Firebase
    await syncToFirebase();

    return result;
}

export const insert_document_content = async ({ position, content, reason }) => {
    const oldContent = currentDocumentContent;
    currentDocumentContent = currentDocumentContent.slice(0, position) + content + currentDocumentContent.slice(position);

    const result = {
        success: true,
        reason,
        operation: 'insert',
        position,
        inserted_length: content.length,
        new_total_length: currentDocumentContent.length,
        updated_content: currentDocumentContent
    };

    logToolUsage('insert_document_content', { position, content, reason }, result, currentDocumentId);

    // Sync to Firebase
    await syncToFirebase();

    return result;
}

export const replace_document_content = async ({ position, content, reason }) => {
    const { from, to } = position;
    const oldContent = currentDocumentContent;
    const removedText = currentDocumentContent.slice(from, to);
    currentDocumentContent = currentDocumentContent.slice(0, from) + content + currentDocumentContent.slice(to);

    const result = {
        success: true,
        reason,
        operation: 'replace',
        position: { from, to },
        removed_text: removedText,
        removed_length: to - from,
        inserted_length: content.length,
        new_total_length: currentDocumentContent.length,
        updated_content: currentDocumentContent
    };

    logToolUsage('replace_document_content', { position, content, reason }, result, currentDocumentId);

    // Sync to Firebase
    await syncToFirebase();

    return result;
}

export const remove_document_content = async ({ position, reason }) => {
    console.log('🗑️  remove_document_content called:', { position, reason, docId: currentDocumentId });

    const { from, to } = position;
    const oldContent = currentDocumentContent;
    const oldLength = currentDocumentContent.length;
    const removedText = currentDocumentContent.slice(from, to);
    currentDocumentContent = currentDocumentContent.slice(0, from) + currentDocumentContent.slice(to);

    console.log(`🗑️  Removed ${removedText.length} chars (${from}-${to}). Length: ${oldLength} → ${currentDocumentContent.length}`);

    const result = {
        success: true,
        reason,
        operation: 'remove',
        position: { from, to },
        removed_text: removedText,
        removed_length: to - from,
        new_total_length: currentDocumentContent.length,
        updated_content: currentDocumentContent
    };

    logToolUsage('remove_document_content', { position, reason }, result, currentDocumentId);

    // Sync to Firebase
    const syncResult = await syncToFirebase();
    console.log('🗑️  Firebase sync result:', syncResult);

    return result;
}

// Helper function to set document content for testing
export const setDocumentContent = (content) => {
    currentDocumentContent = content;
}

// Helper function to reset document
export const resetDocument = () => {
    currentDocumentId = null;
    currentDocumentContent = '';
}