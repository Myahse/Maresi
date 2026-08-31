import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getMyVisitRequests, updateVisitRequestStatus } from "@/services/api";
import { VisitRequestCard } from "@/components/visit/VisitRequestCard";
import { Button } from "@/components/ui/button";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { useRealtimeRefresh } from "@/hooks/useRealtimeRefresh";
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
      setError(e instanceof Error ? e.message : t("visits.cancelConfirm"));
    } finally {
      setActingId(null);
    }
  };

  const markPaid = async (visitId: string) => {
    setActingId(visitId);
    setError("");
    try {
      await updateVisitRequestStatus(visitId, "payment_sent");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("payments.payFailed"));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="font-jakarta max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-foreground mb-2">{t("visits.title")}</h1>
      <p className="text-muted-foreground text-sm mb-6">{t("visits.subtitle")}</p>
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
                    <p className="text-xs text-muted-foreground">{t("payments.payHostHint")}</p>
                    {v.wave_payment_url && (
                      <Button asChild className="w-full rounded-full bg-brand hover:bg-brand-dark">
                        <a href={v.wave_payment_url} target="_blank" rel="noreferrer">
                          {t("payments.payWave")}
                        </a>
                      </Button>
                    )}
                    {v.orange_money_url && (
                      <Button asChild variant="outline" className="w-full rounded-full">
                        <a href={v.orange_money_url} target="_blank" rel="noreferrer">
                          {t("payments.payOrange")}
                        </a>
                      </Button>
                    )}
                    {v.owner_phone && (
                      <Button asChild variant="outline" className="w-full rounded-full">
                        <a href={`tel:${v.owner_phone}`}>{t("payments.callHost")}</a>
                      </Button>
                    )}
                    <Button
                      className="w-full rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id}
                      onClick={() => void markPaid(v.id)}
                    >
                      {actingId === v.id ? t("common.saving") : t("payments.iPaidHost")}
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
