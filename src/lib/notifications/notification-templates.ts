export type NotifType =
  | 'quote_accepted'
  | 'compliance_blocker'
  | 'lead_stage'
  | 'order_stage'
  | 'task_due'
  | 'rfq_received'
  | 'payment_received'
  | 'approval_request'
  | 'quote_opened'
  | 'catalog_engagement';

export type NotificationPriority = 'normal' | 'high' | 'critical';

export type NotificationChannel = 'in_app' | 'push' | 'email' | 'whatsapp' | 'sms';

export type NotificationEntityType =
  | 'quote'
  | 'compliance'
  | 'lead'
  | 'order'
  | 'task'
  | 'rfq'
  | 'payment'
  | 'approval'
  | 'other';

export type NotificationTemplateContext = {
  actorName?: string | null;
  entityRef?: string | null;
  companyName?: string | null;
  dueLabel?: string | null;
  stageName?: string | null;
  amountLabel?: string | null;
};

export type NotificationTemplate = {
  type: NotifType;
  title: string;
  body: string;
  icon: string;
  priority: NotificationPriority;
  entityType: NotificationEntityType;
};

const fallbackActor = 'Setu Flow';

function withRef(label: string, entityRef?: string | null) {
  return entityRef ? `${label} ${entityRef}` : label;
}

export function getNotificationTemplate(
  type: NotifType,
  context: NotificationTemplateContext = {}
): NotificationTemplate {
  const actor = context.actorName || fallbackActor;

  switch (type) {
    case 'quote_accepted':
      return {
        type,
        title: withRef('Quote accepted', context.entityRef),
        body: `${context.companyName || 'A customer'} accepted a quote. Review the order handoff and next execution steps.`,
        icon: 'file-check',
        priority: 'high',
        entityType: 'quote'
      };
    case 'compliance_blocker':
      return {
        type,
        title: 'Compliance blocker needs action',
        body: `${actor} flagged a compliance blocker${context.entityRef ? ` for ${context.entityRef}` : ''}. Resolve it before advancing the workflow.`,
        icon: 'shield-alert',
        priority: 'critical',
        entityType: 'compliance'
      };
    case 'lead_stage':
      return {
        type,
        title: 'Lead stage changed',
        body: `${context.companyName || 'A lead'} moved${context.stageName ? ` to ${context.stageName}` : ' to a new stage'}.`,
        icon: 'users',
        priority: 'normal',
        entityType: 'lead'
      };
    case 'order_stage':
      return {
        type,
        title: withRef('Order stage advanced', context.entityRef),
        body: `An order moved${context.stageName ? ` to ${context.stageName}` : ' to the next stage'}. Check required documents and next gates.`,
        icon: 'package-check',
        priority: 'normal',
        entityType: 'order'
      };
    case 'task_due':
      return {
        type,
        title: 'Task due reminder',
        body: `A task is due${context.dueLabel ? ` ${context.dueLabel}` : ' soon'}.`,
        icon: 'clock',
        priority: 'high',
        entityType: 'task'
      };
    case 'rfq_received':
      return {
        type,
        title: 'New RFQ received',
        body: `${context.companyName || 'A buyer'} submitted a new RFQ${context.entityRef ? ` (${context.entityRef})` : ''}.`,
        icon: 'inbox',
        priority: 'high',
        entityType: 'rfq'
      };
    case 'payment_received':
      return {
        type,
        title: 'Payment received',
        body: `Payment${context.amountLabel ? ` of ${context.amountLabel}` : ''} was recorded${context.entityRef ? ` for ${context.entityRef}` : ''}.`,
        icon: 'wallet',
        priority: 'high',
        entityType: 'payment'
      };
    case 'approval_request':
      return {
        type,
        title: 'Approval request pending',
        body: `${actor} requested approval${context.entityRef ? ` for ${context.entityRef}` : ''}.`,
        icon: 'badge-check',
        priority: 'high',
        entityType: 'approval'
      };
    case 'quote_opened':
      return {
        type,
        title: withRef('Quote opened', context.entityRef),
        body: `${context.companyName || 'A recipient'} opened a quote. Consider timely follow-up.`,
        icon: 'eye',
        priority: 'normal',
        entityType: 'quote'
      };
    case 'catalog_engagement':
      return {
        type,
        title: withRef('Catalog engagement', context.entityRef),
        body: `${context.companyName || 'A buyer'} engaged with a shared catalog. Review activity and follow up while interest is warm.`,
        icon: 'bar-chart-3',
        priority: 'high',
        entityType: 'lead'
      };
  }
}
