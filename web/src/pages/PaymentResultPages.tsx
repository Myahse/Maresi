import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

export function PaymentSuccessPage() {
  const { t } = useTranslation();
  return (
    <div className="font-jakarta max-w-lg mx-auto px-4 py-16 text-center space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">{t("payments.successTitle")}</h1>
      <p className="text-gray-600 text-sm">{t("payments.successText")}</p>
      <div className="flex flex-wrap justify-center gap-3 pt-4">
        <Button asChild className="rounded-full bg-brand hover:bg-brand-dark">
          <Link to="/visits">{t("visits.viewMine")}</Link>
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
      <h1 className="text-2xl font-bold text-gray-900">{t("payments.errorTitle")}</h1>
      <p className="text-gray-600 text-sm">{t("payments.errorText")}</p>
      <Button asChild className="rounded-full bg-brand hover:bg-brand-dark">
        <Link to="/visits">{t("visits.viewMine")}</Link>
      </Button>
    </div>
  );
}
