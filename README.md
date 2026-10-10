# Indie CRM with AI Tagging

A multi-tenant AI-assisted CRM for solo operators that turns unstructured lead conversations into searchable, actionable client intelligence.

This project is intentionally built as a believable SaaS case study instead of an isolated AI demo. The app focuses on real lead workflow, tenant-safe data access, provenance-aware AI features, searchable memory, and integration patterns that look like production software.

## Product Framing

Indie CRM is designed for freelancers, consultants, creators, and small agencies who need a lightweight system to:

- capture inbound leads from manual entry, webhooks, and Gmail sync
- manage conversations, notes, follow-up timing, and pipeline state
- use AI for tagging, summaries, reply suggestions, and follow-up guidance
- search prior client memory semantically instead of relying on exact keywords
- operate inside a multi-tenant workspace model with roles, auditability, and queue-backed integrations

## What The App Demonstrates

- Multi-tenant SaaS architecture with workspace-scoped queries
- Credential auth plus workspace membership and invite flows
- Lead inbox, lead detail workflow, notes, reply composition, and quick actions
- AI provenance storage through `AIGeneration`
- Webhook ingestion with storage-first queue handling and scheduled processing
- Gmail connection and sync groundwork
- Semantic search with stored embeddings, grounded answers, and similar-lead retrieval
- Audit logs and operational events for credibility beyond the UI layer

## Core Features

- Authentication with email/password credentials
- Workspace ownership, membership roles, and invite acceptance flow
- Lead creation, editing, notes, outbound replies, follow-up scheduling, and inbox views
- AI lead tagging, summaries, reply drafts, follow-up recommendations, and grounded memory answers
- Embedding storage for messages and notes, semantic search, and similar-lead retrieval
- Form webhook ingestion endpoint with queue processing and Vercel cron support
- Vision AI Image Processing Pipeline for scanning business cards, meeting whiteboards, conference badges, and documents with instant OCR, predictive scoring, and pgvector embeddings
- Gmail mailbox connection and manual sync path
- Audit log and operational-event tracking for workflow, AI, webhook, and sync activity

## Tech Stack

- Next.js App Router
- TypeScript
- React 19
- Prisma
- PostgreSQL
- NextAuth/Auth.js credentials provider
- OpenAI API for generation and embeddings, with deterministic local fallbacks
- Tailwind CSS
- Vercel cron configuration via `vercel.json`

## Architecture

### Request And Data Flow

```mermaid
flowchart LR
    User["User / Operator"] --> UI["Next.js App Router UI"]
    UI --> Actions["Server Actions / Route Handlers"]
    Actions --> Auth["Auth + Membership Checks"]
    Auth --> Prisma["Prisma Data Layer"]
    Prisma --> DB["PostgreSQL"]
    Actions --> AI["OpenAI / Local AI Fallbacks"]
    AI --> Prisma
    Actions --> Queue["Webhook Queue + Retry Processing"]
    Queue --> Prisma
```

### Memory And Retrieval Flow

```mermaid
flowchart TD
    Msg["Inbound / Outbound Messages"] --> Embed["Generate Embeddings"]
    Note["Lead Notes"] --> Embed
    Embed --> Store["MessageEmbedding / NoteEmbedding"]
    Query["Search Query"] --> QEmbed["Generate Query Embedding"]
    QEmbed --> Search["Keyword + Semantic Retrieval"]
    Store --> Search
    Search --> Answer["Grounded Answer + Similar Leads"]
```

### Integration Flow

```mermaid
flowchart LR
    Form["Form Webhook"] --> Webhook["WebhookEvent (stored first)"]
    Gmail["Gmail Sync"] --> Mailbox["MailboxConnection + Imported Messages"]
    Webhook --> Processor["Queue Processor / Cron Route"]
    Processor --> Lead["Lead + Contact + Conversation + Message"]
    Mailbox --> Lead
    Lead --> AI["AI Tagging / Summary / Embeddings"]
```

### Vision AI & Image Processing Workflow (Week 10 Deliverable)

Indie CRM includes an end-to-end Vision AI intake pipeline that transforms unstructured physical interactions—business cards, whiteboard brainstorms, conference badges, and documents—into structured CRM intelligence in seconds.

```mermaid
flowchart TD
    Img["Image Upload / 1-Click Preset"] --> Check["SHA-256 Checksum & Guardrails (<10MB)"]
    Check --> RL["Rate Limiting (20 req/min)"]
    RL --> Vision["OpenAI Vision API (gpt-4o-mini) / Offline Fallback"]
    Vision --> Extract["Structured JSON Extraction (Contact + Lead)"]
    Extract --> Score["Predictive Lead Scoring Engine (0-100)"]
    Extract --> TenantDB["Tenant-Scoped DB Write (Contact, Lead, Note)"]
    TenantDB --> Embed["pgvector Semantic Embeddings (1536-dim)"]
    TenantDB --> Prov["AIGeneration Audit & Provenance Store"]
    Score --> Workflow["Workflow Engine: Triggers & Slack Block Kit Alerts"]
```

#### How to Run the Live Demo
1. Navigate to the **AI Scanner** tab in the sidebar (`/w/:workspaceSlug/scanner`).
2. Choose one of the built-in 1-click presets:
   - 🪪 **Luminary Creative Studio VP Business Card**
   - 📋 **HyperGrowth Labs Strategy Whiteboard** ($18,500 scope)
   - 🏷️ **Health-Tech Summit 2026 Attendee Badge** (Urgent priority)
   - Or upload any custom JPEG, PNG, or WebP photo ($\le$ 10MB).
3. Click **Execute End-to-End Pipeline** to observe real-time stage progression:
   `Validation ➔ Vision OCR ➔ Lead Scoring ➔ pgvector Embeddings ➔ Workflow Triggers`.
4. Deep-link directly into the generated Lead record with full provenance, extracted notes, and semantic search ready.

#### Programmatic API Endpoint
```bash
# Ingest an image or preset via REST API:
curl -X POST "http://localhost:3000/api/workspaces/demo-workspace/image-workflow" \
  -F "presetKey=card"
```

For complete documentation, see the [Vision AI & Image Processing Guide](IMAGE_PROCESSING_GUIDE.md) and [LinkedIn Post #4](LINKEDIN_POST_4.md).

## Data Model Highlights

Key models:

- `Tenant`
- `User`
- `Membership`
- `WorkspaceInvite`
- `Contact`
- `Lead`
- `Conversation`
- `Message`
- `Note`
- `Tag`
- `LeadTag`
- `WebhookEvent`
- `MailboxConnection`
- `AIGeneration`
- `MessageEmbedding`
- `NoteEmbedding`
- `AuditLog`
- `OperationalEvent`

Important architectural choices in the schema:

- Every business record is tenant-scoped through `tenantId`
- AI output is stored in `AIGeneration` with `type`, `model`, `promptVersion`, `inputSummary`, `outputText`, and `metadata`
- Webhook processing is durable enough to retry through `WebhookEvent.status`, `retryCount`, `maxRetries`, `lastAttemptAt`, and `nextRetryAt`
- Searchable memory is stored explicitly through `MessageEmbedding` and `NoteEmbedding`
- Workflow credibility is supported through `AuditLog` and `OperationalEvent`

## 🐳 Docker Deployment & Containerization

Indie CRM includes full Docker and Docker Compose orchestration for running both the Next.js application and PostgreSQL (`pgvector`) in isolated containers.

### Quick Start with Docker Compose

```bash
# Build and launch application & database containers
docker compose up --build -d
```

Open **[http://localhost:3000](http://localhost:3000)** (Default login: `owner@northstarstudio.test` / `demo12345`).

For a detailed educational guide on Docker multi-stage builds, container architecture, volume persistence, and CLI commands, see **[DOCKER_SETUP_GUIDE.md](file:///Users/user/Downloads/indie%20crm/DOCKER_SETUP_GUIDE.md)**.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment variables

Use [`app/.env.example`](/Users/user/Downloads/Indie%20CRM%20with%20AI%20Tagging/app/.env.example) as the starting point.

Minimum useful variables:

```env
DATABASE_URL="postgresql://user@localhost:5432/indie_crm?schema=public"
AUTH_SECRET="replace-with-a-long-random-secret"
DEMO_USER_PASSWORD="demo12345"
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-5-mini"
OPENAI_EMBEDDING_MODEL="text-embedding-3-small"
FORM_WEBHOOK_SECRET=""
INTERNAL_CRON_SECRET=""
CRON_SECRET=""
```

Notes:

- If `OPENAI_API_KEY` is missing, the app falls back to deterministic local AI/embedding behavior so the workflow still works.
- If `FORM_WEBHOOK_SECRET` is set, form webhook callers must send `x-indie-crm-secret`.
- `CRON_SECRET` is used by the Vercel cron route.

### 3. Generate the Prisma client

```bash
npm run db:generate
```

### 4. Push the schema

```bash
npm run db:push
```

### 5. Seed the demo workspace

```bash
npm run db:seed
```

### 6. Start the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Run the lightweight test suite

```bash
npm run test
```

## Demo Credentials

When seeded, the default demo login is:

- Email: `owner@northstarstudio.test`
- Password: `demo12345`

If you change `DEMO_USER_PASSWORD`, use that value instead.

## Seeded Demo Scenarios

The seed data now includes two real workspaces for the same user:

- `northstar-studio`
- `signal-lab`

Inside those workspaces, the seeded records are intentionally varied so the portfolio demo feels like a working CRM instead of a single happy-path inbox:

- high-intent branding inquiry with timeline pressure
- healthcare proposal with confirmed budget
- stalled follow-up retainer lead
- operations-focused CRM workflow inquiry
- historical lost lead
- second-workspace qualified and won leads for workspace switching

That mix supports better screenshots, more believable saved views, and clearer multi-tenant demos.

## Operational Endpoints

### Public form webhook

`POST /api/webhooks/forms/:workspaceSlug`

Example payload:

```json
{
  "name": "Maya Cole",
  "email": "maya@studiolantern.com",
  "company": "Studio Lantern",
  "title": "Brand refresh and marketing site",
  "message": "Looking for a brand refresh and a four-page site before June.",
  "source": "FORM",
  "priority": "HIGH"
}
```

### Internal queue processor

`POST /api/internal/process-webhooks?workspaceSlug=northstar-studio&limit=20`

Header:

```http
x-internal-secret: YOUR_INTERNAL_CRON_SECRET
```

### Vercel cron processor

`GET /api/cron/process-webhooks`

Header:

```http
Authorization: Bearer YOUR_CRON_SECRET
```

Configured schedule in [`app/vercel.json`](/Users/user/Downloads/Indie%20CRM%20with%20AI%20Tagging/app/vercel.json):

```json
{
  "crons": [
    {
      "path": "/api/cron/process-webhooks",
      "schedule": "0 8 * * *"
    }
  ]
}
```

## Search And Memory

The search experience combines:

- keyword scoring across summaries, tags, notes, AI outputs, and contact context
- semantic matching over stored message and note embeddings
- grounded answer generation from retrieved workspace evidence
- similar-lead retrieval on lead detail
- deep links from search snippets back into the relevant lead record

If you are testing locally with an empty OpenAI key, embeddings still work through a deterministic fallback vectorizer so the UX remains demonstrable.

## Gmail Sync

The app includes Gmail connection and sync scaffolding:

- stores mailbox connections per tenant
- tracks sync attempts, errors, and last successful sync time
- imports messages into existing CRM entities
- dedupes imported mail using `externalMessageId`
- updates embeddings and AI intelligence for newly created CRM records

## Engineering Decisions

### Every business query is scoped by tenant

The project treats tenant isolation as a baseline design rule, not a cleanup step. Queries for leads, contacts, notes, webhook events, embeddings, audit logs, and mailbox connections are scoped by workspace membership or tenant slug.

### Webhooks are stored before processing

Form submissions first become `WebhookEvent` rows. That gives the system a retry surface, an audit trail, and a cleaner path toward external workers or platform queues.

### AI outputs are stored with provenance

Generations are not ephemeral UI artifacts. The app persists model name, prompt version, summarized input, output text, and metadata so the user can inspect what happened later.

### Embeddings are regenerated when searchable content changes

New inbound and outbound messages trigger embedding writes automatically, and the app exposes a backfill path for older records. This keeps semantic search tied to actual CRM history instead of a one-off indexing step.

## Portfolio Screenshots

Captured from the seeded demo workspace on the current build:

### Workspace dashboard

![Workspace dashboard](public/screenshots/dashboard.png)

### Lead inbox

![Lead inbox](public/screenshots/lead-inbox.png)

### Lead detail

![Lead detail](public/screenshots/lead-detail.png)

### Search and memory

![Search and memory](public/screenshots/search-memory.png)

### Settings and integrations

![Settings and integrations](public/screenshots/settings.png)

## Testing And Validation

Current automated and operational validation suite:

- **GitHub Actions CI/CD (`.github/workflows/ci.yml`)**: Automated pipeline running on every PR and main commit (`npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`, Docker container build, and AWS ECS deployment).
- **Terraform CI/CD Pipeline (`.github/workflows/terraform.yml`)**: Automated workflow checking formatting (`terraform fmt -check`), validating syntax (`terraform validate`), planning against AWS, and applying updates on merge.
- **Unit Test Suite (`npm run test`)**: 74 automated unit & integration tests running in `< 1.5s` verifying Vision AI extraction, SHA-256 integrity, AES-256-GCM encryption, RBAC capabilities, vector cosine similarity math, event queue dispatching, lead scoring, workflow automation rules, and HMAC-SHA256 webhook signatures.
- **Container Liveness Probe (`GET /api/health`)**: Public JSON healthcheck endpoint reporting container state, uptime latency, and PostgreSQL connectivity.
- **Dedicated Technical Guides**:
  - [AWS Terraform Infrastructure & Deployment Guide](TERRAFORM_DEPLOYMENT_GUIDE.md)
  - [Cloud Readiness Review & Well-Architected Assessment](CLOUD_READINESS_REVIEW.md)
  - [Technical Mock Interview #3 Prep & Architecture Q&A](MOCK_INTERVIEW_3.md)
  - [Architecture Presentation Deck](ARCHITECTURE_PRESENTATION.md)
  - [CRM v2 Technical Manual & Specification](CRM_V2_DOCUMENTATION.md)
  - [Vision AI & Image Processing Guide](IMAGE_PROCESSING_GUIDE.md)
  - [REST API & OpenAPI Specification](API_DOCUMENTATION.md)
  - [Docker & Container Setup Guide](DOCKER_SETUP_GUIDE.md)
  - [LinkedIn Post #3: API Docs, Voice Notes & Slack Alerts](LINKEDIN_POST_3.md)
  - [LinkedIn Post #4: Vision AI Pipeline, OCR & pgvector Memory](LINKEDIN_POST_4.md)
  - [LinkedIn Post #5: CRM v2 Launch, Analytics & AWS Cloud](LINKEDIN_POST_5.md)
- **Manual Verification & Seeding**:
  - `npm run lint`
  - Seeded workspace login (`owner@northstarstudio.test` / `demo12345`)
  - Webhook submission against `/api/webhooks/forms/:workspaceSlug` with HMAC-SHA256 signature verification
  - Vision AI Image Scanner at `/w/:workspaceSlug/scanner`
  - Queue processing through internal and cron routes
  - Embedding backfill through Settings
