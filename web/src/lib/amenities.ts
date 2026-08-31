export const PROPERTY_TYPES = ["apartment", "house", "studio", "residence"] as const;
export type PropertyTypeId = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_AMENITY_IDS = [
  "wifi",
  "ac",
  "parking",
  "security",
  "pool",
  "kitchen",
  "balcony",
  "garage",
  "hotWater",
  "furnished",
] as const;

export type PropertyAmenityId = (typeof PROPERTY_AMENITY_IDS)[number];

export function isPropertyType(value: string): value is PropertyTypeId {
  return (PROPERTY_TYPES as readonly string[]).includes(value);
}

export function isPropertyAmenity(value: string): value is PropertyAmenityId {
  return (PROPERTY_AMENITY_IDS as readonly string[]).includes(value);
}

export function normalizeAmenities(raw: unknown): PropertyAmenityId[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(isPropertyAmenity);
}
