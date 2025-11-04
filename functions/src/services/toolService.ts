/**
 * Document Manipulation Tools Service - Firebase Cloud Functions Version
 * Updated with character-position search format
 */

import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';

// Firestore instance (Firebase Admin SDK)
let firestore: admin.firestore.Firestore | null = null;

// Initialize firestore reference
export const initFirestore = (firestoreInstance: admin.firestore.Firestore): void => {
  firestore = firestoreInstance;
  logger.info('✅ Firestore initialized in toolService');
};

// Tool usage tracking
interface ToolLogEntry {
  tool: string;
  timestamp: string;
  documentId: string | null;
  args: Record<string, any>;
  result: {
    success: boolean;
    operation: string;
    summary: string;
  };
}

const toolUsageLog: ToolLogEntry[] = [];

// Get human-readable summary of tool result
const getResultSummary = (toolName: string, result: any): string => {
  switch (toolName) {
    case 'scan_document_content':
      return `Scanned: ${result.analysis?.total_lines || 0} lines, ${result.analysis?.total_words || 0} words`;
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

// Helper to log tool usage
const logToolUsage = (toolName: string, args: Record<string, any>, result: any, documentId: string | null = null): ToolLogEntry => {
  const logEntry: ToolLogEntry = {
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

  logger.info(`🔧 Tool used: ${toolName}`, logEntry.result.summary);

  return logEntry;
};

// Export tool usage log getter
export const getToolUsageLog = (): ToolLogEntry[] => {
  return [...toolUsageLog];
};

// Export tool usage log clearer
export const clearToolUsageLog = (): void => {
  toolUsageLog.length = 0;
};

// Execute tool by name (toolMap will be assigned at the end of this file
// after all functions are declared to avoid temporal dead zone issues)
let toolMap: Record<string, Function> = {} as any;

// Export a simple registry for listing available tools
export const getAvailableTools = (): string[] => {
  return Object.keys(toolMap || {}).sort();
};

export const executeTool = async (toolName: string, parameters: Record<string, any>): Promise<any> => {
  const tool = toolMap[toolName];
  if (!tool) {
    return {
      success: false,
      html: `<div class="error-message">Sorry, I couldn't find the requested tool. Please try again with a different request.</div>`
    };
  }

  try {
    return await tool(parameters);
  } catch (err: any) {
    return {
      success: false,
      html: `<div class="error-message">Sorry, something went wrong. Please try again with a different request.</div>`
    };
  }
};

// Global document state
let currentDocumentId: string | null = null;
let currentDocumentContent: string = '';

// Set current document from Firebase
export const setCurrentDocument = async (documentId: string): Promise<any> => {
  try {
    if (!documentId) {
      currentDocumentId = null;
      currentDocumentContent = '';
      return { success: true, content: '' };
    }

    if (!firestore) {
      throw new Error('Firestore not initialized in toolService');
    }

    logger.info(`📄 Attempting to load document: ${documentId}`);

    const docRef = firestore.collection('Documents').doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error(`Document ${documentId} not found in Firestore collection`);
    }

    const docData = docSnap.data()!;
    currentDocumentId = documentId;
    currentDocumentContent = docData.Content || '';

    logger.info(`✅ Document loaded successfully: ${documentId} (${currentDocumentContent.length} chars)`);

    return {
      success: true,
      documentId,
      content: currentDocumentContent,
      documentName: docData.DocumentName
    };
  } catch (error: any) {
    logger.error('❌ Error setting current document:', error);
    throw error;
  }
};

// Sync document content back to Firebase
const syncToFirebase = async (): Promise<any> => {
  if (!currentDocumentId || !firestore) {
    logger.info('ℹ️  No document context set - changes will not be persisted to Firebase');
    return { success: false, error: 'No document set or firestore not initialized' };
  }

  try {
    const docRef = firestore.collection('Documents').doc(currentDocumentId);
    await docRef.update({
      Content: currentDocumentContent,
      Updated_Time: admin.firestore.FieldValue.serverTimestamp()
    });

    logger.info(`💾 Synced to Firebase: ${currentDocumentId} (${currentDocumentContent.length} chars)`);
    return { success: true };
  } catch (error: any) {
    logger.error('❌ Firebase sync error:', error);
    return { success: false, error: error.message };
  }
};

// Tool implementations
export const get_document_content = async ({ documentId, reason }: any): Promise<any> => {
  try {
    logger.info(`📖 get_document_content called: ${reason || 'No reason provided'}`);

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
  } catch (error: any) {
    const result = {
      success: false,
      reason: reason || 'Getting document content',
      error: error.message
    };
    logToolUsage('get_document_content', { documentId, reason }, result, currentDocumentId);
    throw error;
  }
};

export const scan_document_content = async ({ reason }: any): Promise<any> => {
  const lines = currentDocumentContent.split('\n');
  const words = currentDocumentContent.split(/\s+/).filter(w => w.length > 0);
  const characters = currentDocumentContent.length;

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
};

export const search_document_content = async ({ query, reason }: any): Promise<any> => {
  logger.info(`🔍 Searching document for query: "${query}"`);
  const matches = [];
  const lowerQuery = (query || '').toLowerCase();
  const lowerContent = currentDocumentContent.toLowerCase();

  let searchIndex = 0;
  let elementIndex = 0;

  while (searchIndex < lowerContent.length) {
    const matchIndex = lowerContent.indexOf(lowerQuery, searchIndex);
    if (matchIndex === -1) break;

    const contextStart = Math.max(0, matchIndex - 50);
    const contextEnd = Math.min(currentDocumentContent.length, matchIndex + query.length + 50);
    const context = currentDocumentContent.substring(contextStart, contextEnd);

    matches.push({
      element_index: elementIndex,
      character_position: matchIndex,
      match_length: query.length,
      context: context,
      context_start: contextStart,
      context_end: contextEnd
    });

    elementIndex++;
    searchIndex = matchIndex + 1;
  }

  const result = {
    success: true,
    query,
    reason: reason || 'Search requested',
    matches_count: matches.length,
    matches: matches.slice(0, 10),
    total_matches: matches.length
  };

  logToolUsage('search_document_content', { query, reason }, result, currentDocumentId);
  return result;
};

export const append_document_content = async ({ content, reason }: any): Promise<any> => {
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
};

export const insert_document_content = async ({ position, content, reason }: any): Promise<any> => {
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
    position: { from: position, to: position + content.length },
    insertedAt: position
  };
  logToolUsage('insert_document_content', { position, content, reason }, result, currentDocumentId);
  await syncToFirebase();
  return result;
};

export const insert_document_content_at_location = async ({ target, position, content, reason }: any): Promise<any> => {
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
    // For 'after' position, intelligently find the end of the section
    insertPosition = targetIndex + target.length;
    
    // If the target is a heading tag, find the end of its section
    if (target.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/i)) {
      // Extract heading level (h1, h2, etc.)
      const headingMatch = target.match(/<h([1-6])/i);
      if (headingMatch) {
        const currentLevel = parseInt(headingMatch[1]);
        
        // Find the next heading of equal or higher level (lower number)
        const remainingContent = currentDocumentContent.slice(insertPosition);
        const headingRegex = /<h([1-6])[^>]*>/gi;
        let match;
        let sectionEnd = insertPosition;
        
        while ((match = headingRegex.exec(remainingContent)) !== null) {
          const nextLevel = parseInt(match[1]);
          // If we find a heading of same or higher level, that's the end of this section
          if (nextLevel <= currentLevel) {
            sectionEnd = insertPosition + match.index;
            break;
          }
        }
        
        // If we found a section boundary, use it
        if (sectionEnd > insertPosition) {
          insertPosition = sectionEnd;
        }
      }
    }
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
};

export const replace_document_content = async ({ position, content, reason }: any): Promise<any> => {
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
  currentDocumentContent = currentDocumentContent.slice(0, from) + content + currentDocumentContent.slice(to);
  const result = {
    success: true,
    html: `<div class="tool-success">Replaced <b>${to - from}</b> characters with <b>${content.length}</b> new characters.</div>`
  };
  logToolUsage('replace_document_content', { position, content, reason }, result, currentDocumentId);
  await syncToFirebase();
  return result;
};

export const remove_document_content = async ({ position, reason }: any): Promise<any> => {
  if (!position || typeof position !== 'object' || typeof position.from !== 'number' || typeof position.to !== 'number') {
    return {
      success: false,
      html: `<div class="error-message">Sorry, we couldn't find the part of your document to remove. Please try again with a different request.</div>`
    };
  }
  const { from, to } = position;
  currentDocumentContent = currentDocumentContent.slice(0, from) + currentDocumentContent.slice(to);
  const result = {
    success: true,
    html: `<div class="tool-success">Removed <b>${to - from}</b> characters from your document.</div>`
  };
  logToolUsage('remove_document_content', { position, reason }, result, currentDocumentId);
  await syncToFirebase();
  return result;
};

// Summary field operations
export const append_document_summary = async ({ content, reason }: any): Promise<any> => {
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
  const docRef = firestore.collection('Documents').doc(currentDocumentId);
  const docSnap = await docRef.get();
  let summary = '';
  if (docSnap.exists) {
    summary = docSnap.data()?.Summary || '';
  }
  const newSummary = summary + content;
  await docRef.update({ 
    Summary: newSummary, 
    Updated_Time: admin.firestore.FieldValue.serverTimestamp() 
  });
  return {
    success: true,
    html: `<div class="tool-success">Added <b>${content.length}</b> characters to your document summary.</div>`
  };
};

export const insert_document_summary = async ({ position, content, reason }: any): Promise<any> => {
  if (!currentDocumentId || !firestore) {
    return {
      success: false,
      html: `<div class="error-message">Sorry, we couldn't find your document summary. Please try again.</div>`
    };
  }
  const docRef = firestore.collection('Documents').doc(currentDocumentId);
  const docSnap = await docRef.get();
  let summary = '';
  if (docSnap.exists) {
    summary = docSnap.data()?.Summary || '';
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
  await docRef.update({ 
    Summary: newSummary, 
    Updated_Time: admin.firestore.FieldValue.serverTimestamp() 
  });
  return {
    success: true,
    html: `<div class="tool-success">Inserted <b>${content.length}</b> characters into your document summary.</div>`
  };
};

export const replace_doument_summary = async ({ position, content, reason }: any): Promise<any> => {
  if (!currentDocumentId || !firestore) {
    return { success: false, html: `<div class="error-message">Sorry, we couldn't find your document summary. Please try again.</div>` };
  }
  if (!position || typeof position !== 'object' || typeof position.from !== 'number' || typeof position.to !== 'number') {
    return { success: false, html: `<div class="error-message">Missing or invalid position. Provide { position: { from, to } }.</div>` };
  }
  if (typeof content !== 'string') {
    return { success: false, html: `<div class="error-message">Sorry, no summary content was provided to replace. Please try again.</div>` };
  }
  const docRef = firestore.collection('Documents').doc(currentDocumentId);
  const docSnap = await docRef.get();
  const currentSummary = docSnap.exists ? (docSnap.data()?.Summary || '') : '';
  const { from, to } = position;
  const safeFrom = Math.max(0, Math.min(from, currentSummary.length));
  const safeTo = Math.max(safeFrom, Math.min(to, currentSummary.length));
  const newSummary = currentSummary.slice(0, safeFrom) + content + currentSummary.slice(safeTo);
  await docRef.update({ 
    Summary: newSummary, 
    Updated_Time: admin.firestore.FieldValue.serverTimestamp() 
  });
  return { success: true, html: `<div class="tool-success">Replaced <b>${safeTo - safeFrom}</b> characters in the summary.</div>` };
};

export const remove_document_summary = async ({ position, reason }: any): Promise<any> => {
  if (!currentDocumentId || !firestore) {
    return { success: false, html: `<div class="error-message">Sorry, we couldn't find your document summary. Please try again.</div>` };
  }
  if (!position || typeof position !== 'object' || typeof position.from !== 'number' || typeof position.to !== 'number') {
    return { success: false, html: `<div class="error-message">Missing or invalid position. Provide { position: { from, to } }.</div>` };
  }
  const docRef = firestore.collection('Documents').doc(currentDocumentId);
  const docSnap = await docRef.get();
  const currentSummary = docSnap.exists ? (docSnap.data()?.Summary || '') : '';
  const { from, to } = position;
  const safeFrom = Math.max(0, Math.min(from, currentSummary.length));
  const safeTo = Math.max(safeFrom, Math.min(to, currentSummary.length));
  const newSummary = currentSummary.slice(0, safeFrom) + currentSummary.slice(safeTo);
  await docRef.update({ 
    Summary: newSummary, 
    Updated_Time: admin.firestore.FieldValue.serverTimestamp() 
  });
  return { success: true, html: `<div class="tool-success">Removed <b>${safeTo - safeFrom}</b> characters from the summary.</div>` };
};

export const search_document_summary = async ({ query, reason }: any): Promise<any> => {
  if (!currentDocumentId || !firestore) {
    return { success: false, html: `<div class="error-message">Sorry, we couldn't access your document summary. Please try again.</div>` };
  }
  const docRef = firestore.collection('Documents').doc(currentDocumentId);
  const docSnap = await docRef.get();
  const summary = docSnap.exists ? (docSnap.data()?.Summary || '') : '';
  
  const matches = [];
  const lowerQuery = (query || '').toLowerCase();
  const lowerSummary = summary.toLowerCase();

  let searchIndex = 0;
  let elementIndex = 0;

  while (searchIndex < lowerSummary.length) {
    const matchIndex = lowerSummary.indexOf(lowerQuery, searchIndex);
    if (matchIndex === -1) break;

    const contextStart = Math.max(0, matchIndex - 50);
    const contextEnd = Math.min(summary.length, matchIndex + query.length + 50);
    const context = summary.substring(contextStart, contextEnd);

    matches.push({
      element_index: elementIndex,
      character_position: matchIndex,
      match_length: query.length,
      context: context,
      context_start: contextStart,
      context_end: contextEnd
    });

    elementIndex++;
    searchIndex = matchIndex + 1;
  }

  return { 
    success: true, 
    query, 
    matches_count: matches.length, 
    matches: matches.slice(0, 10),
    total_matches: matches.length
  };
};

export const get_all_documents_metadata_within_project = async ({ documentId, reason }: any): Promise<any> => {
  logger.info(`📚 get_all_documents_metadata_within_project called for documentId: ${documentId}`);

  try {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const targetDocId = documentId || currentDocumentId;
    
    if (!targetDocId) {
      return {
        success: false,
        reason,
        error: 'No document ID provided',
        documents: []
      };
    }

    const docRef = firestore.collection('Documents').doc(targetDocId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return {
        success: false,
        reason,
        error: 'Document not found',
        documents: []
      };
    }

    const docData = docSnap.data()!;
    const projectId = docData.ProjectID || docData.Project_Id;

    logger.info(`📚 Document data:`, { 
      documentId: targetDocId, 
      projectId, 
      allFields: Object.keys(docData)
    });

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

    const querySnapshot = await firestore.collection('Documents').where('ProjectID', '==', projectId).get();

    const documents: any[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      documents.push({
        documentId: doc.id,
        documentName: data.DocumentName || 'Untitled',
        description: data.Description || '',
        createdAt: data.CreatedAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.UpdatedAt?.toDate?.()?.toISOString() || null,
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

  } catch (error: any) {
    logger.error('❌ Error getting project documents metadata:', error);
    return {
      success: false,
      reason,
      error: error.message,
      documents: []
    };
  }
};

export const get_document_summary = async ({ documentId, reason }: any): Promise<any> => {
  logger.info(`📝 get_document_summary called for documentId: ${documentId}`);

  try {
    if (!firestore) {
      throw new Error('Firestore not initialized');
    }

    const docRef = firestore.collection('Documents').doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return {
        success: false,
        reason,
        error: 'Document not found',
        summary: ''
      };
    }

    const data = docSnap.data()!;
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

  } catch (error: any) {
    logger.error('❌ Error getting document summary:', error);
    return {
      success: false,
      reason,
      error: error.message,
      summary: ''
    };
  }
};

// Helper functions for testing
export const setDocumentContent = (content: string): void => {
  currentDocumentContent = content;
};

export const resetDocument = (): void => {
  currentDocumentId = null;
  currentDocumentContent = '';
};

// Parse GitHub repository link to extract owner and repo
const parseGitHubRepo = (repoLink: string): { owner: string; repo: string } => {
  // Handle both full URLs and owner/repo format
  if (repoLink.includes('github.com')) {
    const match = repoLink.match(/github\.com\/([^\/]+)\/([^\/\s]+)/);
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
export const get_repo_structure = async ({ repoLink, branch = 'main', reason }: any): Promise<any> => {
  logger.info(`📂 get_repo_structure called: ${repoLink} (branch: ${branch})`);

  try {
    const { owner, repo } = parseGitHubRepo(repoLink);

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
      throw new Error((error as any).message || `Failed to fetch branch: ${branchResponse.statusText}`);
    }

    const branchData = await branchResponse.json();
    const treeSha = (branchData as any).commit.commit.tree.sha;

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
      throw new Error((error as any).message || `Failed to fetch tree: ${treeResponse.statusText}`);
    }

    const treeData = await treeResponse.json();

    // Format tree structure for readability
    const formattedTree = (treeData as any).tree.map((item: any) => ({
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
      truncated: (treeData as any).truncated
    };

    logToolUsage('get_repo_structure', { repoLink, branch, reason }, result);
    return result;

  } catch (error: any) {
    logger.error('❌ Error getting repo structure:', error);
    return {
      success: false,
      reason,
      error: error.message,
      tree: []
    };
  }
};

// Tool: Get repository commits
export const get_repo_commits = async ({ repoLink, branch = 'main', page = 1, per_page = 30, reason }: any): Promise<any> => {
  logger.info(`📜 get_repo_commits called: ${repoLink} (branch: ${branch}, page: ${page})`);

  try {
    const { owner, repo } = parseGitHubRepo(repoLink);

    // Validate pagination parameters
    const validPage = Math.max(1, parseInt(page) || 1);
    const validPerPage = Math.min(100, Math.max(1, parseInt(per_page) || 30));

    const commitsUrl = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&page=${validPage}&per_page=${validPerPage}`;
    const response = await fetch(commitsUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Dotivra-Document-App'
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error((error as any).message || `Failed to fetch commits: ${response.statusText}`);
    }

    const commits = await response.json();

    // Format commits for readability
    const formattedCommits = (commits as any[]).map((commit: any) => ({
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

  } catch (error: any) {
    logger.error('❌ Error getting repo commits:', error);
    return {
      success: false,
      reason,
      error: error.message,
      commits: []
    };
  }
};

// Assign the toolMap now that all functions are declared
toolMap = {
  'get_document_content': get_document_content,
  'scan_document_content': scan_document_content,
  'search_document_content': search_document_content,
  'append_document_content': append_document_content,
  'insert_document_content': insert_document_content,
  'insert_document_content_at_location': insert_document_content_at_location,
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