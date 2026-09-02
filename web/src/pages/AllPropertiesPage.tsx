import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { getProperties, getFavorites, addFavorite, removeFavorite } from "@/services/api";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyFilters, type FilterValues } from "@/components/property/PropertyFilters";
import { PropertyCardSkeleton } from "@/components/property/PropertyCardSkeleton";
import { PropertiesMap } from "@/components/map/PropertiesMap";
import { useAuth } from "@/hooks/useAuth";
import { useAuthModal } from "@/context/AuthModalContext";
import { useUserLocation } from "@/context/LocationContext";
import { sortListings } from "@/lib/listingRank";
import type { Property, Favorite } from "@/types";

const defaultFilters: FilterValues = {
  location: "",
  minPrice: "",
  maxPrice: "",
  property_type: "",
};

export function AllPropertiesPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { requireAuth } = useAuthModal();
  const { coords } = useUserLocation();
  const [properties, setProperties] = useState<Property[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [filters, setFilters] = useState<FilterValues>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(defaultFilters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPhone, setIsPhone] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches
  );
  const sheetItemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const onChange = () => setIsPhone(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const props = await getProperties({
        location: appliedFilters.location || undefined,
        minPrice: appliedFilters.minPrice ? Number(appliedFilters.minPrice) : undefined,
        maxPrice: appliedFilters.maxPrice ? Number(appliedFilters.maxPrice) : undefined,
        property_type: appliedFilters.property_type || undefined,
      });
      setProperties(props);
      if (isAuthenticated) {
        const favs = await getFavorites();
        setFavorites(favs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("dashboard.failedLoad"));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, isAuthenticated, t]);

  const sortedProperties = useMemo(() => sortListings(properties, coords), [properties, coords]);
  const activeId = selectedId ?? hoveredId;
  const previewProperty = sortedProperties.find((p) => p.id === activeId) ?? null;

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    sheetItemRefs.current[selectedId]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [selectedId]);

  const toggleFavorite = (propertyId: string) => {
    requireAuth(async () => {
      const isFav = favorites.some((f) => f.property_id === propertyId);
      try {
        if (isFav) await removeFavorite(propertyId);
        else await addFavorite(propertyId);
        setFavorites((prev) =>
          isFav
            ? prev.filter((f) => f.property_id !== propertyId)
            : [...prev, { id: "", property_id: propertyId, created_at: "" }]
        );
      } catch {
        /* ignore */
      }
    });
  };

  const applyFilters = (next?: FilterValues) => {
    const v = next ?? filters;
    setFilters(v);
    setAppliedFilters(v);
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  const desktopList = (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("properties.allTitle")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("properties.allSubtitle")}</p>
      </div>

      <div className="bg-card rounded-2xl border-2 border-border p-4 sm:p-5 mb-6 shadow-sm">
        <PropertyFilters
          values={filters}
          onChange={setFilters}
          onApply={applyFilters}
          onReset={resetFilters}
        />
      </div>

      {error && <p className="text-destructive mb-4">{error}</p>}
      {!loading && !error && (
        <p className="text-sm text-muted-foreground mb-4">{t("properties.count", { count: sortedProperties.length })}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:gap-4 md:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedProperties.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">{t("dashboard.noneFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:gap-4 md:gap-6 pb-8">
          {sortedProperties.map((p) => (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <PropertyCard
                property={p}
                rental
                className="!w-full !max-w-none !min-w-0 sm:!w-72 md:!w-80 lg:!w-[340px]"
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites.some((f) => f.property_id === p.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  if (isPhone) {
    return (
      <div className="fixed inset-x-0 top-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] bg-muted">
        <PropertiesMap
          properties={sortedProperties}
          hoveredId={activeId}
          onMarkerClick={setSelectedId}
          onBackgroundClick={() => setSelectedId(null)}
          cooperativeGestures={false}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute top-3 left-3 right-14 z-10">
          <div className="rounded-2xl border-2 border-border bg-card/95 backdrop-blur-md p-3 shadow-lg">
            <PropertyFilters
              compact
              values={filters}
              onChange={setFilters}
              onApply={applyFilters}
              onReset={resetFilters}
            />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-20 rounded-t-3xl border-t border-border bg-card shadow-[0_-10px_30px_rgba(0,0,0,0.14)]">
          <div className="flex justify-center pt-2">
            <span className="h-1.5 w-10 rounded-full bg-border" />
          </div>
          <div className="flex items-end justify-between gap-3 px-4 pb-2 pt-1">
            <div>
              <h1 className="text-base font-bold text-foreground">{t("properties.listSheet")}</h1>
              {!loading && (
                <p className="text-xs text-muted-foreground">
                  {t("properties.count", { count: sortedProperties.length })}
                </p>
              )}
            </div>
          </div>
          <div className="overflow-x-auto hide-scrollbar snap-x snap-mandatory px-3 pb-3">
            {error && <p className="text-destructive text-sm px-1 mb-2">{error}</p>}
            {loading ? (
              <div className="flex gap-3">
                {[1, 2, 3].map((i) => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            ) : sortedProperties.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1 py-6 text-center">{t("dashboard.noneFound")}</p>
            ) : (
              <div className="flex gap-3">
                {sortedProperties.map((p) => (
                  <div
                    key={p.id}
                    ref={(el) => {
                      sheetItemRefs.current[p.id] = el;
                    }}
                    onClick={() => setSelectedId(p.id)}
                    className={p.id === selectedId ? "ring-2 ring-brand rounded-2xl shrink-0" : "shrink-0"}
                  >
                    <PropertyCard
                      property={p}
                      rental
                      onToggleFavorite={toggleFavorite}
                      isFavorite={favorites.some((f) => f.property_id === p.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex fixed inset-x-0 top-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:top-[4.5rem] lg:bottom-0 min-h-0 bg-muted">
      <div className="w-[35%] h-full border-r border-border relative">
        <PropertiesMap
          properties={sortedProperties}
          hoveredId={activeId}
          onMarkerClick={setSelectedId}
          onBackgroundClick={() => setSelectedId(null)}
          className="h-full"
        />
        {previewProperty && (
          <div className="absolute inset-x-3 bottom-3 z-10 flex justify-center pointer-events-none">
            <div className="pointer-events-auto w-full max-w-[340px]">
              <PropertyCard
                property={previewProperty}
                rental
                className="!w-full shadow-xl"
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites.some((f) => f.property_id === previewProperty.id)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-y-contain w-[65%] h-full">
        {desktopList}
      </div>
    </div>
  );
}
