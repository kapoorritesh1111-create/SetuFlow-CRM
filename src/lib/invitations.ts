import { createClient } from '@/lib/supabase/server';

export type InvitationStatus =
  | 'draft'
  | 'pending'
  | 'sent'
  | 'accepted'
  | 'expired'
  | 'revoked'
  | 'failed';

export interface Invitation {
  id: string;
  email: string;
  invitedRole: string | null;
  invitedBy: string | null;
  status: InvitationStatus;
  sentAt?: string | null;
  acceptedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  metadata?: Record<string, unknown>;
  acceptUrl?: string | null;
}

function normalizeInvitationStatus(raw: string | null | undefined, expiresAt?: string | null): InvitationStatus {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'accepted' || value === 'revoked' || value === 'failed' || value === 'draft' || value === 'pending' || value === 'sent') {
    if ((value === 'pending' || value === 'sent') && expiresAt) {
      const expires = new Date(expiresAt);
      if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) return 'expired';
    }
    return value;
  }
  if (expiresAt) {
    const expires = new Date(expiresAt);
    if (!Number.isNaN(expires.getTime()) && expires.getTime() < Date.now()) return 'expired';
  }
  return 'draft';
}

export async function listInvitations(organizationId: string): Promise<Invitation[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('organization_invitations')
    .select('id, email, status, expires_at, last_sent_at, accepted_at, revoked_at, metadata, invited_by_membership_id, role_id, roles(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data)) {
    return [];
  }

  return data.map((row: any) => ({
    id: row.id,
    email: row.email,
    invitedRole: row.roles?.name ?? null,
    invitedBy: row.invited_by_membership_id ?? null,
    status: normalizeInvitationStatus(row.status, row.expires_at),
    sentAt: row.last_sent_at ?? null,
    acceptedAt: row.accepted_at ?? null,
    expiresAt: row.expires_at ?? null,
    revokedAt: row.revoked_at ?? null,
    metadata: row.metadata ?? {},
    acceptUrl: row.metadata?.delivery?.accept_url ?? null,
  }));
}
