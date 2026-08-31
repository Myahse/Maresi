import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Property } from "@/types";
import { usePriceFormatter } from "@/context/CurrencyContext";
import { useTranslation } from "react-i18next";
import { useUserLocation } from "@/context/LocationContext";
import { GEO_WATCH_OPTIONS } from "@/lib/geolocation";
import {
  ABIDJAN_CENTER,
  MAPBOX_MARKER,
  MAPBOX_MARKER_ACTIVE,
  MAPBOX_STYLE,
  mapboxToken,
} from "@/lib/mapbox";

interface PropertiesMapProps {
  properties: Property[];
  hoveredId?: string | null;
  onMarkerClick?: (id: string) => void;
  className?: string;
}

export function PropertiesMap({ properties, hoveredId, onMarkerClick, className }: PropertiesMapProps) {
  const { t } = useTranslation();
  const { formatPrice } = usePriceFormatter();
  const token = mapboxToken();
  const { coords, status } = useUserLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const onClickRef = useRef(onMarkerClick);
  const formatRef = useRef(formatPrice);
  const centeredOnUser = useRef(false);
  const statusRef = useRef(status);
  onClickRef.current = onMarkerClick;
  formatRef.current = formatPrice;
  statusRef.current = status;

  const withCoords = useMemo(
    () =>
      properties.filter(
        (p): p is Property & { latitude: number; longitude: number } =>
          p.latitude != null && p.longitude != null
      ),
    [properties]
  );

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const first = withCoords[0];
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: first ? [first.longitude, first.latitude] : ABIDJAN_CENTER,
      zoom: 12,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: GEO_WATCH_OPTIONS,
      trackUserLocation: true,
      showUserHeading: true,
      showAccuracyCircle: true,
    });
    map.addControl(geolocate, "top-right");
    geolocateRef.current = geolocate;
    map.on("load", () => {
      if (statusRef.current === "granted") geolocate.trigger();
    });
    mapRef.current = map;
    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();
      geolocateRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const keep = new Set(withCoords.map((p) => p.id));
    markersRef.current.forEach((marker, id) => {
      if (!keep.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });
    withCoords.forEach((p) => {
      let marker = markersRef.current.get(p.id);
      if (!marker) {
        marker = new mapboxgl.Marker({ color: p.id === hoveredId ? MAPBOX_MARKER_ACTIVE : MAPBOX_MARKER })
          .setLngLat([p.longitude, p.latitude])
          .setPopup(
            new mapboxgl.Popup({ offset: 12 }).setHTML(
              `<div class="text-sm font-jakarta min-w-[140px]"><p class="font-bold">${escapeHtml(
                p.title
              )}</p><p class="font-semibold">${escapeHtml(formatRef.current(p.price))}</p><p>${escapeHtml(
                p.location
              )}</p></div>`
            )
          )
          .addTo(map);
        marker.getElement().style.cursor = "pointer";
        marker.getElement().addEventListener("click", () => onClickRef.current?.(p.id));
        markersRef.current.set(p.id, marker);
      } else {
        marker.setLngLat([p.longitude, p.latitude]);
      }
    });
  }, [withCoords, hoveredId]);

  useEffect(() => {
    if (status === "granted") geolocateRef.current?.trigger();
  }, [status]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !coords || centeredOnUser.current || hoveredId) return;
    centeredOnUser.current = true;
    map.easeTo({ center: [coords.longitude, coords.latitude], zoom: 13, duration: 700 });
  }, [coords, hoveredId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hoveredId) return;
    const hovered = withCoords.find((p) => p.id === hoveredId);
    if (hovered) {
      map.easeTo({ center: [hovered.longitude, hovered.latitude], zoom: 14, duration: 700 });
    }
  }, [hoveredId, withCoords]);

  if (!token) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-sm text-gray-600 ${className ?? "h-full"}`}>
        {t("wizard.property.mapMissingToken")}
      </div>
    );
  }

  return (
    <div className={`relative z-0 isolate ${className ?? "h-full w-full min-h-[280px]"}`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
