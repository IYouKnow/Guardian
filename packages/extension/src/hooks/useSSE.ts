import { useEffect, useState, useRef } from 'react';

type SSEEvent = {
    type: string;
    timestamp: number;
};

export function useSSE(serverUrl: string | null | undefined, authToken: string | null | undefined) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // Only connect if we have a url and token
        if (!serverUrl || !authToken) {
            return;
        }

        const connectSSE = () => {
            // Close any existing connection
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }

            // The Web API EventSource does not support custom headers (like Authorization: Bearer).
            // We must pass the token as a query parameter.
            const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
            const sseUrl = `${cleanUrl}/api/events?token=${authToken}`;

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

        // Cleanup on unmount or when token/url changes
        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                window.clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [serverUrl, authToken]);

    return { isSyncing, lastEvent };
}
