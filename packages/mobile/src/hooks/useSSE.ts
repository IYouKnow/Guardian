import { useEffect, useRef, useState } from "react";

export type SSEEvent = {
  type: string;
  timestamp: number;
};

function cleanUrl(url: string) {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function useSSE(serverUrl: string | null, authToken: string | null) {
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!serverUrl || !authToken) return;

    const connect = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const sseUrl = `${cleanUrl(serverUrl)}/api/events?token=${encodeURIComponent(authToken)}`;
      const evt = new EventSource(sseUrl);
      eventSourceRef.current = evt;

      evt.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as SSEEvent;
          if (data.type === "ping" || data.type === "connected") return;
          setLastEvent(data);
        } catch (err) {
          console.warn("[SSE] Failed to parse message", err);
        }
      };

      evt.onerror = (err) => {
        console.warn("[SSE] Connection error", err);
        evt.close();

        if (reconnectTimeoutRef.current) {
          window.clearTimeout(reconnectTimeoutRef.current);
        }

        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 5000);
      };
    };

    connect();

    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
    };
  }, [serverUrl, authToken]);

  return { lastEvent };
}

