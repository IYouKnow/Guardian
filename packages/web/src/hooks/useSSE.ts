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
    const eventSourceRef = useRef<EventSource | null>(null);
    const location = useLocation();
    const reconnectTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Only connect if the user is authenticated (they have a token)
        const token = authApi.getToken();

        // Don't connect on the login screen
        if (!token || location.pathname === '/login') {
            return;
        }

        const connectSSE = () => {
            // Close any existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            // The Web API EventSource does not support custom headers (like Authorization: Bearer).
            // We must pass the token as a query parameter.
            const sseUrl = `${import.meta.env.VITE_API_URL || ''}/api/events?token=${token}`;

            const evtSource = new EventSource(sseUrl);
            eventSourceRef.current = evtSource;

            evtSource.onopen = () => {
                console.log('[SSE] Connection established');
            };

            evtSource.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as SSEEvent;

                    if (data.type === 'ping') {
                        // Ignoring pings. They just keep the cloudflare tunnel alive.
                        return;
                    }

                    if (data.type === 'connected') {
                        return;
                    }

                    console.log('[SSE] Received event:', data);
                    setLastEvent(data);

                    // Show syncing indicator
                    setIsSyncing(true);

                    // Auto-hide the syncing indicator after 2 seconds
                    setTimeout(() => {
                        setIsSyncing(false);
                    }, 2000);

                } catch (err) {
                    console.error('[SSE] Failed to parse message', err);
                }
            };

            evtSource.onerror = (err) => {
                console.error('[SSE] Connection error', err);
                evtSource.close();

                // Simple exponential backoff or fixed delay could be used here
                // The browser's native EventSource attempts to reconnect automatically, 
                // but if it completely fails, we try again in 5 seconds
                if (reconnectTimeoutRef.current) {
                    window.clearTimeout(reconnectTimeoutRef.current);
                }

                reconnectTimeoutRef.current = window.setTimeout(() => {
                    console.log('[SSE] Attempting to reconnect...');
                    connectSSE();
                }, 5000);
            };
        };

        connectSSE();

        // Cleanup on unmount or when token/location changes
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [location.pathname]);

    return { isSyncing, lastEvent };
}
