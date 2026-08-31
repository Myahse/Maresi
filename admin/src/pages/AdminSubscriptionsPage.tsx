import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getAdminSubscriptions, patchAdminSubscription } from "@/services/api";
import type { OwnerSubscription } from "@/types";

export function AdminSubscriptionsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<OwnerSubscription[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getAdminSubscriptions();
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

  const act = async (userId: string | undefined, status: string) => {
    if (!userId) return;
    if (status === "inactive" && !window.confirm(t("admin.confirmStop"))) return;
    setBusy(userId + status);
    setError("");
    try {
      await patchAdminSubscription(userId, { status, days: 30 });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="font-jakarta max-w-5xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.navSubscriptions")}</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-gray-600">{t("admin.emptySubscriptions")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3">{t("admin.user")}</th>
                <th className="p-3">{t("common.status")}</th>
                <th className="p-3">{t("admin.starts")}</th>
                <th className="p-3">{t("admin.expires")}</th>
                <th className="p-3">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id || s.user_id} className="border-b last:border-0">
                  <td className="p-3">
                    <div className="font-medium">{s.user_name || "—"}</div>
                    <div className="text-xs text-gray-500">{s.user_email}</div>
                  </td>
                  <td className="p-3">{s.active ? t("admin.active") : s.status}</td>
                  <td className="p-3 whitespace-nowrap">
                    {s.starts_at ? new Date(s.starts_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {s.expires_at ? new Date(s.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="rounded-full bg-brand"
                        disabled={!!busy}
                        onClick={() => void act(s.user_id, "active")}
                      >
                        {t("admin.grant30")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={!!busy}
                        onClick={() => void act(s.user_id, "extend")}
                      >
                        {t("admin.extend30")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        disabled={!!busy}
                        onClick={() => void act(s.user_id, "inactive")}
                      >
                        {t("admin.stopSub")}
                      </Button>
                    </div>
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
