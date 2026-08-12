import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/hooks/useAuth";

type AuthModalTab = "login" | "register";

interface AuthModalContextValue {
  openLogin: () => void;
  openRegister: () => void;
  close: () => void;
  requireAuth: (action: () => void) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<AuthModalTab>("login");

  const openLogin = useCallback(() => {
    setTab("login");
    setOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setTab("register");
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const requireAuth = useCallback(
    (action: () => void) => {
      if (!isAuthenticated) {
        openLogin();
        return;
      }
      action();
    },
    [isAuthenticated, openLogin]
  );

  const value = useMemo(
    () => ({ openLogin, openRegister, close, requireAuth }),
    [openLogin, openRegister, close, requireAuth]
  );

  return (
    <AuthModalContext.Provider value={value}>
      {children}
      <LoginModal open={open} tab={tab} onTabChange={setTab} onClose={close} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
