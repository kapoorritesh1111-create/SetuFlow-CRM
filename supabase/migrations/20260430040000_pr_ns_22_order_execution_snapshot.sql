-- PR-NS-22 — Order execution proof hardening
-- Records an honest execution-readiness snapshot for the approved golden order.
-- This migration does not mark the order ready/released/dispatched; it preserves blocker truth.

update public.contracts
set
  execution_blockers = '["Signed contract posture is still missing.","Commercial invoice is still missing.","Packing list is still missing.","Dispatch transport proof is still missing.","Proof of delivery is still missing."]'::jsonb,
  execution_snapshot = jsonb_build_object(
    'source', 'PR-NS-22',
    'state', 'draft',
    'state_label', 'Draft execution',
    'headline', 'Order is accepted and commercially continuous, but not release-ready yet.',
    'summary', 'Q-00025 is visible in Orders with 11 preserved contract lines. Documents are not yet linked, so the next demonstrable action is to upload/approve release documents before dispatch.',
    'line_count', 11,
    'contract_id', 'd129ffe2-c913-4cf7-9a7b-86ea6c9da54e',
    'quote_id', 'b6f8111a-3b32-456d-92f0-412c898bf13b',
    'next_action', 'Upload signed contract/commercial invoice/packing list, then mark execution ready after evidence is approved.',
    'blockers', jsonb_build_array(
      'Signed contract posture is still missing.',
      'Commercial invoice is still missing.',
      'Packing list is still missing.',
      'Dispatch transport proof is still missing.',
      'Proof of delivery is still missing.'
    ),
    'document_posture', jsonb_build_object('linked_documents', 0, 'release_ready', false, 'dispatch_ready', false),
    'dispatch_controls', jsonb_build_object('can_release', false, 'can_dispatch', false, 'can_complete', false),
    'mobile_scope', 'desktop-first order execution; mobile remains trade-event capture only',
    'computed_at', timezone('utc', now())
  ),
  updated_at = timezone('utc', now())
where id = 'd129ffe2-c913-4cf7-9a7b-86ea6c9da54e'
  and quote_id = 'b6f8111a-3b32-456d-92f0-412c898bf13b'
  and exists (
    select 1
    from public.quotes
    where quotes.id = contracts.quote_id
      and quotes.status = 'accepted'
      and quotes.accepted_version_id = contracts.accepted_quote_version_id
  );
