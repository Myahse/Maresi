import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { emitRealtime } from "@/hooks/useRealtimeRefresh";
import type { RealtimeEvent } from "@/types";

export function HostRealtimeBridge() {
  const { isAuthenticated, user, applySession } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const hostTopic = user?.id ? `/topic/host.${user.id}` : "";

  const onEvent = useCallback((event: RealtimeEvent) => {
    emitRealtime(event);
    if (event.type === "host.application.reviewed") {
      const data = event.data ?? {};
      if (data.status === "approved" && typeof data.token === "string" && user) {
        applySession({
          token: data.token,
          user: { ...user, role: "owner", host_status: "approved" },
        });
      }
      setToast(event.type);
      window.setTimeout(() => setToast(null), 4000);
      return;
    }
    if (
      event.type === "visit.created" ||
      event.type === "visit.status_changed" ||
      event.type === "payment.completed"
    ) {
      setToast(event.type);
      window.setTimeout(() => setToast(null), 4000);
    }
  }, [applySession, user]);

  useRealtime(isAuthenticated && !!user, onEvent, hostTopic ? [hostTopic] : []);

  if (!toast) return null;
  return (
    <div className="fixed right-4 z-[80] above-mobile-nav rounded-xl bg-gray-900 text-white text-sm px-4 py-3 shadow-lg">
      {toast === "visit.created" && "New visit request"}
      {toast === "visit.status_changed" && "Visit updated"}
      {toast === "payment.completed" && "Payment confirmed"}
      {toast === "host.application.reviewed" && "Host application updated"}
    </div>
  );
}
