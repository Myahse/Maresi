import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getVisitUnreadSummary } from "@/services/api";
import { MARESI_REALTIME, VISIT_REALTIME_TYPES } from "@/hooks/useRealtimeRefresh";
import type { RealtimeEvent } from "@/types";

interface UnreadVisitsValue {
  totalUnread: number;
  unreadByVisit: Record<string, number>;
  unreadFor: (visitId: string) => number;
}

const UnreadVisitsContext = createContext<UnreadVisitsValue | null>(null);

function chatVisitId(pathname: string) {
  const match = pathname.match(/\/visits\/([^/]+)\/chat/);
  return match?.[1] ?? null;
}

export function UnreadVisitsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const [byVisit, setByVisit] = useState<Record<string, number>>({});

  const load = useCallback(() => {
    if (!isAuthenticated) {
      setByVisit({});
      return;
    }
    getVisitUnreadSummary()
      .then((summary) => {
        const next = { ...(summary?.by_visit ?? {}) };
        const open = chatVisitId(window.location.pathname);
        if (open) next[open] = 0;
        setByVisit(next);
      })
      .catch(() => undefined);
  }, [isAuthenticated]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const open = chatVisitId(pathname);
    if (!open) return;
    setByVisit((prev) => (prev[open] ? { ...prev, [open]: 0 } : prev));
  }, [pathname]);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const event = (e as CustomEvent<RealtimeEvent>).detail;
      const type = event?.type;
      if (type === "visit.message") {
        const visitId = event.data?.visit_request_id != null ? String(event.data.visit_request_id) : "";
        const senderId = event.data?.sender_id != null ? String(event.data.sender_id) : "";
        const open = chatVisitId(window.location.pathname);
        if (visitId && senderId && senderId !== String(user?.id ?? "") && visitId !== open) {
          setByVisit((prev) => ({ ...prev, [visitId]: (Number(prev[visitId]) || 0) + 1 }));
        }
      }
      if (type && (VISIT_REALTIME_TYPES as readonly string[]).includes(type)) load();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener(MARESI_REALTIME, onEvent);
    document.addEventListener("visibilitychange", onVisible);
    const timer = window.setInterval(load, 20000);
    return () => {
      window.removeEventListener(MARESI_REALTIME, onEvent);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(timer);
    };
  }, [load, user?.id]);

  const value = useMemo<UnreadVisitsValue>(() => {
    const unreadByVisit = byVisit;
    const totalUnread = Object.values(byVisit).reduce((sum, n) => sum + (Number(n) || 0), 0);
    return {
      totalUnread,
      unreadByVisit,
      unreadFor: (visitId: string) => Number(byVisit[visitId] || 0),
    };
  }, [byVisit]);

  return <UnreadVisitsContext.Provider value={value}>{children}</UnreadVisitsContext.Provider>;
}

export function useUnreadVisits() {
  return (
    useContext(UnreadVisitsContext) ?? {
      totalUnread: 0,
      unreadByVisit: {},
      unreadFor: () => 0,
    }
  );
}
