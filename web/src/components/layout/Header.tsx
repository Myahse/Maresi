import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/context/AuthModalContext";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { Menu, X, Heart, User } from "lucide-react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  const desktopNavLinks = (
    <>
      <Link to="/properties" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        {t("header.browse")}
      </Link>
      {isAuthenticated && (
        <>
          <Link to="/dashboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>
            {t("header.dashboard")}
          </Link>
          <Link
            to="/favorites"
            className={cn(navLinkClass, "inline-flex items-center gap-1")}
            onClick={() => setMenuOpen(false)}
          >
            <Heart className="h-4 w-4" />
            {t("header.favorites")}
          </Link>
          {user?.role === "owner" ? (
            <a href={HOST_APP_URL} className={navLinkClass} onClick={() => setMenuOpen(false)}>
              {t("header.openHostApp")}
            </a>
          ) : (
            <Link to="/become-host" className={navLinkClass} onClick={() => setMenuOpen(false)}>
              {t("header.becomeHost")}
            </Link>
          )}
        </>
      )}
    </>
  );

  const mobileMenuLinks = (
    <>
      <Link
        to="/properties"
        className="text-sm font-semibold text-gray-700 hover:text-brand"
        onClick={() => setMenuOpen(false)}
      >
        {t("header.browse")}
      </Link>
      {isAuthenticated && (
        <>
          <Link
            to="/dashboard"
            className="text-sm font-semibold text-gray-700 hover:text-brand"
            onClick={() => setMenuOpen(false)}
          >
            {t("header.dashboard")}
          </Link>
          <Link
            to="/favorites"
            className="text-sm font-semibold text-gray-700 hover:text-brand inline-flex items-center gap-1"
            onClick={() => setMenuOpen(false)}
          >
            <Heart className="h-4 w-4" />
            {t("header.favorites")}
          </Link>
          {user?.role === "owner" ? (
            <a
              href={HOST_APP_URL}
              className="text-sm font-semibold text-gray-700 hover:text-brand"
              onClick={() => setMenuOpen(false)}
            >
              {t("header.openHostApp")}
            </a>
          ) : (
            <Link
              to="/become-host"
              className="text-sm font-semibold text-gray-700 hover:text-brand"
              onClick={() => setMenuOpen(false)}
            >
              {t("header.becomeHost")}
            </Link>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ease-out",
          "bg-gradient-to-r from-brand to-brand-dark shadow-md",
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

            <nav className="hidden lg:flex items-center gap-6 min-w-0">{desktopNavLinks}</nav>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden sm:block">
                <CurrencyPicker inverted />
              </div>
              <LanguageSwitcher className="hidden sm:flex" inverted />

              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="hidden sm:flex w-9 h-9 rounded-full items-center justify-center text-sm font-bold shrink-0 bg-white text-brand"
                  aria-label="Account"
                >
                  {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={openLogin}
                  className="hidden sm:flex p-2 rounded-full hover:bg-white/20 transition-colors shrink-0"
                  aria-label={t("header.login")}
                >
                  <User className="h-5 w-5 text-white" />
                </button>
              )}

              <button
                type="button"
                className="p-2 rounded-full hover:bg-white/20 transition-colors lg:hidden shrink-0"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Menu"
              >
                {menuOpen ? (
                  <X className="h-6 w-6 text-white" />
                ) : (
                  <Menu className="h-6 w-6 text-white" />
                )}
              </button>

              {!isAuthenticated && (
                <button
                  type="button"
                  onClick={openRegister}
                  className="hidden md:inline-flex px-3 lg:px-4 py-2 rounded-full text-sm font-semibold bg-white text-brand hover:bg-white/90 transition-colors whitespace-nowrap"
                >
                  {t("header.register")}
                </button>
              )}
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="hidden md:inline-flex px-3 lg:px-4 py-2 rounded-full text-sm font-semibold border border-white/40 text-white hover:bg-white/10 transition-colors whitespace-nowrap"
                >
                  {t("header.logout")}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg p-4 flex flex-col gap-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
            <div className="flex items-center gap-2 sm:hidden pb-2 border-b border-gray-100">
              <CurrencyPicker />
              <LanguageSwitcher />
            </div>
            {mobileMenuLinks}
            {!isAuthenticated ? (
              <>
                <button
                  type="button"
                  className="text-sm font-semibold text-brand text-left"
                  onClick={() => {
                    setMenuOpen(false);
                    openLogin();
                  }}
                >
                  {t("header.login")}
                </button>
                <button
                  type="button"
                  className="text-center py-2 rounded-full bg-brand text-white font-semibold text-sm"
                  onClick={() => {
                    setMenuOpen(false);
                    openRegister();
                  }}
                >
                  {t("header.register")}
                </button>
              </>
            ) : (
              <button type="button" className="text-sm font-semibold text-left text-gray-700" onClick={handleLogout}>
                {t("header.logout")}
              </button>
            )}
          </div>
        </div>
      )}

      <div className="h-16 sm:h-[4.5rem]" aria-hidden />
    </>
  );
}
