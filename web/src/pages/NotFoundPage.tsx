import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-16 bg-background">
      <div className="w-full max-w-lg text-center">
        <p className="text-7xl sm:text-8xl font-extrabold italic text-brand">404</p>
        <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-foreground">{t("notFound.title")}</h1>
        <p className="mt-3 text-muted-foreground">{t("notFound.description")}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex justify-center px-6 py-2.5 rounded-full bg-brand text-white font-semibold text-sm hover:bg-brand-dark transition-colors"
          >
            {t("notFound.home")}
          </Link>
          <Link
            to="/properties"
            className="inline-flex justify-center px-6 py-2.5 rounded-full border border-brand text-brand font-semibold text-sm hover:bg-brand hover:text-white transition-colors"
          >
            {t("notFound.browse")}
          </Link>
        </div>
      </div>
    </div>
  );
}
