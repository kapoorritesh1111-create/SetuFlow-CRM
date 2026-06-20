import { createServiceRoleClient } from '@/lib/supabase/service-role';
import type { CatalogShare } from './types';

export type ShareValidationReason = 'ok' | 'not_found' | 'expired' | 'revoked' | 'pin_required' | 'pin_invalid';

export type ShareValidationResult = {
  ok: boolean;
  reason: ShareValidationReason;
  share?: CatalogShare;
  productIds?: string[];
};

/**
 * Validate a buyer catalog-share token server-side using the service-role client
 * (buyers are anonymous, so RLS does not apply — security is enforced here in code).
 * Mirrors the qa_share_links / guest_links validation pattern.
 *
 * @param token  the share token from the URL
 * @param pin    optional PIN supplied by the buyer (from a query param or form)
 */
export async function validateShareToken(token: string, pin?: string | null): Promise<ShareValidationResult> {
  const svc = createServiceRoleClient() as any;
  const { data: share } = await svc.from('catalog_shares').select('*').eq('token', token).maybeSingle();

  if (!share) return { ok: false, reason: 'not_found' };
  if (share.status === 'revoked') return { ok: false, reason: 'revoked' };
  // Drafts are not publicly visible.
  if (share.status === 'draft') return { ok: false, reason: 'not_found' };
  if (share.valid_until && new Date(share.valid_until).getTime() < Date.now()) {
    return { ok: false, reason: 'expired', share: share as CatalogShare };
  }
  if (share.pin_code) {
    if (!pin) return { ok: false, reason: 'pin_required', share: share as CatalogShare };
    if (String(pin).trim() !== String(share.pin_code).trim()) {
      return { ok: false, reason: 'pin_invalid', share: share as CatalogShare };
    }
  }

  const { data: products } = await svc
    .from('catalog_share_products')
    .select('product_id, sort_order')
    .eq('catalog_share_id', share.id)
    .order('sort_order', { ascending: true });

  return { ok: true, reason: 'ok', share: share as CatalogShare, productIds: (products ?? []).map((p: any) => p.product_id) };
}

/** Increment open count + stamp last_opened_at, and (if tracking) log a link_opened event. */
export async function markShareOpened(share: Pick<CatalogShare, 'id' | 'use_count' | 'tracking_enabled'>, meta?: Record<string, unknown>): Promise<void> {
  const svc = createServiceRoleClient() as any;
  await svc.from('catalog_shares').update({ use_count: (share.use_count ?? 0) + 1, last_opened_at: new Date().toISOString() }).eq('id', share.id);
  if (share.tracking_enabled) {
    await svc.from('catalog_share_events').insert({ catalog_share_id: share.id, event_type: 'link_opened', meta: meta ?? null });
  }
}
