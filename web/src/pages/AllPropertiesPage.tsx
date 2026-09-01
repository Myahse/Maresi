import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Map, List } from "lucide-react";
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
  const navigate = useNavigate();
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
  const [showMobileMap, setShowMobileMap] = useState(false);

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

  useEffect(() => {
    load();
  }, [load]);

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

  const listPanel = (
    <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">{t("properties.allTitle")}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{t("properties.allSubtitle")}</p>
      </div>

      <button
        type="button"
        className="md:hidden mb-4 flex items-center gap-2 px-4 py-2 rounded-full border-2 border-brand text-brand text-sm font-semibold"
        onClick={() => setShowMobileMap((v) => !v)}
      >
        {showMobileMap ? <List className="h-4 w-4" /> : <Map className="h-4 w-4" />}
        {showMobileMap ? t("properties.showList") : t("properties.showMap")}
      </button>

      {showMobileMap && (
        <div className="md:hidden mb-4 h-64 rounded-2xl overflow-hidden border-2 border-border">
          <PropertiesMap
            properties={sortedProperties}
            hoveredId={hoveredId}
            onMarkerClick={(id) => navigate(`/properties/${id}`)}
            className="h-full"
          />
        </div>
      )}

      <div className="bg-card rounded-2xl border-2 border-border p-4 sm:p-5 mb-6 shadow-sm sticky top-0 z-10 md:static">
        <PropertyFilters
          values={filters}
          onChange={setFilters}
          onApply={(next) => {
            const v = next ?? filters;
            setFilters(v);
            setAppliedFilters(v);
          }}
          onReset={() => {
            setFilters(defaultFilters);
            setAppliedFilters(defaultFilters);
          }}
        />
      </div>

      {error && <p className="text-destructive mb-4">{error}</p>}
      {!loading && !error && (
        <p className="text-sm text-muted-foreground mb-4">{t("properties.count", { count: sortedProperties.length })}</p>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : sortedProperties.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">{t("dashboard.noneFound")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5 pb-8">
          {sortedProperties.map((p) => (
            <div
              key={p.id}
              onMouseEnter={() => setHoveredId(p.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <PropertyCard
                property={p}
                rental={false}
                onToggleFavorite={toggleFavorite}
                isFavorite={favorites.some((f) => f.property_id === p.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="font-jakarta bg-muted flex flex-col md:flex-row md:fixed md:inset-x-0 md:top-0 md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:top-[4.5rem] lg:bottom-0 md:min-h-0">
      <div className="hidden md:block md:w-[35%] md:h-full border-r border-border">
        <PropertiesMap
          properties={sortedProperties}
          hoveredId={hoveredId}
          onMarkerClick={(id) => navigate(`/properties/${id}`)}
          className="h-full"
        />
      </div>
      <div className="flex-1 md:min-h-0 md:overflow-y-auto md:overscroll-y-contain md:w-[65%] md:h-full">{listPanel}</div>
    </div>
  );
}
