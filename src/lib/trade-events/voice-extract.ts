export type EventVoiceSuggestions = {
  productInterest?: string;
  quantity?: string;
  productType?: string;
  application?: string;
  artworkStatus?: string;
  sampleNeeded?: boolean;
};

export function extractEventVoiceSuggestions(transcript: string): EventVoiceSuggestions {
  const clean = transcript.replace(/\s+/g, ' ').trim();
  if (!clean) return {};
  const lower = clean.toLowerCase();
  const productInterest = clean.match(/(?:looking for|interested in|needs?|wants?)\s+([^.;]+)/i)?.[1]?.trim();
  const quantity = clean.match(/\b([\d,.]+)\s*(?:pcs|pieces|units|pouches|bags)?\s*(?:per month|monthly|\/month)?\b/i)?.[1]?.replace(/,/g, '');
  const productType = /stand[- ]?up pouch/.test(lower) ? 'Stand-up pouch' : /centre seal|center seal/.test(lower) ? 'Centre seal pouch' : /3[- ]?side|three[- ]?side/.test(lower) ? '3-side seal pouch' : /roll stock|rollstock/.test(lower) ? 'Roll stock' : /label/.test(lower) ? 'Label' : undefined;
  const application = /spice|masala/.test(lower) ? 'Spices / masala' : /snack/.test(lower) ? 'Snacks' : /pet food/.test(lower) ? 'Pet food' : /food/.test(lower) ? 'Food' : undefined;
  const artworkStatus = /artwork (?:is )?ready|ready artwork|can share (?:the )?artwork/.test(lower) ? 'ready' : /artwork.*prepar|preparing.*artwork/.test(lower) ? 'preparing' : /need.*design|design help/.test(lower) ? 'needs_help' : undefined;
  const sampleNeeded = /sample/.test(lower) && /want|need|send|request|asked/.test(lower);
  return { productInterest, quantity, productType, application, artworkStatus, sampleNeeded };
}
