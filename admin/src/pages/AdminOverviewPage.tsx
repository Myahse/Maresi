import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAdminActivity, getAdminOverview, getAdminPayments, getAdminVisits } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import type { AdminActivity, AdminOverview, Payment, RealtimeEvent, VisitRequest } from "@/types";

export function AdminOverviewPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<AdminOverview | null>(null);
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [live, setLive] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError("");
    try {
      const [overview, visitList, payList, actList] = await Promise.all([
        getAdminOverview(),
        getAdminVisits(),
        getAdminPayments(),
        getAdminActivity(),
      ]);
      setData(overview);
      setVisits(Array.isArray(visitList) ? visitList : []);
      setPayments(Array.isArray(payList) ? payList : []);
      setActivity(Array.isArray(actList) ? actList : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      setLive((prev) => [`${event.type} · ${event.at ?? ""}`, ...prev].slice(0, 30));
      void load();
    },
    [load]
  );

  useRealtime(isAuthenticated && user?.role === "admin", onEvent, ["/topic/admin"]);

  const cards: { key: keyof AdminOverview; to: string; label: string }[] = [
    { key: "users", to: "/users", label: t("admin.navUsers") },
    { key: "owners", to: "/users", label: t("admin.owners") },
    { key: "properties", to: "/visits", label: t("admin.properties") },
    { key: "visits", to: "/visits", label: t("admin.navVisits") },
    { key: "visits_pending", to: "/visits", label: t("admin.visitsPending") },
    { key: "visits_awaiting_key", to: "/visits", label: t("admin.visitsKey") },
    { key: "visits_awaiting_payment", to: "/visits", label: t("admin.visitsPay") },
    { key: "visits_confirmed", to: "/visits", label: t("admin.visitsConfirmed") },
    { key: "payments_completed", to: "/payments", label: t("admin.paymentsDone") },
    { key: "payments_pending", to: "/payments", label: t("admin.paymentsPending") },
    { key: "subscriptions_active", to: "/subscriptions", label: t("admin.navSubscriptions") },
    { key: "host_applications_pending", to: "/applications", label: t("admin.navApplications") },
  ];

  return (
    <div className="font-jakarta max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">{t("admin.overviewTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("admin.liveHint")}</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading || !data ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          <p className="text-sm text-gray-600">
            {t("admin.revenue")}: {Number(data.revenue_completed).toLocaleString()} XOF
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((c) => (
              <Link key={c.key} to={c.to} className="rounded-2xl border bg-card p-4 hover:border-brand">
                <div className="text-sm text-gray-600">{c.label}</div>
                <div className="text-2xl font-bold mt-1">{data[c.key] ?? 0}</div>
              </Link>
            ))}
          </div>

          <section className="space-y-3">
            <h2 className="font-semibold">{t("admin.live")}</h2>
            <ul className="rounded-2xl border bg-card divide-y text-sm max-h-56 overflow-auto">
              {live.length === 0 && activity.length === 0 ? (
                <li className="p-3 text-muted-foreground">{t("admin.liveEmpty")}</li>
              ) : (
                (live.length > 0 ? live.map((line) => ({ id: line, summary: line, created_at: "" })) : activity)
                  .slice(0, 20)
                  .map((row, idx) => (
                    <li key={"id" in row ? String(row.id) : idx} className="p-3">
                      {"summary" in row ? row.summary : String(row)}
                      {"created_at" in row && row.created_at ? (
                        <span className="text-muted-foreground"> · {new Date(row.created_at).toLocaleString()}</span>
                      ) : null}
                    </li>
                  ))
              )}
            </ul>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t("admin.navVisits")}</h2>
              <Link to="/visits" className="text-sm text-brand">{t("admin.seeAll")}</Link>
            </div>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="p-3">{t("common.property")}</th>
                    <th className="p-3">{t("admin.user")}</th>
                    <th className="p-3">{t("admin.owners")}</th>
                    <th className="p-3">{t("common.status")}</th>
                    <th className="p-3">{t("admin.when")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visits.slice(0, 12).map((v) => (
                    <tr key={v.id} className="border-b last:border-0">
                      <td className="p-3">{v.property_title || v.property_id}</td>
                      <td className="p-3">
                        <Link to={`/users/${v.user_id}`} className="text-brand hover:underline">
                          {v.requester_name || v.user_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="p-3">{v.owner_name || "—"}</td>
                      <td className="p-3">{t(`visits.status.${v.status}`, { defaultValue: v.status })}</td>
                      <td className="p-3">{v.requested_at ? new Date(v.requested_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t("admin.navPayments")}</h2>
              <Link to="/payments" className="text-sm text-brand">{t("admin.seeAll")}</Link>
            </div>
            <div className="overflow-x-auto rounded-2xl border bg-card">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="p-3">{t("admin.user")}</th>
                    <th className="p-3">{t("admin.type")}</th>
                    <th className="p-3">{t("admin.amount")}</th>
                    <th className="p-3">{t("common.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 8).map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="p-3">
                        <Link to={`/users/${p.user_id}`} className="text-brand hover:underline">
                          {p.user_name || p.user_email || p.user_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="p-3">{p.type}</td>
                      <td className="p-3">{Number(p.amount).toLocaleString()} {p.currency || "XOF"}</td>
                      <td className="p-3">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
