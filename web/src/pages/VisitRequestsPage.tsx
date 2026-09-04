import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getMyVisitRequests,
  markStayExtensionPaid,
  previewReservationPayment,
  requestStayExtension,
  startReservationPayment,
  updateVisitRequestStatus,
  uploadVisitReceipt,
} from "@/services/api";
import { VisitRequestCard } from "@/components/visit/VisitRequestCard";
import { Button } from "@/components/ui/button";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { actionErrorMessage } from "@/lib/offline";
import type { VisitRequest } from "@/types";
import { PaymentOperatorPicker } from "@/components/payment/PaymentOperatorPicker";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle } from "lucide-react";

const SECURITY_SEEN_PREFIX = "maresi-key-security-";

function hasSeenSecurity(visitId: string) {
  try {
    return localStorage.getItem(`${SECURITY_SEEN_PREFIX}${visitId}`) === "1";
  } catch {
    return false;
  }
}

function markSecuritySeen(visitId: string) {
  try {
    localStorage.setItem(`${SECURITY_SEEN_PREFIX}${visitId}`, "1");
  } catch {
    /* private mode */
  }
}

function visitPhone(visit: VisitRequest, accountPhone?: string) {
  return visit.contact_phone || visit.requester_phone || accountPhone || "";
}

function stayAmount(visit: VisitRequest): number {
  const unit = Number(visit.property_price ?? 0);
  if (!visit.check_in || !visit.check_out) return unit;
  const inDate = new Date(visit.check_in);
  const outDate = new Date(visit.check_out);
  const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / 86400000));
  return unit * nights;
}

export function VisitRequestsPage() {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const { user } = useAuth();
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [extendDates, setExtendDates] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [previews, setPreviews] = useState<Record<string, {
    stay_amount: string;
    operator_fee: string;
    operator_fee_percent: string;
    client_pays_operator_fees: boolean;
    total: string;
    currency: string;
    property_price: number;
    property_title: string;
    check_in: string;
    check_out: string;
    nights: number;
  } | null>>({});
  const [selectedMethods, setSelectedMethods] = useState<Record<string, string>>({});
  const [phones, setPhones] = useState<Record<string, string>>({});
  const [securityModalVisitId, setSecurityModalVisitId] = useState<string | null>(null);

  const reload = useCallback(
    () =>
      getMyVisitRequests()
        .then(setVisits)
        .catch(() => setVisits([])),
    []
  );

  useEffect(() => {
    setLoading(true);
    void reload().finally(() => setLoading(false));
  }, [reload]);

  useEffect(() => {
    const awaitingPayment = visits.filter((v) => v.status === "awaiting_payment");
    for (const v of awaitingPayment) {
      if (previews[v.id] !== undefined) continue;
      setPreviews((prev) => ({ ...prev, [v.id]: null }));
      previewReservationPayment(v.id)
        .then((data) => setPreviews((prev) => ({ ...prev, [v.id]: data })))
        .catch(() => setPreviews((prev) => ({ ...prev, [v.id]: null })));
    }
  }, [visits]);

  useRealtimeRefresh(reload);

  useEffect(() => {
    if (securityModalVisitId) return;
    const ready = visits.find(
      (v) => v.status === "awaiting_key" && Boolean(v.key_code) && !hasSeenSecurity(v.id)
    );
    if (ready) setSecurityModalVisitId(ready.id);
  }, [visits, securityModalVisitId]);

  const dismissSecurityModal = () => {
    if (securityModalVisitId) markSecuritySeen(securityModalVisitId);
    setSecurityModalVisitId(null);
  };

  const canCancel = (status: VisitRequest["status"]) =>
    status === "pending" ||
    status === "awaiting_agreement" ||
    status === "awaiting_host_agreement" ||
    status === "awaiting_key" ||
    status === "awaiting_payment";

  const isPaidStay = (status: VisitRequest["status"]) =>
    status === "payment_sent" || status === "confirmed";

  const cancelStay = async (visitId: string) => {
    if (!window.confirm(t("visits.cancelConfirm"))) return;
    setActingId(visitId);
    setError("");
    try {
      await updateVisitRequestStatus(visitId, "cancelled");
      await reload();
    } catch (e) {
      setError(actionErrorMessage(e, t("visits.cancelConfirm"), t("offline.queued")));
    } finally {
      setActingId(null);
    }
  };

  const canRequestExtension = (visit: VisitRequest) =>
    !visit.closed_at &&
    (visit.status === "confirmed" || visit.status === "payment_sent") &&
    (!visit.extension_status || visit.extension_status === "declined" || visit.extension_status === "confirmed");

  const minExtendDate = (visit: VisitRequest) => {
    if (!visit.check_out) return "";
    const d = new Date(`${visit.check_out.slice(0, 10)}T00:00:00`);
    d.setDate(d.getDate() + 1);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
  };

  const requestExtension = async (visit: VisitRequest) => {
    const next = extendDates[visit.id] || minExtendDate(visit);
    if (!next) return;
    setActingId(visit.id);
    setError("");
    try {
      await requestStayExtension(visit.id, next);
      await reload();
    } catch (e) {
      setError(actionErrorMessage(e, t("visits.extendCta"), t("offline.queued")));
    } finally {
      setActingId(null);
    }
  };

  const markExtensionPaid = async (visitId: string) => {
    setActingId(visitId);
    setError("");
    try {
      await markStayExtensionPaid(visitId);
      await reload();
    } catch (e) {
      setError(actionErrorMessage(e, t("payments.payFailed"), t("offline.queued")));
    } finally {
      setActingId(null);
    }
  };

  const payReservation = async (visitId: string) => {
    const method = selectedMethods[visitId];
    const visit = visits.find((item) => item.id === visitId);
    const phone = (phones[visitId] || (visit ? visitPhone(visit, user?.phone) : "")).trim();
    if (!method) {
      setError(t("payments.chooseOperatorFirst"));
      return;
    }
    if (!phone) {
      setError(t("payments.operatorPhoneRequired"));
      return;
    }
    setActingId(visitId);
    setError("");
    try {
      const payment = await startReservationPayment(visitId, method, phone);
      const url = typeof payment.checkout_url === "string" ? payment.checkout_url.trim() : "";
      if (url && url !== "null" && url !== "undefined") {
        window.location.assign(url);
        return;
      }
      setError(t("payments.payFailed"));
      await reload();
    } catch (e) {
      setError(actionErrorMessage(e, t("payments.payFailed"), t("offline.queued")));
    } finally {
      setActingId(null);
    }
  };

return (
    <>
    <div className="font-jakarta max-w-3xl mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">{t("visits.title")}</h1>
      <p className="text-muted-foreground text-sm mb-5">{t("visits.subtitle")}</p>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : visits.length === 0 ? (
        <p className="text-muted-foreground">{t("visits.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {visits.map((v) => (
            <li key={v.id}>
              <VisitRequestCard visit={v}>
                {v.status === "awaiting_host_agreement" && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm text-muted-foreground mb-3">{t("visits.agreementWaitingHost")}</p>
                  </div>
                )}
                {v.status === "awaiting_key" && (
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <p className="text-sm text-muted-foreground">{t("visits.keyHint")}</p>
                    <p className="text-3xl font-mono font-bold tracking-[0.35em] text-center text-foreground py-2">
                      {v.key_code || "------"}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("visits.keyWaitingHost")}</p>
                  </div>
                )}
                {v.status === "awaiting_payment" && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <PaymentOperatorPicker
                      selectedId={selectedMethods[v.id]}
                      onSelect={(id) => setSelectedMethods((prev) => ({ ...prev, [v.id]: id }))}
                      baseAmount={previews[v.id] ? Number(previews[v.id]!.stay_amount) : stayAmount(v)}
                    />
                    <label className="block space-y-1.5">
                      <span className="text-sm font-medium text-foreground">{t("payments.operatorPhone")}</span>
                      <PhoneInput
                        id={`pay-phone-${v.id}`}
                        value={phones[v.id] ?? visitPhone(v, user?.phone)}
                        onChange={(next) => setPhones((prev) => ({ ...prev, [v.id]: next }))}
                        required
                      />
                      <span className="block text-xs text-muted-foreground">{t("payments.operatorPhoneHint")}</span>
                    </label>
                    <Button
                      className="w-full rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id || !selectedMethods[v.id] || !(phones[v.id] ?? visitPhone(v, user?.phone)).trim()}
                      onClick={() => void payReservation(v.id)}
                    >
                      {actingId === v.id ? t("payments.paying") : t("payments.goToPayment")}
                    </Button>
                    <p className="text-sm text-muted-foreground">{t("payments.noOffPlatform")}</p>
                    <ReceiptUpload
                      visit={v}
                      actingId={actingId}
                      onUpload={async (file) => {
                        setActingId(v.id);
                        try {
                          await uploadVisitReceipt(v.id, file);
                          await reload();
                        } catch (e) {
                          setError(actionErrorMessage(e, t("payments.receiptFailed"), t("offline.queued")));
                        } finally {
                          setActingId(null);
                        }
                      }}
                    />
                  </div>
                )}
                {(v.status === "confirmed" || v.status === "payment_sent") && (
                  <ReceiptUpload
                    visit={v}
                    actingId={actingId}
                    onUpload={async (file) => {
                      setActingId(v.id);
                      try {
                        await uploadVisitReceipt(v.id, file);
                        await reload();
                      } catch (e) {
                        setError(actionErrorMessage(e, t("payments.receiptFailed"), t("offline.queued")));
                      } finally {
                        setActingId(null);
                      }
                    }}
                  />
                )}
                {v.overstay && !v.closed_at && (
                  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                    <p className="font-semibold">{t("visits.overstayTitle")}</p>
                    <p className="mt-1">{t("visits.overstayGuestHint")}</p>
                  </div>
                )}
                {v.closed_at && (
                  <p className="text-sm text-muted-foreground">{t("visits.stayClosed")}</p>
                )}
                {canRequestExtension(v) && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold">{t("visits.extendTitle")}</p>
                    <p className="text-xs text-muted-foreground">{t("visits.extendHint")}</p>
                    <label className="block text-sm">
                      <span className="text-muted-foreground">{t("visits.extendUntil")}</span>
                      <input
                        type="date"
                        className="mt-1 w-full rounded-xl border px-3 py-2"
                        min={minExtendDate(v)}
                        value={extendDates[v.id] || minExtendDate(v)}
                        onChange={(e) => setExtendDates((prev) => ({ ...prev, [v.id]: e.target.value }))}
                      />
                    </label>
                    <Button
                      className="w-full rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id}
                      onClick={() => void requestExtension(v)}
                    >
                      {actingId === v.id ? t("common.saving") : t("visits.extendCta")}
                    </Button>
                  </div>
                )}
                {v.extension_status === "awaiting_payment" && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold">
                      {t("visits.extendAmount")}: {formatPrice(Number(v.extension_amount ?? 0))}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("visits.extendPayHint")}</p>
                    <Button
                      className="w-full rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id}
                      onClick={() => void markExtensionPaid(v.id)}
                    >
                      {actingId === v.id ? t("common.saving") : t("visits.iPaidExtension")}
                    </Button>
                  </div>
                )}
                {isPaidStay(v.status) && (
                  <p className="text-xs text-muted-foreground pt-2">{t("visits.cancelPaidHint")}</p>
                )}
                {canCancel(v.status) && (
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      disabled={actingId === v.id}
                      onClick={() => void cancelStay(v.id)}
                    >
                      {actingId === v.id ? t("common.saving") : t("visits.cancelCta")}
                    </Button>
                  </div>
                )}
              </VisitRequestCard>
            </li>
          ))}
        </ul>
        )}
      </div>
    {securityModalVisitId && <SecurityWarningModal onDismiss={dismissSecurityModal} />}
    </>
);
}

function SecurityWarningModal({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation();
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef(0);
  const lastY = useRef(0);
  const lastAt = useRef(0);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDismiss]);

  const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDesktop() || (event.target as HTMLElement).closest("button")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    startY.current = event.clientY;
    lastY.current = event.clientY;
    lastAt.current = Date.now();
    setDragging(true);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    lastY.current = event.clientY;
    lastAt.current = Date.now();
    setOffset(Math.max(0, event.clientY - startY.current));
  };

  const endDrag = () => {
    if (!dragging) return;
    const velocity = (lastY.current - startY.current) / Math.max(1, Date.now() - lastAt.current);
    const shouldClose = offset > 90 || velocity > 0.6;
    setDragging(false);
    if (shouldClose) {
      onDismiss();
      return;
    }
    setOffset(0);
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end justify-center p-0 md:items-center md:p-4"
      style={{ backgroundColor: `rgba(0,0,0,${0.5 * (1 - Math.min(offset / 280, 0.75))})` }}
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="w-full max-w-md space-y-4 border border-amber-300 bg-amber-50 p-6 text-amber-950 shadow-lg touch-none select-none rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))] md:touch-auto md:select-auto md:rounded-2xl md:pb-6 md:animate-in md:fade-in-0 md:zoom-in-95"
        style={{
          transform: `translateY(${offset}px)`,
          transition: dragging ? "none" : "transform 200ms ease",
        }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="security-sheet-title"
      >
        <div className="flex cursor-grab justify-center active:cursor-grabbing md:hidden">
          <div className="h-1.5 w-10 rounded-full bg-amber-400/80" />
        </div>
        <div className="flex flex-col items-center text-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-800" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">{t("visits.securityWarning")}</p>
            <h2 id="security-sheet-title" className="text-lg font-bold text-amber-950">
              {t("visits.securityTitle")}
            </h2>
          </div>
        </div>
        <div className="space-y-3 text-sm text-center">
          <p>{t("visits.securityMessage1")}</p>
          <p className="font-semibold">{t("visits.securityMessage2")}</p>
          <p>{t("visits.securityMessage3")}</p>
        </div>
        <Button
          className="w-full rounded-full bg-amber-600 text-white hover:bg-amber-700"
          onClick={onDismiss}
        >
          {t("visits.gotIt")}
        </Button>
      </div>
    </div>
  );
}

function ReceiptUpload({
  visit,
  actingId,
  onUpload,
}: {
  visit: VisitRequest;
  actingId: string | null;
  onUpload: (file: File) => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <p className="text-sm font-semibold">{t("payments.receiptTitle")}</p>
      <p className="text-xs text-muted-foreground">{t("payments.receiptHint")}</p>
      {visit.payment_receipt_url ? (
        <p className="text-xs text-brand font-medium">{t("payments.receiptUploaded")}</p>
      ) : null}
      <input
        type="file"
        accept="image/*,.pdf,application/pdf"
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-brand file:px-4 file:py-2 file:text-white"
        disabled={actingId === visit.id}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onUpload(file);
        }}
      />
    </div>
  );
}
