import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { getOwnerVisitRequests, updateVisitRequestStatus } from "@/services/api";
import { VisitRequestCard } from "@/components/visit/VisitRequestCard";
import type { VisitRequest } from "@/types";

export function OwnerVisitsPage() {
  const { t } = useTranslation();
  const [visits, setVisits] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [declineId, setDeclineId] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState("");

  const load = () => {
    setLoading(true);
    getOwnerVisitRequests()
      .then(setVisits)
      .catch(() => setVisits([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleStatus = async (id: string, status: "accepted" | "declined", note?: string) => {
    setActingId(id);
    try {
      const updated = await updateVisitRequestStatus(id, status, note);
      setVisits((prev) => prev.map((v) => (v.id === id ? updated : v)));
      setDeclineId(null);
      setDeclineNote("");
    } catch {
      /* ignore */
    } finally {
      setActingId(null);
    }
  };

  const pending = visits.filter((v) => v.status === "pending");
  const resolved = visits.filter((v) => v.status !== "pending");

  return (
    <div className="font-jakarta container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/owner" className="text-sm text-brand hover:underline">
        ← {t("owner.title")}
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mt-4">{t("owner.visitValidation")}</h1>
      <p className="text-gray-600 text-sm mt-1 mb-8">{t("owner.visitValidationHint")}</p>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : visits.length === 0 ? (
        <p className="text-gray-500">{t("owner.noVisits")}</p>
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-gray-900">{t("owner.pendingRequests")} ({pending.length})</h2>
              {pending.map((v) => (
                <VisitRequestCard key={v.id} visit={v} showRequester>
                  {declineId === v.id ? (
                    <div className="space-y-3 pt-2 border-t border-gray-100">
                      <textarea
                        className="w-full min-h-[80px] rounded-xl border border-input px-3 py-2 text-sm"
                        placeholder={t("owner.declineReasonPlaceholder")}
                        value={declineNote}
                        onChange={(e) => setDeclineNote(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          className="rounded-full"
                          disabled={actingId === v.id}
                          onClick={() => handleStatus(v.id, "declined", declineNote)}
                        >
                          {t("owner.confirmDecline")}
                        </Button>
                        <Button size="sm" variant="ghost" className="rounded-full" onClick={() => setDeclineId(null)}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                      <Button
                        size="sm"
                        className="rounded-full bg-brand hover:bg-brand-dark"
                        disabled={actingId === v.id}
                        onClick={() => handleStatus(v.id, "accepted")}
                      >
                        {t("owner.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full border-red-300 text-red-700 hover:bg-red-50"
                        disabled={actingId === v.id}
                        onClick={() => setDeclineId(v.id)}
                      >
                        {t("owner.decline")}
                      </Button>
                    </div>
                  )}
                </VisitRequestCard>
              ))}
            </section>
          )}

          {resolved.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-semibold text-gray-900">{t("owner.pastRequests")}</h2>
              {resolved.map((v) => (
                <VisitRequestCard key={v.id} visit={v} showRequester />
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
