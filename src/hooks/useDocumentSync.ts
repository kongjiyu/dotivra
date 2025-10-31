import { useEffect, useRef, useState, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, Timestamp, increment } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { API_ENDPOINTS } from '@/lib/apiConfig';

export type SyncStatus = 'synced' | 'syncing' | 'pending' | 'error';

/**
 * SyncChannel Types:
 * - 'content': Editor content (document.Content field) - Tracked in version history
 * - 'summary': Summary content (document.Summary field) - NOT tracked in version history
 * 
 * ⚠️ Version history only saves snapshots of 'content' channel changes,
 * not 'summary' channel changes.
 */
export type SyncChannel = 'content' | 'summary';

interface UseDocumentSyncOptions {
  documentId: string;
  channel: SyncChannel;
  onUpdate?: (content: string) => void;
  debounceMs?: number;
  onVersionSaved?: () => void; // Callback when version is saved
}

export function useDocumentSync({ documentId, channel, onUpdate, debounceMs = 2000, onVersionSaved }: UseDocumentSyncOptions) {
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
          version: increment(1), // Atomically increment version
        };
        
        if (channel === 'summary') {
          updateData.Summary = content;
        } else {
          updateData.Content = content;
        }
        
        await updateDoc(docRef, updateData);
        
        // Save version history to backend
        try {
          const response = await fetch(API_ENDPOINTS.saveVersion(documentId), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content,
              channel,
              editedBy: 'current-user', // TODO: Get from auth context
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Failed to save version history:', response.status, errorText);
          } else {
            const result = await response.json();
            
            // Notify parent component that version was saved
            if (onVersionSaved) {
              onVersionSaved();
            }
          }
        } catch (versionError) {
          // Don't fail the whole operation if version save fails
          console.error('❌ Exception while saving version history:', versionError);
        }
        
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
