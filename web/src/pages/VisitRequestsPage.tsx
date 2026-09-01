import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  getMyVisitRequests,
  markStayExtensionPaid,
  requestStayExtension,
  startReservationPayment,
  updateVisitRequestStatus,
} from "@/services/api";
import { VisitRequestCard } from "@/components/visit/VisitRequestCard";
import { Button } from "@/components/ui/button";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
import { actionErrorMessage } from "@/lib/offline";
import type { VisitRequest } from "@/types";

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
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [extendDates, setExtendDates] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

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

  useRealtimeRefresh(reload);

  const canCancel = (status: VisitRequest["status"]) =>
    status === "pending" ||
    status === "awaiting_agreement" ||
    status === "awaiting_key" ||
    status === "awaiting_payment" ||
    status === "payment_sent" ||
    status === "confirmed";

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
    setActingId(visitId);
    setError("");
    try {
      const payment = await startReservationPayment(visitId);
      if (payment.checkout_url) {
        window.location.assign(payment.checkout_url);
        return;
      }
      setError(t("payments.payFailed"));
    } catch (e) {
      setError(actionErrorMessage(e, t("payments.payFailed"), t("offline.queued")));
    } finally {
      setActingId(null);
    }
  };

  return (
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
                {v.status === "awaiting_agreement" && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm text-muted-foreground mb-3">{t("visits.agreementOpenHint")}</p>
                    <Button asChild className="w-full rounded-full bg-brand hover:bg-brand-dark">
                      <Link to={`/visits/${v.id}/agreement`}>{t("visits.agreementOpen")}</Link>
                    </Button>
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
                    <p className="text-sm font-semibold text-foreground">
                      {t("payments.payHostAmount")}: {formatPrice(stayAmount(v))}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("payments.payMaresiHint")}</p>
                    <Button
                      className="w-full rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id}
                      onClick={() => void payReservation(v.id)}
                    >
                      {actingId === v.id ? t("payments.paying") : t("payments.payReservation")}
                    </Button>
                  </div>
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
                {canCancel(v.status) && (
                  <div className="pt-2">
                    {(v.status === "confirmed" || v.status === "payment_sent") && (
                      <p className="text-xs text-muted-foreground mb-2">{t("visits.cancelPaidHint")}</p>
                    )}
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
  );
}
