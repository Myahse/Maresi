# PRD — Maresi

**Product:** digital marketplace that connects residence owners with people looking to rent in Côte d’Ivoire (Abidjan first).  
**Surfaces:** client PWA (`web/`), host app (`host/`), admin app (`admin/`), Flutter, Spring Boot API, PostgreSQL. Realtime: STOMP/SockJS at `/ws`.  
**Related:** [BUSINESS_PLAN.md](BUSINESS_PLAN.md) · [PLAN.md](PLAN.md) · [CHECKPOINT.md](CHECKPOINT.md) · [AGENT.md](AGENT.md)

---

## 1. Problem

Rental listings in Abidjan are scattered (WhatsApp, Facebook, agents). Photos are sparse or misleading, contact is unstructured, and neither tenants nor owners can track visit requests. Maresi centralizes listing, discovery, visit / reservation, and follow-up.

## 2. Goals

| Priority | Goal |
|----------|------|
| P0 | Owners publish photo-rich listings; clients browse, favorite, and request visits. |
| P0 | Owners accept / decline visits; clients pay a reservation deposit via GeniusPay. |
| P0 | Owners subscribe (monthly, FCFA) to keep listings live. |
| P1 | Trust: ID on visit requests, ratings, notifications, EN/FR. |
| P2 | Agency tools, verified-owner badge, expansion beyond Abidjan. |

**Non-goals (now):** full property management, in-app chat, legal lease generation, multi-country payments.

## 3. Users

| Role | Who | Can do |
|------|-----|--------|
| Guest | Unauthenticated visitor | Landing, browse listings, property details. |
| Client | Tenant / seeker | Auth, favorites, visit / reservation, pay after owner accept, ratings, notifications. |
| Owner | Host (approved) | Listings CRUD, visit inbox, subscription — **host app only**. |
| Admin | Internal | Approve/reject host applications in `admin/`. |

Signup is always `client`. Hosts apply from the client PWA (`/become-host`); admin approves before `owner` role.

Demo accounts (password `Password123!`): `client@maresi.app`, `owner@maresi.app`, `admin@maresi.app`.

## 4. Product requirements

### 4.1 Auth

- Register / login with email + password; JWT in `Authorization: Bearer`. Role on register is always `client` (client-supplied role is ignored).
- Phone OTP (4-digit SMS); `SMS_PROVIDER=mock` in local / free deploy.
- Optional email/password when using phone-first signup.

### 4.2 Listings

- Owner creates / edits / deletes own properties (multipart photos).
- Fields: title, description, price (FCFA), location, type, bedrooms, max guests, lat/lng, virtual tour URL, images.
- Public list with filters: location, price range, type.
- Map view (Leaflet on web).
- Business rule: listings should carry a rich photo set (target ≥ 12 photos).

### 4.3 Favorites

- Authenticated users add / remove / list favorites. Unique per `(user, property)`.

### 4.4 Visit / reservation

Client submits: check-in / check-out, visit date + time, guest count, contact phone, ID card.

| Status | Meaning |
|--------|---------|
| `pending` | Awaiting owner. |
| `accepted` | Owner accepted; client must pay. |
| `declined` | Owner declined (optional note). |
| `awaiting_payment` | Checkout started. |
| `confirmed` | Payment completed. |

### 4.5 Payments (GeniusPay)

| Type | Who | Amount |
|------|-----|--------|
| `subscription` | Owner | `OWNER_SUBSCRIPTION_FCFA` (default 10 000 FCFA / month). |
| `reservation` | Client | Commission = `RESERVATION_COMMISSION_PERCENT` (default 10%) of listing price. |

Webhook: `POST /api/webhooks/geniuspay`. Return URLs: `/payments/success` and `/payments/error` on the web app.

### 4.6 Notifications, ratings, i18n

- In-app notifications (visit status, etc.); mark one / all read.
- One rating per user per property (1–5 + comment); average stored on property.
- UI languages: English and French.

### 4.7 Host applications and realtime

- Client submits `POST /api/host-applications`. One pending application per user.
- Admin lists and patches via `/api/admin/host-applications`. Approve sets `users.role = owner` and sends a new JWT on the websocket.
- STOMP over SockJS at `/ws` (JWT on CONNECT). Destinations: `/user/queue/events`, `/topic/admin`, `/topic/host.{ownerId}`.
- Events: `host.application.submitted`, `host.application.reviewed`, `visit.created`, `visit.status_changed`, `payment.completed`.

## 5. API contract (summary)

Envelope: `{ hasError, status, item | items, count }`. Clients unwrap `item` / `items` and throw on `hasError`.

| Area | Prefix | Auth |
|------|--------|------|
| Health | `GET /api/health` | Public |
| Auth | `/api/auth/*` | Public |
| Properties | `/api/properties` | GET public; write owner |
| Favorites | `/api/favorites` | JWT |
| Visits | `/api/visit-requests` | JWT |
| Notifications | `/api/notifications` | JWT |
| Payments | `/api/payments` | JWT |
| Subscriptions | `/api/subscriptions/me` | JWT |
| Webhooks | `/api/webhooks/geniuspay` | Provider secret |
| Host applications | `/api/host-applications` | JWT (client) |
| Admin host applications | `/api/admin/host-applications` | JWT + `ROLE_ADMIN` |
| Websocket | `/ws` | JWT on STOMP CONNECT |

Port **4000**. OpenAPI at `/swagger-ui.html` when the API is running.

## 6. UX / design

- Brand: green primary, white secondary, mobile-first.
- Client PWA (`web/`): listings only + become-host.
- Host app (`host/`): owner listings, visits, subscription.
- Admin app (`admin/`): host application queue + live event feed.

## 7. Success metrics

- Active listings; share with ≥ 12 photos.
- Visit requests / month; owner accept rate; payment completion rate.
- MAU (clients + owners); subscription conversion.

## 8. Constraints

- Production: Neon Postgres, Render API, three Vercel apps — see [DEPLOY.md](DEPLOY.md). Never commit secrets.
- Free Render sleeps; first request after idle can take 30–60s.
- Architecture: [ARCHITECTURE.md](ARCHITECTURE.md) (Spring Boot + three Vite apps + Flutter).
