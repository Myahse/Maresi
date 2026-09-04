import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Bell,
  FileText,
  Globe,
  LifeBuoy,
  KeyRound,
  Languages,
  Scale,
  Settings,
  ShieldAlert,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { IdentityPhotoField } from "@/components/auth/IdentityPhotoField";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { useUserLocation } from "@/context/LocationContext";
import {
  changeMyPassword,
  getMyProfile,
  getNotifications,
  markNotificationsRead,
  updateMyIdentity,
} from "@/services/api";
import {
  dismissPushPrompt,
  enablePush,
  isIosDevice,
  isStandaloneDisplay,
  pushSupported,
} from "@/lib/push";
import { CLIENT_APP_URL } from "@/lib/clientApp";
import type { AppNotification, UserProfile } from "@/types";

const BASE = "/owner/account";

function Shell({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <Link to={BASE} className="text-sm text-brand">
        ← {t("account.hubTitle")}
      </Link>
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {hint ? <p className="text-sm text-muted-foreground mt-1">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function AccountHubPage() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const sections = [
    { to: `${BASE}/personal`, icon: UserRound, title: t("account.sections.personal"), hint: t("account.sections.personalHint") },
    { to: `${BASE}/documents`, icon: FileText, title: t("account.sections.documents"), hint: t("account.sections.documentsHint") },
    { to: `${BASE}/alerts`, icon: ShieldAlert, title: t("account.sections.alerts"), hint: t("account.sections.alertsHint") },
    { to: `${BASE}/notifications`, icon: Bell, title: t("account.sections.notifications"), hint: t("account.sections.notificationsHint") },
    { to: `${BASE}/security`, icon: KeyRound, title: t("account.sections.security"), hint: t("account.sections.securityHint") },
    { to: `${BASE}/language`, icon: Languages, title: t("account.sections.language"), hint: t("account.sections.languageHint") },
    { to: `${BASE}/system`, icon: Settings, title: t("account.sections.system"), hint: t("account.sections.systemHint") },
    { to: `${BASE}/legal`, icon: Scale, title: t("account.sections.legal"), hint: t("account.sections.legalHint") },
    { to: `${BASE}/support`, icon: LifeBuoy, title: t("account.sections.support"), hint: t("account.sections.supportHint") },
  ];

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div>
        <p className="text-sm font-semibold text-brand">{t("account.kicker")}</p>
        <h1 className="text-2xl font-bold">{t("account.hubTitle")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{t("account.hubHint")}</p>
      </div>
      <div className="grid gap-3">
        {sections.map((section) => (
          <Link
            key={section.to}
            to={section.to}
            className="flex items-start gap-3 rounded-2xl border bg-card p-4 hover:border-brand/50"
          >
            <section.icon className="h-5 w-5 text-brand mt-0.5 shrink-0" />
            <span>
              <span className="block font-semibold">{section.title}</span>
              <span className="block text-sm text-muted-foreground">{section.hint}</span>
            </span>
          </Link>
        ))}
      </div>
      <Button
        variant="outline"
        className="rounded-full"
        onClick={() => {
          logout();
          navigate("/login");
        }}
      >
        {t("header.logout")}
      </Button>
    </div>
  );
}

function useProfile() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getMyProfile()
      .then(setProfile)
      .catch((e) => setError(e instanceof Error ? e.message : t("account.loadFailed")));
  }, [t]);
  return { profile, error, setProfile };
}

function genderLabel(profile: UserProfile, t: (key: string) => string) {
  if (profile.gender === "male") return t("register.genderMale");
  if (profile.gender === "female") return t("register.genderFemale");
  if (profile.gender === "other") return t("register.genderOther");
  return "—";
}

export function AccountPersonalPage() {
  const { t } = useTranslation();
  const { profile, error } = useProfile();
  return (
    <Shell title={t("account.sections.personal")} hint={t("account.sections.personalHint")}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!profile ? (
        <p>{t("common.loading")}</p>
      ) : (
        <dl className="rounded-2xl border bg-card divide-y text-sm">
          <Row label={t("register.firstName")} value={profile.first_name || profile.full_name.split(" ")[0] || "—"} />
          <Row label={t("register.lastName")} value={profile.last_name || profile.full_name.split(" ").slice(1).join(" ") || "—"} />
          <Row label={t("register.birthDate")} value={profile.birth_date || profile.birthDate || "—"} />
          <Row label={t("register.gender")} value={genderLabel(profile, t)} />
          <Row label={t("common.email")} value={profile.email} />
          <Row label={t("register.phone")} value={profile.phone || "—"} />
        </dl>
      )}
    </Shell>
  );
}

export function AccountDocumentsPage() {
  const { t } = useTranslation();
  const { patchUser } = useAuth();
  const { profile, error, setProfile } = useProfile();
  const [idCard, setIdCard] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [idFront, setIdFront] = useState<File | null>(null);
  const [idBack, setIdBack] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (profile?.id_card) setIdCard(profile.id_card);
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");
    if (!idCard.trim() && !selfie && !idFront && !idBack) {
      setFormError(t("account.updateRequired"));
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
      setFormError(err instanceof Error ? err.message : t("account.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title={t("account.sections.documents")} hint={t("account.updateHint")}>
      {(error || formError) && <p className="text-sm text-destructive">{error || formError}</p>}
      {success && <p className="text-sm text-brand">{success}</p>}
      {!profile ? (
        <p>{t("common.loading")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border bg-card p-4">
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
        </form>
      )}
    </Shell>
  );
}

export function AccountAlertsPage() {
  const { t } = useTranslation();
  const { profile, error } = useProfile();
  const suspended = profile?.account_status === "suspended";
  return (
    <Shell title={t("account.sections.alerts")} hint={t("account.sections.alertsHint")}>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {!profile ? (
        <p>{t("common.loading")}</p>
      ) : suspended ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 space-y-2">
          <p className="font-semibold text-destructive">{t("account.suspendedTitle")}</p>
          <p className="text-sm">{profile.review_message || t("account.suspendedHint")}</p>
          <Link to={`${BASE}/documents`} className="text-sm text-brand font-semibold">
            {t("account.sections.documents")}
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-4 space-y-2">
          <p className="font-semibold">{t("account.alertsOk")}</p>
          {profile.review_message ? <p className="text-sm text-muted-foreground">{profile.review_message}</p> : null}
        </div>
      )}
    </Shell>
  );
}

export function AccountNotificationsPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [error, setError] = useState("");
  const [pushNote, setPushNote] = useState("");

  useEffect(() => {
    getNotifications()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : t("account.loadFailed")));
  }, [t]);

  const enable = async () => {
    setPushNote("");
    try {
      if (isIosDevice() && !isStandaloneDisplay()) {
        setPushNote(t("push.iosInstall"));
        return;
      }
      if (!pushSupported()) {
        setPushNote(t("account.pushUnsupported"));
        return;
      }
      await enablePush("host");
      dismissPushPrompt();
      setPushNote(t("account.pushEnabled"));
    } catch {
      setPushNote(t("account.pushFailed"));
    }
  };

  return (
    <Shell title={t("account.sections.notifications")} hint={t("account.sections.notificationsHint")}>
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <p className="font-semibold">{t("push.title")}</p>
        <p className="text-sm text-muted-foreground">{t("push.body")}</p>
        <Button className="rounded-full bg-brand" onClick={() => void enable()}>
          {t("push.enable")}
        </Button>
        {pushNote && <p className="text-sm text-muted-foreground">{pushNote}</p>}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button variant="outline" className="rounded-full" onClick={() => void markNotificationsRead().then(() => getNotifications().then(setItems))}>
          {t("account.markAllRead")}
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("account.notificationsEmpty")}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-2xl border bg-card p-4">
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-muted-foreground">{item.message}</p>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export function AccountSecurityPage() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      await changeMyPassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setSuccess(t("account.passwordUpdated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : t("account.passwordFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Shell title={t("account.sections.security")} hint={t("account.sections.securityHint")}>
      <form onSubmit={(e) => void submit(e)} className="rounded-2xl border bg-card p-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="current">{t("account.currentPassword")}</Label>
          <Input id="current" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next">{t("account.newPassword")}</Label>
          <Input id="next" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={6} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && <p className="text-sm text-brand">{success}</p>}
        <Button type="submit" className="rounded-full bg-brand" disabled={saving}>
          {saving ? t("common.saving") : t("account.changePassword")}
        </Button>
      </form>
      <Link to="/forgot-password" className="text-sm text-brand">
        {t("login.forgot")}
      </Link>
    </Shell>
  );
}

export function AccountLanguagePage() {
  const { t } = useTranslation();
  return (
    <Shell title={t("account.sections.language")} hint={t("account.sections.languageHint")}>
      <div className="rounded-2xl border bg-card p-4 flex items-center gap-3">
        <Globe className="h-5 w-5 text-brand" />
        <LanguageSwitcher />
      </div>
    </Shell>
  );
}

export function AccountSystemPage() {
  const { t } = useTranslation();
  const { preference, setPreference } = useTheme();
  const location = useUserLocation();
  return (
    <Shell title={t("account.sections.system")} hint={t("account.sections.systemHint")}>
      <div className="rounded-2xl border bg-card p-4 space-y-4">
        <p className="font-semibold">{t("account.theme")}</p>
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as const).map((value) => (
            <Button
              key={value}
              type="button"
              variant={preference === value ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setPreference(value)}
            >
              {t(`account.theme_${value}`)}
            </Button>
          ))}
          <ThemeToggle />
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <p className="font-semibold">{t("account.currency")}</p>
        <CurrencyPicker />
      </div>
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <p className="font-semibold">{t("location.title")}</p>
        <p className="text-sm text-muted-foreground">{t("location.body")}</p>
        <Button className="rounded-full" variant="outline" onClick={() => location.requestAccess()}>
          {t("location.enable")}
        </Button>
      </div>
    </Shell>
  );
}

export function AccountLegalPage() {
  const { t } = useTranslation();
  const terms = `${CLIENT_APP_URL.replace(/\/$/, "")}/terms`;
  return (
    <Shell title={t("account.sections.legal")} hint={t("account.sections.legalHint")}>
      <div className="rounded-2xl border bg-card divide-y">
        <a href={terms} className="block p-4 font-semibold hover:bg-muted" target="_blank" rel="noreferrer">
          {t("footer.terms")}
        </a>
        <a href={terms} className="block p-4 font-semibold hover:bg-muted" target="_blank" rel="noreferrer">
          {t("footer.privacy")}
        </a>
        <a href={terms} className="block p-4 font-semibold hover:bg-muted" target="_blank" rel="noreferrer">
          {t("footer.cookies")}
        </a>
      </div>
    </Shell>
  );
}

export function AccountSupportPage() {
  const { t } = useTranslation();
  return (
    <Shell title={t("account.sections.support")} hint={t("account.sections.supportHint")}>
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <p className="text-sm text-muted-foreground">{t("account.supportHint")}</p>
        <a href="mailto:maresi00225@gmail.com" className="block font-semibold text-brand">
          maresi00225@gmail.com
        </a>
      </div>
    </Shell>
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
