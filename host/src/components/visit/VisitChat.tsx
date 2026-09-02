import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getVisitMessages, sendVisitMessage } from "@/services/api";
import { MARESI_REALTIME } from "@/hooks/useRealtimeRefresh";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RealtimeEvent, VisitMessage } from "@/types";

export function VisitChat({ visitId }: { visitId: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [messages, setMessages] = useState<VisitMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(() => {
    return getVisitMessages(visitId)
      .then(setMessages)
      .catch(() => setMessages([]));
  }, [visitId]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  useEffect(() => {
    const onEvent = (event: Event) => {
      const type = (event as CustomEvent<RealtimeEvent>).detail?.type;
      const data = (event as CustomEvent<RealtimeEvent>).detail?.data;
      if (type !== "visit.message") return;
      const related = data?.visit_request_id != null && String(data.visit_request_id) === visitId;
      if (related || !data?.visit_request_id) void load();
    };
    window.addEventListener(MARESI_REALTIME, onEvent);
    return () => window.removeEventListener(MARESI_REALTIME, onEvent);
  }, [load, visitId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const created = await sendVisitMessage(visitId, body);
      setMessages((prev) => [...prev, created]);
      setDraft("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("visits.chatFailed"));
    } finally {
      setSending(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-left text-sm font-medium text-foreground hover:bg-muted"
      >
        {t("visits.chatTitle")}
        <span className="block text-xs font-normal text-muted-foreground">{t("visits.chatHint")}</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{t("visits.chatTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("visits.chatHint")}</p>
      </div>
      <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
        {messages.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("visits.chatEmpty")}</p>
        ) : (
          messages.map((item) => {
            const mine = user?.id != null && String(item.sender_id) === String(user.id);
            return (
              <div key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine ? "bg-brand text-white" : "bg-card border border-border text-foreground"
                  )}
                >
                  <p className={cn("text-[10px] font-semibold mb-0.5", mine ? "text-white/80" : "text-muted-foreground")}>
                    {mine ? t("visits.chatYou") : item.sender_name || t("visits.chatOther")}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{item.body}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          maxLength={2000}
          placeholder={t("visits.chatPlaceholder")}
          className="flex-1 min-h-[44px] resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm"
        />
        <Button
          type="button"
          className="self-end rounded-full shrink-0"
          disabled={sending || !draft.trim()}
          onClick={() => void send()}
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">{t("visits.chatSend")}</span>
        </Button>
      </div>
    </div>
  );
}
