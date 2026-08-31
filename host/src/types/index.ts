export type UserRole = "client" | "owner" | "admin";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  phone?: string;
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
  guests_count?: number;
  contact_phone?: string;
  id_card?: string;
  requester_name?: string;
  requester_email?: string;
  requester_phone?: string;
  requester_id_card?: string;
  requester_selfie_url?: string;
  requester_id_photo_url?: string;
  agreement_full_name?: string;
  agreement_signed_at?: string;
  key_code?: string;
  key_confirmed_at?: string;
  owner_note?: string;
  property_price?: number;
  wave_payment_url?: string;
  orange_money_url?: string;
  owner_phone?: string;
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

export interface WalletLedgerEntry {
  id: string;
  entry_type: "topup" | "commission" | "subscription" | "stay" | "payout";
  direction: "credit" | "debit";
  amount: number;
  balance_after: number;
  note?: string;
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
  listings_count?: number;
  free_listings_left?: number;
  free_listings_limit?: number;
  commission_due?: number;
  wallet_balance?: number;
  wallet_ledger?: WalletLedgerEntry[];
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
