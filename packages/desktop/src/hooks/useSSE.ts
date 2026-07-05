import { useEffect, useState, useRef } from 'react';

type SSEEvent = {
    type: string;
    timestamp: number;
};

export function useSSE(serverUrl: string | null, authToken: string | null) {
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
    const reconnectTimerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!serverUrl || !authToken) return;

        const controller = new AbortController();
        let retryDelay = 1000;
        const maxRetryDelay = 30000;
        let isActive = true;

        const connect = async () => {
            if (!isActive) return;

            try {
                const cleanUrl = serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
                const response = await fetch(`${cleanUrl}/api/events?token=${encodeURIComponent(authToken)}`, {
                    signal: controller.signal,
                });

                if (!response.ok) throw new Error(`SSE connection failed: ${response.status}`);
                if (!response.body) throw new Error('No response body');

                retryDelay = 1000;

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';

                while (isActive) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });

                    // Cap buffer to prevent memory exhaustion from malformed server
                    if (buffer.length > 1_048_576) {
                        buffer = '';
                    }

                    const messages = buffer.split('\n\n');
                    buffer = messages.pop() || '';

                    for (const msg of messages) {
                        const dataLine = msg.split('\n').find(l => l.startsWith('data:'));
                        if (!dataLine) continue;

                        const jsonStr = dataLine.slice(5).trim();
                        try {
                            const data = JSON.parse(jsonStr) as SSEEvent;
                            if (data.type === 'ping' || data.type === 'connected') continue;
                            console.log('[SSE] Received event:', data);
                            setLastEvent(data);
                        } catch { /* skip malformed */ }
                    }
                }
            } catch (err) {
                if (!isActive) return;
                console.error('[SSE] Connection error', err);
            }

            if (!isActive) return;
            reconnectTimerRef.current = window.setTimeout(connect, retryDelay);
            retryDelay = Math.min(retryDelay * 2, maxRetryDelay);
        };

        connect();

        return () => {
            isActive = false;
            controller.abort();
            if (reconnectTimerRef.current !== null) {
                window.clearTimeout(reconnectTimerRef.current);
                reconnectTimerRef.current = null;
            }
        };
    }, [serverUrl, authToken]);

    return { isSyncing, lastEvent, setIsSyncing };
}
