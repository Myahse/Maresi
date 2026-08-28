import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAdminOverview } from "@/services/api";
import type { AdminOverview } from "@/types";

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAdminOverview()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : t("admin.empty")))
      .finally(() => setLoading(false));
  }, [t]);

  const cards: { key: keyof AdminOverview; to: string; label: string }[] = [
    { key: "users", to: "/users", label: t("admin.navUsers") },
    { key: "owners", to: "/users", label: t("admin.owners") },
    { key: "subscriptions_active", to: "/subscriptions", label: t("admin.navSubscriptions") },
    { key: "payments_completed", to: "/payments", label: t("admin.paymentsDone") },
    { key: "payments_pending", to: "/payments", label: t("admin.paymentsPending") },
    { key: "host_applications_pending", to: "/applications", label: t("admin.navApplications") },
  ];

  return (
    <div className="font-jakarta max-w-5xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold">{t("admin.overviewTitle")}</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading || !data ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {t("admin.revenue")}: {Number(data.revenue_completed).toLocaleString()} XOF
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((c) => (
              <Link
                key={c.key}
                to={c.to}
                className="rounded-2xl border bg-white p-4 hover:border-brand"
              >
                <div className="text-sm text-gray-600">{c.label}</div>
                <div className="text-2xl font-bold mt-1">{data[c.key]}</div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
