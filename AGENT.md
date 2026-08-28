# AGENT.md — Maresi

Instructions for any coding agent working in this repository. Product: [PRD.md](PRD.md). Execution: [PLAN.md](PLAN.md). Status: [CHECKPOINT.md](CHECKPOINT.md).

---

## What this repo is

Maresi is a residence rental marketplace for Abidjan (web + Flutter + Spring Boot + Postgres). Do not rebuild auth, listings, or payments from scratch. Extend the existing three-client architecture.

```
maresi/
├── Maresi/            # Java 17 Spring Boot API (port 4000)
├── web/               # Client listing PWA (port 3000)
├── host/              # Host operations app (port 3001)
├── admin/             # Admin approvals (port 3002)
├── mobile_flutter/    # Flutter app (live API or USE_MOCK)
├── DEPLOY.md          # Neon + Render + Vercel
└── BUSINESS_PLAN.md   # Market / monetization (French)
```

`ARCHITECTURE.md` matches this stack (Spring + three Vite apps + Flutter). Ignore any leftover Node/Expo wording elsewhere.

---

## Before changing code

1. Read [CHECKPOINT.md](CHECKPOINT.md) and the nearest existing controller / page / screen.
2. Match local patterns (envelope, JWT, i18n, roles). Do not introduce a second API style.
3. If the contract changes, update **API + the affected Vite app(s)** (and Flutter if that surface still uses the field).
4. Do not commit secrets (`.env`, `application-local.properties`, GeniusPay keys, `DATABASE_URL`).

---

## API (`Maresi/`)

- Layering: `controller` → `service` / `business` → `repository`. JDBC + `RowMaps`; no JPA entities.
- Envelope: `Response<T>` with `hasError`, `status`, `item` or `items`, `count`. Use `ControllerSupport.run` / `runCreated`.
- Auth: JWT Bearer. Public: `/api/health`, `/api/auth/**`, `/api/webhooks/**`, `/ws/**`, `GET /api/properties`. `/api/admin/**` requires `ROLE_ADMIN`.
- Roles: `client` | `owner` | `admin`. Register always creates `client`. Hosts apply; admin approves.
- Authorities on the JWT principal: `ROLE_CLIENT` / `ROLE_OWNER` / `ROLE_ADMIN`.
- Realtime: STOMP `/ws`. Publish via `RealtimeEventPublisher` after domain writes. Keep notifications as fallback.
- Locale: honor `Locale` and `errorMessage_*.properties`.
- New tables: add a SQL file under `Maresi/database/migrations/` and keep `pgadmin-full-setup.sql` in sync if the full bootstrap is still used.
- Payments: GeniusPay only. Subscription `OWNER_SUBSCRIPTION_FCFA` (default 10000). Reservation commission `RESERVATION_COMMISSION_PERCENT` (default 10). Webhook: `POST /api/webhooks/geniuspay`.
- Visit statuses: `pending` → `accepted` | `declined` → `awaiting_payment` → `confirmed`. Do not invent extra statuses without a migration.

---

## Web apps

- Client `web/` (port 3000): listings, favorites, visits, become-host. No owner CRUD.
- Host `host/` (port 3001): owners only. Listings, visits, subscription.
- Admin `admin/` (port 3002): admins only. Host application queue + `/topic/admin`.
- Vite proxies `/api` and `/ws` to `localhost:4000`. Production: `VITE_API_URL`, `VITE_WS_URL` baked at build.
- Client also needs `VITE_HOST_APP_URL`.
- Envelope unwrap in `src/services/api.ts`. Realtime: `src/hooks/useRealtime.ts` (`@stomp/stompjs` + SockJS).
- i18n EN/FR in each app’s `src/locales`. JWT: `localStorage` key `token`.

---

## Flutter (`mobile_flutter/`)

- Live API by default (`http://10.0.2.2:4000` on Android emulator). Override: `--dart-define=API_URL=...`.
- Offline demo: `--dart-define=USE_MOCK=true` — do not let mock models drift from the API without updating both.
- Mirror web flows: auth, listings, favorites, visits, notifications, subscription, reservation, ratings.
- EN/FR via existing l10n (`app_strings` / locale provider).

---

## Do / don't

**Do**

- Small, vertical slices (one feature across API + clients).
- Parameterized SQL; UUID primary keys.
- Keep [CHECKPOINT.md](CHECKPOINT.md) honest when a milestone ships.
- Follow [DEPLOY.md](DEPLOY.md) for env var names (`DATABASE_URL`, `JWT_SECRET`, `DEV_AUTH_BYPASS=false` in prod).

**Don't**

- Add Express/Node or Expo as a new backend/mobile stack.
- Return raw arrays from the API; always use the envelope.
- Hardcode production URLs or secrets.
- Skip French copy.
- Expand scope into chat, leases, or multi-country payments unless the user asks.

---

## Verify

| Layer | Check |
|-------|--------|
| API | `GET http://localhost:4000/api/health` |
| Host | `cd host && npm run dev` (port 3001) |
| Admin | `cd admin && npm run dev` (port 3002) |
| Flutter | Run the matching screen against the API (not only mock) |
| UI | If you change web UX, verify in the browser (click through, not screenshot-only) |

Demo logins: `client@maresi.app` / `owner@maresi.app` / `admin@maresi.app` with `Password123!` after `seed-demo.sql`.
