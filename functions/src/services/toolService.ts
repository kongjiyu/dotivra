/**
 * Document Manipulation Tools Service
 * Provides 7 MCP tools for AI-powered document editing
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

// Get human-readable summary of tool result
const getResultSummary = (toolName: string, result: any): string => {
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
export const getToolUsageLog = (): ToolLogEntry[] => {
  return [...toolUsageLog];
};

// Export tool usage log clearer
export const clearToolUsageLog = (): void => {
  toolUsageLog.length = 0;
};

// Global document state
let currentDocumentId: string | null = null;
let currentDocumentContent: string = '';

// Set current document from Firebase
export const setCurrentDocument = async (documentId: string): Promise<{ success: boolean; documentId?: string; content?: string; documentName?: string }> => {
  try {
    if (!documentId) {
      currentDocumentId = null;
      currentDocumentContent = '';
      return { success: true, content: '' };
    }

    if (!firestore) {
      throw new Error('Firestore not initialized in toolService');
    }

    logger.info(`📄 Loading document: ${documentId}`);

    const docRef = firestore.collection('Documents').doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error(`Document ${documentId} not found`);
    }

    const docData = docSnap.data();
    if (!docData) {
      throw new Error(`Document ${documentId} has no data`);
    }

    currentDocumentId = documentId;
    currentDocumentContent = docData.Content || '';

    logger.info(`✅ Document loaded: ${documentId} (${currentDocumentContent.length} chars)`);

    return {
      success: true,
      documentId,
      content: currentDocumentContent,
      documentName: docData.DocumentName
    };
  } catch (error) {
    logger.error('❌ Error setting current document:', error);
    throw error;
  }
};

// Sync document content back to Firebase
const syncToFirebase = async (): Promise<{ success: boolean; error?: string }> => {
  if (!currentDocumentId || !firestore) {
    logger.info('ℹ️  No document context set - changes will not be persisted');
    return { success: false, error: 'No document set or firestore not initialized' };
  }

  try {
    const docRef = firestore.collection('Documents').doc(currentDocumentId);
    await docRef.update({
      Content: currentDocumentContent,
      Updated_Time: admin.firestore.Timestamp.now()
    });

    logger.info(`💾 Synced to Firebase: ${currentDocumentId} (${currentDocumentContent.length} chars)`);
    return { success: true };
  } catch (error) {
    logger.error('❌ Firebase sync error:', error);
    return { success: false, error: (error as Error).message };
  }
};

// Tool 1: Get Document Content
export const get_document_content = async ({ documentId }: { documentId: string }): Promise<any> => {
  logger.info('📖 get_document_content called:', { 
    documentId, 
    currentDocId: currentDocumentId,
    needsLoad: documentId !== currentDocumentId
  });

  try {
    if (documentId && documentId !== currentDocumentId) {
      logger.info(`📖 Loading new document: ${documentId}`);
      await setCurrentDocument(documentId);
    }

    logger.info(`📖 Returning document content: ${currentDocumentContent.length} chars`);

    const result = {
      success: true,
      documentId: currentDocumentId,
      content: currentDocumentContent,
      length: currentDocumentContent.length
    };

    logToolUsage('get_document_content', { documentId }, result, currentDocumentId);
    return result;
  } catch (error) {
    logger.error('❌ get_document_content failed:', error);
    const result = {
      success: false,
      error: (error as Error).message
    };
    logToolUsage('get_document_content', { documentId }, result, currentDocumentId);
    throw error;
  }
};

// Tool 2: Scan Document Content
export const scan_document_content = async ({ reason }: { reason: string }): Promise<any> => {
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
};

// Tool 3: Search Document Content
export const search_document_content = async ({ query, reason }: { query: string; reason?: string }): Promise<any> => {
  const lines = currentDocumentContent.split('\n');
  const matches: any[] = [];

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
    matches: matches.slice(0, 10)
  };

  logToolUsage('search_document_content', { query, reason }, result, currentDocumentId);
  return result;
};

// Tool 4: Append Document Content
export const append_document_content = async ({ content, reason }: { content: string; reason: string }): Promise<any> => {
  logger.info('📝 append_document_content called:', { 
    contentLength: content.length, 
    contentPreview: content.substring(0, 100),
    reason, 
    docId: currentDocumentId,
    currentContentLength: currentDocumentContent.length
  });

  if (!currentDocumentId) {
    logger.error('❌ No document ID set - cannot append content');
    return {
      success: false,
      error: 'No document context set. Call setCurrentDocument first.',
      operation: 'append'
    };
  }

  const oldLength = currentDocumentContent.length;
  currentDocumentContent = currentDocumentContent + content;
  const newLength = currentDocumentContent.length;

  logger.info(`📝 Content appended. Length: ${oldLength} → ${newLength} (added ${content.length} chars)`);

  const result: any = {
    success: true,
    reason,
    operation: 'append',
    appended_length: content.length,
    new_total_length: currentDocumentContent.length,
    updated_content: currentDocumentContent
  };

  logToolUsage('append_document_content', { content, reason }, result, currentDocumentId);
  
  const syncResult = await syncToFirebase();
  logger.info('📝 Firebase sync result:', syncResult);
  
  if (!syncResult.success) {
    logger.error('❌ Failed to sync to Firebase:', syncResult.error);
    result.success = false;
    result.error = syncResult.error;
  }

  return result;
};

// Tool 5: Insert Document Content
export const insert_document_content = async ({ position, content, reason }: { position: number; content: string; reason: string }): Promise<any> => {
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
  await syncToFirebase();

  return result;
};

// Tool 6: Replace Document Content
export const replace_document_content = async ({ position, content, reason }: { position: { from: number; to: number }; content: string; reason: string }): Promise<any> => {
  const { from, to } = position;
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
  await syncToFirebase();

  return result;
};

// Tool 7: Remove Document Content
export const remove_document_content = async ({ position, reason }: { position: { from: number; to: number }; reason: string }): Promise<any> => {
  logger.info('🗑️  remove_document_content called:', { position, reason, docId: currentDocumentId });

  const { from, to } = position;
  const oldLength = currentDocumentContent.length;
  const removedText = currentDocumentContent.slice(from, to);
  currentDocumentContent = currentDocumentContent.slice(0, from) + currentDocumentContent.slice(to);

  logger.info(`🗑️  Removed ${removedText.length} chars (${from}-${to}). Length: ${oldLength} → ${currentDocumentContent.length}`);

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

  const syncResult = await syncToFirebase();
  logger.info('🗑️  Firebase sync result:', syncResult);

  return result;
};

// Helper functions for testing
export const setDocumentContent = (content: string): void => {
  currentDocumentContent = content;
};

export const resetDocument = (): void => {
  currentDocumentId = null;
  currentDocumentContent = '';
};
