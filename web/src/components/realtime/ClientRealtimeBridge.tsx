import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { emitRealtime } from "@/hooks/useRealtimeRefresh";
import { applySession, normalizeAuthResponse } from "@/services/auth";
import { ackIncomingVisitMessage } from "@/services/api";
import type { RealtimeEvent, User } from "@/types";
import { useFloatingAboveNavClass } from "@/context/MobileChromeContext";
import { cn } from "@/lib/utils";
import { alertFromRealtime, type InAppAlert } from "@/lib/visitAlerts";

export function ClientRealtimeBridge() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, applySession: setSession } = useAuth();
  const [toast, setToast] = useState<InAppAlert | null>(null);
  const floatingClass = useFloatingAboveNavClass();

  const showToast = useCallback((next: InAppAlert | null) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 5000);
  }, []);

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      emitRealtime(event);
      ackIncomingVisitMessage(event, user?.id);
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
        showToast({
          title:
            event.data.status === "rejected" ? t("alerts.hostRejected") : t("alerts.hostApproved"),
        });
        return;
      }

      const visitAlert = alertFromRealtime(event, user?.id, t, false);
      if (visitAlert) {
        showToast(visitAlert);
        return;
      }
      if (event.type === "payment.completed") {
        showToast({ title: t("alerts.paymentCompleted"), href: "/visits" });
        return;
      }
      if (event.type === "listing.published") {
        showToast({ title: t("alerts.listingPublished"), href: "/properties" });
      }
    },
    [setSession, showToast, t, user]
  );

  useRealtime(isAuthenticated, onEvent);

  if (!toast) return null;
  return (
    <button
      type="button"
      className={cn(
        "fixed right-4 z-[80] max-w-sm rounded-xl bg-gray-900 text-left text-white text-sm px-4 py-3 shadow-lg",
        floatingClass
      )}
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
