import { Check, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { VisitMessage } from "@/types";

export function MessageReceipt({ message }: { message: VisitMessage }) {
  const { t } = useTranslation();
  const seen = Boolean(message.read_at);
  const delivered = seen || Boolean(message.delivered_at);
  const label = seen
    ? t("visits.chatReceiptSeen")
    : delivered
      ? t("visits.chatReceiptDelivered")
      : t("visits.chatReceiptSent");
  const Icon = delivered ? CheckCheck : Check;
  return (
    <span
      className="ml-1 inline-flex translate-y-px"
      title={label}
      aria-label={label}
    >
      <Icon className={seen ? "h-3.5 w-3.5 text-[#53bdeb]" : "h-3.5 w-3.5 text-[#667781]"} />
    </span>
  );
}
