# Deploy Maresi (Neon + Render + Vercel)

## Stack

| Piece | Host |
|-------|------|
| Postgres | Neon project [green-resonance](https://console.neon.tech/app/projects/green-resonance-11944400) (`neondb`) |
| Spring API | Render (`render.yaml` + `Maresi/Dockerfile`) |
| Web (client PWA) | Vercel (root `web`) |
| Host app | Vercel (root `host`) |
| Admin app | Vercel (root `admin`) |

## 1. Neon

Production Postgres is [this Neon project](https://console.neon.tech/app/projects/green-resonance-11944400/branches/br-purple-surf-ayjhvuju/tables?database=neondb) (`green-resonance-11944400`, database **neondb**). Do not use the older `mute-base-31303142` project.

1. SQL Editor → database **neondb** → run `Maresi/database/pgadmin-full-setup.sql`, then `Maresi/database/seed-demo.sql`.
   If the database already has tables, also run `008_payment_refunded.sql`, `009_direct_host_pay.sql`, `010_host_wallet.sql`, `011_push_subscriptions.sql`, `012_guest_pay_and_payout.sql`, and `013_visit_cancelled.sql`.
2. **Connect** → copy the **pooled** string (`…-pooler…`, `/neondb`, `sslmode=require`).
3. Set that as `DATABASE_URL` on Render (do not commit it). Then redeploy.

Demo logins (password `Password123!`): `client@maresi.app`, `owner@maresi.app`, `admin@maresi.app`.

## 2. Render (API)

1. Push this repo to GitHub (already linked).
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → select the repo (uses root `render.yaml`), **or** **Web Service** with:
   - Root directory: `Maresi`
   - Runtime: **Docker**
3. Set environment variables:

| Key | Value |
|-----|--------|
| `DATABASE_URL` | Neon pooled URI (`postgresql://…?sslmode=require`) |
| `JWT_SECRET` | long random string |
| `DEV_AUTH_BYPASS` | `false` |
| `SMS_PROVIDER` | `mock` |
| `GENIUSPAY_API_KEY` | from GeniusPay |
| `GENIUSPAY_API_SECRET` | from GeniusPay |
| `GENIUSPAY_WEBHOOK_SECRET` | from GeniusPay |
| `GENIUSPAY_PAYOUT_WALLET_ID` | GeniusPay payout wallet UUID (from `GET /wallets`, type `payout`) |
| `PAYMENT_SUCCESS_URL` | Client Vercel: `https://YOUR-CLIENT-APP.vercel.app/payments/success` |
| `PAYMENT_ERROR_URL` | Client Vercel: `https://YOUR-CLIENT-APP.vercel.app/payments/error` |
| `PAYMENT_HOST_SUCCESS_URL` | Host Vercel: `https://YOUR-HOST-APP.vercel.app/payments/success` |
| `PAYMENT_HOST_ERROR_URL` | Host Vercel: `https://YOUR-HOST-APP.vercel.app/payments/error` |
| `VAPID_PUBLIC_KEY` | `npx web-push generate-vapid-keys` → public key |
| `VAPID_PRIVATE_KEY` | same command → private key (keep secret) |
| `VAPID_SUBJECT` | `mailto:your-email@domain` |

4. Deploy. Health check: `GET https://YOUR-RENDER-APP.onrender.com/api/health`
5. GeniusPay webhook URL: `https://YOUR-RENDER-APP.onrender.com/api/webhooks/geniuspay`

Free Render services sleep when idle; first request after sleep can take ~30–60s.

## 3. Vercel (three apps)

Same build for each: `npm run build`, output `dist`. Redeploy after changing `VITE_*` (baked at build time).

### Client (`web/`)

| Setting | Value |
|---------|--------|
| Root Directory | `web` |
| Env | `VITE_API_URL=https://maresi.onrender.com/api` |
| Env | `VITE_WS_URL=https://maresi.onrender.com/ws` |
| Env | `VITE_HOST_APP_URL=https://maresi-host.vercel.app` |
| Env | `VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token` |

### Host (`host/`)

| Setting | Value |
|---------|--------|
| Root Directory | `host` |
| Env | `VITE_API_URL=https://maresi.onrender.com/api` |
| Env | `VITE_WS_URL=https://maresi.onrender.com/ws` |
| Env | `VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token` |

Login: owners only (`owner@maresi.app`).

### Admin (`admin/`)

| Setting | Value |
|---------|--------|
| Root Directory | `admin` |
| Env | `VITE_API_URL=https://maresi.onrender.com/api` |
| Env | `VITE_WS_URL=https://maresi.onrender.com/ws` |

Login: `admin@maresi.app`.

For a fresh local Postgres, run `Maresi/database/pgadmin-full-setup.sql` then `seed-demo.sql`.

## Local vs production

- Local: keep using `application-local.properties` + localhost Postgres if you want.
- Production API never loads secrets from git; only Render env vars.
