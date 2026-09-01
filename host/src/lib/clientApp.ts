export const CLIENT_APP_URL =
  import.meta.env.VITE_CLIENT_APP_URL ||
  (import.meta.env.PROD ? "https://ma-resi.com" : "http://localhost:3000");
