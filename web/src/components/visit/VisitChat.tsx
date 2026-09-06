import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MessageCircle } from "lucide-react";
import type { VisitRequest } from "@/types";
import { useUnreadVisits } from "@/context/UnreadVisitsContext";
import { UnreadBadge } from "@/components/ui/UnreadBadge";

export function VisitChat({ visit }: { visit: VisitRequest }) {
  const { t } = useTranslation();
  const { unreadFor } = useUnreadVisits();
  const unread = unreadFor(visit.id) || visit.unread_count || 0;
  const locked = Boolean(visit.chat_locked || visit.chat_closed_at || visit.closed_at);
  return (
    <Link
      to={`/visits/${visit.id}/chat`}
      className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-left hover:bg-muted"
    >
      <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#075E54] text-white">
        <MessageCircle className="h-5 w-5" />
        <UnreadBadge count={unread} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{t("visits.chatTitle")}</span>
        <span className="block text-xs text-muted-foreground">
          {unread > 0
            ? t("visits.chatUnread", { count: unread })
            : locked
              ? t("visits.chatLockedHint")
              : t("visits.chatOpenHint")}
        </span>
      </span>
    </Link>
  );
}
