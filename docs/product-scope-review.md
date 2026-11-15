# CRM product and interface review

The strongest product is a small lead-follow-up tool for independent service providers: remember each inquiry, decide the next action, and avoid losing the follow-up. The current interface gives too many adjacent experiments the prominence of finished core features.

## Change the information hierarchy first

1. Make the pipeline the default workspace screen. Include a compact “due today / overdue” strip rather than a separate large dashboard that repeats pipeline information.
2. Keep primary navigation to Pipeline and Search. Put workspace/team settings behind the workspace menu. Scanner, analytics, integrations, and automation should not compete with the lead queue.
3. Replace the oversized lead header, four stat cards, five tabs, and repeated action groups with a compact lead summary, a visible next action and follow-up date, and one activity timeline containing conversations and notes. Keep contact details in a secondary panel. Show optional AI assistance beside the task it helps.
4. Reduce nested rounded containers, gradients, uppercase labels, repeated workspace/member/access cards, and introductory paragraphs. Put the client's name, inquiry, last contact, and due date higher on the screen. Reserve accent colors for priorities, stages, and active controls.
5. Keep keyboard-operable stage changes alongside dragging and a usable list view on small screens. The current board has a 1,200px minimum width; horizontal scrolling should be an intentional board option, not the only comfortable route through the workflow.

## Keep, demote, defer

| Area | Decision | Reason |
| --- | --- | --- |
| Lead intake, pipeline, follow-up dates, text notes, search | Keep and polish | They form one complete, testable user job. |
| Tenant boundaries, roles, audit history | Keep underneath the product | They make the workflow credible without needing constant interface explanation. |
| Summaries and reply drafts | Optional assistance inside the lead | Useful when they save an observable step; they do not need their own product identity. |
| Analytics | Demote to a simple pipeline summary | Current aggregate counts are useful context; a top-level section asks for more attention than that value justifies. |
| Scanner and voice notes | Defer from the main experience | They add upload, extraction, failure, and provenance states before the core workflow is settled. |
| Visual automation builder and multiple integrations | Treat as separate experiments | They need independent persistence, execution, failure handling, and user evidence before being presented as core capabilities. |

## Specific credibility issues in the implementation

- `src/components/workflow-builder.tsx` stores rules in React state initialized from demo defaults. Creating a rule in this interface does not persist it across reloads. Its simulator is useful as an experiment, but the “Automation Engine” presentation overstates what that UI saves and executes.
- `src/lib/transcription.ts` returns a generic invented transcript when a provider is absent or fails. Production UI should report unavailable transcription or explicitly show a sample demonstration; it should not record generic text as if it described the uploaded audio.
- Image extraction also has deterministic sample fallbacks in `src/lib/image-processing.ts`. Actual extraction and sample demonstrations need visibly different result states.
- The tested shared-state behavior is database persistence plus route revalidation. Another already-open session needs a refresh. Keep that explanation until actual subscription behavior is implemented and measured.
- Production verification exposed that `getPrismaClient()` previously created a new pool on each helper call in production. This branch reuses the client for the server process. Verification should keep using the production server, because development caching masked that distinction.

## Recommended next design slice

Redesign only the pipeline and one lead detail screen first. Success means a new visitor can identify a due lead, understand the inquiry, choose the next action, schedule the follow-up, and verify the saved history without navigating a collection of feature dashboards. Preserve the existing database and permission checks while changing that presentation. Validate this slice before extending the redesign to secondary tools.
