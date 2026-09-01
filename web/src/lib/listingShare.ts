export function listingPageUrl(id: string): string {
  const origin =
    typeof window !== "undefined" && window.location.origin
      ? window.location.origin.replace(/\/$/, "")
      : "https://ma-resi.com";
  return `${origin}/properties/${id}`;
}

export async function shareListingPage(input: {
  id: string;
  title: string;
}): Promise<"shared" | "copied"> {
  const url = listingPageUrl(input.id);
  const title = input.title.trim() || "Maresi";
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url, text: title });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") throw error;
    }
  }
  await navigator.clipboard.writeText(url);
  return "copied";
}
