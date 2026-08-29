export const HOST_APP_URL =
  import.meta.env.VITE_HOST_APP_URL ||
  (import.meta.env.PROD ? "https://maresi-host.vercel.app" : "http://localhost:3001");

export function openHostApp() {
  window.location.assign(HOST_APP_URL);
}
