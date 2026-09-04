import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ChevronDown, Paperclip, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  closeVisitChat,
  getVisitMessages,
  getVisitRequest,
  sendVisitMessage,
  sendVisitMessageWithFile,
} from "@/services/api";
import { MARESI_REALTIME } from "@/hooks/useRealtimeRefresh";
import { AuthAttachment } from "@/components/visit/AuthAttachment";
import { LocalFilePreview } from "@/components/visit/FilePreviewer";
import { MessageReceipt } from "@/components/visit/MessageReceipt";
import { cn } from "@/lib/utils";
import type { RealtimeEvent, VisitMessage, VisitRequest } from "@/types";

function formatStay(date?: string, time?: string) {
  if (!date) return "—";
  const day = new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const hour = time ? String(time).slice(0, 5) : "";
  return hour ? `${day} · ${hour}` : day;
}

function formatClock(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function formatDay(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export function VisitChatPage({ backTo = "/visits" }: { backTo?: string }) {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [visit, setVisit] = useState<VisitRequest | null>(null);
  const [messages, setMessages] = useState<VisitMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    return Promise.all([getVisitRequest(id), getVisitMessages(id)])
      .then(([nextVisit, nextMessages]) => {
        setVisit(nextVisit);
        setMessages(nextMessages);
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("visits.chatFailed")));
  }, [id, t]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    const onEvent = (event: Event) => {
      const type = (event as CustomEvent<RealtimeEvent>).detail?.type;
      const data = (event as CustomEvent<RealtimeEvent>).detail?.data;
      if (type !== "visit.message" && type !== "visit.message.receipt" && type !== "visit.status_changed") return;
      const related = data?.visit_request_id != null && String(data.visit_request_id) === id;
      const sameVisit = data?.id != null && String(data.id) === id;
      if (related || sameVisit || !data?.visit_request_id) void load();
    };
    window.addEventListener(MARESI_REALTIME, onEvent);
    return () => window.removeEventListener(MARESI_REALTIME, onEvent);
  }, [id, load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, loading]);

  const locked = Boolean(visit?.chat_locked || visit?.chat_closed_at || visit?.closed_at);
  const canClose = Boolean(visit?.can_close_chat && !locked);
  const canSend = Boolean((draft.trim() || file) && !sending && !locked);

  const grouped = useMemo(() => {
    const days: { label: string; items: VisitMessage[] }[] = [];
    for (const item of messages) {
      const label = formatDay(item.created_at);
      const last = days[days.length - 1];
      if (!last || last.label !== label) days.push({ label, items: [item] });
      else last.items.push(item);
    }
    return days;
  }, [messages]);

  const send = async () => {
    if (!id || !canSend) return;
    setSending(true);
    setError("");
    try {
      const created = file
        ? await sendVisitMessageWithFile(id, draft, file)
        : await sendVisitMessage(id, draft);
      setMessages((prev) => [...prev, created]);
      setDraft("");
      setFile(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("visits.chatFailed"));
    } finally {
      setSending(false);
    }
  };

  const closeChat = async () => {
    if (!id || !canClose || closing) return;
    if (!window.confirm(t("visits.chatCloseConfirm"))) return;
    setClosing(true);
    setError("");
    try {
      setVisit(await closeVisitChat(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("visits.chatCloseFailed"));
    } finally {
      setClosing(false);
    }
  };

  const title = visit?.property_title || t("common.property");
  const peer = user?.role === "owner" ? visit?.requester_name || t("visits.chatOther") : t("visits.chatHost");

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#efeae2]">
      <header className="shrink-0 bg-[#075E54] text-white shadow-md">
        <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
          <Link
            to={backTo}
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
            aria-label={t("visits.chatBack")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setDetailsOpen((open) => !open)}
          >
            <p className="truncate text-base font-semibold leading-tight">{title}</p>
            <p className="truncate text-xs text-white/80">
              {peer}
              {visit?.check_in && visit?.check_out
                ? ` · ${formatStay(visit.check_in, visit.arrival_time || visit.check_in_time)} → ${formatStay(visit.check_out, visit.departure_time || visit.check_out_time)}`
                : ""}
            </p>
          </button>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
            onClick={() => setDetailsOpen((open) => !open)}
            aria-expanded={detailsOpen}
          >
            <ChevronDown className={cn("h-5 w-5 transition-transform", detailsOpen && "rotate-180")} />
          </button>
        </div>
        {detailsOpen && visit && (
          <div className="space-y-2 border-t border-white/15 bg-[#064e46] px-4 py-3 text-sm">
            {visit.location && <p>{visit.location}</p>}
            {visit.check_in && visit.check_out && (
              <p>
                {t("visits.stayDates")}: {formatStay(visit.check_in, visit.arrival_time || visit.check_in_time)} →{" "}
                {formatStay(visit.check_out, visit.departure_time || visit.check_out_time)}
              </p>
            )}
            {visit.guests_count != null && (
              <p>
                {visit.guests_count} {t("visits.guests")}
              </p>
            )}
            <p className="uppercase tracking-wide text-white/80">{t(`visits.status.${visit.status}`)}</p>
            {canClose && (
              <button
                type="button"
                className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold hover:bg-white/25"
                disabled={closing}
                onClick={() => void closeChat()}
              >
                {t("visits.chatClose")}
              </button>
            )}
          </div>
        )}
      </header>

      {canClose && (
        <div className="flex items-center justify-between gap-3 bg-[#fff3cd] px-4 py-2 text-sm text-[#664d03]">
          <p>{t("visits.chatCloseReady")}</p>
          <button
            type="button"
            className="shrink-0 rounded-full bg-[#075E54] px-3 py-1 text-xs font-semibold text-white"
            disabled={closing}
            onClick={() => void closeChat()}
          >
            {t("visits.chatClose")}
          </button>
        </div>
      )}

      <div
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)",
          backgroundSize: "18px 18px, 28px 28px",
          backgroundPosition: "0 0, 8px 8px",
        }}
      >
        {loading ? (
          <p className="text-center text-sm text-[#54656f]">{t("common.loading")}</p>
        ) : messages.length === 0 ? (
          <p className="mx-auto max-w-sm rounded-xl bg-white/80 px-4 py-3 text-center text-sm text-[#54656f] shadow-sm">
            {t("visits.chatEmpty")}
          </p>
        ) : (
          grouped.map((group) => (
            <div key={group.label} className="mb-3 space-y-1.5">
              <p className="mx-auto w-fit rounded-full bg-white/80 px-3 py-0.5 text-[11px] font-medium uppercase tracking-wide text-[#54656f] shadow-sm">
                {group.label}
              </p>
              {group.items.map((item) => {
                const mine = user?.id != null && String(item.sender_id) === String(user.id);
                return (
                  <div key={item.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[86%] rounded-xl px-2.5 py-1.5 shadow-sm",
                        mine ? "rounded-tr-sm bg-[#d9fdd3] text-[#111b21]" : "rounded-tl-sm bg-white text-[#111b21]"
                      )}
                    >
                      {!mine && (
                        <p className="mb-0.5 text-[11px] font-semibold text-[#075E54]">
                          {item.sender_name || t("visits.chatOther")}
                        </p>
                      )}
                      {item.attachment_url && (
                        <div className="mb-1">
                          <AuthAttachment
                            src={item.attachment_url}
                            name={item.attachment_name}
                            type={item.attachment_type}
                            mine={mine}
                          />
                        </div>
                      )}
                      {item.body && <p className="whitespace-pre-wrap break-words text-[15px] leading-snug">{item.body}</p>}
                      <p className="mt-0.5 flex items-center justify-end text-[10px] text-[#667781]">
                        <span>{formatClock(item.created_at)}</span>
                        {mine && <MessageReceipt message={item} />}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {error && <p className="bg-[#fff3cd] px-4 py-2 text-xs text-[#664d03]">{error}</p>}

      {locked ? (
        <div className="shrink-0 border-t border-black/5 bg-[#f0f2f5] px-4 py-4 text-center text-sm text-[#54656f]">
          {t("visits.chatLocked")}
        </div>
      ) : (
        <div className="shrink-0 bg-[#f0f2f5] px-2 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
          {file && (
            <div className="mb-2 w-fit rounded-xl bg-white p-2 shadow-sm">
              <LocalFilePreview file={file} onRemove={() => setFile(null)} />
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="sr-only"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full text-[#54656f] hover:bg-black/5"
              onClick={() => fileRef.current?.click()}
              aria-label={t("visits.chatAttach")}
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={t("visits.chatPlaceholder")}
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-3xl border-0 bg-white px-4 py-2.5 text-[15px] text-[#111b21] shadow-sm outline-none"
            />
            <button
              type="button"
              className="mb-0.5 flex h-11 w-11 items-center justify-center rounded-full bg-[#00a884] text-white disabled:opacity-40"
              disabled={!canSend}
              onClick={() => void send()}
              aria-label={t("visits.chatSend")}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
