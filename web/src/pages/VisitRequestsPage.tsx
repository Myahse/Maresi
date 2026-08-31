import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyVisitRequests, startReservationPayment, updateVisitRequestStatus } from "@/services/api";
import { VisitRequestCard } from "@/components/visit/VisitRequestCard";
import { Button } from "@/components/ui/button";
import { usePriceFormatter } from "@/context/CurrencyContext";
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

  const reload = () =>
    getMyVisitRequests()
      .then(setVisits)
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const canCancel = (status: VisitRequest["status"]) =>
    status === "pending" ||
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

  const payStay = async (visitId: string) => {
    setActingId(visitId);
    setError("");
    try {
      const payment = await startReservationPayment(visitId);
      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }
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
                {v.status === "awaiting_payment" && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold text-foreground">
                      {t("payments.payHostAmount")}: {formatPrice(stayAmount(v))}
                    </p>
                    <p className="text-xs text-muted-foreground">{t("payments.payMaresiHint")}</p>
                    <Button
                      className="w-full rounded-full bg-brand hover:bg-brand-dark"
                      disabled={actingId === v.id}
                      onClick={() => void payStay(v.id)}
                    >
                      {actingId === v.id ? t("common.saving") : t("payments.payReservation")}
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
