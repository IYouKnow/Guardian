import { useEffect, useState, useRef } from 'react';

type SSEEvent = {
    type: string;
    timestamp: number;
};

export function useSSE(serverUrl: string | null | undefined, authToken: string | null | undefined) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!serverUrl || !authToken) return;

        const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
        const wsUrl = cleanUrl.replace(/^http/, 'ws') + '/ws/events';

        let isActive = true;
        let retryDelay = 1000;
        const maxRetryDelay = 30000;

        const connect = () => {
            if (!isActive) return;

            try {
                const ws = new WebSocket(wsUrl);
                wsRef.current = ws;

                ws.onmessage = (event) => {
                    try {
                        const data = JSON.parse(event.data);
                        if (data.type === 'challenge') {
                            ws.send(JSON.stringify({ type: 'auth', nonce: data.nonce, token: authToken }));
                            return;
                        }
                        if (data.type === 'auth_ok') {
                            console.log('[WS] Authenticated');
                            retryDelay = 1000;
                            return;
                        }
                        if (data.type === 'auth_error') {
                            console.error('[WS] Auth failed');
                            ws.close();
                            return;
                        }
                        if (data.type === 'ping' || data.type === 'connected') return;

                        console.log('[WS] Received event:', data);
                        setLastEvent(data);
                        setIsSyncing(true);
                        setTimeout(() => setIsSyncing(false), 2000);
                    } catch { /* skip */ }
                };

                ws.onclose = () => {
                    wsRef.current = null;
                    if (!isActive) return;
                    reconnectTimeoutRef.current = window.setTimeout(connect, retryDelay);
                    retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
                };

                ws.onerror = () => {};
            } catch {
                if (isActive) {
                    reconnectTimeoutRef.current = window.setTimeout(connect, retryDelay);
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
            if (reconnectTimeoutRef.current !== null) {
                window.clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };
    }, [serverUrl, authToken]);

    return { isSyncing, lastEvent };
}
