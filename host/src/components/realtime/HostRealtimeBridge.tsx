import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import type { RealtimeEvent } from "@/types";

export function HostRealtimeBridge() {
  const { isAuthenticated, user } = useAuth();
  const [toast, setToast] = useState<string | null>(null);
  const hostTopic = user?.id ? `/topic/host.${user.id}` : "";

  const onEvent = useCallback((event: RealtimeEvent) => {
    if (
      event.type === "visit.created" ||
      event.type === "visit.status_changed" ||
      event.type === "payment.completed"
    ) {
      setToast(event.type);
      window.setTimeout(() => setToast(null), 4000);
    }
  }, []);

  useRealtime(isAuthenticated && user?.role === "owner", onEvent, hostTopic ? [hostTopic] : []);

  if (!toast) return null;
  return (
    <div className="fixed bottom-4 right-4 z-[80] rounded-xl bg-gray-900 text-white text-sm px-4 py-3 shadow-lg">
      {toast === "visit.created" && "New visit request"}
      {toast === "visit.status_changed" && "Visit updated"}
      {toast === "payment.completed" && "Payment confirmed"}
    </div>
  );
}
