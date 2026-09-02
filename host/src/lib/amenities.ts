export const PROPERTY_TYPES = ["apartment", "villa", "studio", "hotel"] as const;
export type PropertyTypeId = (typeof PROPERTY_TYPES)[number];

export const PROPERTY_AMENITY_IDS = [
  "wifi",
  "fibre",
  "ac",
  "fan",
  "hotWater",
  "generator",
  "waterTank",
  "kitchen",
  "fridge",
  "dishwasher",
  "washingMachine",
  "dryer",
  "microwave",
  "coffee",
  "balcony",
  "terrace",
  "garden",
  "pool",
  "bbq",
  "parking",
  "garage",
  "security",
  "concierge",
  "cctv",
  "gated",
  "furnished",
  "workspace",
  "tv",
  "netflix",
  "elevator",
  "gym",
  "seaView",
  "cityView",
  "wheelchair",
  "petFriendly",
  "breakfast",
  "roomService",
  "reception24h",
] as const;

export type PropertyAmenityId = (typeof PROPERTY_AMENITY_IDS)[number];

export const AMENITY_GROUPS: { id: string; ids: PropertyAmenityId[] }[] = [
  { id: "comfort", ids: ["wifi", "fibre", "ac", "fan", "hotWater", "generator", "waterTank"] },
  { id: "kitchen", ids: ["kitchen", "fridge", "dishwasher", "washingMachine", "dryer", "microwave", "coffee"] },
  { id: "outdoor", ids: ["balcony", "terrace", "garden", "pool", "bbq", "parking", "garage"] },
  { id: "security", ids: ["security", "concierge", "cctv", "gated"] },
  { id: "living", ids: ["furnished", "workspace", "tv", "netflix", "elevator", "gym"] },
  { id: "access", ids: ["seaView", "cityView", "wheelchair", "petFriendly"] },
  { id: "hotel", ids: ["breakfast", "roomService", "reception24h"] },
];

export function isPropertyType(value: string): value is PropertyTypeId {
  return (PROPERTY_TYPES as readonly string[]).includes(value);
}

export function displayPropertyType(value: string): PropertyTypeId | string {
  if (value === "house") return "villa";
  if (value === "residence") return "apartment";
  return value;
}

export function isPropertyAmenity(value: string): value is PropertyAmenityId {
  return (PROPERTY_AMENITY_IDS as readonly string[]).includes(value);
}

export function normalizeAmenities(raw: unknown): PropertyAmenityId[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(String).filter(isPropertyAmenity);
}
