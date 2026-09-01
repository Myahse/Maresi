import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getVisitRequest, signStayAgreement } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { VisitRequest } from "@/types";

function formatDate(value?: string) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString();
}

export function StayAgreementPage() {
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

  const signed = Boolean(visit?.agreement_accepted || visit?.agreement_full_name);
  const canSign = visit?.status === "awaiting_agreement" && !signed;
  const ready = canSign && checks.every(Boolean) && name.trim().length >= 3;

  const toggle = (index: number) => {
    setChecks((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const submit = async () => {
    if (!id || !ready) return;
    setSaving(true);
    setError("");
    try {
      const updated = await signStayAgreement(id, name.trim());
      setVisit(updated);
      navigate("/visits", { replace: true });
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
        <Link to="/visits" className="text-brand text-sm mt-4 inline-block">
          ← {t("visits.title")}
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
    <div className="font-jakarta min-h-screen bg-[#f4efe6] py-8 px-4">
      <article className="max-w-3xl mx-auto bg-white shadow-lg border border-[#e6dcc8] px-6 sm:px-12 py-10">
        <header className="border-b-2 border-[#0D9488] pb-6 mb-8 text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-[#0D9488] font-semibold">Maresi</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mt-2">{t("visits.agreementTitle")}</h1>
          <p className="text-sm text-muted-foreground mt-2">{t("visits.agreementDocRef", { id: visit.id.slice(0, 8) })}</p>
        </header>

        {signed && (
          <p className="mb-6 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-4 py-3">
            {t("visits.agreementAlreadySigned", {
              name: visit.agreement_full_name,
              date: visit.agreement_signed_at ? new Date(visit.agreement_signed_at).toLocaleString() : "",
            })}
          </p>
        )}

        <section className="space-y-2 text-sm leading-relaxed mb-8">
          <p>{t("visits.agreementPreamble")}</p>
        </section>

        <section className="grid sm:grid-cols-2 gap-4 text-sm border border-[#e6dcc8] bg-[#faf7f1] p-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("visits.agreementProperty")}</p>
            <p className="font-semibold">{visit.property_title ?? t("common.property")}</p>
            {visit.location && <p className="text-muted-foreground">{visit.location}</p>}
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{t("visits.stayDates")}</p>
            <p className="font-semibold">
              {formatDate(visit.check_in)}
              {(visit.arrival_time || visit.check_in_time)
                ? ` · ${String(visit.arrival_time || visit.check_in_time).slice(0, 5)}`
                : ""}
              {" → "}
              {formatDate(visit.check_out)}
              {(visit.departure_time || visit.check_out_time)
                ? ` · ${String(visit.departure_time || visit.check_out_time).slice(0, 5)}`
                : ""}
            </p>
            {visit.guests_count != null && (
              <p className="text-muted-foreground">
                {visit.guests_count} {t("visits.guests")}
              </p>
            )}
          </div>
        </section>

        <ol className="space-y-5 mb-10">
          {articles.map((text, index) => (
            <li key={index} className="flex gap-3 text-sm leading-relaxed">
              {canSign ? (
                <input
                  type="checkbox"
                  className="mt-1 shrink-0"
                  checked={checks[index]}
                  onChange={() => toggle(index)}
                />
              ) : (
                <span className="mt-0.5 shrink-0 font-semibold text-[#0D9488]">{index + 1}.</span>
              )}
              <span>
                <span className="font-semibold">{t("visits.agreementArticle", { n: index + 1 })} — </span>
                {text}
              </span>
            </li>
          ))}
        </ol>

        {canSign ? (
          <div className="space-y-4 border-t border-[#e6dcc8] pt-6">
            <p className="text-sm font-semibold">{t("visits.agreementSignAs")}</p>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("visits.agreementNamePlaceholder")}
              className="max-w-md border-[#d6cbb4]"
            />
            <p className="text-xs text-muted-foreground">{t("visits.agreementSignLegal")}</p>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button
              className="rounded-full bg-brand hover:bg-brand-dark"
              disabled={!ready || saving}
              onClick={() => void submit()}
            >
              {saving ? t("common.saving") : t("visits.agreementSign")}
            </Button>
          </div>
        ) : (
          <div className="border-t border-[#e6dcc8] pt-6 text-sm">
            <p>
              <span className="text-muted-foreground">{t("visits.signedBy")}: </span>
              <span className="font-semibold">{visit.agreement_full_name || "—"}</span>
            </p>
          </div>
        )}

        <footer className="mt-10 pt-4 text-xs text-muted-foreground border-t border-[#eee6d8]">
          <Link to="/visits" className="text-brand hover:underline">
            ← {t("visits.agreementBackToVisits")}
          </Link>
        </footer>
      </article>
    </div>
  );
}
