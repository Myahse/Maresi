# Maresi — Architecture

Residence rental marketplace (Abidjan first). One Spring Boot API, three Vite apps, one Flutter app, PostgreSQL.

Product: [PRD.md](PRD.md) · Deploy: [DEPLOY.md](DEPLOY.md) · Schema: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · Agent rules: [AGENT.md](AGENT.md)

---

## Layout (do not rename deploy roots)

Vercel and Render are wired to these folder names. Keep them.

```
maresi/
├── Maresi/              # Spring Boot API — port 4000 — Render root
│   ├── src/main/java/com/maresi/api/
│   ├── src/main/resources/
│   ├── database/        # schema.sql, migrations 002–007, seed-demo.sql
│   └── Dockerfile
├── web/                 # Client listing PWA — port 3000 — Vercel root
├── host/                # Host operations — port 3001 — Vercel root
├── admin/               # Admin approvals — port 3002 — Vercel root
├── mobile_flutter/      # Flutter (Android / iOS)
├── pom.xml              # Maven parent (module: Maresi)
└── render.yaml
```

Root markdown (`PRD.md`, `PLAN.md`, `CHECKPOINT.md`, this file) is product/ops docs, not a second backend.

There is **no** Express or Expo app in this repo.

---

## Runtime

```
                    ┌──────────── web :3000  (clients)
                    │
Browser / PWA  ─────┼──────────── host :3001  (owners)
                    │
                    └──────────── admin :3002 (staff)
                                      │
                         REST /api/*  │  STOMP /ws
                                      ▼
                            Spring API :4000
                                      │
                          ┌───────────┴───────────┐
                          ▼                       ▼
                     PostgreSQL              GeniusPay
                     (Neon)                  (payments)
```

Flutter talks to the same API (`API_URL`; emulator default `http://10.0.2.2:4000`).

---

## 1. API (`Maresi/`)

**Stack:** Java 17, Spring Boot 3.3, Security (JWT), JDBC (no JPA), WebSocket/STOMP, springdoc OpenAPI.

**Layering (keep this order):**

| Layer | Package | Job |
|-------|---------|-----|
| HTTP | `controller` | Map routes, envelope, locale |
| Use-case | `service` + `business` | Rules, orchestration |
| Data | `repository` + `RowMaps` | Parameterized SQL |
| Auth | `security` | JWT parse/sign, `ROLE_*` |
| Live | `realtime` | STOMP publish after writes |
| Config | `config` | Security, CORS, WS, DB, OpenAPI |

```
com.maresi.api
├── controller/     Auth, Property, Favorite, VisitRequest, Notification,
│                   Payment, Subscription, HostApplication, AdminHostApplication,
│                   GeniusPayWebhook, Health
├── business/
├── service/        Facade + GeniusPayClient, SmsService, FileStorageService, OtpService
├── repository/
├── realtime/       WebSocketConfig is in config/; publisher + STOMP JWT interceptor
├── security/
├── config/
├── contracts/      Request / Response envelope, ControllerSupport
├── dto/
└── exception/
```

**Envelope:** `{ hasError, status, item | items, count }`. Controllers use `ControllerSupport.run` / `runCreated`.

**Auth:** `Authorization: Bearer`. Public: `/api/health`, `/api/auth/**`, `/api/webhooks/**`, `/ws/**`, `GET /api/properties`. `/api/admin/**` requires `ROLE_ADMIN`.

**Roles:** `client` | `owner` | `admin`. Register always inserts `client`. Admin approval sets `owner`.

**Realtime (STOMP over SockJS at `/ws`):** JWT on CONNECT. Destinations:

- `/user/queue/events` — the authenticated user
- `/topic/host.{ownerId}` — that host’s visit/payment events
- `/topic/admin` — host applications + domain events for staff

Events: `host.application.submitted`, `host.application.reviewed`, `visit.created`, `visit.status_changed`, `payment.completed`.

**Payments:** GeniusPay only. Subscription `OWNER_SUBSCRIPTION_FCFA` (default 10 000). Reservation commission `RESERVATION_COMMISSION_PERCENT` (default 10%). Webhook: `POST /api/webhooks/geniuspay`.

**Uploads:** local disk `UPLOAD_DIR` (fragile on free Render).

---

## 2. Client PWA (`web/`)

Listings, favorites, visits, reservation checkout, become-host. **No owner CRUD.**

Port **3000**. Vite proxies `/api` and `/ws` to `:4000`. Production: `VITE_API_URL`, `VITE_WS_URL`, `VITE_HOST_APP_URL`.

```
web/src/
├── pages/           Landing, browse, details, reserve, dashboard, visits,
│                    favorites, become-host, payment result
├── components/      layout, property cards/filters, map, ratings, visit cards, realtime
├── context/         Auth, AuthModal, Currency
├── services/        api.ts (envelope unwrap), auth.ts
├── hooks/           useAuth, useRealtime
└── locales/         en + fr
```

Signup has no role picker. `/become-host` submits `POST /api/host-applications`.

---

## 3. Host app (`host/`)

Owners only (login rejects other roles). Listings CRUD, visit inbox, subscription, payment return.

Port **3001**. Env: `VITE_API_URL`, `VITE_WS_URL`. Subscribes to `/topic/host.{userId}`.

```
host/src/
├── pages/           Login, owner dashboard, new/edit listing, visits,
│                    subscription, payment result
├── components/      layout, PropertyCreationWizard, VisitRequestCard, HostRealtimeBridge
└── (shared-style)   services, hooks, i18n, ui primitives
```

---

## 4. Admin app (`admin/`)

Admins only. Host-application queue (filter, approve/reject, note) and live `/topic/admin` feed.

Port **3002**. Env: `VITE_API_URL`, `VITE_WS_URL`.

```
admin/src/
├── pages/           Login, AdminApplicationsPage
├── components/      layout (header/footer), ui button/input/card
└── hooks/           useRealtime → /topic/admin
```

---

## 5. Flutter (`mobile_flutter/`)

Live API by default. `--dart-define=USE_MOCK=true` for demos. Mirror web flows (auth, listings, favorites, visits, payments) when the contract changes. Flutter still has a Client/Owner picker; **the API ignores it** and always creates `client`.

---

## 6. Roles vs surfaces

| Role | `web/` | `host/` | `admin/` |
|------|--------|---------|----------|
| Guest | Landing, browse, details | — | — |
| Client | Favorites, visits, pay, become-host | Blocked | Blocked |
| Owner | Same as client + link to host app | Listings, visits, subscription | Blocked |
| Admin | Not the admin UI | Blocked | Application queue |

Visit states: `pending` → `accepted` / `declined` → `awaiting_payment` → `confirmed`.

---

## 7. Local loop

1. Postgres: `pgadmin-full-setup.sql` then `seed-demo.sql` (or Neon).
2. `cd Maresi && mvn spring-boot:run`
3. `cd web && npm run dev` → :3000
4. `cd host && npm run dev` → :3001
5. `cd admin && npm run dev` → :3002

Demo password `Password123!`: `client@maresi.app`, `owner@maresi.app`, `admin@maresi.app`.
