import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthModal } from "@/context/AuthModalContext";
import { useAuth } from "@/hooks/useAuth";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyCardSkeleton } from "@/components/property/PropertyCardSkeleton";
import { getProperties } from "@/services/api";
import type { Property } from "@/types";
import { isPremiumPositioned } from "@/lib/listingRank";
import { HomeHero } from "@/components/layout/HomeHero";

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
        <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-3 sm:gap-6 pb-4 -mx-1 px-1">
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
      <div className="flex overflow-x-auto hide-scrollbar snap-x snap-mandatory gap-3 sm:gap-4 md:gap-6 pb-4 -mx-1 px-1">
        {list.slice(0, 8).map((p) => (
          <PropertyCard key={p.id} property={p} rental />
        ))}
      </div>
    );
  };

  return (
    <div className="font-jakarta flex flex-col bg-background">
      <HomeHero />

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
