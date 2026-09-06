import { createContext, useContext, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useScrollHeader } from "@/hooks/useScrollHeader";
import { cn } from "@/lib/utils";

interface MobileChromeValue {
  navVisible: boolean;
  setNavPinned: (pinned: boolean) => void;
}

const MobileChromeContext = createContext<MobileChromeValue | null>(null);

export function MobileChromeProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [pinned, setNavPinned] = useState(false);
  const disableHide = pinned || pathname === "/properties";
  const { visible } = useScrollHeader({ disabled: disableHide, resetKey: pathname });

  const value = useMemo(
    () => ({
      navVisible: disableHide || visible,
      setNavPinned,
    }),
    [disableHide, visible]
  );

  return <MobileChromeContext.Provider value={value}>{children}</MobileChromeContext.Provider>;
}

export function useMobileChrome() {
  const ctx = useContext(MobileChromeContext);
  if (!ctx) throw new Error("useMobileChrome must be used within MobileChromeProvider");
  return ctx;
}

/** Full-screen shells that end at the top of the nav (map browse). */
export function useNavInsetBottomClass(className?: string) {
  const { navVisible } = useMobileChrome();
  return cn(
    "transition-[bottom] duration-300 ease-out",
    navVisible ? "bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]" : "bottom-0",
    className
  );
}

/** Action bars flush on the navbar; slide down with it but stay on screen. */
export function useDockedAboveNavClass(className?: string) {
  const { navVisible } = useMobileChrome();
  return cn(
    "z-[45] transition-[bottom,padding-bottom] duration-300 ease-out",
    navVisible
      ? "bottom-[calc(4rem+env(safe-area-inset-bottom,0px))]"
      : "bottom-0 pb-[env(safe-area-inset-bottom,0px)]",
    className
  );
}

/** Floating toast / prompt just above the nav or the screen edge. */
export function useFloatingAboveNavClass(className?: string) {
  const { navVisible } = useMobileChrome();
  return cn(
    "transition-[bottom] duration-300 ease-out lg:bottom-4",
    navVisible
      ? "bottom-[calc(5rem+env(safe-area-inset-bottom,0px))]"
      : "bottom-[calc(1rem+env(safe-area-inset-bottom,0px))]",
    className
  );
}
