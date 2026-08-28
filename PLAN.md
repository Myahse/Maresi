# PLAN — Maresi

Working execution plan. Product intent lives in [PRD.md](PRD.md) and [BUSINESS_PLAN.md](BUSINESS_PLAN.md). Current snapshot: [CHECKPOINT.md](CHECKPOINT.md). Agent rules: [AGENT.md](AGENT.md).

---

## Horizon

| Window | Focus |
|--------|-------|
| Now | Stabilize MVP, finish production deploy, keep web / Flutter / API in sync. |
| 0–3 months | Photo quality, visit + payment reliability, first owners in Abidjan. |
| 3–6 months | Ratings trust, listing verification, first monetization tests. |
| 6–12 months | Agency tools, cities beyond Abidjan, verified-owner badge. |

---

## Phase 0 — Foundation (done)

- [x] Spring Boot API on port 4000, PostgreSQL schema + migrations.
- [x] Web (Vite + React + TypeScript + Tailwind) and Flutter clients.
- [x] Auth: email/password JWT + phone OTP.
- [x] Properties CRUD, favorites, visit requests, notifications, ratings.
- [x] GeniusPay: owner subscription + reservation commission.
- [x] EN/FR, map, reservation wizard, owner visit inbox.
- [x] Three web apps: client `web/`, host `host/`, admin `admin/`, STOMP hub at `/ws`.
- [x] Host applications + admin approve; register is always client.

---

## Phase 1 — Production hardening (in progress)

Ship a reliable Abidjan pilot. Do this before new feature work.

1. **Deploy for real**
   - Confirm Neon schema + seed, Render env (including GeniusPay + return URLs), Vercel `VITE_API_URL`.
   - Hit `GET /api/health` after Render wake; complete one subscription and one reservation payment in staging.
2. **Docs vs code**
   - Treat [PRD.md](PRD.md) as product truth. Update [ARCHITECTURE.md](ARCHITECTURE.md) and [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) when touching those areas (they lag the Java/Flutter stack).
3. **Parity**
   - Every new API field or status must land on **web and Flutter** in the same change set.
   - Prefer live API; keep Flutter `USE_MOCK` for demos only.
4. **Quality bar**
   - Enforce ≥ 12 photos on publish (web + Flutter + API).
   - SMS: keep `mock` until a real provider is configured; do not leave OTP broken in production.
   - Uploads: disk `UPLOAD_DIR` is fine for pilot; plan object storage if Render disks reset.

**Exit:** demo logins work on production URLs; one owner can list, one client can request, pay, and see `confirmed`.

---

## Phase 2 — Trust and conversion (next)

1. Owner accept → client checkout with no dead ends (expired payment, webhook miss, double-pay).
2. Public ratings on listing cards and details; prevent rating without a confirmed stay if that rule is adopted.
3. Lightweight listing moderation (hide / flag) before opening to unknown owners.
4. Pricing test with 10–20 pilot owners (commission vs subscription) — see business plan annex.

**Exit:** visit → pay → confirm works end-to-end; owners understand the 10 000 FCFA/month fee.

---

## Phase 3 — Growth

1. Verified-owner badge and optional listing boost.
2. Agency / multi-property dashboard (admin role is in the schema, not in the UI).
3. Push notifications on Flutter (in-app list exists; OS push does not).
4. Expand neighborhoods, then cities outside Abidjan.

---

## Immediate backlog (ordered)

| # | Item | Why |
|---|------|-----|
| 1 | Production env checklist from [DEPLOY.md](DEPLOY.md) | Nothing else matters if the stack is not live. |
| 2 | Photo minimum (12) on create/edit | Core trust differentiator. |
| 3 | Payment / webhook failure UX | Avoid silent `awaiting_payment`. |
| 4 | Align Flutter with web payment + subscription screens | One product, two clients. |
| 5 | ~~Refresh ARCHITECTURE + DATABASE_SCHEMA~~ | Done 2026-08-28 — docs match Java + three Vite apps. |
| 6 | Real SMS provider when OTP goes live | Mock is not production auth. |
| 7 | Durable photo storage | Local disk on free Render is fragile. |

---

## How to work a slice

1. Read [CHECKPOINT.md](CHECKPOINT.md), then the files you will touch.
2. API first if the contract changes (`Maresi/` + SQL migration).
3. Update the Vite app(s) that own the surface (`web/`, `host/`, `admin/`) and Flutter if that screen still uses the field.
4. Add EN **and** FR strings.
5. Update CHECKPOINT when a milestone actually ships.

Local loop: Postgres → `cd Maresi && mvn spring-boot:run` → `cd web && npm run dev` (3000) → `cd host && npm run dev` (3001) → `cd admin && npm run dev` (3002).
