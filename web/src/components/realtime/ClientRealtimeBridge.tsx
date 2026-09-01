import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { emitRealtime } from "@/hooks/useRealtimeRefresh";
import { applySession, normalizeAuthResponse } from "@/services/auth";
import type { RealtimeEvent, User } from "@/types";

export function ClientRealtimeBridge() {
  const { isAuthenticated, user, applySession: setSession } = useAuth();
  const [toast, setToast] = useState<string | null>(null);

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      emitRealtime(event);
      if (event.type === "host.application.reviewed") {
        const token = event.data.token;
        const nextUser = event.data.user;
        if (typeof token === "string" && nextUser && typeof nextUser === "object") {
          try {
            const normalized = normalizeAuthResponse({ token, user: nextUser });
            setSession(normalized);
          } catch {
            if (user) {
              applySession({ token, user: { ...user, role: "owner" } as User });
              setSession({ token, user: { ...user, role: "owner" } });
            }
          }
        }
        setToast(String(event.data.status === "rejected" ? "host-rejected" : "host-approved"));
      }
      if (event.type === "visit.status_changed" || event.type === "payment.completed" || event.type === "listing.published") {
        setToast(event.type);
      }
      window.setTimeout(() => setToast(null), 4000);
    },
    [setSession, user]
  );

  useRealtime(isAuthenticated, onEvent);

  if (!toast) return null;
  return (
    <div className="fixed right-4 z-[80] above-mobile-nav rounded-xl bg-gray-900 text-white text-sm px-4 py-3 shadow-lg">
      {toast === "host-approved" && "Host account approved"}
      {toast === "host-rejected" && "Host application updated"}
      {toast === "visit.status_changed" && "Visit request updated"}
      {toast === "payment.completed" && "Payment confirmed"}
      {toast === "listing.published" && "New residence near you"}
      {!["host-approved", "host-rejected", "visit.status_changed", "payment.completed", "listing.published"].includes(toast) &&
        toast}
    </div>
  );
}
