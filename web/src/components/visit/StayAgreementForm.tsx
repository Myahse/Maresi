import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signStayAgreement } from "@/services/api";

export function StayAgreementForm({
  visitId,
  onSigned,
}: {
  visitId: string;
  onSigned: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [care, setCare] = useState(false);
  const [damage, setDamage] = useState(false);
  const [rules, setRules] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const ready = care && damage && rules && name.trim().length >= 3;

  const submit = async () => {
    if (!ready) return;
    setLoading(true);
    setError("");
    try {
      await signStayAgreement(visitId, name.trim());
      onSigned();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("visits.agreementFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 pt-2 border-t border-gray-100">
      <h3 className="font-semibold text-foreground">{t("visits.agreementTitle")}</h3>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{t("visits.agreementBody")}</p>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={care} onChange={(e) => setCare(e.target.checked)} />
        <span>{t("visits.agreementCare")}</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={damage} onChange={(e) => setDamage(e.target.checked)} />
        <span>{t("visits.agreementDamage")}</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={rules} onChange={(e) => setRules(e.target.checked)} />
        <span>{t("visits.agreementRules")}</span>
      </label>
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("visits.agreementSignAs")}</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("visits.agreementNamePlaceholder")} />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        className="w-full rounded-full bg-brand hover:bg-brand-dark"
        disabled={!ready || loading}
        onClick={() => void submit()}
      >
        {loading ? t("common.saving") : t("visits.agreementSign")}
      </Button>
    </div>
  );
}
