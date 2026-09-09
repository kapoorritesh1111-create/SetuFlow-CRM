export type VisibleLeadScoreInput = {
  company_name?: string | null;
  contact_name?: string | null;
  phone?: string | null;
  whatsapp_number?: string | null;
  email?: string | null;
  country?: string | null;
  products_or_needs?: string | null;
  main_product_category?: string | null;
  notes?: string | null;
  stage_id?: string | null;
  next_follow_up_at?: string | null;
  source_type?: string | null;
  source_label?: string | null;
};

export function computeVisibleLeadScore(lead: VisibleLeadScoreInput) {
  let score = 0;
  if (lead.company_name) score += 10;
  if (lead.contact_name) score += 10;
  if (lead.phone || lead.whatsapp_number) score += 15;
  if (lead.email) score += 5;
  if (lead.country) score += 10;
  if (lead.products_or_needs || lead.main_product_category) score += 20;
  else if (lead.notes && lead.notes.trim().length >= 20) score += 10;
  if (lead.stage_id) score += 10;
  if (lead.next_follow_up_at) score += 10;
  if (lead.source_type || lead.source_label) score += 10;
  return Math.max(0, Math.min(100, score));
}

export function visibleLeadScoreTone(score: number) {
  if (score >= 80) return 'ideal';
  if (score >= 65) return 'strong';
  if (score >= 45) return 'developing';
  return 'low';
}
