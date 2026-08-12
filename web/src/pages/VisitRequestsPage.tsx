import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getMyVisitRequests, startReservationPayment } from "@/services/api";
import { VisitRequestCard } from "@/components/visit/VisitRequestCard";
import { Button } from "@/components/ui/button";
import type { VisitRequest } from "@/types";

export function VisitRequestsPage() {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const reload = () =>
    getMyVisitRequests()
      .then(setVisits)
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));

  useEffect(() => {
    reload();
  }, []);

  const handlePay = async (visitId: string) => {
    setPayingId(visitId);
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
      setPayingId(null);
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
                  <Button
                    className="w-full rounded-full bg-brand hover:bg-brand-dark"
                    disabled={payingId === v.id}
                    onClick={() => handlePay(v.id)}
                  >
                    {payingId === v.id ? t("common.saving") : t("payments.payReservation")}
                  </Button>
                )}
              </VisitRequestCard>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
