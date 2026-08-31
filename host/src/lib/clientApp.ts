export const CLIENT_APP_URL =
  import.meta.env.VITE_CLIENT_APP_URL ||
  (import.meta.env.PROD ? "https://maresi-sepia.vercel.app" : "http://localhost:3000");
