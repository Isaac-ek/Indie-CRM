# Public workflow demo

`/demo` introduces one existing workflow: move a fictional lead, set its follow-up, add a note, and retrieve that note through search. `/login` links to it when enabled. The demo does not use a shared production account.

## Access and lifecycle

Auth.js's CSRF-protected `public-demo` credentials provider provisions a new user and tenant in one PostgreSQL transaction. The visitor is a MEMBER of that tenant only. No password or production credentials are exposed. The session contains a signed workspace identifier and expiry; every workspace action also checks the database lifecycle record. Guest access fails closed instead of falling back to the static OWNER preview.

Sessions last one hour. A new demo request removes expired demo tenants and their dedicated users, using explicit `PublicDemo` relations rather than matching names or slug prefixes. There is no scheduled deletion job: expired records remain until the next demo request, although access and writes are denied after expiry. Normal tenants are outside this cleanup operation.

Provisioning is serialized with a PostgreSQL transaction advisory lock. Limits are 100 active demo workspaces globally and five per hashed client address per hour. The address is HMAC-hashed with AUTH_SECRET; raw addresses are not stored in the lifecycle table. Lead/note forms also impose sample-workspace limits. This is a small portfolio demo, not a public signup or load-testing service.

## Available behavior

- Leads, saved workflow changes, text notes, and search use the real database and existing server actions.
- Different visitors have separate tenants. Another tab sharing the same browser session sees saved changes after refreshing. This does not demonstrate two different team members or automatic live propagation.
- Demo navigation exposes Leads and Search. Scanner, analytics, settings, workspace APIs, and administration are unavailable.
- Image and voice actions reject demo sessions on the server. Form-webhook ingestion rejects demo tenants, including unauthenticated requests.
- AI generation and embedding helpers force local fallback logic for demo tenants, even when a provider key exists. The interface labels that limitation. The demo does not benchmark model quality, embeddings, pgvector, or latency.

## Deployment

The feature is off by default. Before enabling it on an intended deployment:

1. Check that deployment's existing migration baseline. Apply the additive `20261114000000_public_demo` migration to its database using the repository's migration process. Do not blindly reset or push a production schema to resolve drift.
2. Configure `DATABASE_URL`, a private `AUTH_SECRET`, and `PUBLIC_DEMO_ENABLED=true` for that environment.
3. Open `/demo` in a fresh browser context and verify provisioning, saved changes, isolation, and expiry.

This change does not modify production environment variables, apply a production migration, or enable the public production demo. Apply the schema migration before deploying this revision against an existing database, even if demo entry is disabled: tenant-aware AI safeguards read the lifecycle table. Preview environments should use their own database. Do not point local browser tests at a deployed database; they enforce a separate loopback-only `indie_crm_workflow_*` database.

## Verification

`npm run test:workflow` builds the application and runs its standalone production server, including copied static/public assets. The suite covers the original five persisted-workflow scenarios plus visitor isolation, expiry and cleanup, forbidden feature endpoints, and zero external AI HTTP attempts with a configured test key. See `workflow-verification.md` for local database setup.

Production action navigation stalled under the previous Next.js 15 runtime even after successful database writes. This revision uses Next.js 16.4.6, moves the request guard to `src/proxy.ts`, retains Webpack explicitly, and reuses the Prisma pool in production. The proxy migration follows the [Next.js upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16). Existing auth, database, and React dependencies remain in place.

Verified locally on 2026-11-15: nine standalone production browser scenarios and 75 unit tests passed. The database migration also executed successfully inside a temporary local schema and was rolled back. This records local verification; CI results and production activation are separate.
