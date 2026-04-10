export type PricingBasis = 'ex_factory' | 'fob' | 'cif' | 'bulk_chips';

export type CurrencyCode = 'USD' | 'INR' | 'EUR' | 'GBP' | 'AED';

export type CategoryType = 'chips' | 'powders';

export type PricingMode = 'unit' | 'case' | 'kg' | 'bulk_kg';

export type QuoteStatus =
  | 'draft'
  | 'in_review'
  | 'sent'
  | 'negotiating'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export type QuoteVersionStatus =
  | 'draft'
  | 'compiled'
  | 'approval_pending'
  | 'approved'
  | 'sent'
  | 'viewed'
  | 'customer_countered'
  | 'superseded'
  | 'accepted'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export type OverrideStatus = 'none' | 'requested' | 'approved' | 'applied' | 'rejected';

export type NegotiationEventType =
  | 'sent'
  | 'opened'
  | 'comment_added'
  | 'counter_offer'
  | 'line_override_requested'
  | 'line_override_approved'
  | 'line_override_rejected'
  | 'revision_created'
  | 'accepted'
  | 'rejected'
  | 'expired';

export type ActorType = 'internal_user' | 'buyer_contact' | 'system';

export type TemplateType = 'chips' | 'powders' | 'both';

export type PricingRuleSetStatus = 'draft' | 'active' | 'archived';

export type FreightProfileStatus = 'draft' | 'active' | 'archived';

export type QuoteDocumentMimeType = 'application/pdf' | 'text/html';
