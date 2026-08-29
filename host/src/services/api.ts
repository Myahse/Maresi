import type { Property, PropertyRating, RatingStats } from "@/types";

const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

function getToken(): string | null {
  return localStorage.getItem("token");
}

type Envelope = {
  hasError?: boolean;
  status?: { message?: string } | string;
  item?: unknown;
  items?: unknown;
  error?: string;
};

function envelopeMessage(data: Envelope, fallback: string): string {
  if (typeof data.status === "object" && data.status?.message) return data.status.message;
  if (typeof data.status === "string") return data.status;
  if (data.error) return data.error;
  return fallback;
}

function unwrapEnvelope<T>(data: unknown): T {
  if (!data || typeof data !== "object") return data as T;
  const env = data as Envelope;
  if (env.hasError) {
    throw new Error(envelopeMessage(env, "Request failed"));
  }
  if ("item" in env && env.item != null) return env.item as T;
  if ("items" in env && env.items != null) return env.items as T;
  return data as T;
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
  // Backend may return 4xx with hasError + status.message (Peya envelope)
  if (!res.ok || (data && typeof data === "object" && (data as Envelope).hasError)) {
    throw new Error(envelopeMessage(data as Envelope, res.statusText || "Request failed"));
  }
  return unwrapEnvelope<T>(data);
}

function wrapBody(body: unknown): string {
  if (body && typeof body === "object" && !Array.isArray(body) && "data" in (body as object)) {
    return JSON.stringify(body);
  }
  return JSON.stringify({ data: body ?? {} });
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown = {}) =>
    request<T>(path, { method: "POST", body: wrapBody(body) }),
  put: <T>(path: string, body: unknown = {}) =>
    request<T>(path, { method: "PUT", body: wrapBody(body) }),
  patch: <T>(path: string, body: unknown = {}) =>
    request<T>(path, { method: "PATCH", body: wrapBody(body) }),
  delete: (path: string) => request(path, { method: "DELETE" }),
};

function emptyRatingStats(): RatingStats {
  return {
    average: 0,
    count: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
}

async function parseFormResponse<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(envelopeMessage(data as Envelope, "Failed"));
  }
  return unwrapEnvelope<T>(data);
}

export function getProperties(params?: {
  location?: string;
  minPrice?: number;
  maxPrice?: number;
  property_type?: string;
}) {
  const q = new URLSearchParams();
  if (params?.location) q.set("location", params.location);
  if (params?.minPrice != null) q.set("minPrice", String(params.minPrice));
  if (params?.maxPrice != null) q.set("maxPrice", String(params.maxPrice));
  if (params?.property_type) q.set("property_type", params.property_type);
  const query = q.toString();
  return api.get<Property[]>(`/properties${query ? `?${query}` : ""}`);
}

export function getProperty(id: string) {
  return api.get<Property>(`/properties/${id}`);
}

/** Soft-fail: ratings REST is not implemented on Spring yet. */
export async function getPropertyRatings(propertyId: string) {
  try {
    const data = await api.get<{ ratings?: PropertyRating[]; statistics?: RatingStats } | PropertyRating[]>(
      `/properties/${propertyId}/ratings`
    );
    if (Array.isArray(data)) {
      return { ratings: data, statistics: emptyRatingStats() };
    }
    return {
      ratings: data.ratings ?? [],
      statistics: data.statistics ?? emptyRatingStats(),
    };
  } catch {
    return { ratings: [] as PropertyRating[], statistics: emptyRatingStats() };
  }
}

/** Soft-fail: ratings REST is not implemented on Spring yet. */
export async function submitPropertyRating(
  propertyId: string,
  score: number,
  comment?: string
) {
  try {
    return await api.post<PropertyRating>(`/properties/${propertyId}/ratings`, {
      score,
      comment,
    });
  } catch {
    return {
      id: `local-${Date.now()}`,
      property_id: propertyId,
      user_id: "local",
      user_name: "You",
      score,
      comment,
      created_at: new Date().toISOString(),
    } satisfies PropertyRating;
  }
}

export function createProperty(formData: FormData) {
  const token = getToken();
  return fetch(`${API_BASE}/properties`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((res) => parseFormResponse<Property>(res));
}

export function updateProperty(id: string, formData: FormData) {
  const token = getToken();
  return fetch(`${API_BASE}/properties/${id}`, {
    method: "PUT",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  }).then((res) => parseFormResponse<Property>(res));
}

export function deleteProperty(id: string) {
  return api.delete(`/properties/${id}`);
}

export function getFavorites() {
  return api.get<import("@/types").Favorite[]>(`/favorites`);
}

export function addFavorite(propertyId: string) {
  return api.post<{ propertyId: string }>(`/favorites`, { propertyId });
}

export function removeFavorite(propertyId: string) {
  return api.delete(`/favorites/${propertyId}`);
}

export function requestVisit(payload: import("@/types").VisitRequestPayload) {
  return api.post<import("@/types").VisitRequest>(`/visit-requests`, payload);
}

export function getMyVisitRequests() {
  return api.get<import("@/types").VisitRequest[]>(`/visit-requests`);
}

export function getOwnerVisitRequests() {
  return api.get<import("@/types").VisitRequest[]>(`/visit-requests/owner`);
}

export function updateVisitRequestStatus(
  id: string,
  status: import("@/types").VisitRequestStatus,
  ownerNote?: string
) {
  return api.patch<import("@/types").VisitRequest>(`/visit-requests/${id}/status`, {
    status,
    ownerNote,
  });
}

export function getMySubscription() {
  return api.get<import("@/types").OwnerSubscription>(`/subscriptions/me`);
}

export function startSubscriptionPayment() {
  return api.post<import("@/types").Payment>(`/payments/subscription`, {});
}

export function startCommissionSettlement() {
  return api.post<import("@/types").Payment>(`/payments/commission`, {});
}

export function startWalletTopup(amount: number) {
  return api.post<import("@/types").Payment>(`/payments/wallet-topup`, { amount });
}

export function startReservationPayment(visitRequestId: string) {
  return api.post<import("@/types").Payment>(`/payments/reservation`, { visitRequestId });
}

export function confirmPayment(reference: string) {
  return api.post<import("@/types").Payment>(`/payments/confirm`, { reference });
}

export function submitHostApplication(payload: {
  full_name: string;
  phone: string;
  city?: string;
  message?: string;
  id_card?: string;
}) {
  return api.post<import("@/types").HostApplication>(`/host-applications`, {
    full_name: payload.full_name,
    fullName: payload.full_name,
    phone: payload.phone,
    city: payload.city,
    message: payload.message,
    id_card: payload.id_card,
  });
}

export function getVapidPublicKey() {
  return api.get<{ public_key: string }>(`/push/vapid`);
}

export function subscribePush(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  app: "web" | "host" | "admin";
}) {
  return api.post<{ id: string }>(`/push/subscribe`, payload);
}

export function getMyHostApplication() {
  return api.get<import("@/types").HostApplication>(`/host-applications/me`);
}

export function getAdminHostApplications(status?: string) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get<import("@/types").HostApplication[]>(`/admin/host-applications${q}`);
}

export function reviewHostApplication(
  id: string,
  status: "approved" | "rejected",
  adminNote?: string
) {
  return api.patch<import("@/types").HostApplication>(`/admin/host-applications/${id}`, {
    status,
    admin_note: adminNote,
    adminNote,
  });
}
