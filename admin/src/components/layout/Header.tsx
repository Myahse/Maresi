import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-brand to-brand-dark shadow-md">
        <div className="max-w-8xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-extrabold italic text-xl text-white">
            Maresi Admin
          </Link>
          <div className="flex items-center gap-2">
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
