import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  getMySubscription,
  startCommissionSettlement,
  startSubscriptionPayment,
  startWalletPayout,
  startWalletTopup,
} from "@/services/api";
import { usePriceFormatter } from "@/context/CurrencyContext";
import type { OwnerSubscription, WalletLedgerEntry } from "@/types";

const TOPUP_AMOUNTS = [5000, 10000, 25000, 50000];

function ledgerLabel(t: (key: string) => string, entry: WalletLedgerEntry) {
  if (entry.entry_type === "topup") return t("payments.ledgerTopup");
  if (entry.entry_type === "commission") return t("payments.ledgerCommission");
  if (entry.entry_type === "stay") return t("payments.ledgerStay");
  if (entry.entry_type === "payout") return t("payments.ledgerPayout");
  return t("payments.ledgerSubscription");
}

export function OwnerSubscriptionPage() {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const [sub, setSub] = useState<OwnerSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [settling, setSettling] = useState(false);
  const [topping, setTopping] = useState<number | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutProvider, setPayoutProvider] = useState<"wave" | "orange_money">("wave");
  const [payoutBusy, setPayoutBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  const handleSettle = async () => {
    setSettling(true);
    setError("");
    try {
      const payment = await startCommissionSettlement();
      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }
      setSub(await getMySubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("payments.payFailed"));
    } finally {
      setSettling(false);
    }
  };

  const handlePayout = async () => {
    const amount = Number(payoutAmount);
    if (!amount || amount < 200) {
      setError(t("payments.payoutMin"));
      return;
    }
    if (!payoutPhone.trim()) {
      setError(t("payments.payoutPhoneRequired"));
      return;
    }
    setPayoutBusy(true);
    setError("");
    setNotice("");
    try {
      await startWalletPayout({
        amount,
        provider: payoutProvider,
        phone: payoutPhone.trim(),
      });
      setPayoutAmount("");
      setNotice(t("payments.payoutRequested"));
      setSub(await getMySubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("payments.payFailed"));
    } finally {
      setPayoutBusy(false);
    }
  };

  const handleTopup = async (amount: number) => {
    setTopping(amount);
    setError("");
    try {
      const payment = await startWalletTopup(amount);
      if (payment.checkout_url) {
        window.location.href = payment.checkout_url;
        return;
      }
      setSub(await getMySubscription());
    } catch (e) {
      setError(e instanceof Error ? e.message : t("payments.payFailed"));
    } finally {
      setTopping(null);
    }
  };

  const due = Number(sub?.commission_due ?? 0);
  const balance = Number(sub?.wallet_balance ?? 0);
  const price = Number(sub?.price_fcfa ?? 10000);
  const canPayFromWallet = !sub?.active && balance >= price;
  const ledger = Array.isArray(sub?.wallet_ledger) ? sub.wallet_ledger : [];

  return (
    <div className="font-jakarta max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{t("payments.subscriptionTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("payments.subscriptionHint")}</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : (
        <>
          <div className="rounded-2xl border-2 border-brand/20 bg-card p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("payments.walletTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("payments.walletHint")}</p>
            </div>
            <div className="flex justify-between gap-4 items-end">
              <span className="text-sm text-muted-foreground">{t("payments.walletBalance")}</span>
              <span className="text-2xl font-bold text-brand">{formatPrice(balance)}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TOPUP_AMOUNTS.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  className="rounded-full"
                  disabled={topping !== null}
                  onClick={() => void handleTopup(amount)}
                >
                  {topping === amount ? t("common.saving") : `${t("payments.walletTopup")} ${formatPrice(amount)}`}
                </Button>
              ))}
            </div>
            <div className="rounded-xl border border-border p-3 space-y-3">
              <p className="text-sm font-semibold text-foreground">{t("payments.payoutTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("payments.payoutHint")}</p>
              <input
                type="number"
                min={200}
                className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                placeholder={t("payments.payoutAmount")}
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
              />
              <input
                type="tel"
                className="w-full rounded-xl border border-input px-3 py-2 text-sm"
                placeholder={t("payments.payoutPhone")}
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={payoutProvider === "wave" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setPayoutProvider("wave")}
                >
                  Wave
                </Button>
                <Button
                  type="button"
                  variant={payoutProvider === "orange_money" ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setPayoutProvider("orange_money")}
                >
                  Orange Money
                </Button>
              </div>
              <Button
                className="w-full rounded-full bg-brand hover:bg-brand-dark"
                disabled={payoutBusy || balance < 200}
                onClick={() => void handlePayout()}
              >
                {payoutBusy ? t("common.saving") : t("payments.payoutCta")}
              </Button>
              {notice && <p className="text-sm text-emerald-700">{notice}</p>}
            </div>
          </div>

          <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-4">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t("payments.status")}</span>
              <span className="font-semibold">
                {sub?.active ? t("payments.active") : t("payments.inactive")}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t("payments.price")}</span>
              <span className="font-semibold text-brand">
                {formatPrice(price)} / {t("payments.month")}
              </span>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-muted-foreground">{t("payments.freeListings")}</span>
              <span className="font-semibold">
                {t("payments.freeListingsValue", {
                  left: sub?.free_listings_left ?? 0,
                  limit: sub?.free_listings_limit ?? 3,
                  count: sub?.listings_count ?? 0,
                })}
              </span>
            </div>
            {sub?.active ? (
              <p className="text-sm font-medium text-brand">{t("payments.premiumOn")}</p>
            ) : (
              <p className="text-sm text-muted-foreground">{t("payments.premiumOff")}</p>
            )}
            {sub?.expires_at && (
              <div className="flex justify-between gap-4 text-sm">
                <span className="text-muted-foreground">{t("payments.expires")}</span>
                <span className="font-semibold">{new Date(sub.expires_at).toLocaleDateString()}</span>
              </div>
            )}
            {due > 0 && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-2">
                <div className="flex justify-between gap-4 text-sm">
                  <span className="text-foreground">{t("payments.commissionDue")}</span>
                  <span className="font-semibold text-amber-800">{formatPrice(due)}</span>
                </div>
                <Button
                  className="w-full rounded-full bg-brand hover:bg-brand-dark"
                  disabled={settling}
                  onClick={() => void handleSettle()}
                >
                  {settling ? t("common.saving") : t("payments.settleCommission")}
                </Button>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full rounded-full bg-brand hover:bg-brand-dark"
              disabled={paying || !!sub?.active}
              onClick={() => void handlePay()}
            >
              {paying
                ? t("common.saving")
                : sub?.active
                  ? t("payments.alreadyActive")
                  : canPayFromWallet
                    ? t("payments.subscribeWalletCta")
                    : t("payments.subscribeCta")}
            </Button>
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/owner">{t("owner.title")}</Link>
            </Button>
          </div>

          <div className="rounded-2xl border-2 border-border bg-card p-6 space-y-3">
            <h2 className="text-lg font-semibold text-foreground">{t("payments.ledgerTitle")}</h2>
            {ledger.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("payments.ledgerEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {ledger.map((entry) => (
                  <li key={entry.id} className="flex justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{ledgerLabel(t, entry)}</p>
                      {entry.created_at && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <span
                      className={
                        entry.direction === "credit"
                          ? "font-semibold text-emerald-700"
                          : "font-semibold text-foreground"
                      }
                    >
                      {entry.direction === "credit" ? "+" : "−"}
                      {formatPrice(Number(entry.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
