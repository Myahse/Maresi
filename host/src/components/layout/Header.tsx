import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { isApprovedHost } from "@/lib/hostAccess";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { LocaleSettingsButton } from "@/components/layout/LocaleSettingsButton";
import { useUnreadVisits } from "@/context/UnreadVisitsContext";
import { UnreadBadge } from "@/components/ui/UnreadBadge";

const navLinkClass = "text-sm font-semibold text-white/90 hover:text-white transition-colors";

export function Header() {
  const { t } = useTranslation();
  const { isAuthenticated, logout, user } = useAuth();
  const approved = isApprovedHost(user);
  const { totalUnread } = useUnreadVisits();
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
            <Link to="/owner" className="shrink-0" aria-label="Maresi Host">
              <BrandLogo variant="white" className="h-12" />
            </Link>
            <nav className="flex items-center gap-6">
              {isAuthenticated && (
                <>
                  <Link to="/owner" className={navLinkClass}>
                    {t("owner.title")}
                  </Link>
                  {approved ? (
                    <>
                      <Link to="/owner/visits" className={`${navLinkClass} relative inline-flex items-center`}>
                        {t("dashboard.cards.validateVisits")}
                        <UnreadBadge count={totalUnread} className="-top-2 -right-3" />
                      </Link>
                      <Link to="/owner/subscription" className={navLinkClass}>
                        {t("payments.walletNav")}
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/owner/new" className={navLinkClass}>
                        {t("owner.addDraft")}
                      </Link>
                      <Link to="/owner/application" className={navLinkClass}>
                        {t("hostApply.title")}
                      </Link>
                    </>
                  )}
                </>
              )}
            </nav>
            <div className="flex items-center gap-2">
              <LocaleSettingsButton inverted />
              {isAuthenticated && (
                <>
                  <Link to="/owner/account" className={navLinkClass}>
                    {t("nav.account")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex px-3 py-2 rounded-full text-sm font-semibold border border-white/40 text-white"
                  >
                    {t("header.logout")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <div className="hidden lg:block h-16" aria-hidden />
    </>
  );
}
