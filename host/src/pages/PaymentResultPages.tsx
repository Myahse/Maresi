import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { confirmPayment } from "@/services/api";

export function PaymentSuccessPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("ref") || "";
  const [phase, setPhase] = useState<"idle" | "loading" | "ok" | "pending" | "fail">(
    reference ? "loading" : "ok"
  );
  const [detail, setDetail] = useState("");

  useEffect(() => {
    if (!reference) return;
    let cancelled = false;
    confirmPayment(reference)
      .then((payment) => {
        if (cancelled) return;
        const status = String(payment.status || "").toLowerCase();
        if (status === "completed") setPhase("ok");
        else if (status === "failed") setPhase("fail");
        else setPhase("pending");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setPhase("fail");
        setDetail(err instanceof Error ? err.message : "");
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);

  const title =
    phase === "fail"
      ? t("payments.errorTitle")
      : phase === "pending"
        ? t("payments.pendingTitle")
        : t("payments.successTitle");
  const text =
    phase === "loading"
      ? t("payments.confirming")
      : phase === "fail"
        ? detail || t("payments.errorText")
        : phase === "pending"
          ? t("payments.pendingText")
          : t("payments.successText");

  return (
    <div className="font-jakarta max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{title}</h1>
      <p className="text-muted-foreground text-sm">{text}</p>
      {reference ? (
        <p className="text-xs text-gray-400 font-mono break-all">{reference}</p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3 pt-4">
        <Button asChild className="rounded-full bg-brand hover:bg-brand-dark">
          <Link to="/owner/visits">{t("visits.viewMine")}</Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/owner/subscription">{t("payments.viewSubscription")}</Link>
        </Button>
      </div>
    </div>
  );
}

export function PaymentErrorPage() {
  const { t } = useTranslation();
  return (
    <div className="font-jakarta max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold text-foreground">{t("payments.errorTitle")}</h1>
      <p className="text-muted-foreground text-sm">{t("payments.errorText")}</p>
      <Button asChild className="rounded-full bg-brand hover:bg-brand-dark">
        <Link to="/owner/visits">{t("visits.viewMine")}</Link>
      </Button>
    </div>
  );
}
