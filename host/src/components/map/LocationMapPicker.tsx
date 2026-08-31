import { useEffect, useRef, useState, type ReactNode } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useTranslation } from "react-i18next";
import {
  ABIDJAN_CENTER,
  MAPBOX_MARKER,
  MAPBOX_STYLE,
  mapboxToken,
  reverseGeocode,
  searchPlaces,
  type MapboxPlace,
} from "@/lib/mapbox";

interface LocationMapPickerProps {
  latitude?: string;
  longitude?: string;
  onChange: (place: MapboxPlace) => void;
  children?: ReactNode;
}

export function LocationMapPicker({
  latitude,
  longitude,
  onChange,
  children,
}: LocationMapPickerProps) {
  const { t, i18n } = useTranslation();
  const token = mapboxToken();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MapboxPlace[]>([]);
  const [busy, setBusy] = useState(false);

  const lng = longitude ? Number(longitude) : ABIDJAN_CENTER[0];
  const lat = latitude ? Number(latitude) : ABIDJAN_CENTER[1];
  const hasPin = Boolean(latitude && longitude);

  const applyPlace = (place: MapboxPlace, map?: mapboxgl.Map | null) => {
    const target = map ?? mapRef.current;
    if (target) {
      target.easeTo({ center: [place.longitude, place.latitude], zoom: 15, duration: 600 });
      if (!markerRef.current) {
        markerRef.current = new mapboxgl.Marker({ color: MAPBOX_MARKER, draggable: true })
          .setLngLat([place.longitude, place.latitude])
          .addTo(target);
        markerRef.current.on("dragend", () => {
          const pos = markerRef.current?.getLngLat();
          if (pos) void lookup(pos.lng, pos.lat);
        });
      } else {
        markerRef.current.setLngLat([place.longitude, place.latitude]);
      }
    }
    onChange(place);
  };

  const lookup = async (nextLng: number, nextLat: number) => {
    setBusy(true);
    try {
      const place = await reverseGeocode(nextLng, nextLat, i18n.language);
      if (place) applyPlace(place);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: MAPBOX_STYLE,
      center: [lng, lat],
      zoom: hasPin ? 15 : 12,
    });
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event) => {
      void lookup(event.lngLat.lng, event.lngLat.lat);
    });
    if (hasPin) {
      markerRef.current = new mapboxgl.Marker({ color: MAPBOX_MARKER, draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const pos = markerRef.current?.getLngLat();
        if (pos) void lookup(pos.lng, pos.lat);
      });
      void lookup(lng, lat);
    }
    mapRef.current = map;
    const resize = () => map.resize();
    map.on("load", resize);
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // Map is created once; later pin moves go through applyPlace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }
    const handle = window.setTimeout(() => {
      void searchPlaces(q, i18n.language).then(setSuggestions);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [query, i18n.language]);

  if (!token) {
    return (
      <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
        {t("wizard.property.mapMissingToken")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-6 lg:min-h-[28rem]">
      <div
        ref={containerRef}
        className="h-56 w-full rounded-2xl overflow-hidden border-2 border-border sm:h-72 lg:col-start-1 lg:row-start-1 lg:row-span-2 lg:h-full lg:min-h-[28rem]"
      />
      <div className="relative order-first lg:order-none lg:col-start-2 lg:row-start-1">
        <label htmlFor="map-search" className="sr-only">
          {t("wizard.property.mapSearch")}
        </label>
        <input
          id="map-search"
          type="search"
          enterKeyHint="search"
          autoComplete="street-address"
          className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base sm:text-sm"
          placeholder={t("wizard.property.mapSearch")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-border bg-card shadow-lg">
            {suggestions.map((place) => (
              <li key={`${place.latitude}-${place.longitude}-${place.label}`}>
                <button
                  type="button"
                  className="w-full text-left px-3 py-3 text-base sm:text-sm sm:py-2 hover:bg-muted"
                  onClick={() => {
                    applyPlace(place);
                    setQuery(place.label);
                    setSuggestions([]);
                  }}
                >
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {busy && <p className="mt-2 text-sm text-muted-foreground">{t("common.loading")}</p>}
      </div>
      <div className="min-w-0 lg:col-start-2 lg:row-start-2">{children}</div>
    </div>
  );
}
