import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/context/AuthModalContext";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Heart, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { HOST_APP_URL } from "@/lib/hostApp";

const ALWAYS_VISIBLE_ROUTES = ["/properties"];

const navLinkClass =
  "text-sm font-semibold text-white/90 hover:text-white transition-colors";

export function Header() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const navigate = useNavigate();
  const pinHeader = ALWAYS_VISIBLE_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));
  const { visible } = useScrollHeader({ disabled: pinHeader });

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <header
        className={cn(
          "hidden lg:block fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out",
          "bg-brand shadow-md",
          !pinHeader && !visible && "-translate-y-full"
        )}
      >
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-[4.5rem] items-center justify-between gap-2 sm:gap-4">
            <Link
              to="/"
              className="font-extrabold italic text-xl sm:text-2xl tracking-tight shrink-0 text-white"
            >
              Maresi
            </Link>

            <nav className="flex items-center gap-6 min-w-0">
              <Link to="/properties" className={navLinkClass}>
                {t("header.browse")}
              </Link>
              {isAuthenticated && (
                <>
                  <Link to="/dashboard" className={navLinkClass}>
                    {t("header.dashboard")}
                  </Link>
                  <Link to="/favorites" className={cn(navLinkClass, "inline-flex items-center gap-1")}>
                    <Heart className="h-4 w-4" />
                    {t("header.favorites")}
                  </Link>
                  {user?.role === "owner" && (
                    <a href={HOST_APP_URL} className={navLinkClass}>
                      {t("header.openHostApp")}
                    </a>
                  )}
                </>
              )}
            </nav>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <ThemeToggle inverted />
              <CurrencyPicker inverted />
              <LanguageSwitcher inverted />

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate("/account")}
                  className="flex w-9 h-9 rounded-full items-center justify-center text-sm font-bold shrink-0 bg-white text-brand"
                  aria-label="Account"
                >
                  {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLogin}
                  className="p-2 rounded-full hover:bg-white/20 transition-colors shrink-0"
                  aria-label={t("header.login")}
                >
                  <User className="h-5 w-5 text-white" />
                </button>
              )}

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={openRegister}
                  className="inline-flex px-3 lg:px-4 py-2 rounded-full text-sm font-semibold bg-white text-brand hover:bg-white/90 transition-colors whitespace-nowrap"
                >
                  {t("header.register")}
                </button>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex px-3 lg:px-4 py-2 rounded-full text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  {t("header.logout")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="hidden lg:block h-16 sm:h-[4.5rem]" aria-hidden />
    </>
  );
}
