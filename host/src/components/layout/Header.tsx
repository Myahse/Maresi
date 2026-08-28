import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { Menu, X } from "lucide-react";

const navLinkClass = "text-sm font-semibold text-white/90 hover:text-white transition-colors";

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/login");
  };

  const links = (
    <>
      <Link to="/owner" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t("owner.title")}
      </Link>
      <Link to="/owner/visits" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t("dashboard.cards.validateVisits")}
      </Link>
      <Link to="/owner/subscription" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t("payments.subscriptionNav")}
      </Link>
    </>
  );

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-brand to-brand-dark shadow-md">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link to="/owner" className="font-extrabold italic text-xl text-white">
              Maresi Host
            </Link>
            <nav className="hidden lg:flex items-center gap-6">{isAuthenticated && links}</nav>
            <div className="flex items-center gap-2">
              <CurrencyPicker inverted />
              <LanguageSwitcher inverted />
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden md:inline-flex px-3 py-2 rounded-full text-sm font-semibold border border-white/40 text-white"
                >
                  {t("header.logout")}
                </button>
              )}
              <button type="button" className="lg:hidden p-2 text-white" onClick={() => setMenuOpen((o) => !o)}>
                {menuOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>
        </div>
      </header>
      {menuOpen && isAuthenticated && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="absolute top-16 left-0 right-0 bg-white p-4 flex flex-col gap-3">
            <Link to="/owner" onClick={() => setMenuOpen(false)}>{t("owner.title")}</Link>
            <Link to="/owner/visits" onClick={() => setMenuOpen(false)}>{t("dashboard.cards.validateVisits")}</Link>
            <Link to="/owner/subscription" onClick={() => setMenuOpen(false)}>{t("payments.subscriptionNav")}</Link>
            <button type="button" onClick={handleLogout}>{t("header.logout")}</button>
          </div>
        </div>
      )}
      <div className="h-16" aria-hidden />
    </>
  );
}
