import { mapboxToken } from "@/lib/mapbox";
import { readStoredCoords } from "@/lib/geolocation";

export type RoutePreview = {
  coordinates: [number, number][];
  durationMin: number;
  distanceKm: number;
};

export function googleMapsDrivingUrl(opts: {
  destLat?: number;
  destLng?: number;
  destLabel?: string;
  originLat?: number;
  originLng?: number;
}): string {
  const dest =
    opts.destLat != null && opts.destLng != null
      ? `${opts.destLat},${opts.destLng}`
      : encodeURIComponent(opts.destLabel?.trim() || "");
  const origin =
    opts.originLat != null && opts.originLng != null
      ? `&origin=${opts.originLat},${opts.originLng}`
      : "";
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving${origin}`;
}

export function openDrivingDirections(opts: {
  destLat?: number;
  destLng?: number;
  destLabel?: string;
}): void {
  const stored = readStoredCoords();
  const url = googleMapsDrivingUrl({
    ...opts,
    originLat: stored?.latitude,
    originLng: stored?.longitude,
  });
  window.open(url, "_blank", "noopener,noreferrer");
}

export function canOpenDirections(opts: { destLat?: number; destLng?: number; destLabel?: string }) {
  return (opts.destLat != null && opts.destLng != null) || Boolean(opts.destLabel?.trim());
}

export async function fetchDrivingRoute(
  originLng: number,
  originLat: number,
  destLng: number,
  destLat: number
): Promise<RoutePreview | null> {
  const token = mapboxToken();
  if (!token) return null;
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving/${originLng},${originLat};${destLng},${destLat}` +
    `?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as {
    routes?: { duration?: number; distance?: number; geometry?: { coordinates?: [number, number][] } }[];
  };
  const route = data.routes?.[0];
  const coordinates = route?.geometry?.coordinates;
  if (!coordinates?.length) return null;
  return {
    coordinates,
    durationMin: Math.max(1, Math.round((route.duration ?? 0) / 60)),
    distanceKm: Math.max(0.1, Math.round(((route.distance ?? 0) / 1000) * 10) / 10),
  };
}
