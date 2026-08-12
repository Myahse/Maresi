import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { CurrencyCode } from "@/types";
import { BASE_CURRENCY, CURRENCIES, EXCHANGE_RATES } from "@/constants/currencies";

const STORAGE_KEY = "maresi-currency";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  currencies: typeof CURRENCIES;
  formatPrice: (amountInBase: number) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as CurrencyCode | null;
    return stored && EXCHANGE_RATES[stored] ? stored : BASE_CURRENCY;
  });

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    localStorage.setItem(STORAGE_KEY, code);
    window.dispatchEvent(new CustomEvent("currencyChange", { detail: code }));
  }, []);

  const formatPrice = useCallback(
    (amountInBase: number) => {
      const converted = amountInBase * EXCHANGE_RATES[currency];
      return new Intl.NumberFormat(currency === "XOF" ? "fr-FR" : "en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: currency === "XOF" ? 0 : 2,
      }).format(converted);
    },
    [currency]
  );

  const value = useMemo(
    () => ({ currency, setCurrency, currencies: CURRENCIES, formatPrice }),
    [currency, setCurrency, formatPrice]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error("useCurrency must be used within CurrencyProvider");
  return ctx;
}

/** Re-render when currency changes outside React context consumers */
export function usePriceFormatter() {
  const { formatPrice, currency } = useCurrency();
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick((n) => n + 1);
    window.addEventListener("currencyChange", handler);
    return () => window.removeEventListener("currencyChange", handler);
  }, []);
  return { formatPrice, currency };
}
