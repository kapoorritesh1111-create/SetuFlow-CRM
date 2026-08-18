import { NextRequest, NextResponse } from 'next/server';
import { saveLead } from '@/features/leads/server/actions';

const clean = (value: unknown) => String(value ?? '').trim();

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid offline capture payload.' }, { status: 400 });
  }

  const tradeEventId = clean(body.tradeEventId);
  const clientCaptureId = clean(body.clientCaptureId);
  const companyName = clean(body.companyName);
  const leadType = clean(body.leadType).toLowerCase() === 'supplier' ? 'supplier' : 'buyer';
  if (!tradeEventId || !clientCaptureId || !companyName) {
    return NextResponse.json({ error: 'Event, capture ID and company are required.' }, { status: 400 });
  }

  const formData = new FormData();
  formData.set('client_capture_id', clientCaptureId);
  formData.set('trade_event_id', tradeEventId);
  formData.set('lead_type', leadType);
  formData.set('company_name', companyName);
  formData.set('contact_name', clean(body.contactName));
  formData.set('email', clean(body.email));
  formData.set('phone', clean(body.phone));
  formData.set('whatsapp_number', clean(body.phone));
  formData.set('notes', clean(body.notes));
  formData.set('next_follow_up_at', clean(body.nextFollowUpAt));
  formData.set('source_type', 'trade_show');
  formData.set('source_label', clean(body.eventName));

  try {
    const result = await saveLead(undefined, formData);
    if (result?.error) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({
      success: result?.success ?? 'Offline trade-event lead synced.',
      leadId: result?.lead?.id ?? null,
      clientCaptureId,
    });
  } catch (error) {
    console.error('[trade-event-offline-sync] capture failed', error);
    return NextResponse.json({ error: 'Offline capture could not be synced yet.' }, { status: 500 });
  }
}
