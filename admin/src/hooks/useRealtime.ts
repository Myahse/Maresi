import { useEffect, useRef } from "react";
import { Client, type IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { getToken } from "@/services/auth";
import type { RealtimeEvent } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function wsHttpEndpoint(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL;
  if (API_BASE.startsWith("http")) {
    return API_BASE.replace(/\/api\/?$/, "") + "/ws";
  }
  return `${window.location.origin}/ws`;
}

function wsNativeUrl(): string {
  return wsHttpEndpoint().replace(/^http/, "ws");
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

    let connectedOnce = false;
    let fallbackToSock = false;

    const client = new Client({
      webSocketFactory: () =>
        fallbackToSock
          ? (new SockJS(wsHttpEndpoint()) as WebSocket)
          : new WebSocket(wsNativeUrl()),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 4000,
      heartbeatIncoming: 20000,
      heartbeatOutgoing: 20000,
      onConnect: () => {
        connectedOnce = true;
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
      onWebSocketClose: () => {
        if (!connectedOnce) fallbackToSock = true;
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
