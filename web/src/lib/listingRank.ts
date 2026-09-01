import type { Property } from "@/types";
import { distanceKm, type GeoCoords } from "@/lib/geolocation";

export function isPremiumPositioned(property: Pick<Property, "premium_positioning">): boolean {
  return property.premium_positioning === true;
}

/** Premium paid listings stay first; then nearest, then API order. */
export function sortListings(properties: Property[], coords?: GeoCoords | null): Property[] {
  return [...properties].sort((a, b) => {
    const premium = Number(isPremiumPositioned(b)) - Number(isPremiumPositioned(a));
    if (premium !== 0) return premium;
    if (!coords) return 0;
    const da =
      a.latitude != null && a.longitude != null
        ? distanceKm(coords, a.latitude, a.longitude)
        : Number.POSITIVE_INFINITY;
    const db =
      b.latitude != null && b.longitude != null
        ? distanceKm(coords, b.latitude, b.longitude)
        : Number.POSITIVE_INFINITY;
    return da - db;
  });
}
