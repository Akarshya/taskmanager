import { useEffect, useRef } from 'react';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
const RECONNECT_DELAY_MS = 3000;

export function useSSE(token, onEvent) {
  const eventCallbackRef = useRef(onEvent);

  useEffect(() => {
    eventCallbackRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;
    const abortController = new AbortController();

    async function connect() {
      try {
        const response = await fetch(`${BASE_URL}/events`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: abortController.signal,
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let lineBuffer = '';

        while (!isCancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          lineBuffer += decoder.decode(value, { stream: true });
          const lines = lineBuffer.split('\n');
          lineBuffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const event = JSON.parse(line.slice(6));
                eventCallbackRef.current(event);
              } catch {
                // Ignore malformed SSE frames
              }
            }
          }
        }
      } catch {
        if (!isCancelled) setTimeout(connect, RECONNECT_DELAY_MS);
      }
    }

    connect();

    return () => {
      isCancelled = true;
      abortController.abort();
    };
  }, [token]);
}
