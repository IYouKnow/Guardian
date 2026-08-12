import { useEffect, useState, useRef } from 'react';

type SSEEvent = {
    type: string;
    timestamp: number;
};

export function useSSE(serverUrl: string | null, authToken: string | null) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!serverUrl || !authToken) return;

        let retryDelay = 1000;
        const maxRetryDelay = 30000;
        let isActive = true;

        const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
        const wsUrl = cleanUrl.replace(/^http/, 'ws') + '/ws/events';

        const connect = () => {
            if (!isActive) return;

            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                // Step 1: receive challenge nonce
                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'challenge') {
                            // Step 2: respond with auth + nonce
                            ws.send(JSON.stringify({
                                type: 'auth',
                                nonce: data.nonce,
                                token: authToken,
                            }));
                            return;
                        }
                        if (data.type === 'auth_ok') {
                            console.log('[SSE] WebSocket authenticated');
                            retryDelay = 1000;
                            return;
                        }
                        if (data.type === 'auth_error') {
                            console.error('[SSE] WebSocket auth failed');
                            ws.close();
                            return;
                        }
                        // Regular event
                        if (data.type === 'ping' || data.type === 'connected') return;
                        console.log('[SSE] Received event:', data);
                        setLastEvent(data);
                    } catch { /* skip malformed */ }
                };

                ws.onclose = () => {
                    wsRef.current = null;
                    if (!isActive) return;
                    reconnectTimerRef.current = window.setTimeout(connect, retryDelay);
                    retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
                };

                ws.onerror = () => {
                    // onclose will fire after this, so reconnect is handled there
                };

            } catch (err) {
                if (isActive) {
                    reconnectTimerRef.current = window.setTimeout(connect, retryDelay);
                    retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
                }
            }
        };

        connect();

        return () => {
            isActive = false;
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
            if (reconnectTimerRef.current !== null) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };
    }, [serverUrl, authToken]);

    return { isSyncing, lastEvent, setIsSyncing };
}
