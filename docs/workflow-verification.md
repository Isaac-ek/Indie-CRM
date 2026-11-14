# Lead workflow verification

The browser suite uses the actual Next.js application, credentials authentication, server actions, and a dedicated PostgreSQL database. It does not mock the action handlers or the database writes.

## Run locally

Use a disposable local database named `indie_crm_workflow_*`. The test configuration rejects remote database hosts and other database names; it never falls back to `DATABASE_URL` or the production app's URL.

```sh
createdb indie_crm_workflow_local
export E2E_DATABASE_URL="postgresql://YOUR_LOCAL_USER@127.0.0.1:5432/indie_crm_workflow_local"
DATABASE_URL="$E2E_DATABASE_URL" npm run db:push
npx playwright install chromium
npm run test:workflow
```

If Chrome is already installed, set `E2E_BROWSER_CHANNEL=chrome` instead of installing Chromium. `E2E_PORT` defaults to 3180. The suite starts its own local server and refuses to reuse a server that could have different database settings. The command enables the `tsx` loader for Prisma's generated TypeScript client.

Each scenario creates its own owner, member, separate workspace owner, workspaces and sample leads. Cleanup removes only those records. The owner and member sign in through the real login form in separate browser contexts. AI API credentials are blank, so AI generation and embedding fallbacks are exercised; this is not a test of OpenAI or pgvector service performance.

## What the suite proves

1. All six pipeline stages, including Follow-up, retain their records. Changing a stage with the dropdown persists through a reload and keeps the Kanban view open.
2. A real drag-and-drop action persists the selected stage and survives reload.
3. The owner creates a lead through the intake form, qualifies it, and schedules a follow-up. A member with an already-open page sees the saved update after refresh, adds a note, and the owner retrieves that note through search. Database assertions check the saved stage, date, note author, tenant and audit events.
4. A member does not see the deletion control. A genuine owner's deletion request is captured and aborted before it reaches the server; replaying it using the member's authenticated session is denied, leaving the lead and audit log unchanged. The owner then deletes that disposable test lead through the UI, confirming the permitted action also works.
5. Another workspace's record renders the not-found screen and discloses no record content. A streamed Next.js response may have already sent HTTP 200 before rendering that denial, so the check verifies the rendered denial and absence of private data. Tampering with the lead ID in genuine workflow and note forms cannot change that record, attach a note, or create a success audit entry.

## Shared-state behavior

Saving a lead writes to PostgreSQL and revalidates the affected Next.js routes. It does not push the change into another user's already-open browser page. The second-session test explicitly checks the old view before refresh and the saved state after refresh. No automatic propagation latency is claimed.

## CI and scope

`.github/workflows/workflow-proof.yml` runs the suite against its own PostgreSQL 16 service on pull requests and main. Failure screenshots and traces are kept as short-lived CI artifacts. The default `npm run test:e2e` command runs the same suite. The former page-presence checks have been replaced with these persisted-workflow assertions.

This pass verifies the core persisted workflow and workspace boundaries. Public guest-workspace provisioning and a recorded product walkthrough are separate delivery steps; this suite does not expose production credentials or create a public demo login.

## Local verification result

Verified on 2026-11-14 with local PostgreSQL 16 and headless Chrome: all five browser scenarios passed, all 75 unit tests passed, TypeScript and ESLint passed, and the Next.js production build completed. CI runs separately; local completion does not assert a remote CI result or a production deployment.
