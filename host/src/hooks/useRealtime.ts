import { useEffect, useRef } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getToken } from "@/services/auth";
import type { RealtimeEvent } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function wsEndpoint(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (API_BASE.startsWith("http")) {
    return API_BASE.replace(/\/api\/?$/, "") + "/ws";
  }
  return `${window.location.origin}/ws`;
}

export function useRealtime(
  enabled: boolean,
  onEvent: (event: RealtimeEvent) => void,
  extraDestinations: string[] = []
) {
  const handlerRef = useRef(onEvent);
  handlerRef.current = onEvent;
  const destKey = extraDestinations.join("|");

  useEffect(() => {
    if (!enabled) return;
    const token = getToken();
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(wsEndpoint()) as WebSocket,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      onConnect: () => {
        const handle = (message: IMessage) => {
          try {
            handlerRef.current(JSON.parse(message.body) as RealtimeEvent);
          } catch {
            // ignore malformed frames
          }
        };
        client.subscribe("/user/queue/events", handle);
        for (const dest of extraDestinations) {
          client.subscribe(dest, handle);
        }
      },
    });
    client.activate();
    return () => {
      void client.deactivate();
    };
    // extraDestinations is represented by destKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, destKey]);
}
