import type { FilterValues } from "@/components/property/PropertyFilters";

export const EMPTY_FILTERS: FilterValues = {
  location: "",
  minPrice: "",
  maxPrice: "",
  property_type: "",
};

function stripAccents(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

const TYPE_ALIASES: Record<string, string> = {
  appartement: "apartment",
  appartements: "apartment",
  apartment: "apartment",
  apartments: "apartment",
  appart: "apartment",
  residence: "apartment",
  residences: "apartment",
  villa: "villa",
  villas: "villa",
  maison: "villa",
  maisons: "villa",
  house: "villa",
  houses: "villa",
  studio: "studio",
  studios: "studio",
  hotel: "hotel",
  hotels: "hotel",
};

const TYPE_PATTERN =
  /\b(appartements?|apartments?|apparts?|residences?|résidences?|villas?|maisons?|houses?|studios?|h[oô]tels?)\b/i;

const STOP_PATTERN =
  /\b(a|à|au|aux|en|de|du|des|le|la|les|un|une|the|in|at|pres|près|quartier|type|bien|pour)\b/gi;

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function parseListingQuery(raw: string): FilterValues {
  let work = raw.trim().replace(/\s+/g, " ");
  let property_type = "";
  let minPrice = "";
  let maxPrice = "";

  const range = work.match(/(\d[\d\s.]*)\s*(?:-|–|—|à|to)\s*(\d[\d\s.]*)/i);
  if (range) {
    minPrice = digits(range[1]);
    maxPrice = digits(range[2]);
    work = work.replace(range[0], " ");
  } else {
    const price = work.match(/\b(\d[\d\s.]{2,})\b/);
    if (price && digits(price[1]).length >= 4) {
      minPrice = digits(price[1]);
      work = work.replace(price[0], " ");
    }
  }

  const typeMatch = work.match(TYPE_PATTERN);
  if (typeMatch) {
    property_type = TYPE_ALIASES[stripAccents(typeMatch[1]).toLowerCase()] ?? "";
    work = work.replace(typeMatch[0], " ");
  }

  const location = work.replace(STOP_PATTERN, " ").replace(/\s+/g, " ").trim();
  return { location, property_type, minPrice, maxPrice };
}

export function mergeListingQuery(values: FilterValues): FilterValues {
  const parsed = parseListingQuery(values.location);
  return {
    location: parsed.location,
    property_type: parsed.property_type || values.property_type,
    minPrice: parsed.minPrice || values.minPrice,
    maxPrice: parsed.maxPrice || values.maxPrice,
  };
}

export function filtersFromSearch(params: URLSearchParams): FilterValues {
  return {
    location: params.get("location") ?? params.get("q") ?? "",
    property_type: params.get("property_type") ?? "",
    minPrice: params.get("minPrice") ?? "",
    maxPrice: params.get("maxPrice") ?? "",
  };
}

export function filtersToSearch(values: FilterValues) {
  const params = new URLSearchParams();
  if (values.location) params.set("location", values.location);
  if (values.property_type) params.set("property_type", values.property_type);
  if (values.minPrice) params.set("minPrice", values.minPrice);
  if (values.maxPrice) params.set("maxPrice", values.maxPrice);
  const query = params.toString();
  return query ? `/properties?${query}` : "/properties";
}
