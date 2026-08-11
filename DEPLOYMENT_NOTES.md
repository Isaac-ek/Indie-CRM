# AWS Live Deployment & Infrastructure Guide

This guide outlines the production deployment architecture, AWS infrastructure setup, environment configuration, database migrations, and CI/CD automated pipeline for **Indie CRM**.

---

## 🏗️ Architecture Overview

The system is deployed on **AWS** using containerized services behind an Application Load Balancer (ALB) with automated CI/CD deployment via GitHub Actions.

```mermaid
flowchart TD
    subgraph Clients
        User["Browser / Mobile Client"]
        WebhookSrc["External Webhooks / Form Submissions"]
    end

    subgraph AWS Cloud (VPC)
        ALB["Application Load Balancer (HTTPS)"]

        subgraph ECS Cluster / App Runner
            App1["Indie CRM Container Instance 1"]
            App2["Indie CRM Container Instance 2"]
        end

        subgraph Managed Data Stores
            RDS[("Amazon RDS PostgreSQL\n+ pgvector Extension")]
            Redis[("Amazon ElastiCache Redis\n(Rate Limiting & Caching)")]
        end

        subgraph Security & Config
            KMS["AWS Key Management Service (KMS)\nTenant Encryption"]
            Secrets["AWS Secrets Manager / Parameter Store"]
        end
    end

    subgraph External Services
        OpenAI["OpenAI API\n(Embeddings & Generation)"]
        Gmail["Gmail API / OAuth"]
    end

    User --> ALB
    WebhookSrc --> ALB
    ALB --> App1
    ALB --> App2

    App1 --> RDS
    App2 --> RDS
    App1 --> Redis
    App2 --> Redis

    App1 --> KMS
    App1 --> Secrets

    App1 --> OpenAI
    App1 --> Gmail
```

---

## 🛠️ Infrastructure Requirements

| Component | Service | Specification / Details |
|---|---|---|
| **Compute** | AWS ECS (Fargate) or AWS App Runner | Minimum 1 vCPU, 2 GB RAM per task instance |
| **Database** | Amazon RDS PostgreSQL | Postgres v16+ with `pgvector` extension enabled |
| **Caching / Queue** | Amazon ElastiCache Redis | Redis Engine v7+ (Cluster Mode Enabled) |
| **Container Registry** | Amazon ECR | Private repository `indie-crm` |
| **Domain & SSL** | Route 53 + AWS Certificate Manager | TLS 1.3 SSL Termination on ALB |
| **Secrets Management** | AWS Secrets Manager / Parameter Store | Centralized secret distribution to ECS Tasks |

---

## 🔑 Required Production Environment Variables

Ensure the following secrets are configured in AWS Secrets Manager or GitHub Repository Secrets:

```bash
# Database & Cache
DATABASE_URL="postgresql://<db_user>:<db_pass>@<rds_endpoint>:5432/<db_name>?sslmode=require"
REDIS_URL="rediss://:<redis_pass>@<elasticache_endpoint>:6379"

# Authentication & Security
AUTH_SECRET="<random_32_byte_base64_string>"
AUTH_TRUST_HOST="true"
NEXTAUTH_URL="https://crm.yourdomain.com"
ENCRYPTION_KEY="<32_character_hex_key_for_kms_fallback>"
WEBHOOK_SECRET="<hmac_signing_secret>"

# AI Intelligence
OPENAI_API_KEY="sk-proj-..."
```

---

## 🗄️ Database Provisioning & Migration Step

1. **Enable pgvector extension on RDS**:
   Connect to RDS PostgreSQL instance as administrative superuser:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```

2. **Execute Prisma Production Migrations**:
   Run schema migration deployment from a deployment task or entrypoint script:
   ```bash
   npx prisma migrate deploy
   ```

3. **Seed Initial Baseline Data (Optional)**:
   ```bash
   npx prisma db seed
   ```

---

## 🔄 CI/CD Pipeline Workflow

Automated build and deployment is configured in [.github/workflows/ci.yml](file:///.github/workflows/ci.yml):

1. **Lint & Type Check**: Runs ESLint (`npm run lint`) and TypeScript checks (`npx tsc --noEmit`).
2. **Automated Testing**: Executes unit and queue integration tests (`npm test`).
3. **Next.js Production Build**: Validates standalone bundle creation (`npm run build`).
4. **AWS Container Build & Push**: On push to `main`, builds multi-stage Docker image and pushes to Amazon ECR.
5. **ECS Task Update**: Triggers zero-downtime rolling update on AWS ECS Fargate cluster.

---

## 🏥 Health Checks & Monitoring

* **Liveness Endpoint**: `GET /api/health`
  - Validates Web application container responsiveness.
* **Database & Cache Health**: Internal ping to PostgreSQL and Redis endpoints on container start.
* **Container Health Check**:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => res.statusCode === 200 ? process.exit(0) : process.exit(1))"
  ```
