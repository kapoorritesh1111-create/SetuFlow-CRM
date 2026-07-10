import { createClient } from '@/lib/supabase/server';

export type GeneratedRecommendation = {
  org_id: string;
  entity_type: 'lead' | 'buyer' | 'supplier' | 'quote' | 'rfq' | 'trade_event';
  entity_id: string;
  recommendation_type:
    | 'lead_no_outreach'
    | 'quote_no_follow_up'
    | 'trade_event_lead_not_contacted'
    | 'supplier_document_gap'
    | 'buyer_quote_request'
    | 'catalog_sent_no_reply'