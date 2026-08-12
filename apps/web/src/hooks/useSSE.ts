import { useEffect, useState, useRef } from 'react';
import { authApi } from '../api/auth';
import { useLocation } from 'react-router-dom';

type SSEEvent = {
    type: string;
    timestamp: number;
};

export function useSSE() {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const location = useLocation();
    const reconnectTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const token = authApi.getToken();
        if (!token || location.pathname === '/login') return;

        const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
        const wsUrl = baseUrl.replace(/^http/, 'ws') + '/ws/events';

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
                            ws.send(JSON.stringify({ type: 'auth', nonce: data.nonce, token }));
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
    }, [location.pathname]);

    return { isSyncing, lastEvent };
}
