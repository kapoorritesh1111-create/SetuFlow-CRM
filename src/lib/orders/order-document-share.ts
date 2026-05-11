export type OrderDocumentKind = 'order-confirmation' | 'invoice';

export type OrderDocumentSharePayload = {
  organizationId: string;
  contractId: string;
  leadId: string | null;
  quoteId: string | null;
  documentKind: OrderDocumentKind;
  recipient?: string | null;
  note?: string | null;
  createdAt: string;
};

export function encodeOrderDocumentShareToken(payload: OrderDocumentSharePayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeOrderDocumentShareToken(token: string): OrderDocumentSharePayload | null {
  try {
    const raw = Buffer.from(String(token ?? ''), 'base64url').toString('utf8');
    const value = JSON.parse(raw) as Partial<OrderDocumentSharePayload>;
    if (!value.organizationId || !value.contractId || !value.documentKind) return null;
    if (!['order-confirmation', 'invoice'].includes(value.documentKind)) return null;
    return {
      organizationId: String(value.organizationId),
      contractId: String(value.contractId),
      leadId: value.leadId ? String(value.leadId) : null,
      quoteId: value.quoteId ? String(value.quoteId) : null,
      documentKind: value.documentKind,
      recipient: value.recipient ? String(value.recipient) : null,
      note: value.note ? String(value.note) : null,
      createdAt: value.createdAt ? String(value.createdAt) : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function getOrderDocumentPdfPath(contractId: string, documentKind: OrderDocumentKind) {
  return documentKind === 'invoice'
    ? `/api/orders/${contractId}/invoice/pdf`
    : `/api/orders/${contractId}/order-confirmation/pdf`;
}

export function getOrderDocumentLabel(documentKind: OrderDocumentKind) {
  return documentKind === 'invoice' ? 'Invoice' : 'Order Confirmation PDF';
}
