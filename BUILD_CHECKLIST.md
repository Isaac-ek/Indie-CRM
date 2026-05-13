# Indie CRM Build Checklist

Product frame:
"A multi-tenant AI-assisted CRM for solo operators that turns unstructured lead conversations into searchable, actionable client intelligence."

Everything we add should strengthen one of these:
- real lead workflow
- tenant-safe SaaS architecture
- practical AI assistance
- searchable memory
- believable production readiness

## Phase 1: CRM Core
- [x] Finish auth and workspace ownership
- [x] Add workspace switching for multi-workspace users
- [x] Add member invites and roles: `OWNER`, `ADMIN`, `MEMBER`
- [x] Make lead records fully editable: title, source, priority, follow-up, next action, status
- [x] Add archive/delete flows with confirmation
- [x] Expand contact profiles: phone, industry, website, company notes
- [x] Add inbox sorting and saved views: `Overdue`, `Hot`, `Awaiting reply`, `Won`

## Phase 2: Workflow UX
- [x] Add more inbox quick actions: `mark lost`, `set custom follow-up`, `move to exact stage`
- [x] Add bulk actions for tags, stage, and follow-up
- [x] Add a unified activity timeline per lead: messages, notes, AI runs, status changes
- [x] Add better empty/loading/pending states
- [x] Improve mobile responsiveness for inbox and lead detail
- [x] Refresh login, register, and settings to match the upgraded UI system

## Phase 3: AI Features
- [x] Keep auto-tagging on lead creation
- [x] Make conversation summaries first-class and editable
- [x] Improve reply suggestions with tone/context controls
- [x] Add AI follow-up recommendations based on inactivity
- [x] Store AI provenance cleanly: model, prompt version, timestamps, inputs, outputs
- [x] Add per-tenant AI instructions in settings

## Phase 4: Search and Memory
- [x] Implement embeddings with OpenAI
- [x] Store vectors in `message_embeddings`
- [x] Add semantic similarity search with pgvector
- [x] Show "similar past leads" on lead detail
- [x] Add grounded "Have I talked to someone like this before?" answers
- [x] Rebuild embeddings when messages or notes change
  Current progress: new inbound/outbound messages and lead notes now store embeddings automatically, and Settings includes a shared backfill action for older message and note records.
- [x] Deep-link search results to matching messages/notes

## Phase 5: Ingestion and Integrations
- [x] Add webhook-based form submission ingestion
- [x] Add webhook event storage-first processing
- [x] Process events asynchronously with storage-first queue handling
  Current progress: webhook requests return `202 Accepted`, queue in-process handling after storage, support manual retry processing from Settings, expose an internal worker endpoint for cron or job-runner triggering, and include a Vercel cron route plus `vercel.json` schedule. External queue infrastructure is still a later upgrade if higher reliability is needed.
- [x] Add Gmail sync after core ingestion is stable
  Current progress: Settings now stores a workspace Gmail connection with refresh-token auth, supports manual inbox sync, imports recent Gmail messages into contacts/leads/conversations, dedupes by external message ID, and updates embeddings plus AI intelligence for newly created leads.
- [ ] Later add Outlook support if needed
- [ ] Add Slack alerts for hot leads as a stretch feature

## Phase 6: SaaS/Architecture Credibility
- [x] Make sure every business query is tenant-scoped
- [x] Add stronger validation on all server actions
- [x] Add audit logs for important lead changes
- [x] Add role-based permission checks beyond simple membership
- [x] Move from `db push` habits toward real Prisma migrations
- [x] Add background job retry/error handling
- [x] Add observability for AI failures, webhook failures, and sync failures

## Phase 7: Portfolio Polish
- [x] Write a serious README with product framing, architecture, schema, and screenshots
- [x] Add seed data that shows believable real-world lead scenarios
- [x] Add demo credentials and setup steps
- [x] Add architecture diagrams
- [x] Add a short "engineering decisions" section:
  every query scoped by tenant
  webhooks stored before processing
  AI outputs stored with provenance
  embeddings regenerated on content change
- [x] Add tests for filtering, lead actions, and core server actions

## Stretch Features
- [ ] Slack notifications for hot leads
- [ ] Voice note transcription into notes
- [ ] Lead scoring model
- [ ] Shared team inbox
- [ ] Analytics like close rate by tag/category
- [ ] Per-tenant AI prompt customization

## Best Build Order From Here
- [x] Source + priority editing
- [x] Inbox sorting + saved views
- [x] Exact-stage quick actions + custom follow-up
- [x] Unified lead activity timeline
- [x] Webhook form ingestion
- [x] Async event processing
- [x] Embeddings + pgvector semantic search
- [x] Similar-conversation retrieval
- [x] Member invites + roles
- [x] Gmail sync
- [x] README + architecture polish

## Definition Of Done For This Portfolio
It should demonstrate:
- multi-tenant SaaS architecture
- real CRUD workflow, not just AI demos
- practical AI tagging/summaries/reply help
- semantic memory over prior conversations
- background processing and integrations
- strong tenant isolation and provenance-aware data design
