import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ABIDJAN_CENTER, MAPBOX_MARKER, MAPBOX_STYLE, mapboxToken } from "@/lib/mapbox";
import { canOpenDirections, fetchDrivingRoute, openDrivingDirections, type RoutePreview } from "@/lib/directions";
import { readStoredCoords } from "@/lib/geolocation";

interface PropertyLocationMapProps {
  latitude?: number;
  longitude?: number;
  title: string;
  location: string;
}

const ROUTE_SOURCE = "maresi-route";
const ROUTE_LAYER = "maresi-route-line";

export function PropertyLocationMap({ latitude, longitude, title, location }: PropertyLocationMapProps) {
  const { t } = useTranslation();
  const token = mapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const lng = longitude ?? ABIDJAN_CENTER[0];
  const lat = latitude ?? ABIDJAN_CENTER[1];
  const hasCoords = latitude != null && longitude != null;
  const canNavigate = canOpenDirections({ destLat: latitude, destLng: longitude, destLabel: location });
  const [route, setRoute] = useState<RoutePreview | null>(null);

  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [lng, lat],
      zoom: hasCoords ? 15 : 12,
      interactive: true,
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    new mapboxgl.Marker({ color: MAPBOX_MARKER })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`${title} — ${location}`))
      .addTo(map);
    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [token, lng, lat, title, location, hasCoords]);

  useEffect(() => {
    if (!token || !hasCoords || latitude == null || longitude == null) return;
    const origin = readStoredCoords();
    if (!origin) return;
    let cancelled = false;
    void fetchDrivingRoute(origin.longitude, origin.latitude, longitude, latitude).then((preview) => {
      if (cancelled || !preview) return;
      setRoute(preview);
      const map = mapRef.current;
      if (!map) return;
      const apply = () => {
        const data = { type: "Feature" as const, properties: {}, geometry: { type: "LineString" as const, coordinates: preview.coordinates } };
        const existing = map.getSource(ROUTE_SOURCE) as mapboxgl.GeoJSONSource | undefined;
        if (existing) {
          existing.setData(data);
        } else {
          map.addSource(ROUTE_SOURCE, { type: "geojson", data });
          map.addLayer({
            id: ROUTE_LAYER,
            type: "line",
            source: ROUTE_SOURCE,
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#0D9488", "line-width": 4, "line-opacity": 0.85 },
          });
        }
        const bounds = preview.coordinates.reduce(
          (b, coord) => b.extend(coord),
          new mapboxgl.LngLatBounds(preview.coordinates[0], preview.coordinates[0])
        );
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 600 });
      };
      if (map.isStyleLoaded()) apply();
      else map.once("load", apply);
    });
    return () => {
      cancelled = true;
    };
  }, [token, hasCoords, latitude, longitude]);

  const startDirections = () => {
    openDrivingDirections({ destLat: latitude, destLng: longitude, destLabel: location || title });
  };

  if (!token) {
    return (
      <div className="space-y-3">
        <div className="h-56 sm:h-64 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-sm text-gray-600 px-4 text-center">
          {t("wizard.property.mapMissingToken")}
        </div>
        {canNavigate && (
          <Button type="button" className="w-full rounded-full bg-brand hover:bg-brand-dark text-white" onClick={startDirections}>
            <Navigation className="h-4 w-4 mr-2" />
            {t("propertyDetails.directions")}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative z-0 isolate h-56 sm:h-64 rounded-2xl overflow-hidden border-2 border-gray-200">
        <div ref={containerRef} className="h-full w-full" />
        {route && (
          <p className="absolute left-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-semibold text-foreground shadow">
            {t("propertyDetails.routeSummary", { minutes: route.durationMin, km: route.distanceKm })}
          </p>
        )}
      </div>
      {canNavigate && (
        <Button type="button" className="w-full rounded-full bg-brand hover:bg-brand-dark text-white" onClick={startDirections}>
          <Navigation className="h-4 w-4 mr-2" />
          {t("propertyDetails.directions")}
        </Button>
      )}
      <p className="text-xs text-muted-foreground">{t("propertyDetails.directionsHint")}</p>
    </div>
  );
}
