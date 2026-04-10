export type PricingTemplateLineItem = {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
};

export type PricingTemplate = {
  id: string;
  name: string;
  description: string;
  currency: string;
  lineItems: PricingTemplateLineItem[];
};

export const PRICING_TEMPLATES: PricingTemplate[] = [
  {
    id: 'standard-export',
    name: 'Standard export quote',
    description: 'Baseline commercial structure for buyer-facing export quotes.',
    currency: 'USD',
    lineItems: [
      { id: 'goods', label: 'Product supply', quantity: 1, unitPrice: 100 },
      { id: 'packaging', label: 'Packaging and labeling', quantity: 1, unitPrice: 15 },
      { id: 'ops', label: 'Commercial coordination', quantity: 1, unitPrice: 20 },
    ],
  },
  {
    id: 'supplier-check',
    name: 'Supplier validation quote',
    description: 'Lightweight template for supplier-backed replenishment pricing.',
    currency: 'USD',
    lineItems: [
      { id: 'goods', label: 'Material cost', quantity: 1, unitPrice: 75 },
      { id: 'quality', label: 'Quality assurance', quantity: 1, unitPrice: 10 },
    ],
  },
];

export function applyPricingTemplate(template: PricingTemplate, currency?: string) {
  return template.lineItems.map((item) => ({
    product_id: '',
    quantity: item.quantity,
    unit_price: item.unitPrice,
    currency: currency ?? template.currency,
    notes: item.notes ?? item.label,
  }));
}

export function getPricingTemplate(templateId: string | null | undefined) {
  return PRICING_TEMPLATES.find((template) => template.id === templateId) ?? null;
}
