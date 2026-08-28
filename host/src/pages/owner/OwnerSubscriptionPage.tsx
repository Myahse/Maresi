import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getMySubscription, startSubscriptionPayment } from "@/services/api";
import { usePriceFormatter } from "@/context/CurrencyContext";
import type { OwnerSubscription } from "@/types";

export function OwnerSubscriptionPage() {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const [sub, setSub] = useState<OwnerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMySubscription()
      .then(setSub)
      .catch((e) => setError(e instanceof Error ? e.message : t("payments.loadFailed")))
      .finally(() => setLoading(false));
  }, [t]);

  const handlePay = async () => {
    setPaying(true);
    setError("");
    try {
      const payment = await startSubscriptionPayment();
      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }
      setSub(await getMySubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("payments.payFailed"));
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="font-jakarta max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("payments.subscriptionTitle")}</h1>
        <p className="text-sm text-gray-600 mt-1">{t("payments.subscriptionHint")}</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-4">
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500">{t("payments.status")}</span>
            <span className="font-semibold">
              {sub?.active ? t("payments.active") : t("payments.inactive")}
            </span>
          </div>
          <div className="flex justify-between gap-4 text-sm">
            <span className="text-gray-500">{t("payments.price")}</span>
            <span className="font-semibold text-brand">
              {formatPrice(sub?.price_fcfa ?? 10000)} / {t("payments.month")}
            </span>
          </div>
          {sub?.expires_at && (
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-gray-500">{t("payments.expires")}</span>
              <span className="font-semibold">{new Date(sub.expires_at).toLocaleDateString()}</span>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            className="w-full rounded-full bg-brand hover:bg-brand-dark"
            disabled={paying || !!sub?.active}
            onClick={handlePay}
          >
            {paying
              ? t("common.saving")
              : sub?.active
                ? t("payments.alreadyActive")
                : t("payments.subscribeCta")}
          </Button>
          <Button asChild variant="outline" className="w-full rounded-full">
            <Link to="/owner">{t("owner.title")}</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
