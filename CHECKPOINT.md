# CHECKPOINT — Maresi

Snapshot of what is actually in the repo. Update this file when a milestone ships. Date: **2026-08-28**.

Product: [PRD.md](PRD.md) · Next work: [PLAN.md](PLAN.md) · Agent rules: [AGENT.md](AGENT.md)

---

## Status: three-app split in repo; migration 007 applied on Neon

Client listing PWA, host operations app, and admin app share the Spring API and a STOMP websocket. `host_applications` and demo `admin@maresi.app` are on the Neon project **maresi**.

Core marketplace flows exist on API + web + Flutter. Hosting is documented (Neon / Render / Vercel) but not treated as fully signed-off until health, webhook, and one live payment are verified on production URLs.

---

## What works

### Platform

| Piece | Implementation |
|-------|----------------|
| API | Spring Boot  (`Maresi/`), port 4000, JWT, OpenAPI |
| DB | PostgreSQL: `schema.sql` + migrations `002`–`007`, `pgadmin-full-setup.sql`, `seed-demo.sql` |
| Client | Vite React PWA (`web/`, port 3000) |
| Host | Vite React (`host/`, port 3001) |
| Admin | Vite React (`admin/`, port 3002) |
| Mobile | Flutter (`mobile_flutter/`), live API or `USE_MOCK` |
| Payments | GeniusPay subscription + reservation commission, webhook controller |
| Deploy docs | [DEPLOY.md](DEPLOY.md), `render.yaml` |

### Features

- Auth: register always `client`, login, phone OTP (SMS mockable).
- Become a host form on the client PWA; admin approves in `admin/`.
- Host app: listings CRUD, visit inbox, subscription.
- STOMP websocket: host applications, visits, payments.
- Listings: owner CRUD + photo upload; public filters; details; map; virtual tour URL; bedrooms / max guests.
- Favorites, notifications (list + mark read).
- Visit requests with dates, guests, phone, ID card; owner accept/decline + note.
- Ratings (1–5 + comment) with average on property.
- Owner monthly subscription UI (`/owner/subscription`, Flutter `owner_subscription_screen`).
- Reservation payment return pages: `/payments/success`, `/payments/error`.

### Visit state machine (in code)

`pending` → `accepted` / `declined` → `awaiting_payment` → `confirmed`

### Money (defaults)

- Owner subscription: **10 000 FCFA / month** (`OWNER_SUBSCRIPTION_FCFA`).
- Reservation: **10%** commission (`RESERVATION_COMMISSION_PERCENT`), currency **XOF**.

---

## Gaps vs product intent

| Area | Gap |
|------|-----|
| Docs | Architecture and schema docs match the Java + three Vite apps. |
| Photos | ≥ 12 photos is a business rule, not consistently enforced in API validation. |
| Deploy | Production URLs / live GeniusPay / real SMS not confirmed in-repo. Render free tier sleeps. Uploads are local disk. |
| Admin | `admin/` reviews host applications. Flutter still has a Client/Owner picker (API ignores role). |
| Mobile | Push notifications not OS-level; keep mock and API models aligned. |
| Trust | No verified-owner badge, no listing moderation queue. |

---

## Demo data

After `seed-demo.sql`, password for all: `Password123!`

| Email | Role |
|-------|------|
| `client@maresi.app` | client |
| `owner@maresi.app` | owner |
| `admin@maresi.app` | admin |
| `owner2@maresi.app`, `owner3@maresi.app` | owners |

Abidjan sample listings included.

---

## Local run (quick)

1. Create DB `Maresi`, run `Maresi/database/pgadmin-full-setup.sql` then `seed-demo.sql`.
2. Copy `Maresi/src/main/resources/application-local.properties.example` → `application-local.properties`.
3. `cd Maresi && mvn spring-boot:run` → `GET /api/health`.
4. `cd web && npm install && npm run dev` → `http://localhost:3000`.
5. `cd host && npm install && npm run dev` → `http://localhost:3001`.
6. `cd admin && npm install && npm run dev` → `http://localhost:3002`.
7. Flutter: `flutter run` (Android emulator) or `--dart-define=API_URL=http://localhost:4000`.

---

## Last known stack choices (do not revert)

- Backend is **Java Spring Boot**, not Express.
- Mobile product path is **Flutter**, not Expo.
- Web talks to the **Peya-style envelope** (`item` / `items` / `hasError`), not a raw JSON array.

When you complete a phase in [PLAN.md](PLAN.md), tick it there and add a dated note below.

### Log

- **2026-08-28** — Architecture tidy: `host/` and `admin/` stripped of leftover client copies; [ARCHITECTURE.md](ARCHITECTURE.md) and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) rewritten to the live stack.
- **2026-08-28** — Three-app split: client-only signup, host applications, admin app, STOMP `/ws`, `host/` and `admin/` Vite apps. Migration `007` + demo `admin@maresi.app` applied on Neon project **maresi**.
