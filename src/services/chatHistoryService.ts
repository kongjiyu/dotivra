/**
 * Chat History Service
 * Handles storing and retrieving chat messages from Firebase
 */

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import type { ChatMessage } from '@/components/Document/ChatSidebar';

export interface ChatHistoryMessage extends ChatMessage {
  documentId: string;
  userId: string;
}

class ChatHistoryService {
  private readonly COLLECTION_NAME = 'ChatboxHistory';
  private readonly INITIAL_LOAD_COUNT = 5;
  private readonly PAGINATION_COUNT = 5;
  private readonly STORAGE_KEY_PREFIX = 'chat_history_';

  /**
   * Get localStorage key for a document
   */
  private getStorageKey(documentId: string): string {
    return `${this.STORAGE_KEY_PREFIX}${documentId}`;
  }

  /**
   * Save messages to localStorage
   */
  private saveToLocalStorage(documentId: string, messages: ChatMessage[]): void {
    try {
      const key = this.getStorageKey(documentId);
      localStorage.setItem(key, JSON.stringify(messages));
    } catch (error) {
      console.error('❌ Error saving to localStorage:', error);
    }
  }

  /**
   * Load messages from localStorage
   */
  private loadFromLocalStorage(documentId: string): ChatMessage[] | null {
    try {
      const key = this.getStorageKey(documentId);
      const stored = localStorage.getItem(key);
      if (stored) {
        const messages = JSON.parse(stored);
        return messages;
      }
    } catch (error) {
      console.error('❌ Error loading from localStorage:', error);
    }
    return null;
  }

  /**
   * Clear localStorage for a document
   */
  private clearLocalStorage(documentId: string): void {
    try {
      const key = this.getStorageKey(documentId);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('❌ Error clearing localStorage:', error);
    }
  }

  /**
   * Save a chat message to Firebase and localStorage
   */
  async saveMessage(
    documentId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      // Determine type based on message content
      const type = message.toolCalls && message.toolCalls.length > 0 ? 'tool' : 'message';
      await addDoc(collection(db, this.COLLECTION_NAME), {
          content: message.content,
          type: type,
          role: message.role === 'user' ? 'user' : 'agent',
          referDoc: documentId,
          timestamp: Timestamp.fromMillis(message.timestamp || Date.now()),
          toolCalls: message.toolCalls || [],
          createdAt: Timestamp.now(),
        });
      // Update localStorage cache
      const cached = this.loadFromLocalStorage(documentId) || [];
      cached.push(message);
      this.saveToLocalStorage(documentId, cached);
    } catch (error) {
      console.error('❌ Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Load initial chat history (last 5 messages)
   * First checks localStorage, then falls back to Firebase
   */
  async loadInitialHistory(
    documentId: string
  ): Promise<ChatMessage[]> {
    // Try loading from localStorage first
    const cachedMessages = this.loadFromLocalStorage(documentId);
    if (cachedMessages && cachedMessages.length > 0) {
      // Still fetch from Firebase in background to ensure cache is up-to-date
      this.fetchAndUpdateCache(documentId).catch(err => 
        console.error('Background cache update failed:', err)
      );
      return cachedMessages;
    }

    // If not in cache, load from Firebase
    return this.fetchAndUpdateCache(documentId);
  }

  /**
   * Fetch from Firebase and update localStorage cache
   */
  private async fetchAndUpdateCache(documentId: string): Promise<ChatMessage[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('referDoc', '==', documentId),
        orderBy('timestamp', 'desc'),
        limit(this.INITIAL_LOAD_COUNT)
      );

        const snapshot = await getDocs(q);
      const messages: ChatMessage[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          role: data.role === 'user' ? 'user' : 'assistant',
          content: data.content,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          toolCalls: data.toolCalls || [],
        });
      });

      // Reverse to show oldest first (since we queried desc)
      const orderedMessages = messages.reverse();
      
      // Update localStorage cache
      this.saveToLocalStorage(documentId, orderedMessages);
      return orderedMessages;
    } catch (error) {
      console.error('❌ Error loading initial chat history:', error);
      return [];
    }
  }

  /**
   * Load more chat history (pagination when scrolling up)
   */
  async loadMoreHistory(
    documentId: string,
    lastMessage: ChatMessage
  ): Promise<ChatMessage[]> {
    try {
      // Find the document snapshot for the last message
      const lastMessageQuery = query(
        collection(db, this.COLLECTION_NAME),
        where('referDoc', '==', documentId),
        where('timestamp', '==', Timestamp.fromMillis(lastMessage.timestamp || Date.now())),
        limit(1)
      );

      const lastMessageSnapshot = await getDocs(lastMessageQuery);
      
      if (lastMessageSnapshot.empty) {
        return [];
      }

      const lastDoc = lastMessageSnapshot.docs[0];

      // Query for messages before the last message
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('referDoc', '==', documentId),
        orderBy('timestamp', 'desc'),
        startAfter(lastDoc),
        limit(this.PAGINATION_COUNT)
      );

      const snapshot = await getDocs(q);
      const messages: ChatMessage[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({
          id: doc.id,
          role: data.role === 'user' ? 'user' : 'assistant',
          content: data.content,
          timestamp: data.timestamp?.toMillis() || Date.now(),
          toolCalls: data.toolCalls || [],
        });
      });
      return messages.reverse();
    } catch (error) {
      console.error('❌ Error loading more chat history:', error);
      return [];
    }
  }

  /**
   * Clear chat history for a document (both Firebase and localStorage)
   */
  async clearHistory(documentId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('referDoc', '==', documentId)
      );

      const snapshot = await getDocs(q);
      
      // Use deleteDoc for each document
      const deletePromises = snapshot.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      // Clear localStorage cache
      this.clearLocalStorage(documentId);
    } catch (error) {
      console.error('❌ Error clearing chat history:', error);
      throw error;
    }
  }
}

export const chatHistoryService = new ChatHistoryService();
