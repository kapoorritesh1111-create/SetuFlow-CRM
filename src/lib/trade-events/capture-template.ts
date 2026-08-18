export type TradeEventCaptureTemplateKey = 'generic' | 'packaging';

export type TradeEventCaptureTemplate = {
  key: TradeEventCaptureTemplateKey;
  label: string;
  progressive: boolean;
  optionalFields: string[];
};

const templates: Record<TradeEventCaptureTemplateKey, TradeEventCaptureTemplate> = {
  generic: {
    key: 'generic',
    label: 'General trade',
    progressive: true,
    optionalFields: ['product_interest', 'notes', 'follow_up_promise', 'follow_up_timing'],
  },
  packaging: {
    key: 'packaging',
    label: 'Packaging',
    progressive: true,
    optionalFields: [
      'product_interest',
      'packaging_product_type',
      'packaging_application',
      'approximate_quantity',
      'dimensions_status',
      'dimensions',
      'artwork_status',
      'sample_needed',
    ],
  },
};

export function resolveTradeEventCaptureTemplate(industryKey?: string | null): TradeEventCaptureTemplate {
  const normalized = String(industryKey ?? '').trim().toLowerCase();
  if (normalized.includes('packag')) return templates.packaging;
  return templates.generic;
}

export function getTradeEventCaptureTemplate(key: TradeEventCaptureTemplateKey) {
  return templates[key];
}
