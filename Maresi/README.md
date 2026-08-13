# Maresi API (Java / Spring Boot)

REST API for the Maresi residence listing platform. Port **4000**.

## Requirements

- Java 17+
- Maven 3.9+
- PostgreSQL (pgAdmin)

---

## Database setup (pgAdmin)

### 1. Create the database

1. Open **pgAdmin** and connect to your local PostgreSQL server.
2. Right-click **Databases** → **Create** → **Database…**
3. Name: `Maresi` → **Save**

### 2. Run the schema

1. Click the new **Maresi** database.
2. **Tools** → **Query Tool**
3. **File** → **Open** → choose:
   ```
   Maresi/database/pgadmin-full-setup.sql
   ```
4. Press **F5** (Execute). You should see tables: `users`, `properties`, `favorites`, `visit_requests`, `notifications`, etc.
5. (Optional) Also run `Maresi/database/migrations/004_visit_request_id_card.sql` if that column is missing.

### 3. Load demo data (mock seed)

In the same Query Tool, open and execute:

```
Maresi/database/seed-demo.sql
```

Demo accounts (password for all: `Password123!`):

| Email | Role |
|-------|------|
| `client@maresi.app` | client |
| `owner@maresi.app` | owner (Aminata K.) |
| `owner2@maresi.app` | owner |
| `owner3@maresi.app` | owner |

This inserts 4 Abidjan sample listings. Safe to re-run (upserts on fixed IDs/emails).

### 4. Connect the API

```bash
cd Maresi
cp src/main/resources/application-local.properties.example src/main/resources/application-local.properties
```

Edit `application-local.properties` with your pgAdmin credentials:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/Maresi
spring.datasource.username=postgres
spring.datasource.password=YOUR_PASSWORD
maresi.dev-auth-bypass=false
```

> `application-local.properties` is gitignored — your password stays local.

Alternative: set `DATABASE_URL=postgresql://postgres:PASSWORD@localhost:5432/Maresi` as an environment variable.

---

## Run

```bash
cd Maresi
mvn spring-boot:run
```

Health: `GET http://localhost:4000/api/health` → `{"ok":true}`

Register users from the web/Flutter apps, or log in with the demo accounts from `seed-demo.sql`. Data is stored in your PostgreSQL database.

**Local web:** from `web/`, run `npm run dev` (Vite proxies `/api` → `http://localhost:4000`).

---

## Build

```bash
mvn -DskipTests package
java -jar target/maresi-api-1.0.0.jar
```

## Endpoints

| Prefix | Description |
|--------|-------------|
| `/api/auth` | Register, login |
| `/api/properties` | Listings + uploads |
| `/api/favorites` | Favorites |
| `/api/visit-requests` | Reservations |
| `/api/notifications` | Notifications |

Auth header: `Authorization: Bearer <token>`
