import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { MapPin, Phone, Mail } from "lucide-react";
import { useAuthModal } from "@/context/AuthModalContext";
import { useAuth } from "@/hooks/useAuth";
import { HOST_APP_URL } from "@/lib/hostApp";

export function Footer() {
  const { t } = useTranslation();
  const { openRegister } = useAuthModal();
  const { user } = useAuth();
  const year = new Date().getFullYear();

  const linkClass = "text-gray-200 hover:text-white transition-colors text-sm";

  return (
    <footer className="hidden lg:block bg-background font-jakarta mt-auto">
      <div className="mx-4 sm:mx-8 mb-8">
        <div className="w-full bg-brand rounded-xl overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
              <div className="space-y-4">
                <h3 className="font-extrabold italic text-xl text-white">Maresi</h3>
                <p className="text-gray-200 text-sm leading-relaxed">{t("footer.tagline")}</p>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-white">{t("footer.quickLinks")}</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/" className={linkClass}>
                      {t("footer.home")}
                    </Link>
                  </li>
                  <li>
                    <Link to="/properties" className={linkClass}>
                      {t("header.browse")}
                    </Link>
                  </li>
                  <li>
                    <Link to="/dashboard" className={linkClass}>
                      {t("header.dashboard")}
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className={linkClass}>
                      {t("footer.terms")}
                    </Link>
                  </li>
                  {!user && (
                    <li>
                      <button type="button" onClick={openRegister} className={linkClass}>
                        {t("header.register")}
                      </button>
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-white">{t("footer.services")}</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/properties" className={linkClass}>
                      {t("footer.serviceListings")}
                    </Link>
                  </li>
                  <li>
                    <Link to="/visits" className={linkClass}>
                      {t("footer.serviceVisits")}
                    </Link>
                  </li>
                  {user?.role === "owner" ? (
                    <li>
                      <a href={HOST_APP_URL} className={linkClass}>
                        {t("header.openHostApp")}
                      </a>
                    </li>
                  ) : !user ? (
                    <li>
                      <Link to="/become-host" className={linkClass}>
                        {t("footer.serviceOwner")}
                      </Link>
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-lg text-white">{t("footer.contact")}</h4>
                <div className="space-y-3 text-sm text-gray-200">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    <div>
                      <p>{t("footer.addressLine1")}</p>
                      <p>{t("footer.addressLine2")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                    <a href="tel:+2252722499696" className="hover:text-white transition-colors">
                      +225 27 22 49 96 96
                    </a>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                    <a href="mailto:maresi00225@gmail.com" className="hover:text-white transition-colors">
                      maresi00225@gmail.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm text-gray-200 text-center md:text-left">
                {t("footer.copyright", { year })}
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
