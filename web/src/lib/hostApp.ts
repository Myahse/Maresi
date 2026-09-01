export const HOST_APP_URL =
  import.meta.env.VITE_HOST_APP_URL ||
  (import.meta.env.PROD ? "https://host.ma-resi.com" : "http://localhost:3001");

export function openHostApp() {
  window.location.assign(HOST_APP_URL);
}

export function hostHandoffUrl(session: { token: string; user: unknown }) {
  const payload = encodeURIComponent(JSON.stringify(session));
  return `${HOST_APP_URL.replace(/\/$/, "")}/#handoff=${payload}`;
}
