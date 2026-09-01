import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getAdminPayments, getAdminSettings, patchAdminPayment, patchAdminSettings } from "@/services/api";
import type { Payment } from "@/types";

export function AdminPaymentsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Payment[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [clientPaysFees, setClientPaysFees] = useState(false);
  const [savingFees, setSavingFees] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getAdminPayments();
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
    getAdminSettings()
      .then((s) => setClientPaysFees(Boolean(s.client_pays_operator_fees)))
      .catch(() => undefined);
  }, [load]);

  const toggleFees = async (next: boolean) => {
    setSavingFees(true);
    setError("");
    try {
      const saved = await patchAdminSettings({ client_pays_operator_fees: next });
      setClientPaysFees(Boolean(saved.client_pays_operator_fees));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setSavingFees(false);
    }
  };

  const act = async (id: string, action: "cancel" | "refund") => {
    const ok =
      action === "refund"
        ? window.confirm(t("admin.confirmRefund"))
        : window.confirm(t("admin.confirmCancel"));
    if (!ok) return;
    setBusy(id);
    setError("");
    try {
      await patchAdminPayment(id, { action });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="font-jakarta max-w-6xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("admin.navPayments")}</h1>
      <label className="flex items-start gap-3 rounded-2xl border bg-card p-4 text-sm">
        <input
          type="checkbox"
          className="mt-1 accent-brand"
          checked={clientPaysFees}
          disabled={savingFees}
          onChange={(e) => void toggleFees(e.target.checked)}
        />
        <span>
          <span className="font-semibold block">{t("admin.clientPaysFeesTitle")}</span>
          <span className="text-muted-foreground">{t("admin.clientPaysFeesHint")}</span>
        </span>
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <p className="text-gray-600">{t("admin.emptyPayments")}</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-500 border-b">
              <tr>
                <th className="p-3">{t("admin.when")}</th>
                <th className="p-3">{t("admin.user")}</th>
                <th className="p-3">{t("admin.type")}</th>
                <th className="p-3">{t("common.status")}</th>
                <th className="p-3">{t("admin.amount")}</th>
                <th className="p-3">{t("admin.reference")}</th>
                <th className="p-3">{t("admin.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap">
                    {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-3">{p.user_name || p.user_email || p.user_id}</td>
                  <td className="p-3">{p.type}</td>
                  <td className="p-3">{p.status}</td>
                  <td className="p-3 whitespace-nowrap">
                    {Number(p.amount).toLocaleString()} {p.currency}
                  </td>
                  <td className="p-3 font-mono text-xs break-all">{p.provider_reference || "—"}</td>
                  <td className="p-3">
                    {p.status === "pending" || p.status === "processing" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full"
                        disabled={busy === p.id}
                        onClick={() => void act(p.id, "cancel")}
                      >
                        {t("admin.cancelPay")}
                      </Button>
                    ) : null}
                    {p.status === "completed" ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        disabled={busy === p.id}
                        onClick={() => void act(p.id, "refund")}
                      >
                        {t("admin.refund")}
                      </Button>
                    ) : null}
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
