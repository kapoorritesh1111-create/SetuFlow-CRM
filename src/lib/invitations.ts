import { createClient } from '@/lib/supabase/server';

export type InvitationStatus = 'draft' | 'pending' | 'sent' | 'accepted' | 'expired' | 'revoked' | 'failed';

export interface Invitation {
  id: string;
  email: string;
  fullName: string | null;
  invitedRole: string | null;
  invitedBy: string | null;
  status: InvitationStatus;
  sentAt?: string | null;
  acceptedAt?: string | null;
  expiresAt?: string | null;
  revokedAt?: string | null;
  metadata?: Record<string, unknown>;
  acceptUrl?: string | null;
  emailStatus?: string | null;
  emailProvider?: string | null;
  emailError?: string | null;
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export async function listInvitations(organizationId: string): Promise<Invitation[]> {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from('organization_invitations')
    .select('id, email, status, expires_at, last_sent_at, accepted_at, revoked_at, metadata, invited_by_membership_id, role_id, roles(name)')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error || !Array.isArray(data)) return [];

  return data.map((row: any) => {
    const metadata = asRecord(row.metadata);
    const delivery = asRecord(metadata.delivery);
    const invitee = asRecord(metadata.invitee);
    return {
      id: row.id,
      email: row.email,
      fullName: optionalString(invitee.full_name),
      invitedRole: row.roles?.name ?? null,
      invitedBy: row.invited_by_membership_id ?? null,
      status: normalizeInvitationStatus(row.status, row.expires_at),
      sentAt: row.last_sent_at ?? null,
      acceptedAt: row.accepted_at ?? null,
      expiresAt: row.expires_at ?? null,
      revokedAt: row.revoked_at ?? null,
      metadata,
      acceptUrl: optionalString(delivery.accept_url),
      emailStatus: optionalString(delivery.email_status),
      emailProvider: optionalString(delivery.email_provider ?? delivery.provider),
      emailError: optionalString(delivery.email_error),
    };
  });
}
