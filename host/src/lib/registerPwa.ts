import { registerSW } from "virtual:pwa-register";

const CHECK_EVERY_MS = 15 * 60 * 1000;

/** Register the PWA worker and apply a new build as soon as it is found. */
export function registerPwa() {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateSW(true);
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return;

      const check = () => {
        void registration.update();
      };

      check();
      window.setInterval(check, CHECK_EVERY_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
      window.addEventListener("focus", check);
    },
  });
}
