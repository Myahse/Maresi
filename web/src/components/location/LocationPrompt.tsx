import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/context/LocationContext";

export function LocationPrompt() {
  const { t } = useTranslation();
  const { promptVisible, requestAccess, dismissPrompt, supported, status } = useUserLocation();

  if (!supported || !promptVisible || status === "granted" || status === "denied") return null;

  return (
    <div className="fixed left-4 right-4 z-[70] above-mobile-nav md:left-auto md:right-4 md:w-96 rounded-2xl border bg-card p-4 shadow-lg">
      <p className="font-semibold text-foreground">{t("location.title")}</p>
      <p className="text-sm text-muted-foreground mt-1">{t("location.body")}</p>
      <div className="flex gap-2 mt-3">
        <Button
          className="rounded-full bg-brand hover:bg-brand-dark"
          disabled={status === "requesting"}
          onClick={requestAccess}
        >
          {status === "requesting" ? t("common.loading") : t("location.enable")}
        </Button>
        <Button variant="outline" className="rounded-full" onClick={dismissPrompt}>
          {t("location.later")}
        </Button>
      </div>
    </div>
  );
}
