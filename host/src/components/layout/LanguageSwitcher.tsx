import { useTranslation } from "react-i18next";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface LanguageSwitcherProps {
  className?: string;
  inverted?: boolean;
}

export function LanguageSwitcher({ className, inverted }: LanguageSwitcherProps) {
  const { i18n, t } = useTranslation();

  return (
    <div className={cn("flex items-center gap-1.5 text-sm shrink-0", className)}>
      <Globe
        className={cn("h-4 w-4 shrink-0", inverted ? "text-white/90" : "text-muted-foreground")}
        aria-hidden
      />
      <label htmlFor="maresi-lang" className="sr-only">
        {t("language.label")}
      </label>
      <select
        id="maresi-lang"
        value={i18n.language.startsWith("fr") ? "fr" : "en"}
        onChange={(e) => void i18n.changeLanguage(e.target.value)}
        className={cn(
          "rounded-full border px-2 py-1.5 text-xs sm:text-sm font-semibold cursor-pointer outline-none focus:ring-2 focus:ring-brand/40",
          inverted
            ? "border-white/40 bg-white/20 text-white [&>option]:text-gray-900 [&>option]:bg-white"
            : "border-gray-200 bg-white text-gray-700"
        )}
      >
        <option value="en">{t("language.en")}</option>
        <option value="fr">{t("language.fr")}</option>
      </select>
    </div>
  );
}
