'use client';

import { useEffect } from 'react';

const heroUsps = ['Lead Capture', 'Document Readiness', 'Risk Signal', 'Operator Control'];

const aggressiveMilestones = [
  {
    period: 'Mo 1–3',
    phase: 'Launch — India + EU beachhead',
    gtm: 'India launch, first EU customers, export-council outreach, and 2 channel partners · 15 paying clients',
    product: 'ML data pipeline live; Setu Guru recommendation telemetry captured across lead, quote, document, and shipment events',
    value: 'Prove repeatable onboarding under 5 days with quantified lead-to-quote speed and no-lead-loss evidence',
  },
  {
    period: 'Mo 4–6',
    phase: 'Scale — repeatable acquisition engine',
    gtm: 'WhatsApp-first inbound, freight-forwarder channel, trade-show pipeline, and first EU references · 35 paying clients',
    product: 'Predictive lead scoring, quote-risk scoring, and margin-protection prompts live in production',
    value: 'Show measurable quote win-rate lift, margin protection, and partner-sourced pipeline conversion',
  },
  {
    period: 'Mo 7–9',
    phase: 'Expand — EU/GCC partner-led pipeline',
    gtm: 'Partner-led pipeline across EU and GCC, destination templates, and multi-language workflow support · 75 paying clients',
    product: 'Document intelligence beta, dispatch-risk prediction, and compliance readiness automation live for priority markets',
    value: 'Reduce document misses and shipment blockers while building country-specific workflow defensibility',
  },
  {
    period: 'Mo 10–12',
    phase: 'Seed-ready — category wedge',
    gtm: '120–150 paying clients, enterprise pilots, SEA/GCC expansion path, and seed-ready GTM engine',
    product: 'ERP integration foundations, model performance benchmarks, and investor-grade cohort reporting',
    value: '$1M ARR run-rate path with retention, expansion, and AI-assisted trade execution metrics ready for Seed',
  },
];

function renderHeroUsps() {
  const hero = document.querySelector('main > section:first-of-type');
  if (!hero) return;

  const leftCard = Array.from(hero.querySelectorAll('div')).find((node) =>
    node.textContent?.includes('Pre-Seed · $250K–$500K'),
  );
  if (!leftCard) return;

  const ctaRow = leftCard.querySelector('div:last-child');
  if (!ctaRow || ctaRow.getAttribute('data-investor-polished') === 'true') return;

  ctaRow.setAttribute('data-investor-polished', 'true');
  ctaRow.className = 'investor-hero-usp-row';
  ctaRow.innerHTML = heroUsps.map((label) => `<span>${label}</span>`).join('');
}

function renderAggressiveMilestones() {
  const round = document.querySelector('#round');
  if (!round) return;

  const heading = Array.from(round.querySelectorAll('h3')).find((node) =>
    node.textContent?.toLowerCase().includes('twelve-month milestones'),
  );
  const grid = heading?.nextElementSibling;
  if (!grid || grid.getAttribute('data-investor-polished') === 'true') return;

  const cards = Array.from(grid.children).slice(0, aggressiveMilestones.length);
  if (cards.length < aggressiveMilestones.length) return;

  grid.setAttribute('data-investor-polished', 'true');
  cards.forEach((card, index) => {
    const milestone = aggressiveMilestones[index];
    card.innerHTML = `
      <div class="flex items-baseline gap-3 mb-3">
        <span class="text-sm font-semibold text-[#85AB8B]">${milestone.period}</span>
        <span class="text-xs text-white/50">${milestone.phase}</span>
      </div>
      <div class="flex flex-col gap-2">
        <div class="flex gap-3">
          <span class="shrink-0 w-16 text-[11px] font-semibold uppercase tracking-wider text-white/40 pt-0.5">GTM</span>
          <span class="text-sm text-white/80 leading-relaxed">${milestone.gtm}</span>
        </div>
        <div class="flex gap-3">
          <span class="shrink-0 w-16 text-[11px] font-semibold uppercase tracking-wider text-white/40 pt-0.5">Product</span>
          <span class="text-sm text-white/80 leading-relaxed">${milestone.product}</span>
        </div>
        <div class="flex gap-3">
          <span class="shrink-0 w-16 text-[11px] font-semibold uppercase tracking-wider text-white/40 pt-0.5">Value</span>
          <span class="text-sm text-white/80 leading-relaxed">${milestone.value}</span>
        </div>
      </div>
    `;
  });
}

export default function InvestorPolishRuntime() {
  useEffect(() => {
    renderHeroUsps();
    renderAggressiveMilestones();

    const id = window.setTimeout(() => {
      renderHeroUsps();
      renderAggressiveMilestones();
    }, 250);

    return () => window.clearTimeout(id);
  }, []);

  return (
    <style>{`
      .investor-hero-usp-row {
        display: grid !important;
        grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
        gap: 0.55rem !important;
        width: 100% !important;
      }

      .investor-hero-usp-row > span {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        min-height: 1.95rem !important;
        border-radius: 999px !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        background: rgba(255, 255, 255, 0.085) !important;
        padding: 0.45rem 0.52rem !important;
        color: rgba(255, 255, 255, 0.92) !important;
        font-size: 0.62rem !important;
        font-weight: 750 !important;
        line-height: 1.05 !important;
        text-align: center !important;
        text-decoration: none !important;
        white-space: normal !important;
      }

      @media (max-width: 1024px) {
        .investor-hero-usp-row {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }
    `}</style>
  );
}
