'use client';

import { useEffect } from 'react';

export const MARKETING_ATTRIBUTION_KEY = 'setuflow-first-touch-v1';

const PRIVATE_PREFIXES = ['/admin', '/smc', '/api', '/dashboard', '/workspace', '/settings', '/auth', '/client-login'];
const SEARCH_HOSTS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'ecosia.', 'brave.'];
const SOCIAL_HOSTS = ['linkedin.', 'facebook.', 'instagram.', 'x.com', 'twitter.', 't.co', 'youtube.'];

function hostOf(value: string) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function classify(source: string, medium: string, referrer: string) {
  const sourceLower = source.toLowerCase();
  const mediumLower = medium.toLowerCase();
  const referrerHost = hostOf(referrer);
  if (/(cpc|ppc|paid|ads?)/.test(mediumLower) || ['googleads', 'google_ads', 'bingads'].includes(sourceLower)) return 'paid_search';
  if (mediumLower === 'organic' || SEARCH_HOSTS.some((host) => referrerHost.includes(host))) return 'organic_search';
  if (/(social|linkedin|facebook|instagram|twitter|youtube)/.test(`${sourceLower} ${mediumLower}`) || SOCIAL_HOSTS.some((host) => referrerHost.includes(host))) return 'social';
  if (referrerHost && !referrerHost.endsWith('setuflowcrm.com')) return 'referral';
  if (sourceLower || mediumLower) return 'campaign';
  return 'direct';
}

export function MarketingAttributionRecorder() {
  useEffect(() => {
    try {
      if (PRIVATE_PREFIXES.some((prefix) => window.location.pathname.startsWith(prefix))) return;
      const params = new URLSearchParams(window.location.search);
      const source = params.get('utm_source') || '';
      const medium = params.get('utm_medium') || '';
      const campaign = params.get('utm_campaign') || '';
      const content = params.get('utm_content') || '';
      const term = params.get('utm_term') || '';
      const gclid = params.get('gclid') || '';
      const referrer = document.referrer || '';
      const channel = classify(source || (gclid ? 'googleads' : ''), medium || (gclid ? 'cpc' : ''), referrer);
      const capturedAt = new Date().toISOString();
      const incoming = {
        capturedAt,
        channel,
        landingPage: `${window.location.pathname}${window.location.search}`,
        referrer,
        utmSource: source,
        utmMedium: medium,
        utmCampaign: campaign,
        utmContent: content,
        utmTerm: term,
        gclid,
      };

      const raw = window.localStorage.getItem(MARKETING_ATTRIBUTION_KEY);
      if (raw) {
        const existing = JSON.parse(raw) as { capturedAt?: string; channel?: string };
        const age = existing.capturedAt ? Date.now() - new Date(existing.capturedAt).getTime() : Number.POSITIVE_INFINITY;
        const stillFresh = Number.isFinite(age) && age < 30 * 24 * 60 * 60 * 1000;
        if (stillFresh && existing.channel && existing.channel !== 'direct') return;
        if (stillFresh && existing.channel === 'direct' && channel === 'direct') return;
      }

      window.localStorage.setItem(MARKETING_ATTRIBUTION_KEY, JSON.stringify(incoming));
    } catch {
      // Attribution must never block the marketing site.
    }
  }, []);

  return null;
}
