# Indie CRM - API Documentation

Welcome to the Indie CRM API Documentation. Indie CRM provides HTTP REST endpoints for form webhook ingestion, system health monitoring, and background queue processing.

All requests pass through a multi-tier rate limiter and attach unique request context IDs (`x-request-id`) for full observability.

---

## Global Headers & Rate Limiting

### Headers
| Header Name | Direction | Description | Required |
| --- | --- | --- | --- |
| `x-request-id` | Request & Response | Unique tracing string generated per request (e.g. `req_1786966...`) | Optional (Auto-generated if omitted) |
| `x-indie-crm-secret` | Request | Shared secret key for Form Webhook ingestion | Required if `FORM_WEBHOOK_SECRET` is set |
| `authorization` | Request | Bearer token (`Bearer <CRON_SECRET>`) for cron routes | Required for `/api/cron/process-webhooks` |
| `x-internal-secret` | Request | Secret header (`<INTERNAL_CRON_SECRET>`) for internal queue route | Required for `/api/internal/process-webhooks` |

### Rate Limiting Tiers
Rate limiting is enforced by IP address (unauthenticated) or User ID (authenticated) using Redis with an in-memory fallback.

| Tier | Max Requests | Window | Applicable Routes |
| --- | --- | --- | --- |
| `AUTH` | 5 | 15 Minutes | `/login`, `/register`, `/api/auth/*` |
| `AI_VECTOR` | 20 | 1 Minute | `/w/[workspaceSlug]/search`, semantic vector operations |
| `GENERAL` | 200 | 1 Minute | All other workspace pages and API endpoints |

#### Rate Limit Response Headers
Every API response returns standard rate-limit diagnostic headers:
- `X-RateLimit-Limit`: Maximum requests permitted within the window.
- `X-RateLimit-Remaining`: Remaining request allowance in current window.
- `Retry-After`: Seconds until the rate limit resets (returned on `429 Too Many Requests`).

---

## Endpoints Summary

1. [`GET /api/health`](#1-get-apihealth) - Health check & database readiness
2. [`POST /api/webhooks/forms/{workspaceSlug}`](#2-post-apiwebhooksformsworkspaceslug) - Ingest form lead submissions
3. [`GET /api/cron/process-webhooks`](#3-get-apicronprocess-webhooks) - Cron worker queue processing
4. [`POST /api/internal/process-webhooks`](#4-post-apiinternalprocess-webhooks) - Internal queue retry execution

---

## Detailed Endpoint Documentation

### 1. `GET /api/health`

Checks system readiness, database connectivity, and environment status.

- **Authentication**: None required
- **Rate Limit**: `GENERAL` tier (200 req / min)

#### Response `200 OK` (Healthy)
```json
{
  "status": "ok",
  "timestamp": "2026-08-17T12:00:00.000Z",
  "latencyMs": 4,
  "environment": "development",
  "services": {
    "database": {
      "status": "healthy",
      "error": null
    }
  }
}
```

#### Response `503 Service Unavailable` (Degraded)
```json
{
  "status": "degraded",
  "timestamp": "2026-08-17T12:00:00.000Z",
  "latencyMs": 15,
  "environment": "production",
  "services": {
    "database": {
      "status": "unhealthy",
      "error": "Database connection failed"
    }
  }
}
```

---

### 2. `POST /api/webhooks/forms/{workspaceSlug}`

Storage-first webhook ingestion endpoint that enqueues inbound webhooks into the `WebhookEvent` table for durable processing.

- **Authentication**: `x-indie-crm-secret` header (when `FORM_WEBHOOK_SECRET` is configured in env)
- **Path Parameters**:
  - `workspaceSlug` (string, required): Slug of the target workspace (e.g. `northstar-studio`).
- **Rate Limit**: `GENERAL` tier (200 req / min)

#### Request Headers
```http
POST /api/webhooks/forms/northstar-studio HTTP/1.1
Host: crm.example.com
Content-Type: application/json
x-indie-crm-secret: your-webhook-secret-key
```

#### Request Body
```json
{
  "name": "Jane Doe",
  "email": "jane@acmecorp.com",
  "phone": "+1 555 019 2831",
  "company": "Acme Corp",
  "title": "Head of Design",
  "message": "Interested in standard onboarding project with 3-week timeline.",
  "budget": "$15,000",
  "timeline": "Immediate",
  "source": "Website Form"
}
```

#### Response `202 Accepted`
```json
{
  "ok": true,
  "workspaceSlug": "northstar-studio",
  "eventId": "evt_1786966400_abc123",
  "status": "PENDING"
}
```

#### Error Responses
- `401 Unauthorized`: Missing or invalid `x-indie-crm-secret`.
  ```json
  { "error": "Unauthorized webhook request." }
  ```
- `404 Not Found`: Invalid workspace slug.
  ```json
  { "error": "Workspace not found." }
  ```
- `400 Bad Request`: Payload validation error or missing required email field.
  ```json
  { "error": "Invalid form submission payload: email or contact identifier required." }
  ```

#### Example cURL
```bash
curl -X POST "http://localhost:3000/api/webhooks/forms/northstar-studio" \
  -H "Content-Type: application/json" \
  -H "x-indie-crm-secret: secret-123" \
  -d '{
    "name": "Alex Smith",
    "email": "alex@startup.io",
    "message": "Need CRM setup advice."
  }'
```

---

### 3. `GET /api/cron/process-webhooks`

Automated background queue processor triggered by Vercel Cron or standard scheduled tasks.

- **Authentication**: `Authorization: Bearer <CRON_SECRET>`
- **Query Parameters**:
  - `limit` (integer, optional, default: `20`, min: `1`, max: `100`): Maximum batch size per cron run.

#### Request Headers
```http
GET /api/cron/process-webhooks?limit=20 HTTP/1.1
Authorization: Bearer your-cron-secret
```

#### Response `200 OK`
```json
{
  "ok": true,
  "schedule": "vercel-cron",
  "processed": 5,
  "succeeded": 5,
  "failed": 0
}
```

#### Error Response `401 Unauthorized`
```json
{ "error": "Unauthorized cron request." }
```

---

### 4. `POST /api/internal/process-webhooks`

Internal queue management endpoint allowing tenant-specific or global batch retries.

- **Authentication**: `x-internal-secret: <INTERNAL_CRON_SECRET>`
- **Query Parameters**:
  - `workspaceSlug` (string, optional): Target specific workspace scope.
  - `limit` (integer, optional, default: `20`): Maximum events to process.

#### Request Headers
```http
POST /api/internal/process-webhooks?workspaceSlug=northstar-studio&limit=10 HTTP/1.1
x-internal-secret: internal-cron-secret-key
```

#### Response `200 OK`
```json
{
  "ok": true,
  "workspaceSlug": "northstar-studio",
  "processed": 2,
  "succeeded": 2,
  "failed": 0
}
```

---

## Error Handling Standards

All HTTP error responses adhere to standard JSON payload structures with clear diagnostic messages and corresponding HTTP status codes:

| HTTP Status | Meaning | Typical Trigger |
| --- | --- | --- |
| `400 Bad Request` | Invalid payload or missing fields | Malformed JSON payload or missing contact data |
| `401 Unauthorized` | Missing or invalid auth credentials | Incorrect secret header or expired token |
| `404 Not Found` | Workspace or resource not found | Workspace slug does not exist |
| `429 Too Many Requests` | Rate limit threshold exceeded | Exceeded tier allowance within time window |
| `503 Service Unavailable` | Dependency or service unavailable | Database connection offline |
