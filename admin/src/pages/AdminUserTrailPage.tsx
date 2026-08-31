import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAdminUserTrail } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import type { AdminActivity, Payment, RealtimeEvent, User, VisitRequest } from "@/types";

export function AdminUserTrailPage() {
  const { t } = useTranslation();
  const { userId } = useParams<{ userId: string }>();
  const { isAuthenticated, user } = useAuth();
  const [account, setAccount] = useState<User | null>(null);
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [activity, setActivity] = useState<AdminActivity[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) return;
    setError("");
    try {
      const trail = await getAdminUserTrail(userId);
      setAccount(trail.user);
      setVisits(Array.isArray(trail.visits) ? trail.visits : []);
      setPayments(Array.isArray(trail.payments) ? trail.payments : []);
      setActivity(Array.isArray(trail.activity) ? trail.activity : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setLoading(false);
    }
  }, [t, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  useRealtime(
    isAuthenticated && user?.role === "admin",
    useCallback(
      (_event: RealtimeEvent) => {
        void load();
      },
      [load]
    ),
    ["/topic/admin"]
  );

  return (
    <div className="font-jakarta max-w-5xl mx-auto px-4 py-8 space-y-6">
      <Link to="/users" className="text-sm text-brand">
        ← {t("admin.navUsers")}
      </Link>
      <h1 className="text-2xl font-bold">{t("admin.userTrail")}</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : (
        <>
          {account && (
            <div className="rounded-2xl border bg-card p-4 text-sm">
              <p className="font-semibold">{account.full_name}</p>
              <p>{account.email}</p>
              <p>
                {account.role} · {account.phone || "—"}
              </p>
            </div>
          )}
          <section>
            <h2 className="font-semibold mb-2">{t("admin.navVisits")}</h2>
            <ul className="space-y-2 text-sm">
              {visits.map((v) => (
                <li key={v.id} className="rounded-xl border bg-card p-3">
                  {v.property_title} · {t(`visits.status.${v.status}`, { defaultValue: v.status })}
                  {v.key_code ? ` · ${v.key_code}` : ""}
                </li>
              ))}
              {visits.length === 0 && <li className="text-muted-foreground">{t("admin.emptyVisits")}</li>}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold mb-2">{t("admin.navPayments")}</h2>
            <ul className="space-y-2 text-sm">
              {payments.map((p) => (
                <li key={p.id} className="rounded-xl border bg-card p-3">
                  {p.type} · {Number(p.amount).toLocaleString()} · {p.status}
                </li>
              ))}
              {payments.length === 0 && <li className="text-muted-foreground">{t("admin.emptyPayments")}</li>}
            </ul>
          </section>
          <section>
            <h2 className="font-semibold mb-2">{t("admin.live")}</h2>
            <ul className="space-y-2 text-sm">
              {activity.map((a) => (
                <li key={a.id} className="rounded-xl border bg-card p-3">
                  {a.summary || a.action}
                  {a.created_at ? ` · ${new Date(a.created_at).toLocaleString()}` : ""}
                </li>
              ))}
              {activity.length === 0 && <li className="text-muted-foreground">{t("admin.liveEmpty")}</li>}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
