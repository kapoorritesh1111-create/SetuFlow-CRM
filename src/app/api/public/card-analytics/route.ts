import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { getPublicCardByShareSlug } from '@/lib/contact-exchange/my-card-settings';

const TRANSPARENT_GIF = Buffer.from('R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==', 'base64');

function getClientIp(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || null;
}

export async function GET(request: NextRequest) {
  const share = request.nextUrl.searchParams.get('share');
  const event = request.nextUrl.searchParams.get('event') || 'view';

  // Best-effort analytics: never block the public card or QR experience.
  try {
    if (share) {
      const sharedCard = await getPublicCardByShareSlug(share);
      const admin = createAdminSupabaseClient();
      if (admin && sharedCard?.settings?.organization_id) {
        await admin.from('audit_logs').insert({
          organization_id: sharedCard.settings.organization_id,
          actor_user_id: null,
          entity_type: 'contact_exchange_card',
          entity_id: sharedCard.settings.id,
          action: `public_card_${event}`,
          payload: {
            share,
            event,
            path: request.nextUrl.pathname,
            referrer: request.headers.get('referer'),
            userAgent: request.headers.get('user-agent'),
            ip: getClientIp(request),
            source: request.nextUrl.searchParams.get('src') || request.nextUrl.searchParams.get('source') || null,
          },
          created_at: new Date().toISOString(),
        } as any);
      }
    }
  } catch {
    // Analytics is intentionally non-critical.
  }

  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}
