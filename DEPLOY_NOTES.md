# Guest chat: SMC visibility + attachments + emoji (revision of S33-GUEST-009)

DB CHANGE ALREADY APPLIED LIVE (guest_chat_messages.attachment_url, attachment_name).

## What this fixes (your feedback)
- "I can't see the guest message / no Guest session channel in SMC"
  -> New dedicated SMC console at /smc/guests ("Guest Sessions", new nav item under Intelligence).
     Two-pane chat: left = list of guest sessions (ONE conversation per guest), right = the selected
     guest's thread, live-polling every 8s, with copy link / open guest view / revoke. The guest's
     message ("hello can you help") was saved correctly all along — it just had no good home. It now
     shows here.
- "every guest in same chat?" -> No. One separate conversation per guest. The console makes that
   explicit. This is also why guest chat is NOT inside your internal team chat drawer: guests must
   never land in #engineering / #incidents / your DMs.
- "no emoji, no attach file" -> Added an emoji picker and file/image attachments (images render as
   thumbnails; PDFs/text as links) on BOTH the guest composer and the team console. Uploads go
   through a new token/session-validated route /api/public/guest-upload (chat-attachments bucket).

## On @mention (deliberately NOT built this pass)
The guest channel is collective (guest <-> "the SETU Flow team"), so everyone on the team sees every
guest message in the console — no routing needed. Letting a guest @mention specific internal users
would require pulling the internal user directory + a notification path into a guest-visible surface,
which cuts against the isolation we built on purpose. Happy to add a guest->team notification (e.g.
email/Slack ping when a guest posts) as a follow-up if you want that instead.

## Cleanup
DELETE src/app/smc/wiki/guest-admin.tsx — it's superseded by the console and no longer imported.
(The Docs Hub is back to two tabs: Documentation + Share links.)

## Apply / verify
Overwrite files (paths preserved), delete guest-admin.tsx, `tsc --noEmit`, deploy.
1. /smc/guests: your existing Alina session shows with "hello can you help"; reply, attach an image,
   add an emoji.
2. /guest/<token> (incognito): Chat tab shows the team reply within ~8s; send a message + attachment.
3. Mint a second guest -> confirm it's a SEPARATE conversation in the console list.
