// SF-18-007: Small public server-action entrypoint.
// Keep existing imports stable while the legacy action implementation is split by domain.
export * from '@/features/leads/server/actions/legacy-actions';
export { saveLead } from '@/features/leads/server/lead-capture-event-aware-action';
