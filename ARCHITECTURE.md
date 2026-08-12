# Residence Listing Platform — Architecture

## Overview

Monorepo-style project: shared backend (Java Spring Boot REST API), web app (React + Vite + TypeScript + shadcn), and mobile apps (Expo + Flutter). PostgreSQL for persistence; JWT for auth.

```
maresi/
├── Maresi/                  # Java Spring Boot API
├── web/                     # React + Vite + TypeScript + shadcn
├── mobile/                  # Expo React Native
├── mobile_flutter/          # Flutter mobile app
├── ARCHITECTURE.md
├── DATABASE_SCHEMA.md
└── README.md
```

---

## 1. Backend (Node.js + Express)

**Stack:** Node.js, Express, PostgreSQL (pg), JWT (jsonwebtoken), bcrypt, multer (uploads).

**Structure (MVC):**

```
Maresi/
├── config/
│   └── database.js          # PostgreSQL connection pool
├── controllers/
│   ├── authController.js
│   ├── propertyController.js
│   ├── favoriteController.js
│   └── visitRequestController.js
├── middleware/
│   ├── auth.js              # JWT verify, attach user
│   └── upload.js            # Multer for property images
├── models/
│   ├── User.js
│   ├── Property.js
│   ├── Favorite.js
│   └── VisitRequest.js
├── routes/
│   ├── auth.js
│   ├── properties.js
│   ├── favorites.js
│   └── visitRequests.js
├── services/
│   ├── authService.js
│   └── propertyService.js
├── utils/
│   └── errors.js
├── .env.example
├── package.json
└── server.js
```

**API surface:**

- **Auth:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout` (optional; client drops token).
- **Properties:** `GET /api/properties`, `GET /api/properties/:id`, `POST /api/properties`, `PUT /api/properties/:id`, `DELETE /api/properties/:id` (owner only).
- **Favorites:** `GET /api/favorites`, `POST /api/favorites`, `DELETE /api/favorites/:propertyId`.
- **Visit requests:** `POST /api/visit-requests`, `GET /api/visit-requests` (owner: for own properties; user: own requests).

Protected routes use `auth` middleware; owner-only use role check (`role === 'owner'` or `user.id === property.owner_id`).

---

## 2. Web App (React + Vite + TypeScript + shadcn)

**Stack:** React 18, Vite, TypeScript, React Router, shadcn/ui, **Tailwind CSS** (styling).

**Structure:**

```
web/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn components
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   ├── property/
│   │   │   ├── PropertyCard.tsx
│   │   │   ├── PropertyFilters.tsx
│   │   │   └── PropertyForm.tsx
│   │   └── auth/
│   │       └── LoginForm.tsx, RegisterForm.tsx
│   ├── pages/
│   │   ├── LandingPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── PropertyDetailsPage.tsx
│   │   ├── FavoritesPage.tsx
│   │   └── owner/
│   │       ├── OwnerDashboardPage.tsx
│   │       └── PropertyEditPage.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   └── useApi.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── types/
│   │   └── index.ts
│   ├── layouts/
│   │   ├── MainLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.ts
└── tsconfig.json
```

**Design:** Green primary, white secondary; mobile-first; all styling via **Tailwind** utility classes (and CSS variables in `index.css` for theme tokens); shadcn-style components use Tailwind.

---

## 3. Mobile App (Expo React Native)

**Stack:** Expo SDK, React Navigation, TypeScript.

**Structure:**

```
mobile/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── PropertyDetailsScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   └── owner/
│   │       ├── OwnerDashboardScreen.tsx
│   │       └── PropertyEditScreen.tsx
│   ├── components/
│   │   ├── PropertyCard.tsx
│   │   └── ...
│   ├── navigation/
│   │   ├── AppNavigator.tsx
│   │   └── types.ts
│   ├── services/
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── hooks/
│   │   └── useAuth.ts
│   └── types/
│       └── index.ts
├── app.json
├── package.json
└── tsconfig.json
```

**Screens:** Login, Register, Home (listings), Property Details, Favorites, Profile, Owner dashboard & property edit. Same API base URL as web; JWT in header.

---

## 4. Authentication Flow

1. **Guest:** Sees landing only; no access to `/properties` or other protected data.
2. **Register/Login:** Email + password → backend returns JWT.
3. **Client:** Stores JWT (web: memory/localStorage; mobile: secure store). All API calls send `Authorization: Bearer <token>`.
4. **Owner:** Same as client; backend allows `POST/PUT/DELETE` on properties only when `user.id === property.owner_id` (and optionally `role === 'owner'`).

---

## 5. Data Flow

- **Web/Mobile → Backend:** REST JSON; multipart for image uploads.
- **Backend → PostgreSQL:** Connection pool; parameterized queries to avoid SQL injection.
- **Images:** Stored on disk (e.g. `Maresi/uploads`) or cloud (S3); DB stores URLs/paths.

---

## 6. Roles Summary

| Role   | Landing | Listings | Details | Favorites | Visit request | Manage own properties |
|--------|---------|----------|---------|-----------|---------------|------------------------|
| Guest  | ✅      | ❌       | ❌      | ❌        | ❌            | ❌                     |
| Client | ✅      | ✅       | ✅      | ✅        | ✅            | ❌                     |
| Owner  | ✅      | ✅       | ✅      | ✅        | ✅            | ✅                     |

Next: see `DATABASE_SCHEMA.md` for tables and relations.
