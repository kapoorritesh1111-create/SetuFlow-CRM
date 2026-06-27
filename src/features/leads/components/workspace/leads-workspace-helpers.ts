import type { KeyboardEvent } from "react";
import type { useRouter } from "next/navigation";
import type { LeadCommercialReadiness } from "@/lib/catalog-pricing-model";
import type { TodayLayerState } from "@/features/workspace/types";
import { AlertTriangle, BadgeCheck, CalendarCheck, Clock, Handshake, Package, Phone, Snowflake, Sparkles, Trophy, XCircle } from "@/features/leads/ui/lead-workspace-icons";
import type { IconComponent, LeadOpenStep, LeadRow, Profile, SignalTone, Variant } from "./leads-workspace-types";

const COUNTRY_CURRENCY: Record<string, string> = {
  unitedstates: 'USD', usa: 'USD', us: 'USD', canada: 'CAD', mexico: 'MXN',
  india: 'INR', unitedkingdom: 'GBP', uk: 'GBP', britain: 'GBP', england: 'GBP',
  germany: 'EUR', france: 'EUR', italy: 'EUR', spain: 'EUR', netherlands: 'EUR', belgium: 'EUR',
  japan: 'JPY', china: 'CNY', singapore: 'SGD', australia: 'AUD', newzealand: 'NZD',
  ua: 'UAH', ukraine: 'UAH', uae: 'AED', unitedarabemirates: 'AED', saudiarabia: 'SAR',
  qatar: 'QAR', kuwait: 'KWD', oman: 'OMR', bahrain: 'BHD', southafrica: 'ZAR',
};

export function countryCurrency(country?: string | null) {
  const key = String(country ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return COUNTRY_CURRENCY[key] ?? null;
}

const INCOTERM_HELP: Record<string, string> = {
  EXW: 'EXW: buyer collects from factory; quote price is factory gate only.',
  FOB: 'FOB/FCA: seller covers factory to port/carrier handoff; buyer handles main freight.',
  CFR: 'CFR: seller covers freight to destination port; buyer handles insurance and import.',
  CIF: 'CIF: seller covers freight and insurance to destination port.',
  DDP: 'DDP: seller covers delivery, duty, taxes, and local handoff to buyer.'
};

export const QUOTE_ADJUSTMENT_OPTIONS = [
  { value: 'none', label: 'No quote adjustment' },
  { value: 'discount_percent', label: 'Discount %' },
  { value: 'discount_amount', label: 'Discount amount' },
  { value: 'markup_percent', label: 'Markup %' },
  { value: 'markup_amount', label: 'Markup amount' },
] as const;

export function getIncotermHelp(value: string) {
  return INCOTERM_HELP[String(value || '').toUpperCase()] ?? 'Select the commercial handoff point before pricing the customer.';
}

export function quoteAdjustmentDeltaPercent(base: number | null | undefined, adjusted: number | null | undefined) {
  const baseline = Number(base ?? 0);
  const next = Number(adjusted ?? 0);
  if (!Number.isFinite(baseline) || baseline <= 0 || !Number.isFinite(next)) return 0;
  return ((next - baseline) / baseline) * 100;
}

export function applyQuoteAdjustment(base: number | null | undefined, type?: string | null, value?: number | null) {
  const starting = Number(base ?? 0);
  const amount = Number(value ?? 0);
  if (!Number.isFinite(starting) || starting < 0) return 0;
  if (!Number.isFinite(amount) || amount === 0 || !type || type === 'none') return starting;
  if (type === 'discount_percent') return Math.max(0, starting * (1 - amount / 100));
  if (type === 'markup_percent') return Math.max(0, starting * (1 + amount / 100));
  if (type === 'discount_amount') return Math.max(0, starting - amount);
  if (type === 'markup_amount') return Math.max(0, starting + amount);
  return starting;
}

export function uniqueCurrencyOptions(...values: Array<string | null | undefined>) {
  const defaults = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'JPY'];
  const seen = new Set<string>();
  return [...values, ...defaults]
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter((value) => value && !seen.has(value) && seen.add(value));
}

export function variantPricingUnit(variant?: Variant | null) {
  const mode = String(variant?.pricing_mode_default ?? '').trim().toLowerCase();
  if (mode === 'kg' || mode === 'bulk') return 'kg';
  if (mode === 'unit') return 'unit';
  return 'case';
}

export function variantPackSummary(variant?: Variant | null) {
  if (!variant) return 'Catalog basis';
  const packSize = variant.pack_size_value ? `${variant.pack_size_value} ${variant.pack_size_unit ?? ''}`.trim() : null;
  const units = variant.units_per_case ? `${variant.units_per_case} units/case` : null;
  return [packSize, units, variant.pack_label].filter(Boolean).join(' · ') || variant.name;
}

export function defaultQuoteQuantity(variant?: Variant | null) {
  const basis = variantPricingUnit(variant);
  if (basis === 'kg') return Number(variant?.moq_kg ?? 0) > 0 ? Number(variant?.moq_kg) : 1;
  if (basis === 'case') return Number(variant?.moq_cases ?? 0) > 0 ? Number(variant?.moq_cases) : 1;
  return 1;
}

export function getStageIcon(stageName?: string | null): IconComponent {
  const value = String(stageName ?? '').toLowerCase();
  if (value.includes('qual')) return BadgeCheck;
  if (value.includes('contact')) return Phone;
  if (value.includes('sample')) return Package;
  if (value.includes('negoti')) return Handshake;
  if (value.includes('won') || value.includes('close')) return Trophy;
  if (value.includes('lost')) return XCircle;
  return Sparkles;
}

export function getStageTone(stageName?: string | null) {
  const value = String(stageName ?? '').toLowerCase();
  if (value.includes('qual')) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (value.includes('contact')) return 'border-indigo-100 bg-indigo-50 text-indigo-700';
  if (value.includes('sample')) return 'border-amber-100 bg-amber-50 text-amber-700';
  if (value.includes('negoti')) return 'border-violet-100 bg-violet-50 text-violet-700';
  if (value.includes('won') || value.includes('close')) return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (value.includes('lost')) return 'border-rose-100 bg-rose-50 text-rose-700';
  return 'border-blue-100 bg-blue-50 text-blue-700';
}

export function getHealthTone(health: string): SignalTone {
  if (health.includes('at_risk')) return 'rose';
  if (health.includes('cold')) return 'slate';
  if (health.includes('due')) return 'amber';
  return 'emerald';
}

export function getHealthIcon(health: string): IconComponent {
  if (health.includes('at_risk')) return AlertTriangle;
  if (health.includes('cold')) return Snowflake;
  if (health.includes('due')) return Clock;
  return CalendarCheck;
}

export function formatPreviewAmount(value: number | null | undefined) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(amount);
}

export function getStableFollowUpVisualState(scheduledAt?: string | null, nowIso?: string | null) {
  if (!scheduledAt || !nowIso) return scheduledAt ? 'upcoming' : 'unscheduled';
  const target = new Date(scheduledAt);
  const now = new Date(nowIso);
  if (Number.isNaN(target.getTime()) || Number.isNaN(now.getTime())) return 'unscheduled';
  const start = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
  const targetDay = start(target);
  const today = start(now);
  if (targetDay < today) return 'overdue';
  if (targetDay === today) return 'today';
  return 'upcoming';
}

export function getReadinessTone(readiness: string): SignalTone {
  if (readiness === 'ready') return 'emerald';
  if (readiness === 'partial') return 'amber';
  return 'rose';
}

export function buildAiLeadBrief(lead: LeadRow, readiness: LeadCommercialReadiness | undefined, ownerLabel: string, followUpLabel: string) {
  if ((readiness?.blockerCount ?? 0) > 0) return `${lead.company_name} needs blocker recovery before moving deeper into the sales process. ${ownerLabel} should review ${followUpLabel.toLowerCase()}.`;
  if (lead.next_follow_up_at) return `${lead.company_name} is live in the queue with ${followUpLabel.toLowerCase()}. Keep the operator handoff calm and move toward ${lead.contact_name ?? 'the main contact'}.`;
  return `${lead.company_name} has no scheduled next touch. Add a follow-up so AI, pricing, and workflow stay aligned.`;
}
