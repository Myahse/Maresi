import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Maximize2, Minimize2, Navigation } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/context/LocationContext";
import { ABIDJAN_CENTER, MAPBOX_MARKER, MAPBOX_STYLE, mapboxToken } from "@/lib/mapbox";
import { canOpenDirections, openDrivingDirections } from "@/lib/directions";
import { GEO_WATCH_OPTIONS } from "@/lib/geolocation";

interface PropertyLocationMapProps {
  latitude?: number;
  longitude?: number;
  title: string;
  location: string;
}

export function PropertyLocationMap({ latitude, longitude, title, location }: PropertyLocationMapProps) {
  const { t } = useTranslation();
  const token = mapboxToken();
  const { status, requestAccess } = useUserLocation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const geolocateRef = useRef<mapboxgl.GeolocateControl | null>(null);
  const [expanded, setExpanded] = useState(false);
  const lng = longitude ?? ABIDJAN_CENTER[0];
  const lat = latitude ?? ABIDJAN_CENTER[1];
  const hasCoords = latitude != null && longitude != null;
  const canNavigate = canOpenDirections({ destLat: latitude, destLng: longitude, destLabel: location });

  useEffect(() => {
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [lng, lat],
      zoom: hasCoords ? 15 : 12,
      interactive: true,
      cooperativeGestures: !expanded,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    const geolocate = new mapboxgl.GeolocateControl({
      positionOptions: GEO_WATCH_OPTIONS,
      trackUserLocation: true,
      showUserHeading: true,
      showUserLocation: true,
      showAccuracyCircle: true,
    });
    map.addControl(geolocate, "top-right");
    geolocateRef.current = geolocate;
    new mapboxgl.Marker({ color: MAPBOX_MARKER })
      .setLngLat([lng, lat])
      .setPopup(new mapboxgl.Popup({ offset: 12 }).setText(`${title} — ${location}`))
      .addTo(map);

    const fitWithUser = (userLng: number, userLat: number) => {
      if (!hasCoords) {
        map.easeTo({ center: [userLng, userLat], zoom: 14, duration: 500 });
        return;
      }
      const bounds = new mapboxgl.LngLatBounds([lng, lat], [lng, lat]);
      bounds.extend([userLng, userLat]);
      map.fitBounds(bounds, { padding: expanded ? 72 : 40, maxZoom: 15, duration: 600 });
    };

    let fitted = false;
    geolocate.on("geolocate", (event) => {
      if (!expanded || fitted) return;
      fitted = true;
      fitWithUser(event.coords.longitude, event.coords.latitude);
    });

    const startTracking = () => {
      geolocate.trigger();
    };
    if (map.loaded()) startTracking();
    else map.once("load", startTracking);

    const resize = () => map.resize();
    map.on("load", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      geolocateRef.current = null;
      mapRef.current = null;
      map.remove();
    };
  }, [token, lng, lat, title, location, hasCoords, expanded]);

  useEffect(() => {
    if (status === "granted") geolocateRef.current?.trigger();
  }, [status, expanded]);

  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const startDirections = () => {
    openDrivingDirections({ destLat: latitude, destLng: longitude, destLabel: location || title });
  };

  const openExpanded = () => {
    setExpanded(true);
    if (status !== "granted") requestAccess();
  };

  const directionsButton = canNavigate ? (
    <Button type="button" className="w-full rounded-full bg-brand hover:bg-brand-dark text-white" onClick={startDirections}>
      <Navigation className="h-4 w-4 mr-2" />
      {t("propertyDetails.directions")}
    </Button>
  ) : null;

  if (!token) {
    return (
      <div className="space-y-3">
        <div className="h-56 sm:h-64 rounded-2xl border-2 border-gray-200 flex items-center justify-center text-sm text-gray-600 px-4 text-center">
          {t("wizard.property.mapMissingToken")}
        </div>
        {directionsButton}
      </div>
    );
  }

  const mapChrome = (
    <div className={expanded ? "fixed inset-0 z-[1200] flex flex-col bg-background" : "space-y-3"}>
      <div
        className={
          expanded
            ? "relative min-h-0 flex-1"
            : "relative z-0 isolate h-56 sm:h-64 rounded-2xl overflow-hidden border-2 border-gray-200"
        }
      >
        <div ref={containerRef} className="h-full w-full" />
        {expanded ? (
          <button
            type="button"
            className="absolute left-3 top-3 z-10 inline-flex items-center gap-2 rounded-full bg-card/95 px-3 py-2 text-sm font-semibold text-foreground shadow"
            onClick={() => setExpanded(false)}
          >
            <Minimize2 className="h-4 w-4" />
            {t("propertyDetails.closeMap")}
          </button>
        ) : (
          <button
            type="button"
            className="absolute right-3 bottom-3 z-10 inline-flex items-center gap-2 rounded-full bg-card/95 px-3 py-2 text-sm font-semibold text-foreground shadow"
            onClick={openExpanded}
          >
            <Maximize2 className="h-4 w-4" />
            {t("propertyDetails.expandMap")}
          </button>
        )}
      </div>
      {expanded ? (
        <div className="space-y-2 border-t border-border bg-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {directionsButton}
        </div>
      ) : (
        <>
          {directionsButton}
          <p className="text-xs text-muted-foreground">{t("propertyDetails.directionsHint")}</p>
        </>
      )}
    </div>
  );

  return expanded ? createPortal(mapChrome, document.body) : mapChrome;
}
