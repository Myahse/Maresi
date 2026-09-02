import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getVisitRequest, signHostAgreement } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VisitRequest } from "@/types";

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString();
}

export function HostStayAgreementPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [visit, setVisit] = useState<VisitRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [checks, setChecks] = useState([false, false, false, false, false]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getVisitRequest(id)
      .then(setVisit)
      .catch((e) => setError(e instanceof Error ? e.message : t("visits.agreementFailed")))
      .finally(() => setLoading(false));
  }, [id, t]);

  const guestSigned = Boolean(visit?.agreement_full_name);
  const hostSigned = Boolean(visit?.host_agreement_full_name);
  const canSign = visit?.status === "awaiting_host_agreement" && !hostSigned;
  const ready = canSign && checks.every(Boolean) && name.trim().length >= 3;

  const toggle = (index: number) => {
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const submit = async () => {
    if (!id || !ready) return;
    setSaving(true);
    setError("");
    try {
      const updated = await signHostAgreement(id, name.trim());
      setVisit(updated);
      navigate("/owner/visits", { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("visits.agreementFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="font-jakarta max-w-3xl mx-auto px-4 py-12 text-muted-foreground">{t("common.loading")}</p>;
  }

  if (!visit) {
    return (
      <div className="font-jakarta max-w-3xl mx-auto px-4 py-12">
        <p className="text-destructive">{error || t("visits.agreementFailed")}</p>
        <Link to="/owner/visits" className="text-brand text-sm mt-4 inline-block">
          ← {t("owner.visitValidation")}
        </Link>
      </div>
    );
  }

  const articles = [
    t("visits.agreementArt1"),
    t("visits.agreementArt2"),
    t("visits.agreementArt3"),
    t("visits.agreementArt4"),
    t("visits.agreementArt5"),
  ];

  return (
    <div className="font-jakarta min-h-screen bg-muted text-foreground py-5 sm:py-8 px-3 sm:px-4">
      <article className="max-w-3xl mx-auto bg-card text-card-foreground shadow-lg border-2 border-border rounded-2xl px-4 sm:px-12 py-7 sm:py-10">
        <header className="border-b-2 border-brand pb-6 mb-8 text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-brand font-semibold">Maresi</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">{t("visits.agreementTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("visits.agreementDocRef", { id: visit.id.slice(0, 8) })}</p>
        </header>

        {guestSigned && (
          <p className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-foreground text-sm px-4 py-3">
            {t("visits.agreementAlreadySigned", {
              name: visit.agreement_full_name,
              date: visit.agreement_signed_at ? new Date(visit.agreement_signed_at).toLocaleString() : "",
            })}
          </p>
        )}
        {canSign && (
          <p className="mb-6 rounded-lg bg-brand/10 border border-brand/30 text-foreground text-sm px-4 py-3">
            {t("visits.agreementHostSignHint")}
          </p>
        )}
        {hostSigned && (
          <p className="mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-foreground text-sm px-4 py-3">
            {t("visits.agreementHostSigned", {
              name: visit.host_agreement_full_name,
              date: visit.host_agreement_signed_at ? new Date(visit.host_agreement_signed_at).toLocaleString() : "",
            })}
          </p>
        )}

        <section className="space-y-2 text-sm leading-relaxed mb-8 text-foreground">
          <p>{t("visits.agreementPreambleHost")}</p>
        </section>

        <section className="grid sm:grid-cols-2 gap-4 text-sm border border-border bg-muted/60 p-4 mb-8 rounded-xl">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("visits.agreementProperty")}</p>
            <p className="font-semibold text-foreground">{visit.property_title ?? t("common.property")}</p>
            {visit.location && <p className="text-muted-foreground">{visit.location}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("visits.stayDates")}</p>
            <p className="font-semibold text-foreground">
              {formatDate(visit.check_in)}
              {" → "}
              {formatDate(visit.check_out)}
            </p>
            {visit.requester_name && (
              <p className="text-muted-foreground">{visit.requester_name}</p>
            )}
          </div>
        </section>

        {canSign && (
          <label className="mb-4 flex items-start gap-3 rounded-xl border border-brand/30 bg-brand/5 px-3 py-3 text-sm font-semibold text-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              checked={checks.every(Boolean)}
              onChange={(e) => setChecks(articles.map(() => e.target.checked))}
            />
            {t("visits.agreementAcceptAll")}
          </label>
        )}

        <ol className="space-y-5 mb-10">
          {articles.map((text, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed text-foreground">
              {canSign ? (
                <input
                  type="checkbox"
                  className="mt-1 shrink-0 h-4 w-4 accent-brand"
                  checked={checks[index]}
                  onChange={() => toggle(index)}
                />
              ) : (
                <span className="mt-0.5 shrink-0 font-semibold text-brand">{index + 1}.</span>
              )}
              <span>
                <span className="font-semibold">{t("visits.agreementArticle", { n: index + 1 })} — </span>
                {text}
              </span>
            </li>
          ))}
        </ol>

        {canSign ? (
          <div className="space-y-4 border-t border-border pt-6">
            <p className="text-sm font-semibold text-foreground">{t("visits.agreementSignAs")}</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("visits.agreementNamePlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("visits.agreementSignLegal")}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="w-full sm:w-auto rounded-full bg-brand hover:bg-brand-dark"
              disabled={!ready || saving}
              onClick={() => void submit()}
            >
              {saving ? t("common.saving") : t("visits.agreementHostSign")}
            </Button>
          </div>
        ) : (
          <div className="border-t border-border pt-6 text-sm space-y-2">
            <p>
              <span className="text-muted-foreground">{t("visits.signedBy")}: </span>
              <span className="font-semibold text-foreground">{visit.agreement_full_name || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">{t("visits.signedByHost")}: </span>
              <span className="font-semibold text-foreground">
                {visit.host_agreement_full_name || t("visits.waitingHostSignature")}
              </span>
            </p>
          </div>
        )}

        <footer className="mt-10 pt-4 text-xs text-muted-foreground border-t border-border">
          <Link to="/owner/visits" className="text-brand hover:underline">
            ← {t("visits.agreementBackToVisits")}
          </Link>
        </footer>
      </article>
    </div>
  );
}
