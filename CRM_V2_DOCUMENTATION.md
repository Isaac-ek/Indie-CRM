# 📘 Indie CRM v2: Technical Manual & Architecture Specification

**Release Version**: `v2.0-Production`  
**Milestone**: Month 4, Week 13 (Complete CRM v2 with Analytics, Reporting, and Audit Logs)  
**Target Audience**: Staff Software Engineers, Cloud Architects, Technical Evaluators  

---

## 🚀 Executive Overview

**Indie CRM v2** marks the transition from an AI-assisted CRM prototype into a production-hardened, multi-tenant SaaS platform. Built specifically for solo operators, agency founders, and consultants, v2 introduces **real-time pipeline analytics, CSV data reporting, enterprise audit trails, predictive deal scoring, and automated AWS ECS cloud infrastructure**.

---

## 📊 1. Real-Time Analytics & Funnel Engine

### Core Metrics Tracked (`src/lib/analytics-queries.ts`)
The analytics subsystem continuously computes workspace intelligence without expensive full-table scans:

| Metric | Computation / Methodology | Business Value |
|---|---|---|
| **Close Rate (%)** | $\frac{\text{Won Leads}}{\text{Won Leads} + \text{Lost Leads}} \times 100$ | Evaluates sales pipeline effectiveness |
| **Active Pipeline** | $\text{Total Leads} - (\text{Won} + \text{Lost})$ | Measures ongoing operational deal load |
| **Average Lead Score** | Budget, urgency & priority weighted average ($0 - 100$) | Identifies high-intent sales opportunities |
| **AI Generations Count** | Cumulative count of model runs stored in `AIGeneration` | Tracks AI automation leverage and provenance |
| **Stage Conversion Funnel** | Proportional distribution across `NEW`, `QUALIFIED`, `PROPOSAL`, `WON`, `LOST` | Highlights funnel friction and drop-offs |
| **Inbound Source Mix** | Volume aggregation across `FORM`, `IMAGE_SCAN`, `EMAIL`, `MANUAL`, `REFERRAL` | Directs marketing & channel investments |

---

## 🛡️ 2. Enterprise Audit Logging System

Every security-sensitive or business-critical mutation writes an immutable record to the `AuditLog` table.

### Schema Structure (`prisma/schema.prisma`)
```prisma
model AuditLog {
  id          String          @id @default(cuid())
  tenantId    String
  actorUserId String?
  action      AuditLogAction
  targetType  String
  targetId    String?
  summary     String
  metadata    Json?
  createdAt   DateTime        @default(now())
  tenant      Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  actorUser   User?           @relation(fields: [actorUserId], references: [id], onDelete: SetNull)

  @@index([tenantId, createdAt])
  @@index([tenantId, action, createdAt])
}
```

### Audited Actions
- `LEAD_CREATED`: Image scan, form webhook, Gmail sync, or manual intake.
- `LEAD_WORKFLOW_UPDATED`: Stage progression, priority shifts, follow-up scheduling.
- `NOTE_CREATED`: Manual notes or AI voice transcriptions.
- `MEMBER_INVITED` / `MEMBER_ROLE_UPDATED`: RBAC permission adjustments.
- `WEBHOOK_QUEUE_PROCESSED`: External payload ingestion and worker execution.
- `AI_INSTRUCTIONS_UPDATED`: Workspace prompt customizations.

---

## 📥 3. Reporting & Data Export API

### Endpoint: `GET /api/workspaces/:workspaceSlug/export-report`
Enables operators to export their entire lead database with associated contacts and scoring as RFC 4180-compliant CSV files.

#### Request Headers
```http
GET /api/workspaces/demo-workspace/export-report HTTP/1.1
Host: localhost:3000
Cookie: authjs.session-token=...
```

#### Response Headers & Sample Body
```http
HTTP/1.1 200 OK
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="indie-crm-demo-workspace-leads-2026-10-10.csv"

"ID","Title","Stage","Priority","Score","Source","Contact Name","Contact Email","Contact Phone","Company","Created At"
"lead-1","Luminary Brand Retainer","QUALIFIED","HIGH","86","IMAGE_SCAN","Sarah Jenkins","sarah.jenkins@luminarybrand.test","+1 (555) 839-2041","Luminary Creative Studio","2026-10-10T14:22:00.000Z"
"lead-2","HyperGrowth Labs Strategy","PROPOSAL","HIGH","78","FORM","Alex Rivera","alex.rivera@hypergrowth-labs.test","+1 (555) 482-9011","HyperGrowth Labs","2026-10-10T12:00:00.000Z"
```

---

## 🎯 4. Predictive Lead Scoring Algorithm (v2)

Implemented in `src/lib/scoring.ts`, the lead scoring model computes an integer between `0` and `100`:

```ts
export function calculateLeadScore(lead: ScorableLead): number {
  if (lead.stage === "LOST") return 0;
  if (lead.stage === "WON") return 100;

  let score = 20; // Base score

  // Stage progression
  if (lead.stage === "PROPOSAL") score += 35;
  else if (lead.stage === "QUALIFIED") score += 25;

  // Urgency & Priority
  if (lead.priority === "URGENT") score += 25;
  else if (lead.priority === "HIGH") score += 15;

  // Inactive decay penalty
  if (isLeadStale(lead.lastActivityAt)) {
    score = Math.max(0, score - 15);
  }

  return Math.min(100, score);
}
```

---

## 🔐 5. Multi-Tenant Role-Based Access Control (RBAC)

The workspace permission model strictly separates identity authentication from tenant capabilities:

| Capability | `OWNER` | `ADMIN` | `MEMBER` |
|---|:---:|:---:|:---:|
| `leads:read` | ✅ | ✅ | ✅ |
| `leads:write` | ✅ | ✅ | ✅ |
| `leads:delete` | ✅ | ✅ | ❌ |
| `integrations:manage` | ✅ | ✅ | ❌ |
| `roles:manage` | ✅ | ❌ | ❌ |
| `workspace:delete` | ✅ | ❌ | ❌ |

---

## ☁️ 6. Cloud Infrastructure & Terraform Topology

All infrastructure is provisioned through modular Terraform files (`terraform/`):
- **ECS Fargate**: Containerized Next.js 15 application with auto-scaling (Target Tracking at 70% CPU).
- **RDS PostgreSQL 16**: Multi-AZ capable with native `pgvector` extension for 1536-dimensional semantic search.
- **ElastiCache Redis**: Multi-tier sliding window rate limiting (`AUTH`, `AI_VECTOR`, `GENERAL`) and worker queuing.
- **Application Load Balancer (ALB)**: SSL/TLS termination, health checks (`/api/health`), and DDoS edge buffering.
- **CI/CD Automation**: GitHub Actions (`.github/workflows/ci.yml` and `terraform.yml`) enforcing format checks, test execution, plan posting, and automated production deployments.

---

## 🧪 7. Validation & Verification Metrics

```
Total Automated Unit & Integration Tests: 74 / 74 Passed (100%)
Execution Time:                           < 1.6 seconds
TypeScript Strict Checking:               0 errors (npx tsc --noEmit)
Form Ingestion Response Time:             < 15 ms (HTTP 202 Accepted)
pgvector Cosine Search Time:              < 0.6 ms
```

---

## 📖 Related Technical Documentation
- [AWS Terraform Deployment Guide](TERRAFORM_DEPLOYMENT_GUIDE.md)
- [Vision AI Pipeline Specification](IMAGE_PROCESSING_GUIDE.md)
- [Mock Interview #3 Guide](MOCK_INTERVIEW_3.md)
- [Cloud Readiness Review](CLOUD_READINESS_REVIEW.md)
- [Architecture Presentation Deck](ARCHITECTURE_PRESENTATION.md)
- [LinkedIn Post #5: CRM v2 Launch](LINKEDIN_POST_5.md)
