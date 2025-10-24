import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error';
export type SyncChannel = 'content' | 'summary';

interface UseDocumentSyncOptions {
  documentId: string;
  channel: SyncChannel;
  onUpdate?: (content: string) => void;
  debounceMs?: number;
}

export function useDocumentSync({ documentId, channel, onUpdate, debounceMs = 2000 }: UseDocumentSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoadRef = useRef(true);
  const lastSavedContentRef = useRef<string>('');
  const pendingSaveContentRef = useRef<string | null>(null);

  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!documentId) return;
    
    isInitialLoadRef.current = true;
    
    const docRef = doc(db, 'Documents', documentId);
    
    const unsubscribe = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const content = channel === 'summary' ? (data.Summary || '') : (data.Content || '');
          
          if (isInitialLoadRef.current) {
            lastSavedContentRef.current = content;
            if (onUpdateRef.current) {
              onUpdateRef.current(content);
            }
            isInitialLoadRef.current = false;
            setSyncStatus('synced');
            return;
          }
          
          // Check if this is our own save
          if (pendingSaveContentRef.current !== null && pendingSaveContentRef.current === content) {
            lastSavedContentRef.current = content;
            pendingSaveContentRef.current = null;
            setSyncStatus('synced');
            return;
          }
          
          // Check if content changed
          if (content === lastSavedContentRef.current) {
            return;
          }
          
          // Real external update
          lastSavedContentRef.current = content;
          pendingSaveContentRef.current = null;
          if (onUpdateRef.current) {
            onUpdateRef.current(content);
          }
          setSyncStatus('synced');
        } else {
          console.error(`Document not found: ${documentId}`);
          setSyncStatus('error');
        }
      },
      (error) => {
        console.error(`Firestore listener error:`, error);
        setSyncStatus('error');
      }
    );

    return () => {
      unsubscribe();
    };
  }, [documentId, channel]);

  const sendUpdate = useCallback(async (content: string, immediate = false) => {
    if (!documentId) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set to pending when user is typing
    setSyncStatus('pending');

    const saveToFirestore = async () => {
      try {
        // Set to syncing when actually saving
        setSyncStatus('syncing');
        
        pendingSaveContentRef.current = content;
        
        const docRef = doc(db, 'Documents', documentId);
        const updateData: any = {
          Updated_Time: Timestamp.now(),
        };
        
        if (channel === 'summary') {
          updateData.Summary = content;
        } else {
          updateData.Content = content;
        }
        
        await updateDoc(docRef, updateData);
        
      } catch (error) {
        console.error(`Error saving ${channel}:`, error);
        setSyncStatus('error');
        pendingSaveContentRef.current = null;
      }
    };

    if (immediate) {
      await saveToFirestore();
    } else {
      debounceTimerRef.current = setTimeout(saveToFirestore, debounceMs);
    }
  }, [documentId, channel, debounceMs]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    syncStatus,
    sendUpdate,
  };
}
