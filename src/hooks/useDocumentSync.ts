import { useEffect, useRef, useState, useCallback } from 'react';

export type SyncStatus = 'synced' | 'syncing' | 'error';
export type SyncChannel = 'content' | 'summary';

interface UseDocumentSyncOptions {
  documentId: string;
  channel: SyncChannel; // 'content' for editor, 'summary' for summary tab
  onUpdate?: (content: string) => void;
  debounceMs?: number;
}

interface PendingEdit {
  seq: number;
  content: string;
  baseVersion: number;
  timestamp: number;
  channel: SyncChannel;
}

interface DocumentState {
  version: number;           // Current acknowledged version from server
  pendingEdits: PendingEdit[]; // Queue of unacknowledged edits
  nextSeq: number;           // Next sequence number for new edits
}

export function useDocumentSync({ documentId, channel, onUpdate, debounceMs = 2000 }: UseDocumentSyncOptions) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const wsRef = useRef<WebSocket | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Document state for OT protocol
  const stateRef = useRef<DocumentState>({
    version: 0,
    pendingEdits: [],
    nextSeq: 0,
  });

  // Store onUpdate callback in a ref to prevent reconnections
  const onUpdateRef = useRef(onUpdate);
  
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Connect to WebSocket
  useEffect(() => {
    if (!documentId) return;

    const connect = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || "";
      
      // Create WebSocket with error handling
      let ws: WebSocket;
      try {
        ws = new WebSocket(wsUrl);
      } catch (error) {
        console.error('Failed to create WebSocket:', error);
        setSyncStatus('error');
        return;
      }

      ws.onopen = () => {
        console.log('📡 WebSocket connected');
        setSyncStatus('synced');
        reconnectAttemptsRef.current = 0;

        // Join document room and request sync
        ws.send(JSON.stringify({
          type: 'join',
          documentId,
          channel, // Specify which channel (content or summary)
        }));

        // Request current version and content
        ws.send(JSON.stringify({
          type: 'sync_request',
          documentId,
          channel,
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          console.log('📨 Received message from server:', data.type, data);

          switch (data.type) {
            case 'sync_response':
              // Server sent current version and content
              if (data.documentId === documentId) {
                stateRef.current.version = data.version || 0;
                
                // If we have pending edits, re-send them with updated baseVersion
                if (stateRef.current.pendingEdits.length > 0) {
                  console.log('🔄 Re-sending pending edits after sync:', stateRef.current.pendingEdits.length);
                  stateRef.current.pendingEdits.forEach(edit => {
                    edit.baseVersion = stateRef.current.version;
                    ws.send(JSON.stringify({
                      type: 'edit',
                      documentId,
                      content: edit.content,
                      baseVersion: edit.baseVersion,
                      seq: edit.seq,
                      channel: edit.channel,
                    }));
                  });
                } else {
                  // No pending edits, apply server content
                  if (onUpdateRef.current) {
                    onUpdateRef.current(data.content);
                  }
                }
              }
              break;

            case 'ack':
              // Server acknowledged our edit
              if (data.documentId === documentId) {
                // Remove acknowledged edit from queue
                stateRef.current.pendingEdits = stateRef.current.pendingEdits.filter(
                  e => e.seq !== data.seq
                );
                stateRef.current.version = data.newVersion;
                
                // Update sync status
                if (stateRef.current.pendingEdits.length === 0) {
                  setSyncStatus('synced');
                } else {
                  setSyncStatus('syncing');
                }
                
                console.log('✅ Edit acknowledged. Version:', data.newVersion, 'Pending:', stateRef.current.pendingEdits.length);
              }
              break;

            case 'reject':
              // Server rejected our edit (stale baseVersion)
              if (data.documentId === documentId) {
                console.warn('⚠️ Edit rejected. Updating version and re-sending...', data.reason);
                stateRef.current.version = data.currentVersion;
                
                // Re-send all pending edits with updated baseVersion
                stateRef.current.pendingEdits.forEach(edit => {
                  edit.baseVersion = stateRef.current.version;
                  ws.send(JSON.stringify({
                    type: 'edit',
                    documentId,
                    content: edit.content,
                    baseVersion: edit.baseVersion,
                    seq: edit.seq,
                    channel: edit.channel,
                  }));
                });
              }
              break;

            case 'update':
              // Received update from another client
              if (data.documentId === documentId) {
                // Check if this update is for our channel
                if (data.channel && data.channel !== channel) {
                  console.log(`🚫 Ignoring update from different channel. Got: ${data.channel}, Expected: ${channel}`);
                  break;
                }
                
                const incomingVersion = data.version || 0;
                
                if (incomingVersion > stateRef.current.version) {
                  // Newer version from server
                  if (stateRef.current.pendingEdits.length > 0) {
                    // We have pending edits - apply server update but don't update version yet
                    // Our pending edits will be re-sent or merged
                    console.log('🔄 Received update while having pending edits. Applying server content...');
                    if (onUpdateRef.current) {
                      onUpdateRef.current(data.content);
                    }
                  } else {
                    // No conflicts, apply directly
                    console.log('📥 Received update. New version:', incomingVersion, 'Channel:', data.channel || 'legacy');
                    stateRef.current.version = incomingVersion;
                    if (onUpdateRef.current) {
                      onUpdateRef.current(data.content);
                    }
                    setSyncStatus('synced');
                  }
                } else {
                  // Stale update, ignore
                  console.log('🚫 Ignoring stale update. Version:', incomingVersion, 'Current:', stateRef.current.version);
                }
              }
              break;
            case 'synced':
              // Legacy message - server acknowledged the save
              setSyncStatus('synced');
              break;

            case 'error':
              console.error('WebSocket error:', data.message);
              setSyncStatus('error');
              break;
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        // Only set error status if WebSocket is in OPEN or CONNECTING state
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          setSyncStatus('error');
        }
      };

      ws.onclose = () => {
        console.log('📡 WebSocket disconnected');
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        const maxAttempts = 5;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

        if (reconnectAttemptsRef.current < maxAttempts) {
          reconnectAttemptsRef.current++;
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${maxAttempts})`);
          
          reconnectTimerRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
    };
  }, [documentId, channel]); // Reconnect when documentId or channel changes

  // Send content update to server with debouncing and OT protocol
  const sendUpdate = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected');
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set syncing status immediately
    setSyncStatus('syncing');

    // Debounce the actual send
    debounceTimerRef.current = setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const seq = stateRef.current.nextSeq++;
        const baseVersion = stateRef.current.version;
        
        // Add to pending queue
        const pendingEdit: PendingEdit = {
          seq,
          content,
          baseVersion,
          timestamp: Date.now(),
          channel, // Use the channel from hook options
        };
        stateRef.current.pendingEdits.push(pendingEdit);
        
        const editMessage = {
          type: 'edit',
          documentId,
          content,
          baseVersion,
          seq,
          channel, // Send channel instead of isSummary
        };
        
        console.log('📤 Sending edit. Seq:', seq, 'BaseVersion:', baseVersion, 'Channel:', channel, 'Pending:', stateRef.current.pendingEdits.length);
        console.log('📤 Full message:', editMessage);
        
        // Send edit with version info
        try {
          wsRef.current.send(JSON.stringify(editMessage));
        } catch (error) {
          console.error('❌ Error sending edit:', error);
          setSyncStatus('error');
        }
      }
    }, debounceMs);
  }, [documentId, channel, debounceMs]);

  // Cleanup debounce timer on unmount
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
