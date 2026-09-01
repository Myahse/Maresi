import { useTranslation } from "react-i18next";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export function OfflineBanner() {
  const { t } = useTranslation();
  const { online, pending } = useNetworkStatus();
  if (online && pending === 0) return null;

  return (
    <div className="bg-amber-100 text-amber-950 text-sm px-4 py-2 text-center border-b border-amber-200">
      {!online
        ? t("offline.banner")
        : t("offline.back", { count: pending })}
    </div>
  );
}
