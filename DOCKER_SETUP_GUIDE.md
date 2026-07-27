# 🐳 Indie CRM Docker & Containerization Guide

Welcome to the comprehensive guide for containerizing and running **Indie CRM** using **Docker** and **Docker Compose**.

This guide covers Docker concepts, container architecture, multi-stage builds, orchestration setup, and practical CLI commands.

---

## 📚 Core Docker Concepts Introduced

| Concept | Description in Indie CRM Context |
| :--- | :--- |
| **Containerization** | Packaging Indie CRM code, dependencies, Node.js runtime, and configuration into a lightweight, portable container that runs identically across macOS, Linux, and Windows. |
| **Dockerfile** | The blueprint script that automates container creation. Our setup uses a **multi-stage build** (`deps` ➔ `builder` ➔ `runner`) to minimize final image size down to ~150MB. |
| **Docker Compose** | Tool for defining and running multi-container applications (`app` + `db`). Managed via `docker-compose.yml`. |
| **Volume Persistence** | `postgres_data` volume preserves database records even when containers stop or restart. |
| **Healthchecks** | Ensures the `app` container waits for PostgreSQL to become fully ready (`pg_isready`) before executing database setup. |

---

## 🏗️ Architecture & Services

```mermaid
flowchart TD
    subgraph Docker Network [indie-crm Network]
        App["Indie CRM App Container\n(Node.js 20 Standalone Server)\nPort: 3000"]
        DB["PostgreSQL Container\n(pgvector/pgvector:pg16)\nPort: 5432"]
    end

    Host["Developer Host Machine / Browser"] -->|http://localhost:3000| App
    App -->|postgresql://indie:***@db:5432/indie_crm| DB
    DB <--> Volume["Named Volume: postgres_data"]
```

### Services Breakdown

1. **`app` Service (Next.js Application)**
   - Built via multi-stage `Dockerfile` (`node:20-alpine`).
   - Runs `docker-entrypoint.sh` on startup to automatically apply database schema (`npx prisma db push`) and seed demo records (`npx prisma db seed`).
   - Serves Next.js standalone server on port `3000`.

2. **`db` Service (PostgreSQL Database)**
   - Image: `pgvector/pgvector:pg16` (includes native vector memory extension for AI search).
   - Configured with automated healthcheck (`pg_isready`).
   - Persists data to Docker volume `postgres_data`.

---

## ⚡ Quick Start

### 1. Prerequisites

Ensure Docker Desktop (or Docker Engine + Docker Compose) is installed:
```bash
docker --version
docker compose version
```

### 2. Launch Application with Docker Compose

Run the following command from the project root:

```bash
docker compose up --build -d
```

Flags:
- `--build`: Forces rebuilding container images.
- `-d`: Runs containers in detached background mode.

### 3. Verify Container Status

```bash
docker compose ps
```

Expected output:
```text
NAME           IMAGE                   COMMAND                  SERVICE   CREATED         STATUS                   PORTS
indie_crm_db   pgvector/pgvector:pg16  "docker-entrypoint.s…"   db        10 seconds ago  Up 10 seconds (healthy)  0.0.0.0:5432->5432/tcp
indie_crm_app  indie-crm-app           "./docker-entrypoint…"   app       5 seconds ago   Up 5 seconds             0.0.0.0:3000->3000/tcp
```

### 4. Access Indie CRM

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

Default Seed Credentials:
- **Email**: `owner@northstarstudio.test`
- **Password**: `demo12345`

---

## 🛠️ Common Operations & Commands

### View Live Logs

```bash
# View all logs
docker compose logs -f

# View application logs only
docker compose logs -f app

# View database logs only
docker compose logs -f db
```

### Stop Containers

```bash
# Stop containers without removing volume data
docker compose down

# Stop containers and wipe database volume (clean reset)
docker compose down -v
```

### Run Database Commands Inside App Container

```bash
# Execute custom seed manually
docker compose exec app npx prisma db seed

# Run Prisma schema status
docker compose exec app npx prisma migrate status
```

### Connect to PostgreSQL Database

```bash
docker compose exec db psql -U indie -d indie_crm
```

---

## ⚙️ Environment Variables Reference

Key environment variables in `docker-compose.yml`:

| Variable | Default Value in Docker | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql://indie:indie_password@db:5432/indie_crm?schema=public` | PostgreSQL connection string |
| `AUTH_SECRET` | `indie-crm-production-docker-secret-32b!` | NextAuth session signing key |
| `ENCRYPTION_KEY` | `indie-crm-docker-encryption-key-32!` | AES-256-GCM token encryption key |
| `DEMO_USER_PASSWORD` | `demo12345` | Password for seeded demo workspace accounts |
| `AUTO_SEED` | `"true"` | Enables automatic seeding on container start |
| `OPENAI_API_KEY` | `""` | Optional OpenAI key (falls back to local vectorizer if empty) |

---

## ❓ Troubleshooting & FAQ

### Port 3000 or 5432 is already in use
If local PostgreSQL or another Node app is using port 5432 or 3000, update `docker-compose.yml` port mappings:
```yaml
ports:
  - "3001:3000" # Maps host port 3001 to container port 3000
```

### Database Healthcheck Timeout
If `db` healthcheck fails on slow hardware, increase `retries` or `timeout` in `docker-compose.yml`.

### Force Clean Rebuild
```bash
docker compose down -v
docker compose build --no-cache
docker compose up -d
```
