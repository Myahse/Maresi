import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navLinkClass = "text-sm font-semibold text-white/90 hover:text-white transition-colors";

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <header className="hidden lg:block fixed top-0 left-0 right-0 z-50 bg-brand shadow-md">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2">
            <Link to="/owner" className="font-extrabold italic text-xl text-white">
              Maresi Host
            </Link>
            <nav className="flex items-center gap-6">
              {isAuthenticated && (
                <>
                  <Link to="/owner" className={navLinkClass}>
                    {t("owner.title")}
                  </Link>
                  <Link to="/owner/visits" className={navLinkClass}>
                    {t("dashboard.cards.validateVisits")}
                  </Link>
                  <Link to="/owner/subscription" className={navLinkClass}>
                    {t("payments.walletNav")}
                  </Link>
                </>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <ThemeToggle inverted />
              <CurrencyPicker inverted />
              <LanguageSwitcher inverted />
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex px-3 py-2 rounded-full text-sm font-semibold border border-white/40 text-white"
                >
                  {t("header.logout")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="hidden lg:block h-16" aria-hidden />
    </>
  );
}
