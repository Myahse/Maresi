import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IdentityPhotoField } from "@/components/auth/IdentityPhotoField";
import { getMyProfile, updateMyIdentity } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import type { UserProfile } from "@/types";

export function OwnerIdentityPage() {
  const { t } = useTranslation();
  const { patchUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [idCard, setIdCard] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        setProfile(data);
        setIdCard(data.id_card || "");
      })
      .catch((e) => setError(e instanceof Error ? e.message : t("account.loadFailed")));
  }, [t]);

  const suspended = profile?.account_status === "suspended";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!idCard.trim() && !selfie && !idFront && !idBack) {
      setError(t("account.updateRequired"));
      return;
    }
    setSaving(true);
    try {
      const form = new FormData();
      if (idCard.trim()) form.append("id_card", idCard.trim());
      if (selfie) form.append("selfie", selfie);
      if (idFront) form.append("id_card_photo", idFront);
      if (idBack) form.append("id_card_back", idBack);
      const updated = await updateMyIdentity(form);
      setProfile(updated);
      setSelfie(null);
      setIdFront(null);
      setIdBack(null);
      patchUser({
        account_status: updated.account_status ?? "ok",
        review_message: updated.review_message || "",
      });
      setSuccess(t("account.updateSuccess"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("account.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

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
      {success && <p className="text-sm text-brand">{success}</p>}
      {suspended && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 space-y-2">
          <p className="font-semibold text-destructive">{t("account.suspendedTitle")}</p>
          <p className="text-sm">{profile?.review_message || t("account.suspendedHint")}</p>
        </div>
      )}
      {!profile ? (
        <p>{t("common.loading")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
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
          </dl>
          <div className="rounded-2xl border bg-card p-4 space-y-4">
            <p className="text-sm font-semibold">{t("account.updateTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("account.updateHint")}</p>
            <div className="space-y-2">
              <Label htmlFor="id_card">{t("register.idCardNumber")}</Label>
              <Input id="id_card" value={idCard} onChange={(e) => setIdCard(e.target.value)} minLength={5} />
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <IdentityPhotoField
                id="selfie"
                label={t("register.selfie")}
                hint={t("register.selfieHint")}
                file={selfie}
                currentSrc={profile.selfie_url}
                capture="user"
                onChange={setSelfie}
              />
              <IdentityPhotoField
                id="id-front"
                label={t("register.idCardFront")}
                hint={t("register.idCardPhotoHint")}
                file={idFront}
                currentSrc={profile.id_card_photo_url}
                capture="environment"
                onChange={setIdFront}
              />
              <IdentityPhotoField
                id="id-back"
                label={t("register.idCardBack")}
                hint={t("register.idCardBackHint")}
                file={idBack}
                currentSrc={profile.id_card_back_url}
                capture="environment"
                onChange={setIdBack}
              />
            </div>
            <Button type="submit" className="rounded-full bg-brand" disabled={saving}>
              {saving ? t("common.saving") : t("account.updateSubmit")}
            </Button>
          </div>
        </form>
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
