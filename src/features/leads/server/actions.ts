// C7 Phase 1: stable public server-action entrypoint split by domain.
// Business logic remains in legacy-actions.ts during this phase to avoid behavior changes.
// Consumers should import from this file, not the implementation module.

export * from '@/features/leads/server/actions/quote-actions';
export * from '@/features/leads/server/actions/lead-record-actions';
export * from '@/features/leads/server/actions/follow-up-actions';
export * from '@/features/leads/server/actions/communication-actions';
export * from '@/features/leads/server/actions/approval-actions';

// Canonical saveLead remains the event-aware implementation.
// The legacy saveLead is still used internally by lead-capture-save-action.ts and is not
// re-exported from the public actions gateway.
export { saveLead } from '@/features/leads/server/lead-capture-event-aware-action';
