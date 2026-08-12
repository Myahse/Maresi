import type { Property, PropertyRating, RatingStats } from "@/types";

const API_BASE = "/api";
const FRONTEND_ONLY = true;

const mockProperties: Property[] = [
  {
    id: "p1",
    owner_id: "owner1",
    title: "Modern Apartment — Plateau",
    description: "Bright 2-bedroom apartment in the city center with balcony and parking.",
    price: 425000,
    location: "Abidjan, Plateau",
    property_type: "apartment",
    images: [
      "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
    ],
    is_active: true,
    latitude: 5.322,
    longitude: -4.016,
    virtual_tour_url: "https://kuula.co/share/collection/7l9pT?logo=0&info=0&fs=1&vr=1&sd=1&thumbs=1",
    average_rating: 4.6,
    rating_count: 12,
    owner_name: "Aminata K.",
    owner_email: "aminata@example.com",
    owner_phone: "+225 07 00 00 01",
  },
  {
    id: "p2",
    owner_id: "owner2",
    title: "Family House — Yopougon",
    description: "Spacious home with garden, 3 bedrooms and secure compound.",
    price: 620000,
    location: "Yopougon, Abidjan",
    property_type: "house",
    images: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=80"],
    is_active: true,
    latitude: 5.336,
    longitude: -4.089,
    average_rating: 4.2,
    rating_count: 8,
    owner_name: "Jean-Marc D.",
    owner_email: "jean@example.com",
  },
  {
    id: "p3",
    owner_id: "owner1",
    title: "Cozy Studio — Cocody",
    description: "Furnished studio near universities, ideal for students or young professionals.",
    price: 285000,
    location: "Cocody, Abidjan",
    property_type: "studio",
    images: ["https://images.unsplash.com/photo-1536376072261-38c75010e6c9?auto=format&fit=crop&w=800&q=80"],
    is_active: true,
    latitude: 5.348,
    longitude: -3.986,
    average_rating: 4.8,
    rating_count: 5,
    owner_name: "Aminata K.",
  },
  {
    id: "p4",
    owner_id: "owner3",
    title: "Villa with Pool — Bingerville",
    description: "Luxury villa with swimming pool and large terrace.",
    price: 890000,
    location: "Bingerville",
    property_type: "house",
    images: ["https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80"],
    is_active: true,
    latitude: 5.356,
    longitude: -3.885,
    virtual_tour_url: "https://my.matterport.com/show/?m=example",
    average_rating: 4.9,
    rating_count: 3,
    owner_name: "Sophie N.",
  },
];

let mockFavorites: import("@/types").Favorite[] = [];
let mockVisitRequests: import("@/types").VisitRequest[] = [];
let mockRatings: PropertyRating[] = [
  {
    id: "r1",
    property_id: "p1",
    user_id: "u1",
    user_name: "Kouadio M.",
    score: 5,
    comment: "Excellent location and very clean apartment.",
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "r2",
    property_id: "p1",
    user_id: "u2",
    user_name: "Fatou B.",
    score: 4,
    comment: "Great stay, responsive owner.",
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  },
];

function getToken(): string | null {
  return localStorage.getItem("token");
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};

function computeStats(ratings: PropertyRating[]): RatingStats {
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;
  for (const r of ratings) {
    distribution[r.score] = (distribution[r.score] ?? 0) + 1;
    sum += r.score;
  }
  return {
    average: ratings.length ? sum / ratings.length : 0,
    count: ratings.length,
    distribution,
  };
}

export function getProperties(params?: {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  property_type?: string;
}) {
  if (FRONTEND_ONLY) {
    const filtered = mockProperties.filter((p) => {
      if (params?.location && !p.location.toLowerCase().includes(params.location.toLowerCase())) return false;
      if (params?.minPrice != null && p.price < params.minPrice) return false;
      if (params?.maxPrice != null && p.price > params.maxPrice) return false;
      if (params?.property_type && p.property_type !== params.property_type) return false;
      return true;
    });
    return Promise.resolve(filtered);
  }
  const q = new URLSearchParams();
  if (params?.location) q.set("location", params.location);
  if (params?.minPrice != null) q.set("minPrice", String(params.minPrice));
  if (params?.maxPrice != null) q.set("maxPrice", String(params.maxPrice));
  if (params?.property_type) q.set("property_type", params.property_type);
  const query = q.toString();
  return api.get<Property[]>(`/properties${query ? `?${query}` : ""}`);
}

export function getProperty(id: string) {
  if (FRONTEND_ONLY) {
    const found = mockProperties.find((p) => p.id === id);
    if (!found) return Promise.reject(new Error("Property not found"));
    return Promise.resolve(found);
  }
  return api.get<Property>(`/properties/${id}`);
}

export function getPropertyRatings(propertyId: string) {
  if (FRONTEND_ONLY) {
    const ratings = mockRatings.filter((r) => r.property_id === propertyId);
    return Promise.resolve({ ratings, statistics: computeStats(ratings) });
  }
  return api.get<{ ratings: PropertyRating[]; statistics: RatingStats }>(
    `/properties/${propertyId}/ratings`
  );
}

export function submitPropertyRating(propertyId: string, score: number, comment?: string) {
  if (FRONTEND_ONLY) {
    const rating: PropertyRating = {
      id: `r-${Date.now()}`,
      property_id: propertyId,
      user_id: "web-dev-user",
      user_name: "You",
      score,
      comment,
      created_at: new Date().toISOString(),
    };
    mockRatings.unshift(rating);
    const prop = mockProperties.find((p) => p.id === propertyId);
    if (prop) {
      const all = mockRatings.filter((r) => r.property_id === propertyId);
      const stats = computeStats(all);
      prop.average_rating = stats.average;
      prop.rating_count = stats.count;
    }
    return Promise.resolve(rating);
  }
  return api.post<PropertyRating>(`/properties/${propertyId}/ratings`, { score, comment });
}

export function createProperty(formData: FormData) {
  if (FRONTEND_ONLY) {
    const property: Property = {
      id: `p${Date.now()}`,
      owner_id: "web-dev-user",
      title: String(formData.get("title") || "Untitled"),
      description: String(formData.get("description") || ""),
      price: Number(formData.get("price") || 0),
      location: String(formData.get("location") || ""),
      property_type: String(formData.get("property_type") || "apartment"),
      images: [],
      is_active: true,
      latitude: Number(formData.get("latitude")) || 5.36,
      longitude: Number(formData.get("longitude")) || -4.008,
      virtual_tour_url: String(formData.get("virtual_tour_url") || "") || undefined,
      bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : undefined,
      max_guests: formData.get("max_guests") ? Number(formData.get("max_guests")) : undefined,
    };
    mockProperties.unshift(property);
    return Promise.resolve(property);
  }
  const token = getToken();
  return fetch(`${API_BASE}/properties`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed");
    return data;
  });
}

export function updateProperty(id: string, formData: FormData) {
  if (FRONTEND_ONLY) {
    const index = mockProperties.findIndex((p) => p.id === id);
    if (index < 0) return Promise.reject(new Error("Property not found"));
    const current = mockProperties[index];
    mockProperties[index] = {
      ...current,
      title: String(formData.get("title") || current.title),
      description: String(formData.get("description") || current.description),
      price: Number(formData.get("price") || current.price),
      location: String(formData.get("location") || current.location),
      property_type: String(formData.get("property_type") || current.property_type),
      virtual_tour_url: String(formData.get("virtual_tour_url") || current.virtual_tour_url || "") || undefined,
      bedrooms: formData.get("bedrooms") ? Number(formData.get("bedrooms")) : current.bedrooms,
      max_guests: formData.get("max_guests") ? Number(formData.get("max_guests")) : current.max_guests,
    };
    return Promise.resolve(mockProperties[index]);
  }
  const token = getToken();
  return fetch(`${API_BASE}/properties/${id}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Failed");
    return data;
  });
}

export function deleteProperty(id: string) {
  if (FRONTEND_ONLY) {
    mockFavorites = mockFavorites.filter((f) => f.property_id !== id);
    mockVisitRequests = mockVisitRequests.filter((r) => r.property_id !== id);
    mockRatings = mockRatings.filter((r) => r.property_id !== id);
    const before = mockProperties.length;
    const next = mockProperties.filter((p) => p.id !== id);
    mockProperties.length = 0;
    mockProperties.push(...next);
    if (before === next.length) return Promise.reject(new Error("Property not found"));
    return Promise.resolve({});
  }
  return api.delete(`/properties/${id}`);
}

export function getFavorites() {
  if (FRONTEND_ONLY) return Promise.resolve(mockFavorites);
  return api.get<import("@/types").Favorite[]>(`/favorites`);
}

export function addFavorite(propertyId: string) {
  if (FRONTEND_ONLY) {
    const exists = mockFavorites.some((f) => f.property_id === propertyId);
    if (!exists) {
      mockFavorites.push({
        id: `fav-${Date.now()}`,
        property_id: propertyId,
        created_at: new Date().toISOString(),
      });
    }
    return Promise.resolve({ propertyId });
  }
  return api.post<{ propertyId: string }>(`/favorites`, { propertyId });
}

export function removeFavorite(propertyId: string) {
  if (FRONTEND_ONLY) {
    mockFavorites = mockFavorites.filter((f) => f.property_id !== propertyId);
    return Promise.resolve({});
  }
  return api.delete(`/favorites/${propertyId}`);
}

export function requestVisit(payload: import("@/types").VisitRequestPayload) {
  if (FRONTEND_ONLY) {
    const prop = mockProperties.find((p) => p.id === payload.propertyId);
    const req: import("@/types").VisitRequest = {
      id: `vr-${Date.now()}`,
      user_id: "web-dev-user",
      property_id: payload.propertyId,
      message: payload.message,
      status: "pending",
      requested_at: new Date().toISOString(),
      property_title: prop?.title,
      location: prop?.location,
      check_in: payload.check_in,
      check_out: payload.check_out,
      visit_date: payload.visit_date,
      visit_time: payload.visit_time,
      guests_count: payload.guests_count,
      contact_phone: payload.contact_phone,
      id_card: payload.id_card,
      requester_name: "Frontend User",
      requester_email: "client@example.com",
    };
    mockVisitRequests.unshift(req);
    return Promise.resolve(req);
  }
  return api.post<import("@/types").VisitRequest>(`/visit-requests`, payload);
}

export function getMyVisitRequests() {
  if (FRONTEND_ONLY) return Promise.resolve(mockVisitRequests);
  return api.get<import("@/types").VisitRequest[]>(`/visit-requests`);
}

export function getOwnerVisitRequests() {
  if (FRONTEND_ONLY) {
    const ownerId = "web-dev-user";
    const ownerPropertyIds = mockProperties.filter((p) => p.owner_id === ownerId).map((p) => p.id);
    return Promise.resolve(
      mockVisitRequests
        .filter((v) => ownerPropertyIds.includes(v.property_id))
        .map((v) => ({
          ...v,
          requester_name: v.requester_name ?? "Client",
          requester_email: v.requester_email ?? "client@example.com",
        }))
    );
  }
  return api.get<import("@/types").VisitRequest[]>(`/visit-requests/owner`);
}

export function updateVisitRequestStatus(
  id: string,
  status: import("@/types").VisitRequestStatus,
  ownerNote?: string
) {
  if (FRONTEND_ONLY) {
    const idx = mockVisitRequests.findIndex((v) => v.id === id);
    if (idx < 0) return Promise.reject(new Error("Not found"));
    const storedStatus = status === "accepted" ? "awaiting_payment" : status;
    mockVisitRequests[idx] = {
      ...mockVisitRequests[idx],
      status: storedStatus,
      owner_note: ownerNote,
      responded_at: new Date().toISOString(),
    };
    return Promise.resolve(mockVisitRequests[idx]);
  }
  return api.patch<import("@/types").VisitRequest>(`/visit-requests/${id}/status`, {
    status,
    ownerNote,
  });
}

function unwrapItem<T>(data: unknown): T {
  if (data && typeof data === "object" && "item" in data && (data as { item: T }).item != null) {
    return (data as { item: T }).item;
  }
  return data as T;
}

let mockSubscriptionActive = false;

export function getMySubscription() {
  if (FRONTEND_ONLY) {
    return Promise.resolve({
      status: mockSubscriptionActive ? "active" : "inactive",
      price_fcfa: 10000,
      active: mockSubscriptionActive,
      expires_at: mockSubscriptionActive
        ? new Date(Date.now() + 30 * 86400000).toISOString()
        : undefined,
    } satisfies import("@/types").OwnerSubscription);
  }
  return api.get<unknown>(`/subscriptions/me`).then(unwrapItem<import("@/types").OwnerSubscription>);
}

export function startSubscriptionPayment() {
  if (FRONTEND_ONLY) {
    mockSubscriptionActive = true;
    return Promise.resolve({
      id: `pay-sub-${Date.now()}`,
      user_id: "web-dev-user",
      type: "subscription" as const,
      amount: 10000,
      commission_amount: 0,
      owner_amount: 0,
      currency: "XOF",
      status: "completed",
      checkout_url: "/payments/success?mock=subscription",
    } satisfies import("@/types").Payment);
  }
  return api
    .post<unknown>(`/payments/subscription`, {})
    .then(unwrapItem<import("@/types").Payment>);
}

export function startReservationPayment(visitRequestId: string) {
  if (FRONTEND_ONLY) {
    const idx = mockVisitRequests.findIndex((v) => v.id === visitRequestId);
    if (idx < 0) return Promise.reject(new Error("Not found"));
    mockVisitRequests[idx] = { ...mockVisitRequests[idx], status: "confirmed" };
    return Promise.resolve({
      id: `pay-res-${Date.now()}`,
      user_id: "web-dev-user",
      type: "reservation" as const,
      visit_request_id: visitRequestId,
      amount: 50000,
      commission_amount: 5000,
      owner_amount: 45000,
      currency: "XOF",
      status: "completed",
      checkout_url: "/payments/success?mock=reservation",
    } satisfies import("@/types").Payment);
  }
  return api
    .post<unknown>(`/payments/reservation`, { data: { visitRequestId } })
    .then(unwrapItem<import("@/types").Payment>);
}
