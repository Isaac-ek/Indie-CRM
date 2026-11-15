# Focused CRM interface

The workspace now opens directly into Pipeline. The primary navigation is Pipeline and Search; analytics, scanner, settings, and integrations remain under More tools for signed-in workspace members. Public demo access restrictions are unchanged.

The board and list lead with the opportunity, contact, next action, and follow-up. Intake and bulk editing are disclosed when needed. Filter and layout links retain the current query, stage, view, tag, and sort.

The lead record keeps notes, conversation history, next action, stage, and follow-up in one page. Profile editing, AI suggestions, and archive/delete controls are secondary. The old tab switcher, repeated workflow snapshot, score card, and voice recorder entry point are removed from this core flow. Voice implementation remains in the repository as deferred work. Recording an outbound reply explicitly stores a copy; it does not send email.

The shell uses a compact light interface, accessible focus indicators, system fonts, and a contained horizontally scrolling board. The undefined Geist variables that caused a Times fallback are removed. Standalone authentication/demo entry screens retain their existing visual treatment.

No schema, authentication, tenant permission, or mutation logic changes are required. Saved changes in another session still appear after refresh; this change does not add live push synchronization.

## Verification

- Existing database-backed browser coverage continues to check all six stages, drag/drop and stage selectors, shared notes, search, tenant isolation, role restrictions, demo expiry, and local-only demo AI.
- Additional coverage checks workspace home routing, preserved filter/layout state, mobile page width, and editing a next action then seeing it on the board.
- Desktop and 390px mobile views were inspected in the browser. The board scrolls inside its own region, without page overflow.
