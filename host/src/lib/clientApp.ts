export const CLIENT_APP_URL =
  import.meta.env.VITE_CLIENT_APP_URL ||
  (import.meta.env.PROD ? "https://ma-resi.com" : "http://localhost:3000");

export function guestHandoffUrl(session: { token: string; user: unknown }, path = "/") {
  const payload = encodeURIComponent(JSON.stringify(session));
  const base = CLIENT_APP_URL.replace(/\/$/, "");
  const dest = path.startsWith("/") ? path : `/${path}`;
  return `${base}${dest}#handoff=${payload}`;
}
