import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/hooks/useAuth";

interface AuthModalContextValue {
  openLogin: () => void;
  openRegister: () => void;
  close: () => void;
  requireAuth: (action: () => void) => void;
}

const AuthModalContext = createContext<AuthModalContextValue | null>(null);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const openLogin = useCallback(() => {
    setOpen(true);
  }, []);

  const openRegister = useCallback(() => {
    setOpen(false);
    navigate("/register");
  }, [navigate]);

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
      <LoginModal open={open} onClose={close} onRegister={openRegister} />
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used within AuthModalProvider");
  return ctx;
}
