export type UserRole = "client" | "owner" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  birth_date?: string;
  birthDate?: string;
  gender?: string;
  role: UserRole;
  phone?: string;
  account_status?: "ok" | "suspended";
  review_message?: string;
  host_status?: "none" | "pending" | "rejected" | "approved";
}

export interface UserProfile extends User {
  id_card?: string;
  selfie_url?: string;
  id_card_photo_url?: string;
  id_card_back_url?: string;
  created_at?: string;
}

export interface AppNotification {
  id: string;
  type?: string;
  title: string;
  message: string;
  property_id?: string;
  read_at?: string;
  created_at?: string;
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
  max_guests?: number;
  amenities?: string[];
  wave_payment_url?: string;
  orange_money_url?: string;
  check_in_time?: string;
  check_out_time?: string;
  price_midday?: number;
  price_full_day?: number;
  premium_positioning?: boolean;
  manager_name?: string;
  manager_phone?: string;
  manager_email?: string;
  manager_role?: string;
}

export interface VisitRequestPayload {
  propertyId: string;
  message?: string;
  check_in: string;
  check_out: string;
  visit_date?: string;
  visit_time?: string;
  guests_count: number;
  contact_phone: string;
  id_card: string;
  stay_rate?: "night" | "midday" | "full_day";
  arrival_time?: string;
  departure_time?: string;
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
  bedrooms?: number;
  max_guests?: number;
  amenities?: string[];
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
  check_in_time?: string;
  check_out_time?: string;
  guests_count?: number;
  contact_phone?: string;
  id_card?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  requester_id_card?: string;
  requester_selfie_url?: string;
  requester_id_photo_url?: string;
  requester_id_back_url?: string;
  agreement_full_name?: string;
  agreement_accepted?: boolean;
  agreement_signed_at?: string;
  host_agreement_full_name?: string;
  host_agreement_accepted?: boolean;
  host_agreement_signed_at?: string;
  key_code?: string;
  key_confirmed_at?: string;
  owner_note?: string;
  property_price?: number;
  wave_payment_url?: string;
  orange_money_url?: string;
  owner_phone?: string;
  extension_check_out?: string;
  extension_status?: "pending" | "declined" | "awaiting_payment" | "payment_sent" | "confirmed";
  extension_amount?: number;
  extension_note?: string;
  closed_at?: string;
  payment_receipt_url?: string;
  overstay?: boolean;
  can_close?: boolean;
  guest_rating_avg?: number;
  guest_rating_count?: number;
  guest_host_notes?: { score: number; note?: string; created_at?: string }[];
}

export interface Payment {
  id: string;
  user_id: string;
  type: "subscription" | "reservation" | "commission" | "wallet_topup" | "payout";
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
}

export interface OwnerSubscription {
  id?: string;
  user_id?: string;
  status: "inactive" | "active" | "expired";
  starts_at?: string;
  expires_at?: string;
  price_fcfa: number;
  active: boolean;
  premium_positioning?: boolean;
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
