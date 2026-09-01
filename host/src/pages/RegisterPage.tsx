import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { BirthDateInput } from "@/components/auth/BirthDateInput";
import { IdentityPhotoField } from "@/components/auth/IdentityPhotoField";
import { PhoneInput } from "@/components/auth/PhoneInput";
import { WizardPane } from "@/components/ui/WizardPane";
import { useAuth } from "@/hooks/useAuth";
import { isAdultBirthDate, isValidIdCard, maxAdultBirthDate } from "@/lib/validation";
import { isCompletePhone } from "@/lib/phoneCountries";
import { CLIENT_APP_URL, guestHandoffUrl } from "@/lib/clientApp";
import { cn } from "@/lib/utils";

type RoleIntent = "client" | "owner";

export function RegisterPage() {
  const { t } = useTranslation();
  const { register, logout } = useAuth();

  const [step, setStep] = useState(0);
  const [role, setRole] = useState<RoleIntent | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [idCard, setIdCard] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [idCardPhoto, setIdCardPhoto] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const lastStep = 3;
  const steps = [
    t("register.stepRole"),
    t("register.stepPersonal"),
    t("register.stepAccount"),
    t("register.stepIdentity"),
  ];

  const goNext = () => {
    setError("");
    if (step === 0 && !role) {
      setError(t("register.roleRequired"));
      return;
    }
    if (step === 1) {
      if (!firstName.trim() || !lastName.trim() || !birthDate || !gender) {
        setError(t("register.personalRequired"));
        return;
      }
      if (!isAdultBirthDate(birthDate)) {
        setError(t("register.ageRequired"));
        return;
      }
    }
    if (step === 2) {
      if (!email.trim() || password.length < 6 || !isCompletePhone(phone)) {
        setError(t("register.accountRequired"));
        return;
      }
    }
    setStep((s) => Math.min(s + 1, lastStep));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < lastStep) {
      goNext();
      return;
    }
    setError("");
    if (!role) {
      setError(t("register.roleRequired"));
      return;
    }
    if (!selfie || !idCardPhoto) {
      setError(t("register.photosRequired"));
      return;
    }
    if (!isValidIdCard(idCard)) {
      setError(t("register.idCardInvalid"));
      return;
    }
    setLoading(true);
    try {
      const res = await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        birth_date: birthDate,
        gender,
        phone: phone.trim(),
        role,
        id_card: idCard.trim(),
        selfie,
        id_card_photo: idCardPhoto,
        id_card_back: idCardBack ?? undefined,
      });
      if ("needsEmailVerification" in res && res.needsEmailVerification) {
        const intent = role === "owner" ? "&intent=host" : "";
        window.location.assign(
          `${CLIENT_APP_URL.replace(/\/$/, "")}/verify-email?sent=1&email=${encodeURIComponent(res.email)}${intent}`
        );
        return;
      }
      if (role === "owner" && "token" in res) {
        window.location.assign(guestHandoffUrl(res, "/become-host?apply=1"));
        return;
      }
      logout();
      window.location.assign(CLIENT_APP_URL);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("register.failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="rounded-2xl border border-border bg-card text-card-foreground p-6 sm:p-8">
        <p className="text-sm font-semibold text-brand">{t("register.kicker")}</p>
        <h1 className="mt-1 text-2xl font-bold">{t("register.title")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("register.description")}</p>

        <ol className="mt-6 flex gap-2">
          {steps.map((label, i) => (
            <li key={label} className="flex-1">
              <div className={cn("h-1.5 rounded-full", i <= step ? "bg-brand" : "bg-muted")} />
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  i === step ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {label}
              </p>
            </li>
          ))}
        </ol>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>
          )}

          {step === 0 && (
            <WizardPane step={0}>
            <div className="grid sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole("client")}
                className={cn(
                  "text-left rounded-xl border-2 p-5 transition-colors",
                  role === "client" ? "border-brand bg-accent" : "border-border hover:border-brand"
                )}
              >
                <Search className="h-8 w-8 text-brand mb-3" />
                <p className="font-bold">{t("register.clientTitle")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("register.clientHint")}</p>
              </button>
              <button
                type="button"
                onClick={() => setRole("owner")}
                className={cn(
                  "text-left rounded-xl border-2 p-5 transition-colors",
                  role === "owner" ? "border-brand bg-accent" : "border-border hover:border-brand"
                )}
              >
                <Building2 className="h-8 w-8 text-brand mb-3" />
                <p className="font-bold">{t("register.hostTitle")}</p>
                <p className="text-sm text-muted-foreground mt-1">{t("register.hostHint")}</p>
              </button>
            </div>
            </WizardPane>
          )}

          {step === 1 && (
            <WizardPane step={1}>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t("register.firstName")}</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    autoComplete="given-name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t("register.lastName")}</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    autoComplete="family-name"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">{t("register.birthDate")}</Label>
                <BirthDateInput
                  id="birthDate"
                  value={birthDate}
                  max={maxAdultBirthDate()}
                  onChange={setBirthDate}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">{t("register.gender")}</Label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    required
                    className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                  >
                    <option value="">{t("register.genderPlaceholder")}</option>
                    <option value="male">{t("register.genderMale")}</option>
                    <option value="female">{t("register.genderFemale")}</option>
                    <option value="other">{t("register.genderOther")}</option>
                  </select>
                </div>
            </WizardPane>
          )}

          {step === 2 && (
            <WizardPane step={2}>
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t("register.emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t("register.phone")}</Label>
                <PhoneInput id="phone" value={phone} onChange={setPhone} required />
              </div>
            </WizardPane>
          )}

          {step === 3 && (
            <WizardPane step={3}>
              <p className="text-sm text-muted-foreground">{t("register.identityHint")}</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <IdentityPhotoField
                  id="selfie"
                  label={t("register.selfie")}
                  hint={t("register.selfieHint")}
                  file={selfie}
                  onChange={setSelfie}
                  capture="user"
                />
                <IdentityPhotoField
                  id="id-card-photo"
                  label={t("register.idCardFront")}
                  hint={t("register.idCardPhotoHint")}
                  file={idCardPhoto}
                  onChange={setIdCardPhoto}
                  capture="environment"
                />
                <IdentityPhotoField
                  id="id-card-back"
                  label={t("register.idCardBack")}
                  hint={t("register.idCardBackHint")}
                  file={idCardBack}
                  onChange={setIdCardBack}
                  capture="environment"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_card">{t("register.idCardNumber")}</Label>
                <Input
                  id="id_card"
                  value={idCard}
                  onChange={(e) => setIdCard(e.target.value)}
                  placeholder={t("register.idCardPlaceholder")}
                  required
                />
              </div>
            </WizardPane>
          )}

          <div className="flex gap-3">
            {step > 0 && (
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep((s) => s - 1)}>
                {t("common.back")}
              </Button>
            )}
            <Button type="submit" className="flex-1 bg-brand hover:bg-brand-dark text-white" disabled={loading}>
              {loading
                ? t("common.creatingAccount")
                : step < lastStep
                  ? t("common.next")
                  : t("register.submit")}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-sm text-muted-foreground text-center">
          {t("register.hasAccount")}{" "}
          <Link to="/login" className="text-brand font-medium hover:underline">
            {t("register.signInLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
