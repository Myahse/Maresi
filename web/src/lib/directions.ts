import { readStoredCoords } from "@/lib/geolocation";

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
