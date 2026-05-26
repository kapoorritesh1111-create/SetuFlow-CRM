export type FreightQuoteRequestPayload = {
  orderId: string;
  packingPlanId?: string | null;
  shipmentMode: 'road' | 'sea' | 'air' | 'courier' | string;
  incoterm?: string | null;
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  originPort?: string | null;
  destinationPort?: string | null;
  requestPayload?: Record<string, unknown>;
};

export type FreightQuoteResult = {
  providerName: string;
  providerType?: string | null;
  quotedAmount?: number | null;
  currency?: string | null;
  transitDays?: number | null;
  serviceLevel?: string | null;
  validityUntil?: string | null;
  quotePayload?: Record<string, unknown>;
};

export type FreightBookingPayload = {
  orderId: string;
  freightRateQuoteId?: string | null;
  shipmentMode: string;
  carrierName?: string | null;
  forwarderName?: string | null;
  bookingReference?: string | null;
};

export type FinanceInvoicePayload = {
  orderId: string;
  orderDocumentId?: string | null;
  financeDocumentType: 'final_invoice' | 'credit_note' | 'receipt' | string;
  currency?: string | null;
  lineItems?: Array<{
    skuCode?: string | null;
    description: string;
    quantity: number;
    unitPrice?: number | null;
    lineTotal?: number | null;
  }>;
  invoicePayload?: Record<string, unknown>;
};

export type FinancePaymentPayload = {
  orderId: string;
  externalInvoiceId?: string | null;
  amount: number;
  currency: string;
  paidAt?: string | null;
  paymentPayload?: Record<string, unknown>;
};

export interface FreightAdapter {
  quote(payload: FreightQuoteRequestPayload): Promise<FreightQuoteResult[]>;
  book(payload: FreightBookingPayload): Promise<{ externalBookingId?: string | null; payload?: Record<string, unknown> }>;
  track(payload: { shipmentId: string; trackingNumber?: string | null }): Promise<Record<string, unknown>>;
  documents(payload: { shipmentId: string }): Promise<Record<string, unknown>[]>;
}

export interface FinanceAdapter {
  createInvoice(payload: FinanceInvoicePayload): Promise<{ externalId?: string | null; payload?: Record<string, unknown> }>;
  updateInvoice(payload: FinanceInvoicePayload & { externalId: string }): Promise<{ externalId: string; payload?: Record<string, unknown> }>;
  recordPayment(payload: FinancePaymentPayload): Promise<{ externalPaymentId?: string | null; payload?: Record<string, unknown> }>;
  voidInvoice(payload: { orderId: string; externalId: string; reason: string }): Promise<{ externalId: string; payload?: Record<string, unknown> }>;
  syncCustomer(payload: { organizationId: string; leadId?: string | null; customerSnapshot: Record<string, unknown> }): Promise<{ externalCustomerId?: string | null; payload?: Record<string, unknown> }>;
}

export class DisabledFreightAdapter implements FreightAdapter {
  async quote(): Promise<FreightQuoteResult[]> {
    return [];
  }

  async book(): Promise<{ externalBookingId?: string | null; payload?: Record<string, unknown> }> {
    return { externalBookingId: null, payload: { disabled: true, reason: 'Freight integrations are not enabled by default in Sprint 8P.' } };
  }

  async track(): Promise<Record<string, unknown>> {
    return { disabled: true, reason: 'Freight tracking integrations are not enabled by default in Sprint 8P.' };
  }

  async documents(): Promise<Record<string, unknown>[]> {
    return [];
  }
}

export class DisabledFinanceAdapter implements FinanceAdapter {
  async createInvoice(): Promise<{ externalId?: string | null; payload?: Record<string, unknown> }> {
    return { externalId: null, payload: { disabled: true, reason: 'Finance sync is not enabled by default in Sprint 8P.' } };
  }

  async updateInvoice(payload: FinanceInvoicePayload & { externalId: string }): Promise<{ externalId: string; payload?: Record<string, unknown> }> {
    return { externalId: payload.externalId, payload: { disabled: true, reason: 'Finance sync is not enabled by default in Sprint 8P.' } };
  }

  async recordPayment(): Promise<{ externalPaymentId?: string | null; payload?: Record<string, unknown> }> {
    return { externalPaymentId: null, payload: { disabled: true, reason: 'Payment sync is not enabled by default in Sprint 8P.' } };
  }

  async voidInvoice(payload: { orderId: string; externalId: string; reason: string }): Promise<{ externalId: string; payload?: Record<string, unknown> }> {
    return { externalId: payload.externalId, payload: { disabled: true, reason: payload.reason } };
  }

  async syncCustomer(): Promise<{ externalCustomerId?: string | null; payload?: Record<string, unknown> }> {
    return { externalCustomerId: null, payload: { disabled: true, reason: 'Customer sync is not enabled by default in Sprint 8P.' } };
  }
}

export const freightAdapter = new DisabledFreightAdapter();
export const financeAdapter = new DisabledFinanceAdapter();

export const ORDER_INTEGRATION_BOUNDARY_POLICY = {
  freight: {
    enabledByDefault: false,
    safeFirstStep: "Use freight_rate_requests/freight_booking_events with adapter_name='pending' before any live carrier adapter is enabled.",
    humanApprovalRequiredFor: ['send_request', 'select_quote', 'book_shipment', 'dispatch'],
  },
  finance: {
    enabledByDefault: false,
    safeFirstStep: "Use finance_integration_events with adapter_name='pending' only after final invoice approval and explicit finance queue action.",
    noSyncFrom: ['quote', 'proforma_invoice', 'order_confirmation', 'packing_sheet', 'freight_rate_request', 'draft_invoice'],
    humanApprovalRequiredFor: ['create_invoice', 'update_invoice', 'record_payment', 'void_invoice', 'sync_customer'],
  },
} as const;
