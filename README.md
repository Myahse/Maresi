# Maresi — Residence Listing Platform

A modern platform where property owners list residences and clients browse them. Includes a **web app** (React + Vite + TypeScript + **Tailwind CSS** + shadcn), **mobile apps** (Expo + Flutter), and a **Java Spring Boot REST API** with PostgreSQL.

## Project structure

```
maresi/
├── Maresi/           # Java Spring Boot API (port 4000)
├── web/              # React + Vite + shadcn
├── mobile_flutter/   # Flutter mobile app (connects to Maresi API)
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
└── README.md
```

## Quick start

### 1. Database (PostgreSQL + pgAdmin)

1. In **pgAdmin**, create a database named `Maresi`.
2. Open **Query Tool** on that database and execute `Maresi/database/pgadmin-full-setup.sql`.
3. Copy `Maresi/src/main/resources/application-local.properties.example` to `application-local.properties` and set your PostgreSQL username/password.

See [Maresi/README.md](Maresi/README.md) for details.

### 2. Backend (Java)

Requires **Java 17+** and **Maven**.

```bash
cd Maresi
cp src/main/resources/application-local.properties.example src/main/resources/application-local.properties
# Edit application-local.properties with your pgAdmin credentials
mvn spring-boot:run
```

API: `http://localhost:4000` — Health: `GET /api/health`

See [Maresi/README.md](Maresi/README.md) for details.

### 3. Web app

```bash
cd web
npm install
npm run dev
```

Runs at `http://localhost:3000` with API proxy to `:4000`.

### 4. Flutter mobile app

```bash
cd mobile_flutter
flutter pub get
```

Start the API first (`cd Maresi && mvn spring-boot:run`). The app defaults to `http://10.0.2.2:4000` (Android emulator). Override for other targets:

```bash
# iOS simulator or desktop
flutter run --dart-define=API_URL=http://localhost:4000

# Physical device (use your PC's LAN IP)
flutter run --dart-define=API_URL=http://192.168.x.x:4000
```

## Languages (English / French)

- **Web (`web/`):** Uses `i18next` + `react-i18next`. Strings live in `web/src/locales/en/translation.json` and `web/src/locales/fr/translation.json`. The header includes a language selector; the choice is stored in `localStorage` under `maresi-lang`.
- **Mobile (`mobile/`):** Uses `I18nContext` + `mobile/src/i18n/messages.ts` (EN/FR). Pick **English** or **Français** on the **Profile** tab; preference is stored in AsyncStorage under `maresi-lang`.

## Features

- **Auth:** Register, login, phone OTP (4-digit SMS), JWT.
- **Listings:** CRUD properties (owner), browse with filters (location, price, type).
- **Favorites:** Save and list favorites.
- **Visit requests:** Request a visit from property details.
- **UI:** Green primary, white secondary; mobile-first; shadcn on web.

## API overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register |
| POST | /api/auth/login | No | Login |
| GET | /api/properties | Optional | List (owner sees own if token sent) |
| GET | /api/properties/:id | No | Property details |
| POST | /api/properties | Yes | Create (owner) |
| PUT | /api/properties/:id | Yes | Update (owner) |
| DELETE | /api/properties/:id | Yes | Delete (owner) |
| GET | /api/favorites | Yes | My favorites |
| POST | /api/favorites | Yes | Add favorite (body: `{ "propertyId" }`) |
| DELETE | /api/favorites/:propertyId | Yes | Remove favorite |
| POST | /api/auth/otp/send | No | Send SMS OTP |
| POST | /api/auth/otp/verify | No | Verify OTP & sign in |
| GET | /api/notifications | Yes | My notifications |
| PATCH | /api/notifications/read-all | Yes | Mark all read |
| PATCH | /api/notifications/:id/read | Yes | Mark one read |

## Adding more shadcn components (web)

From the `web` folder:

```bash
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
# etc.
```

## License

MIT.
