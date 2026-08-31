import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Heart, Home, Search, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/context/AuthModalContext";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";
import { HOST_APP_URL } from "@/lib/hostApp";

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const { openLogin, openRegister } = useAuthModal();
  const [moreOpen, setMoreOpen] = useState(false);

  const goProtected = (path: string) => {
    if (!isAuthenticated) {
      openLogin();
      return;
    }
    navigate(path);
  };

  const tabs = [
    { id: "home", to: "/", label: t("nav.home"), icon: Home, active: pathname === "/" },
    {
      id: "browse",
      to: "/properties",
      label: t("nav.browse"),
      icon: Search,
      active: pathname.startsWith("/properties"),
    },
    {
      id: "favorites",
      label: t("nav.favorites"),
      icon: Heart,
      active: pathname.startsWith("/favorites"),
      onClick: () => goProtected("/favorites"),
    },
    {
      id: "visits",
      label: t("nav.visits"),
      icon: CalendarDays,
      active: pathname.startsWith("/visits"),
      onClick: () => goProtected("/visits"),
    },
    {
      id: "account",
      label: t("nav.account"),
      icon: User,
      active: moreOpen || ["/dashboard", "/login", "/register", "/become-host"].some((p) => pathname.startsWith(p)),
      onClick: () => setMoreOpen((o) => !o),
    },
  ] as const;

  return (
    <>
      {moreOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-label={t("common.cancel")}
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 rounded-2xl border border-border bg-card p-4 shadow-xl lg:hidden">
            <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border">
              <ThemeToggle />
              <CurrencyPicker />
              <LanguageSwitcher />
            </div>
            {isAuthenticated ? (
              <div className="flex flex-col gap-1">
                <Link
                  to="/dashboard"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                  onClick={() => setMoreOpen(false)}
                >
                  {t("header.dashboard")}
                </Link>
                {user?.role === "owner" && (
                  <a
                    href={HOST_APP_URL}
                    className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                    onClick={() => setMoreOpen(false)}
                  >
                    {t("header.openHostApp")}
                  </a>
                )}
                <button
                  type="button"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-left hover:bg-muted"
                  onClick={() => {
                    setMoreOpen(false);
                    logout();
                    navigate("/");
                  }}
                >
                  {t("header.logout")}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold text-left hover:bg-muted"
                  onClick={() => {
                    setMoreOpen(false);
                    openLogin();
                  }}
                >
                  {t("header.login")}
                </button>
                <button
                  type="button"
                  className="rounded-full bg-brand px-3 py-2.5 text-sm font-semibold text-white"
                  onClick={() => {
                    setMoreOpen(false);
                    openRegister();
                  }}
                >
                  {t("header.register")}
                </button>
              </div>
            )}
          </div>
        </>
      )}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const className = cn(
              "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold",
              tab.active ? "text-brand" : "text-muted-foreground"
            );
            if ("to" in tab) {
              return (
                <li key={tab.id}>
                  <Link to={tab.to} className={className} onClick={() => setMoreOpen(false)}>
                    <Icon className={cn("h-5 w-5", tab.active && "stroke-[2.25]")} />
                    <span className="truncate">{tab.label}</span>
                  </Link>
                </li>
              );
            }
            return (
              <li key={tab.id}>
                <button type="button" className={className} onClick={"onClick" in tab ? tab.onClick : undefined}>
                  <Icon className={cn("h-5 w-5", tab.active && "stroke-[2.25]")} />
                  <span className="truncate">{tab.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
