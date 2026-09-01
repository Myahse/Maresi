import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getAdminUserTrail, patchAdminUserReview } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import { useRealtime } from "@/hooks/useRealtime";
import { AuthImage } from "@/components/media/AuthImage";
import { Button } from "@/components/ui/button";
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
  const [message, setMessage] = useState("");
  const [suspend, setSuspend] = useState(true);
  const [busy, setBusy] = useState(false);

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

  const review = async (action: "request_correction" | "unsuspend") => {
    if (!userId) return;
    if (action === "request_correction" && message.trim().length < 8) {
      setError(t("admin.reviewMessageRequired"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const updated = await patchAdminUserReview(userId, {
        action,
        message: message.trim() || undefined,
        suspend,
      });
      setAccount(updated);
      setMessage("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("admin.empty"));
    } finally {
      setBusy(false);
    }
  };

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
            <div className="rounded-2xl border bg-card p-4 text-sm space-y-4">
              <div>
                <p className="font-semibold">
                  {account.first_name && account.last_name
                    ? `${account.first_name} ${account.last_name}`
                    : account.full_name}
                </p>
                {(account.birth_date || account.gender) && (
                  <p className="text-muted-foreground">
                    {[account.birth_date, account.gender === "male" ? t("register.genderMale") : account.gender === "female" ? t("register.genderFemale") : account.gender === "other" ? t("register.genderOther") : ""].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p>{account.email}</p>
                <p>
                  {account.role} · {account.phone || "—"}
                  {account.account_status === "suspended" ? ` · ${t("admin.suspended")}` : ""}
                </p>
                {account.id_card && <p>{t("register.idCardNumber", { defaultValue: "ID" })}: {account.id_card}</p>}
                {account.review_message && (
                  <p className="mt-2 text-destructive">{account.review_message}</p>
                )}
              </div>
              {(account.selfie_url || account.id_card_photo_url || account.id_card_back_url) && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {t("admin.identityPhotos")}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("admin.selfie")}</p>
                      <AuthImage src={account.selfie_url} alt={t("admin.selfie")} className="h-36 w-full rounded-xl object-cover bg-muted" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">{t("admin.idFront")}</p>
                      <AuthImage src={account.id_card_photo_url} alt={t("admin.idFront")} className="h-36 w-full rounded-xl object-cover bg-muted" />
                    </div>
                    {account.id_card_back_url && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">{t("admin.idBack")}</p>
                        <AuthImage src={account.id_card_back_url} alt={t("admin.idBack")} className="h-36 w-full rounded-xl object-cover bg-muted" />
                      </div>
                    )}
                  </div>
                </div>
              )}
              {account.role !== "admin" && (
                <div className="border-t pt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t("admin.reviewTitle")}
                  </p>
                  <p className="text-sm text-muted-foreground">{t("admin.reviewHint")}</p>
                  <textarea
                    className="w-full border rounded-md p-2 text-sm min-h-[90px]"
                    placeholder={t("admin.reviewPlaceholder")}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={suspend} onChange={(e) => setSuspend(e.target.checked)} />
                    {t("admin.reviewSuspend")}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      className="rounded-full bg-brand"
                      disabled={busy}
                      onClick={() => void review("request_correction")}
                    >
                      {t("admin.reviewSend")}
                    </Button>
                    {account.account_status === "suspended" && (
                      <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={busy}
                        onClick={() => void review("unsuspend")}
                      >
                        {t("admin.reviewUnsuspend")}
                      </Button>
                    )}
                  </div>
                </div>
              )}
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
