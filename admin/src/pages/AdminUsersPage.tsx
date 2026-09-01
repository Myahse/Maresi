import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getAdminUsers, patchAdminSubscription } from "@/services/api";
import type { User } from "@/types";

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<User[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getAdminUsers();
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

  const grant = async (userId: string) => {
    setBusy(userId);
    setError("");
    try {
      await patchAdminSubscription(userId, { status: "active", days: 30 });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="font-jakarta max-w-5xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.navUsers")}</h1>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-gray-600">{t("admin.emptyUsers")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3">{t("common.email")}</th>
                <th className="p-3">{t("admin.name")}</th>
                <th className="p-3">{t("admin.role")}</th>
                <th className="p-3">{t("admin.status")}</th>
                <th className="p-3">{t("admin.phone")}</th>
                <th className="p-3">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">
                    <Link to={`/users/${u.id}`} className="text-brand hover:underline">
                      {u.full_name}
                    </Link>
                  </td>
                  <td className="p-3">{u.role}</td>
                  <td className="p-3">
                    {u.account_status === "suspended" ? (
                      <span className="text-destructive font-semibold">{t("admin.suspended")}</span>
                    ) : (
                      t("admin.ok")
                    )}
                  </td>
                  <td className="p-3">{u.phone || "—"}</td>
                  <td className="p-3">
                    {u.role === "owner" ? (
                      <Button
                        size="sm"
                        className="rounded-full bg-brand"
                        disabled={busy === u.id}
                        onClick={() => void grant(u.id)}
                      >
                        {t("admin.grant30")}
                      </Button>
                    ) : (
                      "—"
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
