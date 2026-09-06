import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { emitRealtime } from "@/hooks/useRealtimeRefresh";
import { ackIncomingVisitMessage } from "@/services/api";
import type { RealtimeEvent } from "@/types";
import { alertFromRealtime, type InAppAlert } from "@/lib/visitAlerts";

export function HostRealtimeBridge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, applySession } = useAuth();
  const [toast, setToast] = useState<InAppAlert | null>(null);
  const hostTopic = user?.id ? `/topic/host.${user.id}` : "";

  const showToast = useCallback((next: InAppAlert | null) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      emitRealtime(event);
      ackIncomingVisitMessage(event, user?.id);
      if (event.type === "host.application.reviewed") {
        const data = event.data ?? {};
        if (data.status === "approved" && typeof data.token === "string" && user) {
          applySession({
            token: data.token,
            user: { ...user, role: "owner", host_status: "approved" },
          });
        }
        showToast({ title: t("alerts.hostReviewed") });
        return;
      }
      const visitAlert = alertFromRealtime(event, user?.id, t, true);
      if (visitAlert) {
        showToast(visitAlert);
        return;
      }
      if (event.type === "payment.completed") {
        showToast({ title: t("alerts.paymentCompleted"), href: "/owner/visits" });
      }
    },
    [applySession, showToast, t, user]
  );

  useRealtime(isAuthenticated && !!user, onEvent, hostTopic ? [hostTopic] : []);

  if (!toast) return null;
  return (
    <button
      type="button"
      className="fixed right-4 z-[80] above-mobile-nav max-w-sm rounded-xl bg-gray-900 text-left text-white text-sm px-4 py-3 shadow-lg"
      onClick={() => {
        if (toast.href) navigate(toast.href);
        setToast(null);
      }}
    >
      <p className="font-semibold">{toast.title}</p>
      {toast.body && <p className="mt-0.5 text-xs text-white/80">{toast.body}</p>}
    </button>
  );
}
