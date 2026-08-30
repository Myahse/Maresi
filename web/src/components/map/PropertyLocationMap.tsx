import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTranslation } from "react-i18next";
import { ABIDJAN_CENTER, MAPBOX_MARKER, MAPBOX_STYLE, mapboxToken } from "@/lib/mapbox";

interface PropertyLocationMapProps {
  latitude?: number;
  longitude?: number;
  title: string;
  location: string;
}

export function PropertyLocationMap({ latitude, longitude, title, location }: PropertyLocationMapProps) {
  const { t } = useTranslation();
  const token = mapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lng = longitude ?? ABIDJAN_CENTER[0];
  const lat = latitude ?? ABIDJAN_CENTER[1];

  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [lng, lat],
      zoom: latitude != null && longitude != null ? 15 : 12,
      interactive: true,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    new mapboxgl.Marker({ color: MAPBOX_MARKER })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`${title} — ${location}`))
      .addTo(map);
    return () => {
      map.remove();
    };
  }, [token, lng, lat, title, location, latitude, longitude]);

  if (!token) {
    return (
      <div className="h-56 sm:h-64 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-sm text-gray-600 px-4 text-center">
        {t("wizard.property.mapMissingToken")}
      </div>
    );
  }

  return (
    <div className="relative z-0 isolate h-56 sm:h-64 rounded-2xl overflow-hidden border-2 border-gray-200">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
