import { useTranslation } from "react-i18next";

export function TermsPage() {
  const { t } = useTranslation();
  return (
    <div className="font-jakarta max-w-3xl mx-auto px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">{t("footer.terms")}</h1>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{t("legal.termsBody")}</p>
    </div>
  );
}
