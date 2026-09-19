# C5 Mail + Calendar Production Evidence Snapshot

Date: 2026-09-19

This is an evidence snapshot, not a completed device UAT.

## Mail
Current production rows:
- Mailboxes: 1
- Threads: 18
- Messages: 23
- Inbound messages: 17
- Outbound messages: 6
- Draft messages: 3
- Custom folders: 1
- Rules: 0
- Signatures: 0
- Attachments: 1
- Mail webhook events: 46
- Push subscriptions: 5

Latest production evidence:
- Latest inbound message created: 2026-09-13 17:07:39 UTC
- Latest outbound message created: 2026-09-12 03:17:54 UTC
- Latest email.received webhook: 2026-09-13 17:07:35 UTC
- Latest email.sent webhook: 2026-09-12 13:54:40 UTC
- Latest email.delivered webhook: 2026-09-12 13:54:42 UTC
- Latest mail_received notification: 2026-09-13 17:07:41 UTC
- Latest push subscription seen: 2026-09-12 09:58:06 UTC

Conclusion:
Mail send/receive/webhook persistence remains historically proven, but there is no fresh Sep 19 traffic proving current end-to-end behavior.
Rules and signatures remain unproven in production because both tables still contain zero rows.
Closed-app iPhone push remains unproven by database evidence alone.

## Calendar
Current production rows:
- Events: 11
- Cancelled events: 2
- Reminders: 10
- Reminder rows marked sent: 4
- Reminder delivery rows: 4

Latest evidence:
- Latest event start: 2026-09-19 02:00:00 UTC
- Latest event created: 2026-09-12 14:23:28 UTC
- Latest reminder sent: 2026-09-12 14:25:02 UTC
- Latest calendar_reminder notification: 2026-09-12 14:25:04 UTC
- Latest reminder delivery: 2026-09-12 14:25:04 UTC

Conclusion:
Calendar event data reaches Sep 19, but reminder/device-delivery evidence has not refreshed since Sep 12.

## C5 status
YELLOW — implementation exists and historical flows are proven, but fresh end-to-end production UAT is still required.

Fresh UAT still required:
1. external inbound email
2. inbox refresh and reader
3. reply
4. new outbound + delivered webhook
5. common attachment MIME types
6. create folder
7. create and execute rule
8. create and send signature
9. draft save/reopen
10. archive/trash/recover
11. mobile Mail
12. app-closed push banner/badge
13. notification deep link
14. incoming ICS invite
15. RSVP
16. new calendar reminder and device notification
