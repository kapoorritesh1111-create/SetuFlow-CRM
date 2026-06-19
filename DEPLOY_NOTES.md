# Guest notification moved to the Notifications bell (always-visible left rail)

You were right: a badge inside the collapsible "Guest Sessions" nav group is too buried to act as a
notification. This moves the signal to the bell in the far-left icon rail, which is always visible.

## What changed
- The Notifications bell now shows a red count badge = number of guest sessions awaiting a team reply
  (polls /api/smc/guest-unread every 15s).
- Opening the bell's Notifications panel now lists "N guest sessions awaiting a reply" with a link
  straight to Guest Sessions (instead of the old "No new notifications" empty state).
- (The small badge on the Guest Sessions nav item remains as a secondary cue.)

## Files (self-contained deploy)
- src/app/smc/smc-shell.tsx   (bell badge + populated notifications panel)
- src/app/api/smc/guest-unread/route.ts   (included again in case the prior bundle wasn't deployed)

The RLS read fix from before is already applied live — no DB change in this bundle.

## Apply / verify
Overwrite the 2 files, `tsc --noEmit`, deploy.
- With Alina's last message being a guest message, the bell shows a red "1"; open it -> "1 guest
  session awaiting a reply" -> click -> Guest Sessions with her thread. Reply -> badge clears within ~15s.
