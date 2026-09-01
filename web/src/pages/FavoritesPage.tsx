import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getFavorites, removeFavorite } from "@/services/api";
import { PropertyCard } from "@/components/property/PropertyCard";
import type { Favorite } from "@/types";
import { getProperty } from "@/services/api";
import type { Property } from "@/types";

export function FavoritesPage() {
  const { t } = useTranslation();
  const [items, setItems] = useState<(Favorite & Property)[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const favs = await getFavorites();
      const withDetails = await Promise.all(
        favs.map(async (f) => {
          try {
            const p = await getProperty(f.property_id);
            return { ...f, ...p };
          } catch {
            return null;
          }
        })
      );
      setItems(withDetails.filter(Boolean) as (Favorite & Property)[]);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const remove = async (propertyId: string) => {
    await removeFavorite(propertyId);
    setItems((prev) => prev.filter((i) => i.property_id !== propertyId));
  };

  if (loading) return <div className="container mx-auto px-4 py-8">{t("common.loading")}</div>;

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl font-bold mb-5 sm:mb-6">{t("favorites.title")}</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">
          {t("favorites.empty")}{" "}
          <Link to="/properties" className="text-primary hover:underline">{t("favorites.browseLink")}</Link>.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:gap-4 md:gap-6">
          {items.map((item) => (
            <div key={item.id} className="relative">
              <PropertyCard
                property={item}
                rental
                onToggleFavorite={remove}
                isFavorite
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
