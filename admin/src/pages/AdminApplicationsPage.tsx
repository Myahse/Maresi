import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getAdminHostApplications, reviewHostApplication } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import type { HostApplication, RealtimeEvent } from "@/types";

export function AdminApplicationsPage() {
  const { t } = useTranslation();
  const { isAuthenticated, user } = useAuth();
  const [items, setItems] = useState<HostApplication[]>([]);
  const [events, setEvents] = useState<string[]>([]);
  const [filter, setFilter] = useState("pending");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await getAdminHostApplications(filter || undefined);
      setItems(Array.isArray(list) ? list : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setLoading(false);
    }
  }, [filter, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const onEvent = useCallback(
    (event: RealtimeEvent) => {
      setEvents((prev) => [`${event.type} · ${event.at ?? ""}`, ...prev].slice(0, 20));
      if (event.type.startsWith("host.application")) void load();
    },
    [load]
  );

  useRealtime(isAuthenticated && user?.role === "admin", onEvent, ["/topic/admin"]);

  const act = async (id: string, status: "approved" | "rejected" | "suspended") => {
    try {
      await reviewHostApplication(id, status, note || undefined);
      setNote("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    }
  };

  return (
    <div className="font-jakarta max-w-5xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{t("admin.title")}</h1>
        <label className="text-sm text-gray-600 flex items-center gap-2">
          {t("admin.filter")}
          <select
            className="border rounded-md px-2 py-1"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="pending">pending</option>
            <option value="approved">approved</option>
            <option value="rejected">rejected</option>
            <option value="">all</option>
          </select>
        </label>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? (
          <p>{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="text-gray-600">{t("admin.empty")}</p>
        ) : (
          <ul className="space-y-3">
            {items.map((app) => (
              <li key={app.id} className="rounded-2xl border p-4 space-y-2 bg-card">
                <div className="font-semibold">{app.full_name}</div>
                <div className="text-sm text-gray-600">
                  {app.user_email} · {app.phone} · {app.city || "—"} · {app.status}
                </div>
                {app.message && <p className="text-sm">{app.message}</p>}
                {app.status === "pending" && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button className="rounded-full bg-brand" onClick={() => void act(app.id, "approved")}>
                      {t("admin.approve")}
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={() => void act(app.id, "rejected")}>
                      {t("admin.reject")}
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={() => void act(app.id, "suspended")}>
                      {t("admin.suspend")}
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">{t("admin.note")}</label>
          <textarea
            className="w-full border rounded-md p-2 text-sm min-h-[80px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <aside className="rounded-2xl border bg-card p-4 h-fit">
        <h2 className="font-semibold mb-3">{t("admin.live")}</h2>
        <ul className="space-y-2 text-xs text-gray-600">
          {events.length === 0 && <li>—</li>}
          {events.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </aside>
    </div>
  );
}
