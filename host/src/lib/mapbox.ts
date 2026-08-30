export const ABIDJAN_CENTER: [number, number] = [-4.0083, 5.3599];
export const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";
export const MAPBOX_MARKER = "#0D9488";

export type MapboxPlace = {
  street: string;
  city: string;
  country: string;
  label: string;
  latitude: number;
  longitude: number;
};

type MapboxContext = { id: string; text?: string; text_fr?: string };
type MapboxFeature = {
  id?: string;
  text?: string;
  place_name?: string;
  address?: string;
  place_type?: string[];
  center?: [number, number];
  context?: MapboxContext[];
};

export function mapboxToken(): string {
  return (import.meta.env.VITE_MAPBOX_TOKEN ?? "").trim();
}

function contextText(ctx: MapboxContext[] | undefined, prefix: string): string {
  const item = ctx?.find((c) => c.id.startsWith(prefix));
  return item?.text?.trim() ?? "";
}

export function placeFromFeature(
  feature: MapboxFeature,
  longitude: number,
  latitude: number
): MapboxPlace {
  const ctx = feature.context ?? [];
  const streetFromAddress =
    feature.address && feature.text ? `${feature.address} ${feature.text}`.trim() : "";
  const street =
    streetFromAddress ||
    (feature.place_type?.includes("address") ? feature.text ?? "" : "") ||
    contextText(ctx, "address") ||
    feature.text ||
    "";
  const city =
    contextText(ctx, "place") ||
    contextText(ctx, "locality") ||
    contextText(ctx, "district") ||
    (feature.place_type?.includes("place") ? feature.text ?? "" : "");
  const country = contextText(ctx, "country");
  const label =
    [street, city, country].filter(Boolean).join(", ") || feature.place_name?.trim() || "";
  return { street, city, country, label, latitude, longitude };
}

async function geocode(url: string): Promise<MapboxFeature[]> {
  const token = mapboxToken();
  if (!token) return [];
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = (await res.json()) as { features?: MapboxFeature[] };
  return Array.isArray(data.features) ? data.features : [];
}

export async function reverseGeocode(
  longitude: number,
  latitude: number,
  language: string
): Promise<MapboxPlace | null> {
  const token = mapboxToken();
  const lang = language.startsWith("fr") ? "fr" : "en";
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json` +
    `?access_token=${encodeURIComponent(token)}&language=${lang}&limit=1` +
    `&types=address,poi,neighborhood,locality,place,district,region,country`;
  const features = await geocode(url);
  const feature = features[0];
  if (!feature) {
    return {
      street: "",
      city: "",
      country: "",
      label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      latitude,
      longitude,
    };
  }
  return placeFromFeature(feature, longitude, latitude);
}

export async function searchPlaces(
  query: string,
  language: string
): Promise<MapboxPlace[]> {
  const token = mapboxToken();
  const q = query.trim();
  if (!token || q.length < 2) return [];
  const lang = language.startsWith("fr") ? "fr" : "en";
  const [lng, lat] = ABIDJAN_CENTER;
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json` +
    `?access_token=${encodeURIComponent(token)}&language=${lang}&limit=6` +
    `&proximity=${lng},${lat}&types=address,poi,neighborhood,locality,place`;
  const features = await geocode(url);
  return features
    .map((feature) => {
      const [longitude, latitude] = feature.center ?? ABIDJAN_CENTER;
      return placeFromFeature(feature, longitude, latitude);
    })
    .filter((p) => p.label);
}
