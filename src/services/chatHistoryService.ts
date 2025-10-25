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
  private readonly PAGINATION_COUNT = 10;

  /**
   * Save a chat message to Firebase
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
        
      console.log('💾 Chat message saved to Firebase');
    } catch (error) {
      console.error('❌ Error saving chat message:', error);
      throw error;
    }
  }

  /**
   * Load initial chat history (last 5 messages)
   */
  async loadInitialHistory(
    documentId: string
  ): Promise<ChatMessage[]> {
    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where('referDoc', '==', documentId),
        orderBy('timestamp', 'desc'),
        limit(this.INITIAL_LOAD_COUNT)
      );

        const snapshot = await getDocs(q);
        console.log(`📄 Retrieved ${snapshot.size} chat messages from Firebase`);
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
      console.log(`📜 Loaded ${messages.length} initial chat messages`);
      return messages.reverse();
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
        console.warn('⚠️ Could not find last message for pagination');
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

      console.log(`📜 Loaded ${messages.length} more chat messages`);
      return messages.reverse();
    } catch (error) {
      console.error('❌ Error loading more chat history:', error);
      return [];
    }
  }

  /**
   * Clear chat history for a document
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

      console.log(`🗑️ Cleared ${snapshot.size} chat messages`);
    } catch (error) {
      console.error('❌ Error clearing chat history:', error);
      throw error;
    }
  }
}

export const chatHistoryService = new ChatHistoryService();
