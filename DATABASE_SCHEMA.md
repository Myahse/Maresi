# Database Schema (PostgreSQL)

## ER Overview

- **users** — accounts (email, password hash, role: guest/client/owner).
- **properties** — listings (owner_id → users, title, description, price, location, type, images).
- **favorites** — user_id + property_id (many-to-many).
- **visit_requests** — user_id, property_id, message, status, timestamps.

---

## Tables

### 1. users

| Column         | Type         | Constraints        | Description                |
|----------------|--------------|--------------------|----------------------------|
| id             | UUID         | PRIMARY KEY DEFAULT gen_random_uuid() | |
| email          | VARCHAR(255) | UNIQUE NOT NULL    | Login email                |
| password_hash  | VARCHAR(255) | NOT NULL           | bcrypt hash                |
| full_name      | VARCHAR(255) | NOT NULL           | Display name               |
| role           | VARCHAR(20)  | NOT NULL DEFAULT 'client' | 'client' \| 'owner' \| 'admin' |
| phone          | VARCHAR(50)  |                    | Optional contact           |
| avatar_url     | VARCHAR(500) |                    | Optional profile image     |
| created_at     | TIMESTAMPTZ  | DEFAULT NOW()      | |
| updated_at     | TIMESTAMPTZ  | DEFAULT NOW()      | |

**Indexes:** `UNIQUE(email)`.

---

### 2. properties

| Column       | Type         | Constraints        | Description                |
|--------------|--------------|--------------------|----------------------------|
| id           | UUID         | PRIMARY KEY DEFAULT gen_random_uuid() | |
| owner_id     | UUID         | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| title        | VARCHAR(255) | NOT NULL           | |
| description  | TEXT         |                    | |
| price        | DECIMAL(12,2)| NOT NULL           | Per night or per month     |
| location     | VARCHAR(500) | NOT NULL           | Address or area            |
| property_type| VARCHAR(50)  | NOT NULL           | apartment, house, studio   |
| images       | TEXT[]       |                    | Array of image URLs/paths  |
| is_active    | BOOLEAN      | DEFAULT true       | Soft visibility            |
| created_at   | TIMESTAMPTZ  | DEFAULT NOW()      | |
| updated_at   | TIMESTAMPTZ  | DEFAULT NOW()      | |

**Indexes:** `owner_id`, `property_type`, `price`, `is_active` (for listing filters).

---

### 3. favorites

| Column     | Type | Constraints | Description |
|------------|------|-------------|-------------|
| id         | UUID | PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id    | UUID | NOT NULL REFERENCES users(id) ON DELETE CASCADE | |
| property_id| UUID | NOT NULL REFERENCES properties(id) ON DELETE CASCADE | |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | |

**Unique:** `(user_id, property_id)` — one favorite per user per property.

**Indexes:** `user_id`, `property_id`.

---

### 4. visit_requests

| Column      | Type         | Constraints        | Description                |
|-------------|--------------|--------------------|----------------------------|
| id          | UUID         | PRIMARY KEY DEFAULT gen_random_uuid() | |
| user_id     | UUID         | NOT NULL REFERENCES users(id) ON DELETE CASCADE | Requester |
| property_id | UUID         | NOT NULL REFERENCES properties(id) ON DELETE CASCADE | |
| message     | TEXT         |                    | Optional message           |
| status      | VARCHAR(20)  | DEFAULT 'pending'  | pending, accepted, declined |
| requested_at| TIMESTAMPTZ  | DEFAULT NOW()      | |
| responded_at| TIMESTAMPTZ  |                    | Owner response time        |

**Indexes:** `user_id`, `property_id`, `status`.

---

## SQL Script (PostgreSQL)

See `Maresi/database/schema.sql` for the executable migration script.
