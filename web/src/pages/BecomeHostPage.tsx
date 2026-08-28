import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyHostApplication, submitHostApplication } from "@/services/api";
import type { HostApplication } from "@/types";

const HOST_APP_URL = import.meta.env.VITE_HOST_APP_URL ?? "http://localhost:3001";

export function BecomeHostPage() {
  const { t } = useTranslation();
  const { user, applySession } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [city, setCity] = useState("");
  const [idCard, setIdCard] = useState("");
  const [message, setMessage] = useState("");
  const [current, setCurrent] = useState<HostApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMyHostApplication()
      .then(setCurrent)
      .catch(() => setCurrent(null))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (current?.token && current.status === "approved" && user) {
      applySession({
        token: current.token,
        user: { ...user, role: "owner" },
      });
    }
  }, [current, user, applySession]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await submitHostApplication({
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim() || undefined,
        message: message.trim() || undefined,
        id_card: idCard.trim() || undefined,
      });
      setCurrent(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("hostApply.failed"));
    } finally {
      setSaving(false);
    }
  };

  const approved = current?.status === "approved" || user?.role === "owner";
  const pending = current?.status === "pending";
  const rejected = current?.status === "rejected";

  return (
    <div className="font-jakarta max-w-xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t("hostApply.title")}</h1>
        <p className="text-sm text-gray-600 mt-1">{t("hostApply.hint")}</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground">{t("common.loading")}</p>
      ) : approved ? (
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-4">
          <p className="font-semibold text-brand">{t("hostApply.approved")}</p>
          <a
            href={HOST_APP_URL}
            className="inline-flex items-center justify-center w-full rounded-full bg-brand hover:bg-brand-dark text-white text-sm font-semibold py-2.5"
          >
            {t("hostApply.openHostApp")}
          </a>
        </div>
      ) : pending ? (
        <div className="rounded-2xl border-2 border-gray-200 bg-white p-6">
          <p className="font-semibold">{t("hostApply.pending")}</p>
          <p className="text-sm text-gray-600 mt-2">{t("hostApply.pendingHint")}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border-2 border-gray-200 bg-white p-6 space-y-4">
          {rejected && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">
              {current?.admin_note || t("hostApply.rejected")}
            </p>
          )}
          {error && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded-md">{error}</p>}
          <div className="space-y-2">
            <Label htmlFor="host-name">{t("register.fullName")}</Label>
            <Input id="host-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host-phone">{t("hostApply.phone")}</Label>
            <Input id="host-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host-city">{t("hostApply.city")}</Label>
            <Input id="host-city" value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host-id">{t("hostApply.idCard")}</Label>
            <Input id="host-id" value={idCard} onChange={(e) => setIdCard(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host-msg">{t("hostApply.message")}</Label>
            <textarea
              id="host-msg"
              className="flex min-h-[90px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full rounded-full bg-brand hover:bg-brand-dark" disabled={saving}>
            {saving ? t("common.saving") : t("hostApply.submit")}
          </Button>
        </form>
      )}
    </div>
  );
}
