export type ConnectorRuntime = {
  provider: string;
  label: string;
  category: 'freight' | 'erp';
  requiredKeys: string[];
  mapInboundPayload: (payload: Record<string, unknown>) => Record<string, unknown>;
  validatePayload: (payload: Record<string, unknown>) => { ok: boolean; errors: string[]; label: string };
  continuityKey: (payload: Record<string, unknown>) => string | null;
};

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function hasKey(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return value !== undefined && value !== null && !(typeof value === 'string' && !value.trim());
}

function buildValidation(payload: Record<string, unknown>, requiredKeys: string[], label: string) {
  const errors = requiredKeys.filter((key) => !hasKey(payload, key)).map((key) => `Missing ${key}.`);
  return { ok: errors.length === 0, errors, label };
}

export const mockFreightConnector: ConnectorRuntime = {
  provider: 'freight_mock',
  label: 'Freight mock connector',
  category: 'freight',
  requiredKeys: ['event_type', 'shipment_reference'],
  mapInboundPayload(payload) {
    return {
      event_type: payload.event_type ?? 'shipment_update',
      contract_id: payload.contract_id ?? null,
      quote_id: payload.quote_id ?? null,
      shipment_reference: payload.shipment_reference ?? payload.reference ?? null,
      delivery_status: payload.delivery_status ?? payload.status ?? 'unknown',
      dispatch_ready: payload.dispatch_ready ?? false,
      compliance_cleared: payload.compliance_cleared ?? false,
      recommended_action: 'Review governed freight impact before changing execution posture.',
    };
  },
  validatePayload(payload) {
    return buildValidation(payload, ['event_type', 'shipment_reference'], 'Freight payload validated');
  },
  continuityKey(payload) {
    const contractId = readString(payload.contract_id);
    if (contractId) return `contract:${contractId}:freight_mock`;
    const shipmentReference = readString(payload.shipment_reference) ?? readString(payload.reference);
    return shipmentReference ? `shipment:${shipmentReference}:freight_mock` : null;
  },
};

export const mockErpConnector: ConnectorRuntime = {
  provider: 'erp_mock',
  label: 'ERP mock connector',
  category: 'erp',
  requiredKeys: ['event_type'],
  mapInboundPayload(payload) {
    return {
      event_type: payload.event_type ?? 'commercial_update',
      contract_id: payload.contract_id ?? null,
      quote_id: payload.quote_id ?? null,
      order_reference: payload.order_reference ?? payload.reference ?? null,
      invoice_status: payload.invoice_status ?? 'open',
      payment_status: payload.payment_status ?? 'pending',
      commercial_hold: payload.commercial_hold ?? false,
      recommended_action: 'Review governed ERP impact before changing commercial posture.',
    };
  },
  validatePayload(payload) {
    const base = buildValidation(payload, ['event_type'], 'ERP payload validated');
    const hasTarget = hasKey(payload, 'contract_id') || hasKey(payload, 'quote_id') || hasKey(payload, 'order_reference') || hasKey(payload, 'reference');
    if (!hasTarget) base.errors.push('Missing contract_id, quote_id, or order_reference.');
    base.ok = base.errors.length === 0;
    return base;
  },
  continuityKey(payload) {
    const contractId = readString(payload.contract_id);
    if (contractId) return `contract:${contractId}:erp_mock`;
    const quoteId = readString(payload.quote_id);
    if (quoteId) return `quote:${quoteId}:erp_mock`;
    const reference = readString(payload.order_reference) ?? readString(payload.reference);
    return reference ? `order:${reference}:erp_mock` : null;
  },
};

export const connectorRegistry: Record<string, ConnectorRuntime> = {
  [mockFreightConnector.provider]: mockFreightConnector,
  [mockErpConnector.provider]: mockErpConnector,
};
