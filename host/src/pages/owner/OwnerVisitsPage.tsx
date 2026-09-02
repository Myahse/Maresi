import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import {
  billStayOverstay,
  closeStay,
  confirmStayExtensionPayment,
  confirmVisitKey,
  decideStayExtension,
  getOwnerVisitRequests,
  updateVisitRequestStatus,
} from "@/services/api";
import { VisitRequestCard } from "@/components/visit/VisitRequestCard";
import { actionErrorMessage } from "@/lib/offline";
import type { VisitRequest } from "@/types";

export function OwnerVisitsPage() {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState("");
  const [keyCodes, setKeyCodes] = useState<Record<string, string>>({});
  const [keyError, setKeyError] = useState("");
  const [overstayDates, setOverstayDates] = useState<Record<string, string>>({});
  const [closeScores, setCloseScores] = useState<Record<string, number>>({});
  const [closeNotes, setCloseNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    return getOwnerVisitRequests()
      .then(setVisits)
      .catch(() => setVisits([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh().finally(() => setLoading(false));
  }, [refresh]);

  useRealtimeRefresh(refresh);

  const handleStatus = async (id: string, status: "accepted" | "declined" | "confirmed", note?: string) => {
    setActingId(id);
    setError("");
    try {
      const updated = await updateVisitRequestStatus(id, status, note);
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
      setDeclineId(null);
      setDeclineNote("");
    } catch (e) {
      setError(actionErrorMessage(e, t("owner.visitValidation"), t("offline.queued")));
    } finally {
      setActingId(null);
    }
  };

  const handleExtension = async (id: string, status: "approved" | "declined") => {
    setActingId(id);
    try {
      const updated = await decideStayExtension(id, status);
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch {
      /* ignore */
    } finally {
      setActingId(null);
    }
  };

  const confirmExtensionPay = async (id: string) => {
    setActingId(id);
    try {
      const updated = await confirmStayExtensionPayment(id);
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
    } catch {
      /* ignore */
    } finally {
      setActingId(null);
    }
  };

  const minOverstayDate = (visit: VisitRequest) => {
    const base = visit.check_out ? new Date(`${visit.check_out.slice(0, 10)}T00:00:00`) : new Date();
    base.setDate(base.getDate() + 1);
    const month = String(base.getMonth() + 1).padStart(2, "0");
    const day = String(base.getDate()).padStart(2, "0");
    return `${base.getFullYear()}-${month}-${day}`;
  };

  const billOverstay = async (visit: VisitRequest) => {
    const next = overstayDates[visit.id] || minOverstayDate(visit);
    setActingId(visit.id);
    try {
      const updated = await billStayOverstay(visit.id, next);
      setVisits((prev) => prev.map((v) => (v.id === visit.id ? updated : v)));
    } catch {
      /* ignore */
    } finally {
      setActingId(null);
    }
  };

  const submitClose = async (visit: VisitRequest) => {
    const score = closeScores[visit.id] ?? 5;
    setActingId(visit.id);
    try {
      const updated = await closeStay(visit.id, score, closeNotes[visit.id]);
      setVisits((prev) => prev.map((v) => (v.id === visit.id ? updated : v)));
    } catch {
      /* ignore */
    } finally {
      setActingId(null);
    }
  };

  const pending = visits.filter((v) => v.status === "pending");
  const awaitingHost = visits.filter((v) => v.status === "awaiting_host_agreement");
  const awaitingKey = visits.filter((v) => v.status === "awaiting_key");
  const toConfirm = visits.filter((v) => v.status === "payment_sent");
  const extensionPending = visits.filter((v) => v.extension_status === "pending");
  const extensionToConfirm = visits.filter((v) => v.extension_status === "payment_sent");
  const overstays = visits.filter((v) => v.overstay && !v.closed_at);
  const toClose = visits.filter((v) => v.can_close && !v.closed_at && !v.overstay);
  const resolved = visits.filter(
    (v) =>
      v.status !== "pending" &&
      v.status !== "payment_sent" &&
      v.status !== "awaiting_key" &&
      v.status !== "awaiting_host_agreement" &&
      v.extension_status !== "pending" &&
      v.extension_status !== "payment_sent" &&
      !v.can_close
  );

  const submitKey = async (id: string) => {
    setActingId(id);
    setKeyError("");
    try {
      const updated = await confirmVisitKey(id, (keyCodes[id] || "").trim());
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
      setKeyCodes((prev) => ({ ...prev, [id]: "" }));
    } catch (e) {
      setKeyError(e instanceof Error ? e.message : t("visits.keyEnterHint"));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="font-jakarta container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/owner" className="text-sm text-brand hover:underline">
        ← {t("owner.title")}
      </Link>
      <h1 className="text-2xl font-bold text-foreground mt-4">{t("owner.visitValidation")}</h1>
      <p className="text-muted-foreground text-sm mt-1 mb-8">{t("owner.visitValidationHint")}</p>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : visits.length === 0 ? (
        <p className="text-muted-foreground">{t("owner.noVisits")}</p>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">{t("owner.pendingRequests")} ({pending.length})</h2>
              {pending.map((v) => (
                <VisitRequestCard key={v.id} visit={v} showRequester>
                  {declineId === v.id ? (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <textarea
                        className="w-full min-h-[80px] rounded-xl border border-input px-3 py-2 text-sm"
                        placeholder={t("owner.declineReasonPlaceholder")}
                        value={declineNote}
                        onChange={(e) => setDeclineNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full"
                          disabled={actingId === v.id}
                          onClick={() => handleStatus(v.id, "declined", declineNote)}
                        >
                          {t("owner.confirmDecline")}
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setDeclineId(null)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        className="rounded-full bg-brand hover:bg-brand-dark"
                        disabled={actingId === v.id}
                        onClick={() => handleStatus(v.id, "accepted")}
                      >
                        {t("owner.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-red-300 text-red-700 hover:bg-red-50"
                        disabled={actingId === v.id}
                        onClick={() => setDeclineId(v.id)}
                      >
                        {t("owner.decline")}
                      </Button>
                    </div>
                  )}
                </VisitRequestCard>
              ))}
            </section>
          )}

          {awaitingHost.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">
                {t("visits.hostSignTitle")} ({awaitingHost.length})
              </h2>
              <p className="text-sm text-muted-foreground">{t("visits.agreementHostSignHint")}</p>
              {awaitingHost.map((v) => (
                <VisitRequestCard key={v.id} visit={v} showRequester>
                  <div className="pt-2 border-t border-gray-100">
                    <Button asChild className="w-full rounded-full bg-brand hover:bg-brand-dark">
                      <Link to={`/owner/visits/${v.id}/agreement`}>{t("visits.agreementHostOpen")}</Link>
                    </Button>
                  </div>
                </VisitRequestCard>
              ))}
            </section>
          )}

          {awaitingKey.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">
                {t("visits.keyEnterTitle")} ({awaitingKey.length})
              </h2>
              <p className="text-sm text-muted-foreground">{t("visits.keyEnterHint")}</p>
              {keyError && <p className="text-sm text-destructive">{keyError}</p>}
              {awaitingKey.map((v) => (
                <VisitRequestCard key={v.id} visit={v} showRequester>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <input
                      className="flex-1 min-w-[8rem] rounded-xl border px-3 py-2 font-mono tracking-widest"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder={t("visits.keyPlaceholder")}
                      value={keyCodes[v.id] || ""}
                      onChange={(e) =>
                        setKeyCodes((prev) => ({ ...prev, [v.id]: e.target.value.replace(/\D/g, "").slice(0, 6) }))
                      }
                    />
                    <Button
                      size="sm"
                      className="rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id || (keyCodes[v.id] || "").length !== 6}
                      onClick={() => void submitKey(v.id)}
                    >
                      {t("visits.keyConfirm")}
                    </Button>
                  </div>
                </VisitRequestCard>
              ))}
            </section>
          )}

          {extensionPending.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">
                {t("visits.extendDecideTitle")} ({extensionPending.length})
              </h2>
              {extensionPending.map((v) => (
                <VisitRequestCard key={`ext-${v.id}`} visit={v} showRequester>
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                    <Button
                      size="sm"
                      className="rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id}
                      onClick={() => void handleExtension(v.id, "approved")}
                    >
                      {t("visits.extendAccept")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full border-red-300 text-red-700 hover:bg-red-50"
                      disabled={actingId === v.id}
                      onClick={() => void handleExtension(v.id, "declined")}
                    >
                      {t("visits.extendDecline")}
                    </Button>
                  </div>
                </VisitRequestCard>
              ))}
            </section>
          )}

          {extensionToConfirm.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">
                {t("visits.extendConfirmPayTitle")} ({extensionToConfirm.length})
              </h2>
              {extensionToConfirm.map((v) => (
                <VisitRequestCard key={`ext-pay-${v.id}`} visit={v} showRequester>
                  <Button
                    size="sm"
                    className="rounded-full bg-brand hover:bg-brand-dark"
                    disabled={actingId === v.id}
                    onClick={() => void confirmExtensionPay(v.id)}
                  >
                    {t("visits.extendConfirmPay")}
                  </Button>
                </VisitRequestCard>
              ))}
            </section>
          )}

          {overstays.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">
                {t("visits.overstaySection")} ({overstays.length})
              </h2>
              <p className="text-sm text-muted-foreground">{t("visits.overstayHint")}</p>
              {overstays.map((v) => (
                <VisitRequestCard key={`overstay-${v.id}`} visit={v} showRequester>
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    {v.extension_status !== "awaiting_payment" && v.extension_status !== "payment_sent" && (
                      <div className="space-y-2">
                        <label className="block text-sm">
                          <span className="text-muted-foreground">{t("visits.overstayBillUntil")}</span>
                          <input
                            type="date"
                            className="mt-1 w-full rounded-xl border px-3 py-2"
                            min={minOverstayDate(v)}
                            value={overstayDates[v.id] || minOverstayDate(v)}
                            onChange={(e) => setOverstayDates((prev) => ({ ...prev, [v.id]: e.target.value }))}
                          />
                        </label>
                        <Button
                          size="sm"
                          className="rounded-full bg-brand hover:bg-brand-dark"
                          disabled={actingId === v.id}
                          onClick={() => void billOverstay(v)}
                        >
                          {t("visits.overstayBillCta")}
                        </Button>
                      </div>
                    )}
                    <p className="text-sm font-semibold">{t("visits.closeStayTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("visits.closeStayHint")}</p>
                    <select
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={closeScores[v.id] ?? 5}
                      onChange={(e) => setCloseScores((prev) => ({ ...prev, [v.id]: Number(e.target.value) }))}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm"
                      placeholder={t("visits.closeStayNotePlaceholder")}
                      value={closeNotes[v.id] || ""}
                      onChange={(e) => setCloseNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      disabled={actingId === v.id}
                      onClick={() => void submitClose(v)}
                    >
                      {t("visits.closeStayCta")}
                    </Button>
                  </div>
                </VisitRequestCard>
              ))}
            </section>
          )}

          {toClose.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">
                {t("visits.closeStayTitle")} ({toClose.length})
              </h2>
              <p className="text-sm text-muted-foreground">{t("visits.closeStayHint")}</p>
              {toClose.map((v) => (
                <VisitRequestCard key={`close-${v.id}`} visit={v} showRequester>
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <select
                      className="w-full rounded-xl border px-3 py-2 text-sm"
                      value={closeScores[v.id] ?? 5}
                      onChange={(e) => setCloseScores((prev) => ({ ...prev, [v.id]: Number(e.target.value) }))}
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n}>
                          {n} / 5
                        </option>
                      ))}
                    </select>
                    <textarea
                      className="w-full min-h-[80px] rounded-xl border px-3 py-2 text-sm"
                      placeholder={t("visits.closeStayNotePlaceholder")}
                      value={closeNotes[v.id] || ""}
                      onChange={(e) => setCloseNotes((prev) => ({ ...prev, [v.id]: e.target.value }))}
                    />
                    <Button
                      size="sm"
                      className="rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id}
                      onClick={() => void submitClose(v)}
                    >
                      {t("visits.closeStayCta")}
                    </Button>
                  </div>
                </VisitRequestCard>
              ))}
            </section>
          )}

          {toConfirm.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">
                {t("owner.confirmReceiptTitle")} ({toConfirm.length})
              </h2>
              {toConfirm.map((v) => (
                <VisitRequestCard key={v.id} visit={v} showRequester>
                  <Button
                    size="sm"
                    className="rounded-full bg-brand hover:bg-brand-dark"
                    disabled={actingId === v.id}
                    onClick={() => void handleStatus(v.id, "confirmed")}
                  >
                    {t("owner.confirmReceipt")}
                  </Button>
                </VisitRequestCard>
              ))}
            </section>
          )}

          {resolved.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-foreground">{t("owner.pastRequests")}</h2>
              {resolved.map((v) => (
                <VisitRequestCard key={v.id} visit={v} showRequester />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
