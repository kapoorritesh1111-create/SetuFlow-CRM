import type { LeadDrawerProps, LeadDrawerSavePayload } from '@/features/leads/types/workspace';
import { LeadDrawer as LeadDrawerImplementation } from '@/features/leads/components/drawer/lead-drawer-implementation';

export * from '@/features/leads/components/drawer/lead-drawer-implementation';

export function LeadDrawer(props: LeadDrawerProps) {
  const quickNewLead = (props.mode ?? 'quick') === 'quick' && !props.lead?.id;

  return (
    <LeadDrawerImplementation
      {...props}
      onSaved={(payload: LeadDrawerSavePayload) => {
        if (quickNewLead && payload.resetForNextLead) {
          props.onSaved?.({ ...payload, lead: undefined });
          props.onClose?.();
          return;
        }
        props.onSaved?.(payload);
      }}
    />
  );
}
