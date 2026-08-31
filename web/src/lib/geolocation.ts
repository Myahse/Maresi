export type GeoCoords = {
  latitude: number;
  longitude: number;
  accuracy: number;
  updatedAt: number;
};

const LAST_KEY = "maresi-last-geo";
const DISMISS_KEY = "maresi-location-prompt-dismissed";

export const GEO_QUICK_OPTIONS: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 60_000,
  timeout: 8_000,
};

export const GEO_WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 8_000,
  timeout: 20_000,
};

export function geolocationSupported() {
  return typeof navigator !== "undefined" && "geolocation" in navigator;
}

export function readStoredCoords(): GeoCoords | null {
  try {
    const raw = localStorage.getItem(LAST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GeoCoords;
    if (typeof parsed.latitude !== "number" || typeof parsed.longitude !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredCoords(coords: GeoCoords) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

export function isLocationPromptDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissLocationPrompt() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function coordsFromPosition(pos: GeolocationPosition): GeoCoords {
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    updatedAt: pos.timestamp || Date.now(),
  };
}

export async function queryGeoPermission(): Promise<PermissionState | "unknown"> {
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    return "unknown";
  }
}

export function distanceKm(
  from: { latitude: number; longitude: number },
  latitude: number,
  longitude: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(latitude - from.latitude);
  const dLng = toRad(longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(latitude)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function onPosition(
  pos: GeolocationPosition,
  onUpdate: (coords: GeoCoords) => void
) {
  const coords = coordsFromPosition(pos);
  writeStoredCoords(coords);
  onUpdate(coords);
}

export function watchUserPosition(
  onUpdate: (coords: GeoCoords) => void,
  onError?: (err: GeolocationPositionError) => void
): () => void {
  if (!geolocationSupported()) return () => undefined;

  navigator.geolocation.getCurrentPosition(
    (pos) => onPosition(pos, onUpdate),
    () => undefined,
    GEO_QUICK_OPTIONS
  );

  const id = navigator.geolocation.watchPosition(
    (pos) => onPosition(pos, onUpdate),
    onError,
    GEO_WATCH_OPTIONS
  );
  return () => navigator.geolocation.clearWatch(id);
}
