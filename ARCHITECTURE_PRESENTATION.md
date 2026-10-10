# Indie CRM Architecture Presentation

---

## Slide 1: Executive Summary & System Vision

### Indie CRM: Multi-Tenant AI-Assisted CRM Platform

- **Mission**: Turn unstructured client conversations and webhooks into searchable, actionable client intelligence for solo operators and teams.
- **Core Engineering Focus**:
  - 🛡️ **Tenant Safety**: Strict workspace boundary isolation across all data models.
  - ⚡ **High Reliability**: Storage-first webhook ingestion with Dead Letter Queue (DLQ) retry management.
  - 🧠 **Grounded AI Memory**: AI provenance logging with pgvector semantic similarity search.
  - 📊 **Enterprise Observability**: Request-traced Pino JSON logs and Redis multi-tier rate limiting.

---

## Slide 2: High-Level Technical Architecture

```
+-----------------------------------------------------------------------+
|                           CLIENT LAYER                                |
|   Next.js React 19 Frontend  |  External Webhook Form Providers       |
+-----------------------------------┬-----------------------------------+
                                    │
+-----------------------------------▼-----------------------------------+
|                         EDGE & MIDDLEWARE                             |
|  Request Tracing (x-request-id)  |  Redis Multi-Tier Rate Limiter     |
+-----------------------------------┬-----------------------------------+
                                    │
+-----------------------------------▼-----------------------------------+
|                      APPLICATION & AI SERVICES                        |
|  Next.js Server Actions | RBAC Engine | OpenAI Vector Engine      |
+-----------------------------------┬-----------------------------------+
                                    │
+-----------------------------------▼-----------------------------------+
|                       DATA & STORAGE LAYER                            |
|  Prisma ORM | PostgreSQL + pgvector | Webhook Queue & DLQ Engine      |
+-----------------------------------------------------------------------+
```

---

## Slide 3: Multi-Tenant Isolation & Role-Based Access Control (RBAC)

### Tenant Safety by Design
- Every record is anchored by a compulsory `tenantId`.
- Database query wrappers strictly validate tenant scope context before execution.

```
                      +-------------------+
                      |   OWNER ROLE      | -> Manage Workspace, Billing, Roles
                      +---------┬---------+
                                │
                      +---------▼---------+
                      |   ADMIN ROLE      | -> Manage Integrations, Edit Leads
                      +---------┬---------+
                                │
                      +---------▼---------+
                      |   MEMBER ROLE     | -> View Leads, Add Notes & Replies
                      +-------------------+
```

---

## Slide 4: Webhook Ingestion & Dead Letter Queue (DLQ) Engine

### Storage-First Reliability Architecture
1. **Immediate Ingestion**: Incoming webhooks stored with `PENDING` status (`< 15ms` response time).
2. **Background Execution**: In-memory job queue handles retry loops with exponential backoff.
3. **Dead Letter Queue Routing**: Failed jobs isolated after max attempts to prevent job blocking and enable audit recovery.

```
Incoming Webhook ---> Store WebhookEvent (PENDING) ---> Enqueue Job
                                                             |
                                      +----------------------+----------------------+
                                      |                                             |
                              [Job Succeeded]                               [Job Failed]
                                      |                                             |
                           Update Status: PROCESSED                       Retry Count < Max?
                                                                           /            \
                                                                        [YES]          [NO]
                                                                          |              |
                                                                    Re-enqueue     Route to DLQ
```

---

## Slide 5: AI Provenance & Grounded Semantic Memory

### Transparent AI Infrastructure
- **AIGeneration Audit Table**: Tracks model versions, system prompts, latency, and full token generation output.
- **Vector Search Engine**:
  - Note & message embeddings stored as 1536-dimensional vectors (`text-embedding-3-small`).
  - Cosine similarity searches allow operators to recall prior client agreements instantly.
- **Deterministic Offline Fallbacks**: Operates seamlessly without an OpenAI key using local fallback heuristics.

---

## Slide 6: System Observability & Performance Benchmarks

### Observability & Performance Highlights

```
+--------------------------------+--------------------------------------+
| System Feature                 | Performance Metric                   |
+--------------------------------+--------------------------------------+
| Automated Test Suite Coverage  | 74 / 74 Passed (100% Core Modules)   |
| Form Webhook Ingestion Time    | 12 ms (Storage-first 202 Accepted)   |
| Vision AI Pipeline Execution   | < 1.8 s (OCR + Score + Embeddings)   |
| Rate Limiter Fallback Latency  | 0.13 ms (In-memory sliding window)   |
| Cosine Vector Similarity Match | 0.52 ms (pgvector search ranking)    |
| Container Healthcheck Probe    | < 4 ms (GET /api/health liveness)    |
+--------------------------------+--------------------------------------+
```

- **Structured Pino JSON Logging**: Unified contextual logging (`requestId`, `tenantId`, `userId`).
- **Redis Rate Limiting Tiers**:
  - `AUTH`: 5 requests / 15 mins
  - `AI_VECTOR`: 20 requests / min
  - `GENERAL`: 200 requests / min

---

## Slide 7: Vision AI Ingestion & Predictive Lead Scoring (Week 10)

### Real-Time Offline-to-CRM Pipeline
1. **Multi-Artifact Vision OCR**: Business cards, whiteboard roadmaps, and conference badges parsed with high-precision OpenAI Vision (`gpt-4o-mini`) + deterministic fallback fixtures.
2. **Predictive Lead Scoring Engine**: Calculates real-time intent score (`0–100`) from stage, urgency, budget verification, and response velocity.
3. **Automated Workflow Routing**: Hot leads ($\ge 70$ points) trigger instant Slack Block Kit notifications and priority triage.

---

## Slide 8: Cloud Readiness & AWS Well-Architected Assessment (Week 12)

### Production Cloud Architecture
- **Infrastructure as Code (Terraform)**: Modular VPC, Security Groups, RDS PostgreSQL (pgvector), Redis ElastiCache, S3, and ECS Fargate.
- **GitOps CI/CD**: Automated linting, validation, S3 remote state with DynamoDB distributed locking, and PR plan comments.
- **Disability & Disaster Recovery**:
  - **RTO**: $< 15$ minutes via automated Terraform recreate.
  - **RPO**: $< 5$ minutes via continuous RDS WAL archiving.
  - **Uptime SLA**: $99.9\%$ with ECS target-tracking auto-scaling (70% CPU).

---

## Slide 9: Complete CRM v2 — Analytics, Audit Logs & Reporting (Week 13)

### The Complete Production Platform
- 📈 **Pipeline Analytics & Funnels**: Real-time conversion tracking, stage breakdown, and revenue velocity.
- 🛡️ **Enterprise Audit Logging**: Granular tracking for authentication, lead state changes, AI generations, and webhook deliveries.
- 📑 **Data Export & Reporting**: CSV/JSON data extraction and scheduled summary generation for operators and teams.

