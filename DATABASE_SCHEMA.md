# Database schema (PostgreSQL)

Source of truth for a full bootstrap: [`Maresi/database/pgadmin-full-setup.sql`](Maresi/database/pgadmin-full-setup.sql). Incremental files live in [`Maresi/database/migrations/`](Maresi/database/migrations/). Demo rows: [`Maresi/database/seed-demo.sql`](Maresi/database/seed-demo.sql).

Product roles: `client` | `owner` | `admin` (not `guest` — guests are unauthenticated).

---

## ER overview

```
users 1──* properties
users 1──* favorites *──1 properties
users 1──* visit_requests *──1 properties
users 1──* property_ratings *──1 properties
users 1──* notifications
users 1──* payments
users 1──1 owner_subscriptions
users 1──* host_applications (reviewed_by → users)
payments *──? visit_requests
owner_subscriptions.last_payment_id → payments
```

---

## Tables

### users

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | `gen_random_uuid()` |
| email | VARCHAR(255) UNIQUE | Nullable after OTP migration |
| password_hash | VARCHAR(255) | Nullable after OTP migration |
| full_name | VARCHAR(255) NOT NULL | |
| role | VARCHAR(20) NOT NULL | `client` \| `owner` \| `admin`, default `client` |
| phone | VARCHAR(50) | Unique when present |
| avatar_url | VARCHAR(500) | |
| created_at / updated_at | TIMESTAMPTZ | |

### properties

| Column | Type | Notes |
|--------|------|--------|
| id | UUID PK | |
| owner_id | UUID FK users | ON DELETE CASCADE |
| title, description, location | | |
| price | DECIMAL(12,2) | Listing price (FCFA) |
| property_type | VARCHAR(50) | apartment, house, studio |
| images | TEXT[] | URLs / upload paths |
| is_active | BOOLEAN | default true |
| latitude / longitude | DECIMAL(10,7) | |
| virtual_tour_url | VARCHAR(500) | |
| average_rating / rating_count | | Maintained with ratings |
| bedrooms / max_guests | INTEGER | |
| created_at / updated_at | TIMESTAMPTZ | |

### favorites

Unique `(user_id, property_id)`.

### visit_requests

| Column | Type | Notes |
|--------|------|--------|
| user_id / property_id | UUID FK | |
| message, owner_note | TEXT | |
| status | VARCHAR(20) | `pending`, `accepted`, `declined`, `awaiting_payment`, `confirmed` |
| check_in / check_out / visit_date | DATE | |
| visit_time | VARCHAR(20) | |
| guests_count | INTEGER | default 1 |
| contact_phone / id_card | VARCHAR(50) | |
| requested_at / responded_at | TIMESTAMPTZ | |

### property_ratings

Unique `(property_id, user_id)`. Score 1–5.

### notifications

`user_id`, `type`, `title`, `message`, optional `property_id`, `read_at`.

### payments (GeniusPay)

| Column | Type | Notes |
|--------|------|--------|
| type | | `subscription` \| `reservation` |
| visit_request_id | UUID FK | Reservation only |
| amount, commission_amount, owner_amount | DECIMAL(12,2) | |
| currency | VARCHAR(10) | default `XOF` |
| status | | `pending`, `processing`, `completed`, `failed`, `expired` |
| provider / provider_reference / checkout_url | | |
| metadata | JSONB | |

### owner_subscriptions

One row per owner (`user_id` unique). Status `inactive` \| `active` \| `expired`. `last_payment_id` → payments.

### host_applications

Clients apply to become hosts. At most one **pending** row per user (partial unique index).

| Column | Type | Notes |
|--------|------|--------|
| user_id | UUID FK | Applicant |
| full_name, phone | NOT NULL | |
| city, message, id_card | | |
| status | | `pending` \| `approved` \| `rejected` |
| admin_note | | |
| reviewed_by / reviewed_at | | `reviewed_by` → users |

Approve sets `users.role = owner`.

---

## Migrations

| File | Adds |
|------|------|
| `schema.sql` | users, properties, favorites, visit_requests |
| `002_property_extras.sql` | map, tour URL, ratings table |
| `003_visit_request_details.sql` | stay/visit fields, bedrooms, max_guests |
| `004_visit_request_id_card.sql` | `id_card` |
| `004_phone_otp_auth.sql` | nullable email/password, unique phone |
| `005_notifications.sql` | notifications |
| `006_payments.sql` | payments, owner_subscriptions, extra visit statuses |
| `007_host_applications.sql` | host_applications |

New tables: add a file under `migrations/` and keep `pgadmin-full-setup.sql` in sync.
