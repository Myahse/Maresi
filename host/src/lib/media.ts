/** Origin of the Spring API (no trailing slash), or "" when using the Vite proxy. */
export function apiOrigin(): string {
  const api = import.meta.env.VITE_API_URL ?? "/api";
  if (api.startsWith("http")) return api.replace(/\/api\/?$/, "");
  return "";
}

/** Turn stored listing URLs into something the browser can actually load. */
export function listingImageUrl(url: string | undefined | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  const origin = apiOrigin();
  const r2 = /r2\.cloudflarestorage\.com\/(?:[^/?#]+\/)?(properties\/[A-Za-z0-9._-]+)/i.exec(trimmed);
  if (r2?.[1]) {
    return `${origin}/api/media/${r2[1]}`;
  }
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    return origin ? `${origin}${trimmed}` : trimmed;
  }
  return trimmed;
}

export function listingImageUrls(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return images.map((value) => listingImageUrl(String(value))).filter(Boolean);
}
