'use client';

import { useEffect, useMemo } from 'react';

type LeadRef = {
  id: string;
  trade_event_id?: string | null;
  owner_user_id?: string | null;
  stage_id?: string | null;
  country_id?: string | null;
};

type LinkedMarket = { lead_id: string; market_id: string };
type LinkedProduct = { lead_id: string; product_id: string };
type CountryRef = { id: string; market_id?: string | null };

type EventScope = {
  ownerIds: Set<string>;
  stageIds: Set<string>;
  countryIds: Set<string>;
  marketIds: Set<string>;
  productIds: Set<string>;
};

function optionText(option?: HTMLOptionElement | null) {
  return String(option?.textContent ?? '').toLowerCase();
}

function findSelectsByAllOption(label: string) {
  return Array.from(document.querySelectorAll('select')).filter((select) => optionText(select.options[0]).includes(label));
}

function clearUnsupportedValue(select: HTMLSelectElement, allowed: Set<string>) {
  if (!select.value || allowed.has(select.value)) return;
  select.value = '';
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function applyScopedOptions(label: string, allowed: Set<string>, active: boolean) {
  for (const select of findSelectsByAllOption(label)) {
    for (const option of Array.from(select.options)) {
      if (!option.value) {
        option.hidden = false;
        option.disabled = false;
        continue;
      }
      const supported = !active || allowed.has(option.value);
      option.hidden = !supported;
      option.disabled = !supported;
    }
    if (active) clearUnsupportedValue(select, allowed);
  }
}

export function LeadEventFilterNarrower({
  leads,
  leadMarkets,
  leadProductInterests,
  countries,
}: {
  leads: LeadRef[];
  leadMarkets: LinkedMarket[];
  leadProductInterests: LinkedProduct[];
  countries: CountryRef[];
}) {
  const scopeByEventId = useMemo(() => {
    const countryMarketMap = new Map(countries.map((country) => [country.id, country.market_id ?? '']));
    const marketsByLeadId = new Map<string, string[]>();
    const productsByLeadId = new Map<string, string[]>();

    for (const item of leadMarkets) {
      marketsByLeadId.set(item.lead_id, [...(marketsByLeadId.get(item.lead_id) ?? []), item.market_id]);
    }
    for (const item of leadProductInterests) {
      productsByLeadId.set(item.lead_id, [...(productsByLeadId.get(item.lead_id) ?? []), item.product_id]);
    }

    const next = new Map<string, EventScope>();
    for (const lead of leads) {
      const eventId = lead.trade_event_id ?? '';
      if (!eventId) continue;
      const scope = next.get(eventId) ?? {
        ownerIds: new Set<string>(),
        stageIds: new Set<string>(),
        countryIds: new Set<string>(),
        marketIds: new Set<string>(),
        productIds: new Set<string>(),
      };

      if (lead.owner_user_id) scope.ownerIds.add(lead.owner_user_id);
      if (lead.stage_id) scope.stageIds.add(lead.stage_id);
      if (lead.country_id) {
        scope.countryIds.add(lead.country_id);
        const countryMarketId = countryMarketMap.get(lead.country_id);
        if (countryMarketId) scope.marketIds.add(countryMarketId);
      }
      for (const marketId of marketsByLeadId.get(lead.id) ?? []) scope.marketIds.add(marketId);
      for (const productId of productsByLeadId.get(lead.id) ?? []) scope.productIds.add(productId);

      next.set(eventId, scope);
    }
    return next;
  }, [countries, leadMarkets, leadProductInterests, leads]);

  useEffect(() => {
    let frame = 0;

    function apply() {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const eventSelect = findSelectsByAllOption('all events')[0];
        const eventId = eventSelect?.value ?? '';
        const active = Boolean(eventId);
        const scope = scopeByEventId.get(eventId) ?? {
          ownerIds: new Set<string>(),
          stageIds: new Set<string>(),
          countryIds: new Set<string>(),
          marketIds: new Set<string>(),
          productIds: new Set<string>(),
        };

        applyScopedOptions('all owners', scope.ownerIds, active);
        applyScopedOptions('all stages', scope.stageIds, active);
        applyScopedOptions('all countries', scope.countryIds, active);
        applyScopedOptions('all markets', scope.marketIds, active);
        applyScopedOptions('all products', scope.productIds, active);
      });
    }

    const handleChange = () => apply();
    document.addEventListener('change', handleChange, true);
    const observer = new MutationObserver(apply);
    observer.observe(document.body, { childList: true, subtree: true });
    apply();

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('change', handleChange, true);
      observer.disconnect();
    };
  }, [scopeByEventId]);

  return null;
}

export default LeadEventFilterNarrower;
