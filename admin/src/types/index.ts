export type UserRole = "client" | "owner" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  gender?: string;
  role: UserRole;
  phone?: string;
  created_at?: string;
  id_card?: string;
  selfie_url?: string;
  id_card_photo_url?: string;
  id_card_back_url?: string;
  account_status?: "ok" | "suspended";
  review_message?: string;
  review_requested_at?: string;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  price: number;
  location: string;
  property_type: string;
  images: string[];
  is_active?: boolean;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  created_at?: string;
  latitude?: number;
  longitude?: number;
  virtual_tour_url?: string;
  average_rating?: number;
  rating_count?: number;
  bedrooms?: number;
  amenities?: string[];
  max_guests?: number;
}

export interface VisitRequestPayload {
  propertyId: string;
  message?: string;
  check_in: string;
  check_out: string;
  visit_date: string;
  visit_time: string;
  guests_count: number;
  contact_phone: string;
  id_card: string;
}

export interface Favorite {
  id: string;
  property_id: string;
  created_at: string;
  title?: string;
  price?: number;
  location?: string;
  property_type?: string;
  images?: string[];
}

export type VisitRequestStatus =
  | "pending"
  | "accepted"
  | "declined"
  | "awaiting_agreement"
  | "awaiting_host_agreement"
  | "awaiting_key"
  | "awaiting_payment"
  | "payment_sent"
  | "confirmed"
  | "cancelled";

export interface VisitRequest {
  id: string;
  user_id: string;
  property_id: string;
  message?: string;
  status: VisitRequestStatus;
  requested_at: string;
  responded_at?: string;
  property_title?: string;
  location?: string;
  check_in?: string;
  check_out?: string;
  visit_date?: string;
  visit_time?: string;
  arrival_time?: string;
  departure_time?: string;
  guests_count?: number;
  contact_phone?: string;
  id_card?: string;
  requester_name?: string;
  requester_email?: string;
  owner_name?: string;
  owner_email?: string;
  owner_note?: string;
  key_code?: string;
  key_confirmed_at?: string;
  extension_check_out?: string;
  extension_status?: string;
  extension_amount?: number;
  extension_note?: string;
}

export interface Payment {
  id: string;
  user_id: string;
  type: "subscription" | "reservation" | "commission" | "wallet_topup";
  visit_request_id?: string;
  amount: number;
  commission_amount: number;
  owner_amount: number;
  currency: string;
  status: string;
  provider?: string;
  provider_reference?: string;
  checkout_url?: string;
  created_at?: string;
  user_email?: string;
  user_name?: string;
}

export interface OwnerSubscription {
  id?: string;
  user_id?: string;
  status: "inactive" | "active" | "expired";
  starts_at?: string;
  expires_at?: string;
  price_fcfa?: number;
  active?: boolean;
  user_email?: string;
  user_name?: string;
  user_role?: string;
}

export interface AdminOverview {
  users: number;
  clients: number;
  owners: number;
  admins: number;
  payments: number;
  payments_completed: number;
  payments_pending: number;
  revenue_completed: number;
  subscriptions_active: number;
  host_applications_pending: number;
  users_suspended?: number;
  properties?: number;
  visits?: number;
  visits_pending?: number;
  visits_awaiting_key?: number;
  visits_awaiting_payment?: number;
  visits_confirmed?: number;
}

export interface AdminActivity {
  id: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  actor_id?: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
  summary?: string;
  created_at?: string;
}

export interface PropertyRating {
  id: string;
  property_id: string;
  user_id: string;
  user_name: string;
  score: number;
  comment?: string;
  created_at: string;
}

export interface RatingStats {
  average: number;
  count: number;
  distribution: Record<number, number>;
}

export interface HostApplication {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  city?: string;
  message?: string;
  id_card?: string;
  status: "pending" | "approved" | "rejected";
  admin_note?: string;
  user_email?: string;
  token?: string;
  created_at?: string;
  reviewed_at?: string;
}

export interface RealtimeEvent {
  type: string;
  data: Record<string, unknown>;
  at?: string;
}

export type CurrencyCode = "XOF" | "EUR" | "USD";
