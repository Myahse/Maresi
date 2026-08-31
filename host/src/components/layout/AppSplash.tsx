import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const MIN_DISPLAY_MS = 1200;
const MAX_DISPLAY_MS = 2500;
const FADE_OUT_MS = 400;

type SplashPhase = "visible" | "hiding" | "hidden";

/** Survives React StrictMode remount within the same page load. */
const splashRuntime: { phase: SplashPhase; startedAt: number } = {
  phase: "visible",
  startedAt: Date.now(),
};

/**
 * Full-page splash on every hard load (refresh, first visit, new tab).
 * Not shown on in-app client-side navigation.
 */
export function AppSplash() {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<SplashPhase>(splashRuntime.phase);

  const setPhaseGlobal = (next: SplashPhase) => {
    splashRuntime.phase = next;
    setPhase(next);
  };

  useEffect(() => {
    const elapsed = Date.now() - splashRuntime.startedAt;
    const minDelay = Math.max(0, MIN_DISPLAY_MS - elapsed);
    const maxDelay = Math.max(0, MAX_DISPLAY_MS - elapsed);

    const hide = () => setPhaseGlobal("hiding");

    const minTimer = window.setTimeout(hide, minDelay);
    const maxTimer = window.setTimeout(hide, maxDelay);

    return () => {
      window.clearTimeout(minTimer);
      window.clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    if (phase !== "hiding") return;
    const id = window.setTimeout(() => setPhaseGlobal("hidden"), FADE_OUT_MS);
    return () => window.clearTimeout(id);
  }, [phase]);

  useEffect(() => {
    if (phase === "hidden") {
      document.body.style.overflow = "";
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev || "";
    };
  }, [phase]);

  if (phase === "hidden") return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background font-jakarta transition-opacity duration-400 ease-out",
        phase === "hiding" ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
      role="status"
      aria-live="polite"
      aria-label={t("splash.loading")}
    >
      <div className="splash-logo flex flex-col items-center gap-5">
        <img
          src="/logo-mark.svg"
          alt=""
          width={96}
          height={96}
          className="h-20 w-20 sm:h-24 sm:w-24 drop-shadow-md"
          draggable={false}
        />
        <p className="text-3xl sm:text-4xl font-extrabold italic text-brand tracking-tight">
          Maresi
        </p>
        <div className="flex items-center gap-1.5 mt-2" aria-hidden>
          <span className="splash-dot h-2 w-2 rounded-full bg-brand" />
          <span className="splash-dot h-2 w-2 rounded-full bg-brand [animation-delay:150ms]" />
          <span className="splash-dot h-2 w-2 rounded-full bg-brand [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
