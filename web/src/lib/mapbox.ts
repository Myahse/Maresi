export const ABIDJAN_CENTER: [number, number] = [-4.0083, 5.3599];
export const MAPBOX_STYLE = "mapbox://styles/mapbox/streets-v12";
export const MAPBOX_MARKER = "#0D9488";
export const MAPBOX_MARKER_ACTIVE = "#0F766E";

export function mapboxToken(): string {
  return (import.meta.env.VITE_MAPBOX_TOKEN ?? "").trim();
}
