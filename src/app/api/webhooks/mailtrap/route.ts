/**
 * Mailtrap Webhook Receiver — Sprint 12
 * Receives delivery, bounce, open, and click events from Mailtrap.
 * Updates email_send_log and order_document_sends.email_delivery_status.
 *
 * Mailtrap sends POST requests to this endpoint when:
 * - An email is delivered to the inbox (event: delivery)
 * - An email bounces (event: bounce)
 * - A recipient opens the email (event: open)
 * - A recipient clicks a link (event: click)
 *
 * Setup: Mailtrap Dashboard → Sending → Webhooks → Add endpoint:
 *   https://www.setuflowcrm.com/api/webhooks/mailtrap
 * Select events: delivery, bounce, open, click
 * Copy the signing secret → MAILTRAP_WEBHOOK_SECRET env var
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

const SUPPORTED_EVENTS = new Set(['delivery', 'bounce', 'open', 'click', 'spam', 'unsubscribe']);

function mapEventToStatus(eventType: string): string {
  if (eventType === 'delivery') return 'delivered';
  if (eventType === 'bounce') return 'bounced';
  if (eventType === 'spam' || eventType === 'unsubscribe') return 'failed';
  return 'sent'; // open/click do not change delivery status
}

function verifyMailtrapSignature(body: string, signature: string | null): boolean {
  const secret = process.env.MAILTRAP_WEBHOOK_SECRET;
  // If no secret configured, skip verification in dev (warn in prod)
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[mailtrap-webhook] MAILTRAP_WEBHOOK_SECRET not set in production — rejecting');
      return false;
    }
    console.warn('[mailtrap-webhook] MAILTRAP_WEBHOOK_SECRET not set — skipping verification (dev only)');
    return true;
  }
  if (!signature) return false;
  // Mailtrap uses HMAC-SHA256 hex signature
  try {
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

interface MailtrapEvent {
  event: string;
  message_id?: string;
  email?: string;
  timestamp?: number;
  response?: string;
  bounce_category?: string;
  bounce_type?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  let bodyText: string;
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ error: 'Could not read request body' }, { status: 400 });
  }

  const signature = request.headers.get('X-Mailtrap-Signature') || request.headers.get('x-mailtrap-signature');
  if (!verifyMailtrapSignature(bodyText, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let events: MailtrapEvent[];
  try {
    const parsed = JSON.parse(bodyText);
    events = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient() as any;
  if (!admin) {
    return NextResponse.json({ error: 'Admin client unavailable' }, { status: 500 });
  }

  const processed: string[] = [];
  const errors: string[] = [];

  for (const evt of events) {
    if (!evt.message_id || !SUPPORTED_EVENTS.has(evt.event)) continue;

    const newStatus = mapEventToStatus(evt.event);
    const now = new Date().toISOString();
    const bounceReason = evt.bounce_category || evt.error || evt.response || null;

    try {
      // 1. Update email_send_log
      const updatePayload: Record<string, unknown> = {
        status: newStatus,
        provider_payload: evt,
        updated_at: now,
      };
      if (evt.event === 'delivery') updatePayload.delivered_at = now;
      if (evt.event === 'open') updatePayload.opened_at = now;
      if (evt.event === 'bounce') updatePayload.bounce_reason = bounceReason;

      const { data: logRows } = await admin
        .from('email_send_log')
        .update(updatePayload)
        .eq('provider_message_id', evt.message_id)
        .select('id, order_document_send_id');

      // 2. Update order_document_sends if linked
      if (logRows && logRows.length > 0) {
        for (const logRow of logRows) {
          if (logRow.order_document_send_id) {
            const sendUpdate: Record<string, unknown> = {
              email_delivery_status: newStatus,
              updated_at: now,
            };
            if (evt.event === 'open') sendUpdate.opened_at = now;
            await admin
              .from('order_document_sends')
              .update(sendUpdate)
              .eq('id', logRow.order_document_send_id);
          }
        }
      }

      // 3. Update communications table if linked
      await admin
        .from('communications')
        .update({
          email_delivery_status: newStatus,
          ...(evt.event === 'delivery' ? { email_delivered_at: now } : {}),
          ...(evt.event === 'open' ? { email_opened_at: now } : {}),
          ...(bounceReason ? { email_bounce_reason: bounceReason } : {}),
          updated_at: now,
        })
        .eq('email_message_id', evt.message_id);

      processed.push(evt.message_id);
    } catch (err) {
      console.error('[mailtrap-webhook] Error processing event:', evt.message_id, err);
      errors.push(evt.message_id);
    }
  }

  return NextResponse.json({
    ok: true,
    processed: processed.length,
    errors: errors.length,
    ...(errors.length > 0 ? { failed_ids: errors } : {}),
  });
}

// Mailtrap also sends GET to verify the webhook endpoint
export async function GET() {
  return NextResponse.json({ ok: true, service: 'setuflow-mailtrap-webhook', version: '1.0' });
}
