# S41-MAIL-012 - iOS Declarative Web Push reliability

User evidence on 2026-09-12: a new message reached production, generated a `mail_received` notification with push enabled, and the active device subscription endpoint remained on `web.push.apple.com`, but the closed Home Screen app showed neither a banner nor an app-icon badge.

This patch standardizes SETU Mail pushes on the Declarative Web Push payload (`web_push: 8030`) so modern WebKit can display a fallback notification without depending entirely on service-worker JavaScript. The same payload remains backwards compatible because the service worker normalizes the declarative shape and calls `showNotification` for older browsers. The push includes an `app_badge` unread count and the worker also calls the Badging API when available.

Server diagnostics now explicitly record whether Apple/Web Push accepted or rejected each request so future device reports can be correlated with provider response rather than assuming `channels_sent=['push']` proves delivery.
