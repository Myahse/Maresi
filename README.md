# Maresi — Residence listing platform

Abidjan-first rental marketplace: **Spring Boot API**, **three Vite apps** (client / host / admin), **Flutter**, **PostgreSQL**.

Layout and data flow: [ARCHITECTURE.md](ARCHITECTURE.md) · Schema: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) · Deploy: [DEPLOY.md](DEPLOY.md)

## Project structure

```
maresi/
├── Maresi/            # Java 17 Spring Boot API (port 4000) — Render
├── web/               # Client listing PWA (port 3000) — Vercel
├── host/              # Host operations (port 3001) — Vercel
├── admin/             # Admin approvals (port 3002) — Vercel
├── mobile_flutter/    # Flutter
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
└── README.md
```

Do not rename `Maresi/`, `web/`, `host/`, or `admin/` — those are deploy roots.

## Quick start

### 1. Database

1. Create a Postgres database named `Maresi`.
2. Run `Maresi/database/pgadmin-full-setup.sql`, then `Maresi/database/seed-demo.sql`.
3. Copy `Maresi/src/main/resources/application-local.properties.example` → `application-local.properties`.

Or use Neon; see [DEPLOY.md](DEPLOY.md). Demo password for all: `Password123!` (`client@maresi.app`, `owner@maresi.app`, `admin@maresi.app`).

### 2. API

Java 17+ and Maven:

```bash
cd Maresi
mvn spring-boot:run
```

`http://localhost:4000` — `GET /api/health` — OpenAPI `/swagger-ui.html`

### 3. Vite apps

```bash
cd web && npm install && npm run dev     # :3000 clients
cd host && npm install && npm run dev    # :3001 owners
cd admin && npm install && npm run dev   # :3002 admin@maresi.app
```

Each app proxies `/api` and `/ws` to `:4000`. Signup on `web/` is always **client**. Apply at `/become-host`; approve in `admin/`; operate listings in `host/`.

### 4. Flutter

```bash
cd mobile_flutter
flutter pub get
flutter run --dart-define=API_URL=http://localhost:4000
```

Android emulator default is `http://10.0.2.2:4000`. Offline demo: `--dart-define=USE_MOCK=true`.

## Languages

EN/FR via `i18next` in `web/`, `host/`, and `admin/` (`src/locales`). Flutter uses its own l10n. Preference key `maresi-lang`.

## Features

- Auth: register as client, login, phone OTP, JWT. Hosts apply; admin approves.
- Client PWA: browse, map, favorites, visit/reservation, become-host, live events.
- Host app: listing CRUD, visit inbox, subscription, live visit/payment toasts.
- Admin app: host-application queue + live `/topic/admin` feed.
- GeniusPay: owner subscription (10 000 FCFA/month) and 10% reservation commission.

## API (short)

Envelope `{ hasError, status, item | items }`. Full map in [ARCHITECTURE.md](ARCHITECTURE.md).

| Area | Prefix |
|------|--------|
| Auth | `/api/auth/*` |
| Properties | `/api/properties` |
| Favorites | `/api/favorites` |
| Visits | `/api/visit-requests` |
| Payments | `/api/payments`, `/api/webhooks/geniuspay` |
| Host applications | `/api/host-applications` |
| Admin | `/api/admin/host-applications` |
| Websocket | `/ws` (STOMP) |

## License

MIT.
