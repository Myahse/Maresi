import L from "leaflet";

const ICON_BASE = "https://unpkg.com/leaflet@1.9.4/dist/images";

/** Fix default marker icons (Vite-friendly CDN URLs) */
export const defaultMarkerIcon = L.icon({
  iconUrl: `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl: `${ICON_BASE}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export const activeMarkerIcon = L.icon({
  iconUrl: `${ICON_BASE}/marker-icon.png`,
  iconRetinaUrl: `${ICON_BASE}/marker-icon-2x.png`,
  shadowUrl: `${ICON_BASE}/marker-shadow.png`,
  iconSize: [35, 57],
  iconAnchor: [17, 57],
  popupAnchor: [1, -48],
  shadowSize: [41, 41],
});

export const ABIDJAN_CENTER: [number, number] = [5.3599, -4.0083];
