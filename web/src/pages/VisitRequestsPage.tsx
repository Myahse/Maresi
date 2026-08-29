import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyVisitRequests, updateVisitRequestStatus } from "@/services/api";
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t("visits.title")}</h1>
      <p className="text-gray-600 text-sm mb-6">{t("visits.subtitle")}</p>
      {error && <p className="text-sm text-destructive mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : visits.length === 0 ? (
        <p className="text-gray-500">{t("visits.empty")}</p>
      ) : (
        <ul className="space-y-4">
          {visits.map((v) => (
            <li key={v.id}>
              <VisitRequestCard visit={v}>
                {v.status === "awaiting_payment" && (
                  <div className="space-y-3 pt-2 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {t("payments.payHostAmount")}: {formatPrice(stayAmount(v))}
                    </p>
                    <p className="text-xs text-gray-600">{t("payments.payHostHint")}</p>
                    <div className="flex flex-col gap-2">
                      {v.wave_payment_url && (
                        <Button asChild className="rounded-full bg-brand hover:bg-brand-dark">
                          <a href={v.wave_payment_url} target="_blank" rel="noreferrer">
                            {t("payments.payWave")}
                          </a>
                        </Button>
                      )}
                      {v.orange_money_url && (
                        <Button asChild variant="outline" className="rounded-full">
                          <a href={v.orange_money_url} target="_blank" rel="noreferrer">
                            {t("payments.payOrange")}
                          </a>
                        </Button>
                      )}
                      {!v.wave_payment_url && !v.orange_money_url && v.owner_phone && (
                        <a href={`tel:${v.owner_phone}`} className="text-sm text-brand hover:underline">
                          {t("payments.callHost")}: {v.owner_phone}
                        </a>
                      )}
                      <Button
                        className="w-full rounded-full"
                        variant="outline"
                        disabled={actingId === v.id}
                        onClick={() => void markPaid(v.id)}
                      >
                        {actingId === v.id ? t("common.saving") : t("payments.iPaidHost")}
                      </Button>
                    </div>
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
