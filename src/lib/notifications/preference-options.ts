export const notificationTypes = [
  { key: 'quote_accepted', label: 'Quote accepted', description: 'A buyer accepts a quote and the order handoff needs attention.' },
  { key: 'compliance_blocker', label: 'Compliance blocker', description: 'A compliance issue blocks workflow progress.' },
  { key: 'lead_stage', label: 'Lead stage changed', description: 'A lead moves to another sales stage.' },
  { key: 'order_stage', label: 'Order stage advanced', description: 'An order moves through execution stages.' },
  { key: 'task_due', label: 'Task due reminder', description: 'A task is due soon or overdue.' },
  { key: 'rfq_received', label: 'RFQ received', description: 'A buyer submits a new RFQ.' },
  { key: 'payment_received', label: 'Payment received', description: 'Payment is recorded against a workflow.' },
  { key: 'approval_request', label: 'Approval request', description: 'A teammate requests approval.' },
  { key: 'quote_opened', label: 'Quote opened', description: 'A recipient opens a quote.' },
  { key: 'catalog_engagement', label: 'Catalog engagement', description: 'A buyer opens, views, downloads, selects, or requests quote activity from a shared catalog.' },
] as const;

export const notificationChannels = [
  { key: 'in_app', label: 'In-app' },
  { key: 'push', label: 'Push' },
  { key: 'email', label: 'Email' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'sms', label: 'SMS' },
] as const;

export type NotificationTypeKey = (typeof notificationTypes)[number]['key'];
export type NotificationChannelKey = (typeof notificationChannels)[number]['key'];

export type NotificationPreferenceRow = {
  notif_type: string;
  in_app: boolean;
  push: boolean;
  email: boolean;
  whatsapp: boolean;
  sms: boolean;
  is_locked?: boolean;
};

export function getNotificationTypeMeta(notifType: string) {
  return notificationTypes.find((item) => item.key === notifType) ?? {
    key: notifType,
    label: notifType.replaceAll('_', ' '),
    description: 'Notification preference.',
  };
}

export function normalizePreferenceRows(rows: NotificationPreferenceRow[]) {
  const byType = new Map(rows.map((row) => [row.notif_type, row]));

  return notificationTypes.map((type) => ({
    notif_type: type.key,
    in_app: byType.get(type.key)?.in_app ?? true,
    push: byType.get(type.key)?.push ?? true,
    email: byType.get(type.key)?.email ?? false,
    whatsapp: byType.get(type.key)?.whatsapp ?? false,
    sms: byType.get(type.key)?.sms ?? false,
    is_locked: byType.get(type.key)?.is_locked ?? false,
  }));
}
