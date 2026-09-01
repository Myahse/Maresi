import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, LayoutDashboard, Users, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const tabs = [
    { to: "/", label: t("admin.navOverview"), icon: LayoutDashboard, active: pathname === "/" },
    {
      to: "/applications",
      label: t("admin.navApplications"),
      icon: ClipboardList,
      active: pathname.startsWith("/applications"),
    },
    { to: "/users", label: t("admin.navUsers"), icon: Users, active: pathname.startsWith("/users") },
    {
      to: "/visits",
      label: t("admin.navVisits"),
      icon: ClipboardList,
      active: pathname.startsWith("/visits"),
    },
  ] as const;

  const moreActive = moreOpen || pathname.startsWith("/subscriptions") || pathname.startsWith("/payments");

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
              <LanguageSwitcher />
            </div>
            <Link
              to="/payments"
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
              onClick={() => setMoreOpen(false)}
            >
              {t("admin.navPayments")}
            </Link>
            <Link
              to="/subscriptions"
              className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
              onClick={() => setMoreOpen(false)}
            >
              {t("admin.navSubscriptions")}
            </Link>
            {isAuthenticated && (
              <button
                type="button"
                className="rounded-xl px-3 py-2.5 text-sm font-semibold text-left hover:bg-muted w-full"
                onClick={() => {
                  setMoreOpen(false);
                  logout();
                  navigate("/login");
                }}
              >
                {t("header.logout")}
              </button>
            )}
          </div>
        </>
      )}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5 h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <li key={tab.to}>
                <Link
                  to={tab.to}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold",
                    tab.active ? "text-brand" : "text-muted-foreground"
                  )}
                  onClick={() => setMoreOpen(false)}
                >
                  <Icon className={cn("h-5 w-5", tab.active && "stroke-[2.25]")} />
                  <span className="truncate">{tab.label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={cn(
                "flex h-full w-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold",
                moreActive ? "text-brand" : "text-muted-foreground"
              )}
              onClick={() => setMoreOpen((o) => !o)}
            >
              <Wallet className={cn("h-5 w-5", moreActive && "stroke-[2.25]")} />
              <span className="truncate">{t("nav.more")}</span>
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
