# Setu Mail: folder, move and rule integration

Baseline: d5157f03babd5d70a897293e02edd860a913a96e.

## Corrected baseline

The baseline had folder/rule tables, a scoped organizer API and a deterministic rule helper. It did not connect the helper to the live inbound webhook or expose folder/move/rule controls in the desktop workspace. Earlier reports describing those workflows as complete were too broad.

## This batch

1. Desktop folder navigation: mailbox-scoped create, rename, empty-folder deletion, counts and unread indicators; paginated custom-folder messages and their attachments.
2. Manual Move to controls in the message list and reader. Read/star state is preserved, drafts remain in Drafts, and successful actions update local state and counts. Requests retain organization and mailbox checks.
3. Rule management: create/edit/pause/delete, priority, sender/domain/subject/To-or-Cc/attachment conditions and move/archive/read/star actions. New inbound messages invoke the existing deterministic evaluator before insertion. All conditions use AND; the first matching enabled rule wins. Existing mail is not reorganized. Repeated delivery events do not override manual moves.

The inbound event handler now distinguishes transient database failures from duplicates and allows failed/stale processing attempts to retry. Missing webhook verification configuration fails closed. Rule lookup failures still retain received mail in Inbox with diagnostic metadata.

New organization UI uses the existing Plus Jakarta Sans design token, navy/teal semantic tokens, and Lucide icons. No package dependencies or database schema changes are introduced.

## Verification

Run from repository root after dependency installation:

```sh
node --test tests/mail/organizer-mvp.test.mjs
npm run typecheck
npm run build
```

The first command passed 47 isolated regression checks during implementation on Node 22 with TypeScript 5.8. The suite exercises production source with simulated database/provider dependencies: API scoping, CRUD, move preservation, pagination, deterministic matching, signed incoming webhook routing, duplicate preservation and retry behavior. It does not replace actual database RLS tests, browser verification or real external email delivery checks.

Full application build and deployment status must be checked for the release commit. Formal authenticated Mail + Calendar UAT remains deferred until both modules are complete.

## Not completed by this batch

- Mobile folder/move/rules parity.
- True rich-text/HTML composition: the existing toolbar remains a formatting placeholder, not a finished rich-text editor.
- Setu Guru Compose preview/insert/regenerate UI and richer CRM context.
- Mailbox switching and the Mail-only application shell.
- Attachment removal/recovery, malware scanning and remaining launch hardening.
- Final inbox/reader/compose visual verification against the approved concept.

No customer rules or folders are seeded and no existing messages are moved by the deployment. The outbound send route is unchanged.
