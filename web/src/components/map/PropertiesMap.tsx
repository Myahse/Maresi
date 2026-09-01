import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { Property } from "@/types";
import { useTranslation } from "react-i18next";
import { useUserLocation } from "@/context/LocationContext";
import { GEO_WATCH_OPTIONS } from "@/lib/geolocation";
import { listingImageUrls } from "@/lib/media";
import { isPremiumPositioned } from "@/lib/listingRank";
import { ABIDJAN_CENTER, MAPBOX_STYLE, mapboxToken } from "@/lib/mapbox";

interface PropertiesMapProps {
  properties: Property[];
  hoveredId?: string | null;
  onMarkerClick?: (id: string) => void;
  onBackgroundClick?: () => void;
  className?: string;
  cooperativeGestures?: boolean;
}

export function PropertiesMap({
  properties,
  hoveredId,
  onMarkerClick,
  onBackgroundClick,
  className,
  cooperativeGestures = true,
}: PropertiesMapProps) {
  const { t } = useTranslation();
  const token = mapboxToken();
  const { coords, status } = useUserLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const onClickRef = useRef(onMarkerClick);
  const onBackgroundRef = useRef(onBackgroundClick);
  const hoveredRef = useRef(hoveredId);
  const centeredOnUser = useRef(false);
  const statusRef = useRef(status);
  onClickRef.current = onMarkerClick;
  onBackgroundRef.current = onBackgroundClick;
  statusRef.current = status;
  hoveredRef.current = hoveredId;

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
      cooperativeGestures,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
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
    map.on("click", (event) => {
      const target = event.originalEvent.target;
      if (target instanceof Element && target.closest(".maresi-map-marker")) return;
      onBackgroundRef.current?.();
    });
    map.on("load", () => {
      if (statusRef.current === "granted") geolocate.trigger();
    });
    mapRef.current = map;
    const resize = () => map.resize();
    map.on("load", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
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
        const el = photoMarkerElement(p, p.id === hoveredRef.current);
        el.addEventListener("click", (event) => {
          event.stopPropagation();
          onClickRef.current?.(p.id);
        });
        marker = new mapboxgl.Marker({ element: el, anchor: "bottom" })
          .setLngLat([p.longitude, p.latitude])
          .addTo(map);
        markersRef.current.set(p.id, marker);
      } else {
        marker.setLngLat([p.longitude, p.latitude]);
        syncPhotoMarker(marker.getElement(), p, p.id === hoveredRef.current);
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

function photoMarkerElement(property: Property, active: boolean) {
  const el = document.createElement("button");
  el.type = "button";
  el.setAttribute("aria-label", property.title);
  syncPhotoMarker(el, property, active);
  return el;
}

function syncPhotoMarker(el: HTMLElement, property: Property, active: boolean) {
  const premium = isPremiumPositioned(property);
  const photo = listingImageUrls(property.images)[0] ?? "";
  const fallback = `https://placehold.co/96x96/0D9488/white?text=${encodeURIComponent("M")}`;
  el.className = `maresi-map-marker${premium ? " is-premium" : ""}${active ? " is-active" : ""}`;
  el.style.zIndex = active ? "30" : premium ? "12" : "2";
  el.innerHTML = `<span class="maresi-map-pin"><span class="maresi-map-photo"><img src="${escapeHtml(
    photo || fallback
  )}" alt="" /></span><span class="maresi-map-stem"></span><span class="maresi-map-dot"></span></span>`;
  const img = el.querySelector("img");
  if (img) {
    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
    };
  }
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
