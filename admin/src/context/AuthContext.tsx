import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@/types";
import * as authService from "@/services/auth";
import { api, SESSION_EXPIRED_EVENT } from "@/services/api";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ user: User; token: string }>;
  register: (data: Parameters<typeof authService.register>[0]) => Promise<{ user: User; token: string }>;
  applySession: (res: { user: User; token: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const onExpired = () => {
      authService.logout();
      setUser(null);
      setLoading(false);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  useEffect(() => {
    const stored = authService.getStoredUser();
    setUser(stored);
    if (!authService.getToken()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void api
      .get("/users/me")
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setUser(res.user);
    return res;
  }, []);

  const register = useCallback(async (data: Parameters<typeof authService.register>[0]) => {
    const res = await authService.register(data);
    setUser(res.user);
    return res;
  }, []);

  const applySession = useCallback((res: { user: User; token: string }) => {
    authService.applySession(res);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && !!authService.getToken(),
      loading,
      login,
      register,
      applySession,
      logout,
    }),
    [user, loading, login, register, applySession, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
