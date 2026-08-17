# Deploy Maresi (Neon + Render + Vercel)

## Stack

| Piece | Host |
|-------|------|
| Postgres | Neon project `maresi` |
| Spring API | Render (`render.yaml` + `Maresi/Dockerfile`) |
| Web (Vite PWA) | Vercel (root `web`) |

## 1. Neon

Project: **maresi** (already created, schema + demo seed applied).

1. Open [Neon Console](https://console.neon.tech) → project **maresi**.
2. Copy the **pooled** connection string (`…-pooler…`, includes `sslmode=require`).
3. Use it as `DATABASE_URL` on Render (do not commit it).

Demo logins (password `Password123!`): `client@maresi.app`, `owner@maresi.app`.

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
| `PAYMENT_SUCCESS_URL` | `https://YOUR-VERCEL-APP/payments/success` |
| `PAYMENT_ERROR_URL` | `https://YOUR-VERCEL-APP/payments/error` |

4. Deploy. Health check: `GET https://YOUR-RENDER-APP.onrender.com/api/health`
5. GeniusPay webhook URL: `https://YOUR-RENDER-APP.onrender.com/api/webhooks/geniuspay`

Free Render services sleep when idle; first request after sleep can take ~30–60s.

## 3. Vercel (web)

| Setting | Value |
|---------|--------|
| Root Directory | `web` |
| Build | `npm run build` |
| Output | `dist` |
| Env | `VITE_API_URL=https://YOUR-RENDER-APP.onrender.com/api` |

Redeploy after setting `VITE_API_URL` (it is baked in at build time).

## Local vs production

- Local: keep using `application-local.properties` + localhost Postgres if you want.
- Production API never loads secrets from git; only Render env vars.
