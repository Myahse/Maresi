import { useTranslation } from "react-i18next";
import { useCurrency } from "@/context/CurrencyContext";
import type { CurrencyCode } from "@/types";
import { cn } from "@/lib/utils";

interface CurrencyPickerProps {
  className?: string;
  inverted?: boolean;
}

export function CurrencyPicker({ className, inverted }: CurrencyPickerProps) {
  const { t } = useTranslation();
  const { currency, setCurrency, currencies } = useCurrency();

  return (
    <select
      aria-label={t("currency.label")}
      value={currency}
      onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
      className={cn(
        "text-xs sm:text-sm font-semibold rounded-full border px-2 py-1.5 cursor-pointer outline-none focus:ring-2 focus:ring-brand/40",
        inverted
          ? "border-white/40 bg-white/20 text-white [&>option]:text-gray-900 [&>option]:bg-white"
          : "border-border bg-background text-foreground",
        className
      )}
    >
      {currencies.map((c) => (
        <option key={c.code} value={c.code}>
          {c.symbol} {c.code}
        </option>
      ))}
    </select>
  );
}
