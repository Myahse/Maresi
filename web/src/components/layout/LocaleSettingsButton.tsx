import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { useCurrency } from "@/context/CurrencyContext";
import type { CurrencyCode } from "@/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface LocaleSettingsButtonProps {
  inverted?: boolean;
  className?: string;
}

export function LocaleSettingsButton({ inverted, className }: LocaleSettingsButtonProps) {
  const { t, i18n } = useTranslation();
  const { currency, setCurrency, currencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const lang = i18n.language.startsWith("fr") ? "fr" : "en";
  const current = currencies.find((c) => c.code === currency);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs sm:text-sm font-semibold shrink-0",
          inverted
            ? "border-white/40 bg-white/20 text-white hover:bg-white/25"
            : "border-border bg-background text-foreground hover:bg-muted",
          className
        )}
        aria-label={t("localeSettings.open")}
        title={t("localeSettings.open")}
      >
        <Globe className="h-4 w-4 shrink-0" />
        <span>
          {lang.toUpperCase()} · {current?.symbol ?? currency}
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("localeSettings.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t("language.label")}</p>
              <div className="grid grid-cols-2 gap-2">
                {(["fr", "en"] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => void i18n.changeLanguage(code)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm font-semibold",
                      lang === code
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    {t(`language.${code}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{t("currency.label")}</p>
              <div className="grid grid-cols-3 gap-2">
                {currencies.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setCurrency(c.code as CurrencyCode)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-sm font-semibold",
                      currency === c.code
                        ? "border-brand bg-brand text-white"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    )}
                  >
                    {c.symbol} {c.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
