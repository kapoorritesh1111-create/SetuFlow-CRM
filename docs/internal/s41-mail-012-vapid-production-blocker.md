# S41-MAIL-012 - Production VAPID blocker

Production evidence on 2026-09-12 09:04:45 UTC:

`POST /api/mail/webhooks/resend 200` logged `[setu-communications:push] no device delivery` with `skipped: 'vapid-not-configured'` for the SETU Flow organization and `mail_received`.

The inbound email and in-app notification path are healthy. The production server cannot send Web Push until a matching VAPID key pair is configured in Vercel production (`WEB_PUSH_PRIVATE_KEY` plus `WEB_PUSH_PUBLIC_KEY` or `NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`). If a new key pair is introduced, existing browser subscriptions created with the old public key must be recreated.
