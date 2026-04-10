import { hasSupabaseEnv } from '@/lib/env';
import { getAuditEvents, type AuditEventType } from '@/lib/auditLog';
import { canViewAuditLogs } from '@/lib/permissionGuards';
import { requireAdminWorkspace } from '@/lib/workspace/auth';
import { AdminAuditWorkspace, type AuditViewKey } from '@/features/admin/components/admin-audit-workspace';
import { StateMessage } from '@/components/ui/state-message';

type SearchParams = {
  event?: string;
  actor?: string;
  since?: string;
  until?: string;
  view?: string;
};

const EVENT_TYPE_OPTIONS: AuditEventType[] = [
  'invitation_created',
  'invitation_sent',
  'invitation_resent',
  'invitation_updated',
  'invitation_revoked',
  'invitation_accepted',
  'invitation_failed',
  'role_changed',
  'saved_view_created',
  'saved_view_shared',
  'saved_view_updated',
  'default_view_set',
  'settings_list_item_saved',
  'settings_list_item_deleted',
  'membership_reactivated',
  'membership_deactivated',
  'membership_removed',
  'password_reset_requested',
  'lead_created',
  'lead_updated',
  'lead_stage_changed',
  'lead_follow_up_scheduled',
  'lead_follow_up_completed',
  'lead_qualification_updated',
  'lead_note_added',
  'rfq_created',
  'rfq_updated',
  'rfq_status_changed',
  'pricing_shared',
  'pricing_sent',
  'pricing_exported',
  'product_created',
  'product_updated',
  'product_deleted',
  'quote_created',
  'quote_updated',
  'quote_sent',
  'quote_send_blocked',
  'contract_progressed',
  'contract_updated',
  'document_reviewed',
  'document_revision_requested',
  'document_approved',
  'document_rejected',
  'compliance_item_updated',
  'integration_replay_requested',
  'trade_event_created',
  'trade_event_updated',
  'trade_event_deleted',
  'trade_event_entry_captured',
  'trade_event_entry_converted',
  'scheduled_task_created',
  'scheduled_task_updated',
  'scheduled_task_completed',
  'scheduled_task_reopened',
  'mobile_field_note_captured',
  'mobile_field_document_captured',
  'ai_suggestion_generated',
  'ai_suggestion_reviewed',
  'ai_suggestion_approved',
  'ai_suggestion_dismissed',
  'ai_suggestion_applied',
  'pricing_quote_approval_requested',
  'pricing_quote_approved',
  'pricing_quote_rejected',
  'pricing_quote_version_sent',
  'pricing_quote_version_superseded',
  'pricing_quote_revision_cloned',
  'pricing_quote_override_requested',
  'pricing_quote_override_applied',
  'quote_document_stored',
  'quote_negotiation_event_recorded',
];

const VIEW_EVENT_TYPES: Record<AuditViewKey, AuditEventType[] | undefined> = {
  all: undefined,
  catalog: [
    'settings_list_item_saved',
    'settings_list_item_deleted',
    'pricing_shared',
    'pricing_sent',
    'pricing_exported',
    'product_created',
    'product_updated',
    'product_deleted',
  ],
  leads: [
    'lead_created',
    'lead_updated',
    'lead_stage_changed',
    'lead_follow_up_scheduled',
    'lead_follow_up_completed',
    'lead_qualification_updated',
    'lead_note_added',
    'rfq_created',
    'rfq_updated',
    'rfq_status_changed',
    'trade_event_created',
    'trade_event_updated',
    'trade_event_deleted',
    'trade_event_entry_captured',
    'trade_event_entry_converted',
    'scheduled_task_created',
    'scheduled_task_updated',
    'scheduled_task_completed',
    'scheduled_task_reopened',
    'mobile_field_note_captured',
    'mobile_field_document_captured',
    'quote_created',
    'quote_updated',
    'quote_sent',
    'quote_send_blocked',
    'contract_progressed',
    'contract_updated',
    'document_reviewed',
    'document_revision_requested',
    'document_approved',
    'document_rejected',
    'compliance_item_updated',
    'ai_suggestion_generated',
    'ai_suggestion_reviewed',
    'ai_suggestion_approved',
    'ai_suggestion_dismissed',
    'ai_suggestion_applied',
    'pricing_quote_approval_requested',
    'pricing_quote_approved',
    'pricing_quote_rejected',
    'pricing_quote_version_sent',
    'pricing_quote_version_superseded',
    'pricing_quote_revision_cloned',
    'pricing_quote_override_requested',
    'pricing_quote_override_applied',
    'quote_document_stored',
    'quote_negotiation_event_recorded',
  ],
  access: [
    'invitation_created',
    'invitation_sent',
    'invitation_resent',
    'invitation_updated',
    'invitation_revoked',
    'invitation_accepted',
    'invitation_failed',
    'role_changed',
    'membership_reactivated',
    'membership_deactivated',
    'membership_removed',
    'password_reset_requested',
    ],
};


function normalizeFilterValue(value: string | string[] | undefined) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
}

function normalizeView(value: string): AuditViewKey {
  return value === 'catalog' || value === 'leads' || value === 'access' ? value : 'all';
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>;
}) {
  if (!hasSupabaseEnv) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <p className="text-sm text-slate-600">Supabase environment variables are missing. Please configure your environment.</p>
      </div>
    );
  }

  const params = searchParams ? await Promise.resolve(searchParams) : {};
  const { missingEnv, membership, organization, currentRoles } = await requireAdminWorkspace();
  if (missingEnv) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-soft">
        <p className="text-sm text-slate-600">Supabase environment variables are missing. Please configure your environment.</p>
      </div>
    );
  }
  if (!membership || !organization) return null;
  if (!canViewAuditLogs(currentRoles)) {
    return (
      <StateMessage
        title="Audit log not available for this admin view"
        description="Your current admin role can open organization routes, but audit visibility is still protected. Return to the organization workspace or escalate through an owner/admin role with audit access."
        tone="warning"
      />
    );
  }

  const selectedView = normalizeView(normalizeFilterValue(params.view));
  const selectedEventType = normalizeFilterValue(params.event);
  const selectedActorId = normalizeFilterValue(params.actor);
  const since = normalizeDateValue(normalizeFilterValue(params.since));
  const until = normalizeDateValue(normalizeFilterValue(params.until));

  const eventTypes = EVENT_TYPE_OPTIONS.includes(selectedEventType as AuditEventType)
    ? [selectedEventType as AuditEventType]
    : VIEW_EVENT_TYPES[selectedView];

  const events = await getAuditEvents(organization.id, {
    eventTypes,
    actorId: selectedActorId && selectedActorId !== 'all' ? selectedActorId : undefined,
    since: since || undefined,
    until: until ? `${until}T23:59:59.999Z` : undefined,
    limit: 100,
  });

  const actorOptions = Array.from(
    new Map(
      events
        .filter((event) => event.actor_user_id)
        .map((event) => [event.actor_user_id as string, event.actor_name ?? event.actor_email ?? event.actor_user_id ?? 'Unknown user']),
    ).entries(),
  ).map(([id, label]) => ({ id, label }));

  const summaryStats = [
    {
      label: 'Access + roles',
      value: events.filter((event) => event.event_type.startsWith('invitation_') || event.event_type === 'role_changed' || event.event_type.startsWith('membership_') || event.event_type === 'password_reset_requested').length,
      helper: 'Invitations, membership changes, role changes, and admin-triggered access actions.',
    },
    {
      label: 'Commercial workflows',
      value: events.filter((event) => event.event_type.startsWith('product_') || event.event_type.startsWith('pricing_') || event.event_type.startsWith('quote_') || event.event_type.startsWith('contract_')).length,
      helper: 'Catalog, pricing, quote, negotiation, and contract activity.',
    },
    {
      label: 'Operations + documents',
      value: events.filter((event) => event.event_type.startsWith('document_') || event.event_type.startsWith('compliance_') || event.event_type.startsWith('integration_')).length,
      helper: 'Document reviews, compliance updates, and integration replay requests.',
    },
    {
      label: 'AI assist review',
      value: events.filter((event) => event.event_type.startsWith('ai_suggestion_')).length,
      helper: 'Generated, reviewed, approved, dismissed, and applied AI suggestions.',
    },
  ];

  return (
    <AdminAuditWorkspace
      organizationName={organization.name}
      events={events}
      eventTypeOptions={EVENT_TYPE_OPTIONS}
      actorOptions={actorOptions}
      selectedEventType={selectedEventType || 'all'}
      selectedActorId={selectedActorId || 'all'}
      since={since}
      until={until}
      summaryStats={summaryStats}
      selectedView={selectedView}
      readOnlyMessage={currentRoles.includes('owner') ? null : 'Admin-view state keeps audit exploration visible while owner-sensitive governance actions stay contained elsewhere.'}
    />
  );
}
