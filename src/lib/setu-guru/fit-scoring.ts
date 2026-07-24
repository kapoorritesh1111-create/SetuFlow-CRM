// src/lib/setu-guru/fit-scoring.ts
// Pure, synchronous ICP fit-scoring logic.
//
// Deliberately NOT a "use server" file: this has no I/O (no DB, no AI
// calls) and must stay a plain synchronous function. Next.js requires
// every export from a "use server" file to be async (treated as a
// Server Action) — keeping this file separate from entity-research.ts
// avoids forcing a fake `async` on logic that doesn't need it.

import type { IcpProfile } from '@/lib/setu-guru/icp';

export type FitScoreResult = {
  score: number; // 0-100
  matchedCountry: boolean;
  matchedProduct: boolean;
  matchedBuyerType: boolean;
  reasons: string[];
};

function normalize(value?: string | null) {
  return (value ?? '').trim().toLowerCase();
}

function overlaps(a: string[], b: string[]) {
  const setB = new Set(b.map(normalize));
  return a.some((item) => setB.has(normalize(item)));
}

export function scoreFitAgainstIcp(
  lead: {
    country?: string | null;
    products_or_needs?: string | null;
    lead_type?: string | null;
    main_product_category?: string | null;
  },
  icp: IcpProfile | null,
): FitScoreResult | null {
  if (!icp) return null;

  const reasons: string[] = [];
  let score = 40; // baseline: CRM record exists, no ICP contradiction yet

  const matchedCountry = Boolean(icp.target_countries.length) && overlaps([lead.country ?? ''], icp.target_countries);
  if (matchedCountry) {
    score += 25;
    reasons.push(`Located in a target market (${lead.country}).`);
  }

  const leadProductTerms = [lead.products_or_needs ?? '', lead.main_product_category ?? '']
    .join(' ')
    .split(/[,/;]+/)
    .map((term) => term.trim())
    .filter(Boolean);
  const matchedProduct =
    Boolean(icp.products.length) &&
    leadProductTerms.some((term) =>
      icp.products.some(
        (product) => normalize(term).includes(normalize(product)) || normalize(product).includes(normalize(term)),
      ),
    );
  if (matchedProduct) {
    score += 20;
    reasons.push('Product interest overlaps with your ICP product list.');
  }

  const matchedBuyerType = Boolean(icp.buyer_types.length) && overlaps([lead.lead_type ?? ''], icp.buyer_types);
  if (matchedBuyerType) {
    score += 15;
    reasons.push('Buyer type matches a target buyer type in your ICP.');
  }

  if (!matchedCountry && icp.target_countries.length) {
    reasons.push('Outside your configured target countries.');
  }
  if (!matchedProduct && icp.products.length) {
    reasons.push('No clear overlap with your configured product list yet.');
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    matchedCountry,
    matchedProduct,
    matchedBuyerType,
    reasons,
  };
}