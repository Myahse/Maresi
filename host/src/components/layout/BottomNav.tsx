import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Building2, CalendarDays, Plus, User, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { isApprovedHost } from "@/lib/hostAccess";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { CurrencyPicker } from "@/components/layout/CurrencyPicker";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";
import { CLIENT_APP_URL, clientHostRegisterUrl } from "@/lib/clientApp";

export function BottomNav() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
  const approved = isApprovedHost(user);
  const [moreOpen, setMoreOpen] = useState(false);

  const listingsActive = pathname === "/" || pathname === "/owner";
  const visitsActive = pathname.startsWith("/owner/visits");
  const addActive = pathname.startsWith("/owner/new") || pathname.startsWith("/owner/edit");
  const walletActive = pathname.startsWith("/owner/subscription");

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
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                  onClick={() => setMoreOpen(false)}
                >
                  {t("header.login")}
                </Link>
                <a
                  href={clientHostRegisterUrl()}
                  className="rounded-full bg-brand px-3 py-2.5 text-sm font-semibold text-white text-center"
                  onClick={() => setMoreOpen(false)}
                >
                  {t("login.registerOnClient")}
                </a>
                <a
                  href={CLIENT_APP_URL}
                  className="rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-muted"
                >
                  {t("nav.home")}
                </a>
              </div>
            )}
          </div>
        </>
      )}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <ul className="grid grid-cols-5 h-16 items-end">
          <li>
            <Link
              to="/owner"
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                listingsActive ? "text-brand" : "text-muted-foreground"
              )}
              onClick={() => setMoreOpen(false)}
            >
              <Building2 className={cn("h-5 w-5", listingsActive && "stroke-[2.25]")} />
              <span className="truncate px-1">{t("nav.listings")}</span>
            </Link>
          </li>
          <li>
            <Link
              to="/owner/visits"
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                visitsActive ? "text-brand" : "text-muted-foreground"
              )}
              onClick={() => setMoreOpen(false)}
            >
              <CalendarDays className={cn("h-5 w-5", visitsActive && "stroke-[2.25]")} />
              <span className="truncate px-1">{t("nav.visits")}</span>
            </Link>
          </li>
          <li>
            <Link
              to={approved ? "/owner/new" : "/owner/application"}
              className="flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold text-brand"
              onClick={() => setMoreOpen(false)}
            >
              <span
                className={cn(
                  "-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-brand text-white shadow-lg",
                  addActive && "ring-2 ring-brand/40"
                )}
              >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
              </span>
              <span className="truncate px-1 mt-0.5">{t("nav.add")}</span>
            </Link>
          </li>
          <li>
            <Link
              to="/owner/subscription"
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                walletActive ? "text-brand" : "text-muted-foreground"
              )}
              onClick={() => setMoreOpen(false)}
            >
              <Wallet className={cn("h-5 w-5", walletActive && "stroke-[2.25]")} />
              <span className="truncate px-1">{t("nav.wallet")}</span>
            </Link>
          </li>
          <li>
            {isAuthenticated ? (
              <Link
                to="/owner/account"
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                  pathname.startsWith("/owner/account") ? "text-brand" : "text-muted-foreground"
                )}
                onClick={() => setMoreOpen(false)}
              >
                <User className={cn("h-5 w-5", pathname.startsWith("/owner/account") && "stroke-[2.25]")} />
                <span className="truncate px-1">{t("nav.account")}</span>
              </Link>
            ) : (
              <button
                type="button"
                className={cn(
                  "flex h-16 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-semibold",
                  moreOpen ? "text-brand" : "text-muted-foreground"
                )}
                onClick={() => setMoreOpen((o) => !o)}
              >
                <User className={cn("h-5 w-5", moreOpen && "stroke-[2.25]")} />
                <span className="truncate px-1">{t("nav.account")}</span>
              </button>
            )}
          </li>
        </ul>
      </nav>
    </>
  );
}
