import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { updateMyLocation } from "@/services/api";
import {
  dismissLocationPrompt,
  distanceKm,
  geolocationSupported,
  isLocationPromptDismissed,
  queryGeoPermission,
  readStoredCoords,
  watchUserPosition,
  type GeoCoords,
} from "@/lib/geolocation";

const LAST_SYNC_KEY = "maresi-last-geo-sync";

export type LocationStatus = "idle" | "requesting" | "granted" | "denied" | "unavailable";

interface LocationContextValue {
  status: LocationStatus;
  coords: GeoCoords | null;
  supported: boolean;
  promptVisible: boolean;
  requestAccess: () => void;
  dismissPrompt: () => void;
}

const LocationContext = createContext<LocationContextValue | null>(null);

function readLastSync(): GeoCoords | null {
  try {
    const raw = localStorage.getItem(LAST_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GeoCoords;
  } catch {
    return null;
  }
}

function writeLastSync(coords: GeoCoords) {
  try {
    localStorage.setItem(LAST_SYNC_KEY, JSON.stringify(coords));
  } catch {
    /* ignore */
  }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const supported = geolocationSupported();
  const [status, setStatus] = useState<LocationStatus>(supported ? "idle" : "unavailable");
  const [coords, setCoords] = useState<GeoCoords | null>(() =>
    typeof window === "undefined" ? null : readStoredCoords()
  );
  const [promptVisible, setPromptVisible] = useState(false);
  const stopWatch = useRef<(() => void) | null>(null);

  const startWatch = useCallback(() => {
    if (!supported) return;
    stopWatch.current?.();
    setStatus("requesting");
    stopWatch.current = watchUserPosition(
      (next) => {
        setCoords(next);
        setStatus("granted");
        setPromptVisible(false);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setPromptVisible(false);
          return;
        }
        if (!readStoredCoords()) setStatus("denied");
      }
    );
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    void queryGeoPermission().then((state) => {
      if (cancelled) return;
      if (state === "granted") {
        startWatch();
        return;
      }
      if (state === "denied") {
        setStatus("denied");
        return;
      }
      if (!isLocationPromptDismissed()) setPromptVisible(true);
    });
    return () => {
      cancelled = true;
      stopWatch.current?.();
      stopWatch.current = null;
    };
  }, [supported, startWatch]);

  useEffect(() => {
    if (!supported) return;
    const resume = () => {
      if (document.visibilityState === "visible" && status === "granted") startWatch();
    };
    document.addEventListener("visibilitychange", resume);
    return () => document.removeEventListener("visibilitychange", resume);
  }, [supported, status, startWatch]);

  useEffect(() => {
    if (!isAuthenticated || !coords) return;
    const last = readLastSync();
    if (last && Date.now() - last.updatedAt < 30 * 60 * 1000 && distanceKm(last, coords.latitude, coords.longitude) < 0.4) {
      return;
    }
    void updateMyLocation(coords.latitude, coords.longitude)
      .then(() => writeLastSync(coords))
      .catch(() => undefined);
  }, [isAuthenticated, coords]);

  const requestAccess = useCallback(() => {
    startWatch();
  }, [startWatch]);

  const dismissPrompt = useCallback(() => {
    dismissLocationPrompt();
    setPromptVisible(false);
  }, []);

  const value = useMemo(
    () => ({ status, coords, supported, promptVisible, requestAccess, dismissPrompt }),
    [status, coords, supported, promptVisible, requestAccess, dismissPrompt]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useUserLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useUserLocation must be used within LocationProvider");
  return ctx;
}
