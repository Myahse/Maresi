import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getAdminVisits, patchAdminVisit } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import type { RealtimeEvent, VisitRequest } from "@/types";

export function AdminVisitsPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<VisitRequest[]>([]);
  const [filter, setFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const list = await getAdminVisits();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setLoading(false);
    }
  }, [t]);

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

  const shown = items.filter((v) => !filter || v.status === filter);

  const cancelVisit = async (id: string) => {
    if (!window.confirm(t("admin.confirmCancelVisit"))) return;
    setBusy(id);
    setError("");
    try {
      await patchAdminVisit(id, { action: "cancel" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setBusy("");
    }
  };

  const canAdminCancel = (status: VisitRequest["status"]) =>
    status !== "cancelled" && status !== "declined";

  return (
    <div className="font-jakarta max-w-6xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.navVisits")}</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <select
        className="rounded-xl border px-3 py-2 text-sm"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      >
        <option value="">{t("common.any")}</option>
        {["pending", "awaiting_agreement", "awaiting_host_agreement", "awaiting_key", "awaiting_payment", "payment_sent", "confirmed", "declined", "cancelled"].map(
          (status) => (
            <option key={status} value={status}>
              {t(`visits.status.${status}`, { defaultValue: status })}
            </option>
          )
        )}
      </select>
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : shown.length === 0 ? (
        <p className="text-muted-foreground">{t("admin.emptyVisits")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3">{t("common.property")}</th>
                <th className="p-3">{t("admin.user")}</th>
                <th className="p-3">{t("admin.owners")}</th>
                <th className="p-3">{t("common.status")}</th>
                <th className="p-3">{t("visits.keyCode")}</th>
                <th className="p-3">{t("admin.when")}</th>
                <th className="p-3">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((v) => (
                <tr key={v.id} className="border-b last:border-0">
                  <td className="p-3">{v.property_title || "—"}</td>
                  <td className="p-3">
                    <Link to={`/users/${v.user_id}`} className="text-brand hover:underline">
                      {v.requester_name || v.requester_email || v.user_id.slice(0, 8)}
                    </Link>
                  </td>
                  <td className="p-3">{v.owner_name || v.owner_email || "—"}</td>
                  <td className="p-3">{t(`visits.status.${v.status}`, { defaultValue: v.status })}</td>
                  <td className="p-3 font-mono">{v.key_code || "—"}</td>
                  <td className="p-3">{v.requested_at ? new Date(v.requested_at).toLocaleString() : "—"}</td>
                  <td className="p-3">
                    {canAdminCancel(v.status) && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy === v.id}
                        onClick={() => void cancelVisit(v.id)}
                      >
                        {busy === v.id ? t("common.loading") : t("admin.cancelVisit")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
