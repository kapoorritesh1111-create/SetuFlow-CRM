export type ConnectorRuntime = {
  provider: string;
  label: string;
  category: 'freight' | 'erp';
  mapInboundPayload: (payload: Record<string, unknown>) => Record<string, unknown>;
};

export const mockFreightConnector: ConnectorRuntime = {
  provider: 'freight_mock',
  label: 'Freight mock connector',
  category: 'freight',
  mapInboundPayload(payload) {
    return {
      shipment_reference: payload.shipment_reference ?? payload.reference ?? null,
      delivery_status: payload.delivery_status ?? payload.status ?? 'unknown',
      dispatch_ready: payload.dispatch_ready ?? false,
      compliance_cleared: payload.compliance_cleared ?? false,
    };
  },
};

export const mockErpConnector: ConnectorRuntime = {
  provider: 'erp_mock',
  label: 'ERP mock connector',
  category: 'erp',
  mapInboundPayload(payload) {
    return {
      order_reference: payload.order_reference ?? payload.reference ?? null,
      invoice_status: payload.invoice_status ?? 'open',
      payment_status: payload.payment_status ?? 'pending',
      commercial_hold: payload.commercial_hold ?? false,
    };
  },
};

export const connectorRegistry: Record<string, ConnectorRuntime> = {
  [mockFreightConnector.provider]: mockFreightConnector,
  [mockErpConnector.provider]: mockErpConnector,
};
