import type { CurrencyCode } from "@/types";

export const BASE_CURRENCY: CurrencyCode = "XOF";

/** Static display rates — base amount is stored in XOF */
export const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  XOF: 1,
  EUR: 1 / 655.957,
  USD: 1 / 600,
};

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "XOF", label: "CFA Franc (XOF)", symbol: "CFA" },
  { code: "EUR", label: "Euro (EUR)", symbol: "€" },
  { code: "USD", label: "US Dollar (USD)", symbol: "$" },
];
