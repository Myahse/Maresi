import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Syncs <title> and html lang with current locale. */
export function DocumentTitle() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.title = t("meta.title");
  }, [t, i18n.language]);

  return null;
}
