import { useTranslation } from "react-i18next";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { PAYMENT_METHODS, calculateTotalAmount } from "@/lib/paymentMethods";
import { getPaymentMethodLogo } from "@/components/payment/PaymentMethodLogos";
import { cn } from "@/lib/utils";

export function PaymentOperatorPicker({
  selectedId,
  onSelect,
  baseAmount,
}: {
  selectedId?: string;
  onSelect: (id: string) => void;
  baseAmount: number;
}) {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const selected = PAYMENT_METHODS.find((method) => method.id === selectedId);
  const breakdown = selected ? calculateTotalAmount(baseAmount, selected, true) : null;

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{t("payments.selectMethod")}</p>
        <p className="text-xs text-muted-foreground">{t("payments.selectMethodHint")}</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PAYMENT_METHODS.map((method) => {
          const Logo = getPaymentMethodLogo(method.id);
          const active = selectedId === method.id;
          return (
            <button
              key={method.id}
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left transition-all",
                active ? "border-brand bg-brand/5" : "border-border hover:border-brand/50"
              )}
              onClick={() => onSelect(method.id)}
            >
              <Logo className="h-8 w-8 shrink-0" />
              <span className="min-w-0">
                <span className="block text-sm font-medium text-foreground">{method.name}</span>
                <span className="block text-xs text-muted-foreground">{method.operatorFeePercent}%</span>
              </span>
            </button>
          );
        })}
      </div>
      {breakdown ? (
        <div className="space-y-1.5 rounded-lg bg-muted/50 p-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("payments.stayAmount")}</span>
            <span className="font-medium">{formatPrice(baseAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("payments.operatorFee")}</span>
            <span className="font-medium">{formatPrice(breakdown.operatorFee)}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-sm font-semibold">
            <span>{t("payments.totalToPay")}</span>
            <span className="text-brand">{formatPrice(breakdown.total)}</span>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("payments.chooseOperatorFirst")}</p>
      )}
    </div>
  );
}
