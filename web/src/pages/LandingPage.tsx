import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthModal } from "@/context/AuthModalContext";
import { useAuth } from "@/hooks/useAuth";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyCardSkeleton } from "@/components/property/PropertyCardSkeleton";
import { getProperties } from "@/services/api";
import type { Property } from "@/types";
import { isPremiumPositioned } from "@/lib/listingRank";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80";

const SERVICE_KEYS = [
  "landing.serviceRent",
  "landing.serviceBrowse",
  "landing.serviceVisits",
  "landing.serviceOwner",
] as const;

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openRegister } = useAuthModal();
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch(() => setProperties([]))
      .finally(() => setLoading(false));
  }, []);

  const { featured, others, featuredIsPremium } = useMemo(() => {
    const premium = properties.filter(isPremiumPositioned);
    const rest = properties.filter((p) => !isPremiumPositioned(p));
    if (premium.length > 0) {
      return { featured: premium, others: rest, featuredIsPremium: true };
    }
    const primary = properties.filter((p) => /abidjan/i.test(p.location));
    return {
      featured: primary.length > 0 ? primary : properties.slice(0, 5),
      others: primary.length > 0 ? properties.filter((p) => !/abidjan/i.test(p.location)) : [],
      featuredIsPremium: false,
    };
  }, [properties]);

  const renderRow = (list: Property[], emptyKey: string) => {
    if (loading) {
      return (
        <div className="flex flex-col sm:flex-row sm:overflow-x-auto sm:hide-scrollbar gap-3 sm:gap-6 pb-4">
          {[1, 2, 3, 4].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <div className="py-12 text-center text-muted-foreground">
          <p className="font-medium">{t(emptyKey)}</p>
          <p className="text-sm mt-1">{t("landing.checkBack")}</p>
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 gap-3 sm:gap-0 sm:grid-cols-none sm:flex sm:space-x-4 md:space-x-6 sm:overflow-x-auto sm:hide-scrollbar pb-4">
        {list.slice(0, 8).map((p) => (
          <PropertyCard key={p.id} property={p} rental />
        ))}
      </div>
    );
  };

  return (
    <div className="font-jakarta flex flex-col bg-background">
      {/* Hero image — desktop */}
      <section className="hidden sm:block w-full px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3">
        <div className="max-w-8xl mx-auto">
          <div className="relative h-40 sm:h-56 md:h-64 lg:h-72 overflow-hidden rounded-2xl sm:rounded-3xl">
            <img src={HERO_IMAGE} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-brand/80" />
            <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-8 text-white max-w-lg">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{t("landing.heroTitle")}</h1>
              <p className="text-sm sm:text-base text-white/90 mt-1 hidden md:block">{t("landing.heroSubtitle")}</p>
              <div className="hidden md:flex gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => navigate("/properties")}
                  className="px-6 py-2.5 rounded-full bg-white text-brand font-semibold text-sm hover:bg-white/90 transition-colors"
                >
                  {t("landing.browseNow")}
                </button>
                {!isAuthenticated && (
                  <button
                    type="button"
                    onClick={openRegister}
                    className="px-6 py-2.5 rounded-full border-2 border-white text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                  >
                    {t("landing.getStarted")}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile hero */}
      <section className="sm:hidden px-4 pt-5 pb-6 bg-brand text-white">
        <p className="font-extrabold italic text-xl tracking-tight">Maresi</p>
        <h1 className="text-2xl font-bold mt-3">{t("landing.heroTitle")}</h1>
        <p className="text-white/90 mt-2 text-sm">{t("landing.heroSubtitle")}</p>
        <div className="flex gap-3 mt-4">
          <Link
            to="/properties"
            className="flex-1 text-center py-2.5 rounded-full bg-white text-brand font-semibold text-sm"
          >
            {t("landing.browseNow")}
          </Link>
          {!isAuthenticated && (
            <button
              type="button"
              onClick={openRegister}
              className="flex-1 text-center py-2.5 rounded-full border-2 border-white text-white font-semibold text-sm"
            >
              {t("landing.getStarted")}
            </button>
          )}
        </div>
      </section>

      {/* Services pills */}
      <section className="hidden sm:block w-full px-3 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-4">
        <div className="max-w-8xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h2 className="text-xs sm:text-sm font-bold text-foreground shrink-0">{t("landing.dedicatedServices")}</h2>
            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {SERVICE_KEYS.map((key) => (
                <span
                  key={key}
                  className="bg-brand/10 border border-brand text-brand px-3 py-1 rounded-full font-bold text-[10px] sm:text-xs whitespace-nowrap"
                >
                  {t(key)}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured listings */}
      <section className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6">
        <div className="max-w-8xl mx-auto">
          <div className="flex justify-between items-end gap-4 mb-4 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-2xl font-bold text-foreground">{t("landing.available")}</h2>
              <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
                {t(featuredIsPremium ? "landing.featuredPremium" : "landing.featuredCity")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/properties")}
              className="px-4 sm:px-8 py-1.5 sm:py-2 rounded-full border-2 border-brand text-brand font-medium text-xs sm:text-sm hover:bg-brand hover:text-white transition-colors whitespace-nowrap"
            >
              {t("landing.seeAll")} &gt;
            </button>
          </div>
          {renderRow(featured, "landing.noFeatured")}
        </div>
      </section>

      {others.length > 0 && (
        <section className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 bg-muted">
          <div className="max-w-8xl mx-auto">
            <div className="flex justify-between items-end gap-4 mb-4 sm:mb-6">
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">{t("landing.moreListings")}</h2>
                <p className="text-xs sm:text-sm font-semibold text-muted-foreground">{t("landing.otherCities")}</p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/properties")}
                className="px-4 sm:px-8 py-1.5 sm:py-2 rounded-full border-2 border-brand text-brand font-medium text-xs sm:text-sm hover:bg-brand hover:text-white transition-colors whitespace-nowrap"
              >
                {t("landing.seeAll")} &gt;
              </button>
            </div>
            {renderRow(others, "landing.noOther")}
          </div>
        </section>
      )}

      {!isAuthenticated && (
        <section className="py-12 px-4 bg-brand/5 border-t border-brand/20">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-xl font-bold text-foreground">{t("landing.listTitle")}</h2>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">{t("landing.listText")}</p>
            <button
              type="button"
              onClick={openRegister}
              className="inline-block mt-6 px-8 py-3 rounded-full bg-brand text-white font-semibold hover:bg-brand-dark transition-colors"
            >
              {t("landing.registerNow")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
