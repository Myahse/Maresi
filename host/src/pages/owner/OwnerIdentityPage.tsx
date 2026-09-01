import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthImage } from "@/components/visit/AuthImage";
import { getMyProfile } from "@/services/api";
import type { UserProfile } from "@/types";

export function OwnerIdentityPage() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : t("account.loadFailed")));
  }, [t]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link to="/" className="text-sm text-brand">
        ← {t("owner.title")}
      </Link>
      <div>
        <p className="text-sm font-semibold text-brand">{t("account.kicker")}</p>
        <h1 className="text-2xl font-bold">{t("account.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("account.hint")}</p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!profile ? (
        <p>{t("common.loading")}</p>
      ) : (
        <div className="space-y-6">
          <dl className="rounded-2xl border bg-card divide-y text-sm">
            <Row label={t("register.firstName")} value={profile.first_name || profile.full_name.split(" ")[0] || "—"} />
            <Row label={t("register.lastName")} value={profile.last_name || profile.full_name.split(" ").slice(1).join(" ") || "—"} />
            <Row label={t("register.birthDate")} value={profile.birth_date || profile.birthDate || "—"} />
            <Row
              label={t("register.gender")}
              value={
                profile.gender === "male"
                  ? t("register.genderMale")
                  : profile.gender === "female"
                    ? t("register.genderFemale")
                    : profile.gender === "other"
                      ? t("register.genderOther")
                      : "—"
              }
            />
            <Row label={t("common.email")} value={profile.email} />
            <Row label={t("register.phone")} value={profile.phone || "—"} />
            <Row label={t("register.idCardNumber")} value={profile.id_card || "—"} />
          </dl>
          <div className="grid sm:grid-cols-3 gap-4">
            <PhotoCard title={t("register.selfie")} src={profile.selfie_url} />
            <PhotoCard title={t("register.idCardFront")} src={profile.id_card_photo_url} />
            <PhotoCard title={t("register.idCardBack")} src={profile.id_card_back_url} />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 p-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold text-right break-all">{value}</dd>
    </div>
  );
}

function PhotoCard({ title, src }: { title: string; src?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      {src ? (
        <AuthImage src={src} alt={title} className="h-44 w-full rounded-xl object-cover bg-muted" />
      ) : (
        <div className="h-44 rounded-xl bg-muted flex items-center justify-center text-xs text-muted-foreground">
          —
        </div>
      )}
    </div>
  );
}
