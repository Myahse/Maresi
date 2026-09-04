import { useEffect } from "react";
import type { RealtimeEvent } from "@/types";

export const MARESI_REALTIME = "maresi:realtime";

export const VISIT_REALTIME_TYPES = [
  "visit.created",
  "visit.status_changed",
  "visit.message",
  "visit.message.receipt",
  "payment.completed",
] as const;

export function emitRealtime(event: RealtimeEvent) {
  window.dispatchEvent(new CustomEvent(MARESI_REALTIME, { detail: event }));
}

export function useRealtimeRefresh(refresh: () => void, intervalMs = 10000) {
  useEffect(() => {
    const onEvent = (e: Event) => {
      const type = (e as CustomEvent<RealtimeEvent>).detail?.type;
      if (type && (VISIT_REALTIME_TYPES as readonly string[]).includes(type)) {
        refresh();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener(MARESI_REALTIME, onEvent);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(refresh, intervalMs);
    return () => {
      window.removeEventListener(MARESI_REALTIME, onEvent);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [refresh, intervalMs]);
}
