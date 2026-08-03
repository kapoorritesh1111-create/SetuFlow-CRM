/*
 * Audit logging utilities.
 *
 * Audit events are used to capture meaningful administrative and workflow
 * actions for accountability. The canonical write entrypoint is now
 * `writeAuditLog()`. Legacy callers may continue to use `recordAuditEvent()`,
 * which delegates into the standardized helper.
 */

import { createClient } from '@/lib/supabase/server';
import { getCurrentWorkspace, getWorkspaceRoleNames } from '@/lib/workspace/auth';

type AuditProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  email: string | null;
};

export type AuditReadScope =
  | {
      mode: 'organization';
      organizationId: string;
      actorUserId: null;
      currentRoles: string[];
    }
  | {
      mode: 'actor';
      organizationId: string;
      actorUserId: string;
      currentRoles: string[];
    }
  | {
      mode: 'none';
      organizationId: null;
      actorUserId: null;
      currentRoles: string[];
    };

/**
 * Supported audit event types. Extend this list cautiously. Each type
 * should correspond to a discrete, meaningful action rather than a UI
 * interaction. Do not log sensitive payloads such as passwords or
 * tokens.
 */
export type AuditEventType =
  | 'invitation_created'
  | 'invitation_sent'
  | 'invitation_resent'
  | 'invitation_updated'
  | 'invitation_revoked'
  | 'invitation_accepted'
  | 'invitation_failed'
  | 'role_changed'
  | 'saved_view_created'
  | 'saved_view_updated'
  | 'saved_view_shared'
  | 'default_view_set'
  | 'settings_list_item_saved'
  | 'settings_list_item_deleted'
  | 'lead_created'
  | 'lead_updated'
  | 'lead_stage_changed'
  | 'lead_follow_up_scheduled'
  | 'lead_follow_up_completed'
  | 'lead_qualification_updated'
  | 'lead_note_added'
  | 'rfq_created'
  | 'rfq_updated'
  | 'quote_approved'
  | 'quote_rejected'
  | 'rfq_status_changed'
  | 'pricing_shared'
  | 'pricing_sent'
  | 'pricing_exported'
  | 'product_created'
  | 'product_updated'
  | 'product_deleted'
  | 'password_reset_requested'
  | 'membership_reactivated'
  | 'membership_deactivated'
  | 'membership_removed'
  | 'document_status_changed'
  | 'compliance_status_changed'
  | 'document_reviewed'
  | 'document_revision_requested'
  | 'document_approved'
  | 'document_rejected'
  | 'compliance_item_updated'
  | 'integration_replay_requested'
  | 'trade_event_created'
  | 'trade_event_updated'
  | 'trade_event_deleted'
  | 'trade_event_entry_captured'
  | 'trade_event_entry_converted'
  | 'scheduled_task_created'
  | 'scheduled_task_updated'
  | 'scheduled_task_completed'
  | 'scheduled_task_reopened'
  | 'mobile_field_note_captured'
  | 'mobile_field_document_captured'
  | 'ai_suggestion_generated'
  | 'ai_suggestion_reviewed'
  | 'ai_suggestion_approved'
  | 'ai_suggestion_dismissed'
  | 'ai_suggestion_applied'
  | 'quote_created'
  | 'quote_updated'
  | 'quote_sent'
  | 'quote_send_blocked'
  | 'contract_progressed'
  | 'contract_updated'
  | 'pricing_quote_approval_requested'
  | 'pricing_quote_approved'
  | 'pricing_quote_rejected'
  | 'pricing_quote_version_sent'
  | 'pricing_quote_version_superseded'
  | 'pricing_quote_revision_cloned'
  | 'pricing_quote_override_requested'
  | 'pricing_quote_override_applied'
  | 'quote_document_stored'
  | 'quote_negotiation_event_recorded';

export interface AuditEventInput {
  eventType: AuditEventType;
  entityType: string;
  entityId?: string | null;
  actorId?: string | null;
  actorRole?: string | null;
  previousValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export interface WriteAuditLogInput {
  organizationId: string;
  action: AuditEventType | string;
  entityType: string;
  entityId?: string | null;
  actorUserId?: string | null;
  payload?: Record<string, unknown> | null;
}

export type AuditEventRecord = {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string | null;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_email: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

/**
 * Canonical low-level audit log writer.
 *
 * This helper writes directly into `audit_logs` and intentionally swallows
 * persistence errors so that audit logging does not block the primary
 * workflow. Feature actions should standardize on this function (or wrapper
 * helpers that delegate to it) instead of hand-crafting inserts.
 */
export async function writeAuditLog(input: WriteAuditLogInput): Promise<void> {
  const supabase = await createClient();
  const insertData = {
    organization_id: input.organizationId,
    actor_user_id: input.actorUserId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    payload: input.payload ?? {},
  } as const;

  try {
    await (supabase as any).from('audit_logs').insert(insertData);
  } catch {
    // Suppress errors. If logging fails nothing should break.
  }
}

/**
 * Backward-compatible audit event wrapper.
 */
export async function recordAuditEvent(
  organizationId: string,
  input: AuditEventInput,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (input.previousValue) payload.previous = input.previousValue;
  if (input.newValue) payload.new = input.newValue;
  if (input.metadata) payload.metadata = input.metadata;
  if (input.actorRole) payload.actorRole = input.actorRole;

  await writeAuditLog({
    organizationId,
    action: input.eventType,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    actorUserId: input.actorId ?? null,
    payload,
  });
}

function asProfile(record: unknown): AuditProfile | null {
  if (!record || typeof record !== 'object') return null;
  const item = record as Record<string, unknown>;
  return {
    id: String(item.id ?? ''),
    full_name: typeof item.full_name === 'string' ? item.full_name : null,
    username: typeof item.username === 'string' ? item.username : null,
    email: typeof item.email === 'string' ? item.email : null,
  };
}

function getActorDisplayName(profile: AuditProfile | null) {
  if (!profile) return null;
  return profile.full_name ?? profile.username ?? profile.email ?? null;
}

function hasAnyRole(currentRoles: string[], allowedRoles: readonly string[]) {
  return currentRoles.some((role) => allowedRoles.includes(role));
}

export function resolveAuditReadScopeForRoles(input: {
  requestedOrganizationId: string;
  activeOrganizationId?: string | null;
  actorUserId?: string | null;
  currentRoles?: string[];
}): AuditReadScope {
  const requestedOrganizationId = String(input.requestedOrganizationId ?? '').trim();
  const activeOrganizationId = String(input.activeOrganizationId ?? '').trim();
  const actorUserId = String(input.actorUserId ?? '').trim();
  const currentRoles = Array.from(new Set((input.currentRoles ?? []).map((role) => String(role ?? '').trim()).filter(Boolean)));

  if (!requestedOrganizationId || !activeOrganizationId || requestedOrganizationId !== activeOrganizationId) {
    return { mode: 'none', organizationId: null, actorUserId: null, currentRoles };
  }

  if (hasAnyRole(currentRoles, ['owner', 'admin'])) {
    return {
      mode: 'organization',
      organizationId: activeOrganizationId,
      actorUserId: null,
      currentRoles,
    };
  }

  if (hasAnyRole(currentRoles, ['manager'])) {
    return {
      mode: 'organization',
      organizationId: activeOrganizationId,
      actorUserId: null,
      currentRoles,
    };
  }

  if (actorUserId) {
    return {
      mode: 'actor',
      organizationId: activeOrganizationId,
      actorUserId,
      currentRoles,
    };
  }

  return { mode: 'none', organizationId: null, actorUserId: null, currentRoles };
}

async function resolveAuditReadScope(requestedOrganizationId: string): Promise<AuditReadScope> {
  const workspace = await getCurrentWorkspace();

  if (
    workspace.missingEnv ||
    !workspace.user ||
    !workspace.membership ||
    !workspace.organization?.id
  ) {
    return { mode: 'none', organizationId: null, actorUserId: null, currentRoles: [] };
  }

  const currentRoles = await getWorkspaceRoleNames(workspace.membership.id);

  return resolveAuditReadScopeForRoles({
    requestedOrganizationId,
    activeOrganizationId: workspace.organization.id,
    actorUserId: workspace.user.id,
    currentRoles,
  });
}

export async function getAuditEvents(
  organizationId: string,
  filters?: {
    eventTypes?: AuditEventType[];
    since?: string;
    until?: string;
    actorId?: string;
    limit?: number;
  },
  dbClient?: any,
): Promise<AuditEventRecord[]> {

  const scope = dbClient 
    ? { mode: 'org', organizationId, actorUserId: null, currentRoles: ['admin'] } 
    : await resolveAuditReadScope(organizationId);
  if (scope.mode === 'none' || !scope.organizationId) {
    return [];
  }

  if (scope.mode === 'actor' && filters?.actorId && filters.actorId !== scope.actorUserId) {
    return [];
  }

  const supabase = dbClient ?? (await createClient());
  let query = supabase
    .from('audit_logs')
    .select('*')
    .eq('organization_id', scope.organizationId) as any;

  if (scope.mode === 'actor') {
    query = query.eq('actor_user_id', scope.actorUserId);
  }

  if (filters?.eventTypes && filters.eventTypes.length > 0) {
    query = query.in('action', filters.eventTypes);
  }
  if (filters?.since) {
    query = query.gte('created_at', filters.since);
  }
  if (filters?.until) {
    query = query.lte('created_at', filters.until);
  }
  if (filters?.actorId && scope.mode !== 'actor') {
    query = query.eq('actor_user_id', filters.actorId);
  }
  if (typeof filters?.limit === 'number' && Number.isFinite(filters.limit) && filters.limit > 0) {
    query = query.limit(filters.limit);
  }

  const { data } = await query.order('created_at', { ascending: false });
  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const actorIds = Array.from(
    new Set(
      rows
        .map((row) => (typeof row.actor_user_id === 'string' ? row.actor_user_id : null))
        .filter(Boolean) as string[],
    ),
  );

  const actorMap = new Map<string, AuditProfile>();
  if (actorIds.length > 0) {
    const { data: profileRows } = await (supabase as any)
      .from('profiles')
      .select('id, full_name, username, email')
      .in('id', actorIds);

    for (const row of (profileRows ?? []) as unknown[]) {
      const profile = asProfile(row);
      if (profile?.id) {
        actorMap.set(profile.id, profile);
      }
    }
  }

  return rows.map((row) => {
    const actorUserId = typeof row.actor_user_id === 'string' ? row.actor_user_id : null;
    const actorProfile = actorUserId ? actorMap.get(actorUserId) ?? null : null;
    return {
      id: String(row.id ?? ''),
      event_type: String(row.action ?? ''),
      entity_type: typeof row.entity_type === 'string' ? row.entity_type : 'record',
      entity_id: typeof row.entity_id === 'string' ? row.entity_id : null,
      actor_user_id: actorUserId,
      actor_name: getActorDisplayName(actorProfile),
      actor_email: actorProfile?.email ?? null,
      payload: row.payload && typeof row.payload === 'object' ? (row.payload as Record<string, unknown>) : null,
      created_at: String(row.created_at ?? ''),
    };
  });
}