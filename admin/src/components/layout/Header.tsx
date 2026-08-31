import { Link, NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const navClass = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-full text-sm font-semibold ${
    isActive ? "bg-white text-brand" : "text-white/90 hover:bg-white/15"
  }`;

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-brand shadow-md">
        <div className="max-w-8xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="font-extrabold italic text-xl text-white shrink-0">
            Maresi Admin
          </Link>
          {isAuthenticated && (
            <nav className="flex items-center gap-1 overflow-x-auto">
              <NavLink to="/" end className={navClass}>
                {t("admin.navOverview")}
              </NavLink>
              <NavLink to="/applications" className={navClass}>
                {t("admin.navApplications")}
              </NavLink>
              <NavLink to="/users" className={navClass}>
                {t("admin.navUsers")}
              </NavLink>
              <NavLink to="/payments" className={navClass}>
                {t("admin.navPayments")}
              </NavLink>
              <NavLink to="/subscriptions" className={navClass}>
                {t("admin.navSubscriptions")}
              </NavLink>
            </nav>
          )}
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle inverted />
            <LanguageSwitcher inverted />
            {isAuthenticated && (
              <button
                type="button"
                className="px-3 py-2 rounded-full text-sm font-semibold border border-white/40 text-white"
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
              >
                {t("header.logout")}
              </button>
            )}
          </div>
        </div>
      </header>
      <div className="h-16" aria-hidden />
    </>
  );
}
