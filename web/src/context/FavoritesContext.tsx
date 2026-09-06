import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { addFavorite, getFavorites, removeFavorite } from "@/services/api";
import { useAuth } from "@/hooks/useAuth";

interface FavoritesContextValue {
  isFavorite: (propertyId: string) => boolean;
  toggle: (propertyId: string) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const idsRef = useRef(ids);
  idsRef.current = ids;

  useEffect(() => {
    if (!isAuthenticated) {
      setIds(new Set());
      return;
    }
    let cancelled = false;
    getFavorites()
      .then((favs) => {
        if (!cancelled) setIds(new Set(favs.map((item) => item.property_id)));
      })
      .catch(() => {
        if (!cancelled) setIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const isFavorite = useCallback((propertyId: string) => idsRef.current.has(propertyId), [ids]);

  const toggle = useCallback(async (propertyId: string) => {
    const liked = idsRef.current.has(propertyId);
    setIds((prev) => {
      const next = new Set(prev);
      if (liked) next.delete(propertyId);
      else next.add(propertyId);
      return next;
    });
    try {
      if (liked) await removeFavorite(propertyId);
      else await addFavorite(propertyId);
    } catch {
      setIds((prev) => {
        const next = new Set(prev);
        if (liked) next.add(propertyId);
        else next.delete(propertyId);
        return next;
      });
    }
  }, []);

  const value = useMemo(() => ({ isFavorite, toggle }), [isFavorite, toggle]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}
