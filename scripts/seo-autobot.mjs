#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const siteUrl = process.env.SEO_SITE_URL || 'https://www.setuflowcrm.com';
const runDate = new Date().toISOString();
const reportDir = path.join(process.cwd(), 'docs', 'seo');
const reportPath = path.join(reportDir, 'SEO_BOT_REPORT.md');
const dataPath = path.join(reportDir, 'seo-bot-data.json');

const competitors = [
  { name: 'HubSpot CRM', url: 'https://www.hubspot.com/products/crm', category: 'generic CRM' },
  { name: 'Zoho CRM', url: 'https://www.zoho.com/crm/', category: 'generic CRM' },
  { name: 'Pipedrive', url: 'https://www.pipedrive.com/', category: 'sales pipeline CRM' },
  { name: 'Freshsales', url: 'https://www.freshworks.com/crm/sales/', category: 'sales CRM' },
  { name: 'CargoWise', url: 'https://www.cargowise.com/', category: 'logistics execution' },
  { name: 'SAP Global Trade Services', url: 'https://www.sap.com/products/financial-management/global-trade-services.html', category: 'global trade management' },
];

const keywordClusters = [
  {
    cluster: 'Import export CRM',
    priority: 'high',
    keywords: ['import export CRM', 'CRM for import export business', 'CRM for exporters', 'CRM for importers', 'EXIM CRM software'],
    targetPage: '/solutions/import-export-crm',
  },
  {
    cluster: 'Export management software',
    priority: 'high',
    keywords: ['export management software', 'export sales CRM', 'software for exporters', 'export software for small business'],
    targetPage: '/solutions/export-management-software',
  },
  {
    cluster: 'Trade show lead capture',
    priority: 'high',
    keywords: ['trade show lead capture app', 'business card scanner CRM', 'trade fair lead management', 'lead capture for exporters'],
    targetPage: '/features/trade-show-lead-capture',
  },
  {
    cluster: 'Export quote workflow',
    priority: 'high',
    keywords: ['export quote software', 'FOB CIF quote software', 'quotation software for exporters', 'quote approval workflow CRM'],
    targetPage: '/features/export-quote-management',
  },
  {
    cluster: 'CRM alternatives for exporters',
    priority: 'medium',
    keywords: ['HubSpot alternative for exporters', 'Zoho CRM for export business', 'Pipedrive alternative for import export', 'best CRM for exporters'],
    targetPage: '/compare/crm-for-exporters',
  },
];

function stripHtml(value) {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const patterns = [
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+name=["']${escaped}["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${escaped}["'][^>]*>`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return '';
}

function analyzeHtml(url, html) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || '';
  const description = findMeta(html, 'description');
  const ogTitle = findMeta(html, 'og:title');
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["'][^>]*>/i)?.[1] || '';
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => stripHtml(m[1])).filter(Boolean);
  const jsonLdCount = [...html.matchAll(/application\/ld\+json/gi)].length;
  const text = stripHtml(html).toLowerCase();
  const clusterCoverage = keywordClusters.map((cluster) => ({
    cluster: cluster.cluster,
    hits: cluster.keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length,
    keywordCount: cluster.keywords.length,
  }));
  return { url, title, description, ogTitle, canonical, h1s, jsonLdCount, clusterCoverage, text };
}

async function fetchHtml(url) {
  const response = await fetch(url, { headers: { 'user-agent': 'SETU Flow SEO Bot (+https://www.setuflowcrm.com)' } });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.text();
}

function normalizeUrl(value) {
  return String(value || '').replace(/\/$/, '');
}

function auditTargetPage(cluster, analysis) {
  const matchedKeywords = cluster.keywords.filter((keyword) => analysis.text.includes(keyword.toLowerCase()));
  const expectedCanonical = new URL(cluster.targetPage, siteUrl).toString();
  const canonicalOk = normalizeUrl(analysis.canonical) === normalizeUrl(expectedCanonical);
  const issues = [];
  if (!analysis.title) issues.push('missing title');
  if (!analysis.description) issues.push('missing description');
  if (analysis.h1s.length !== 1) issues.push(`H1 count ${analysis.h1s.length}`);
  if (!canonicalOk) issues.push('canonical mismatch');
  if (matchedKeywords.length === 0) issues.push('no direct target phrase coverage');
  return {
    cluster: cluster.cluster,
    targetPage: cluster.targetPage,
    url: analysis.url,
    hits: matchedKeywords.length,
    keywordCount: cluster.keywords.length,
    matchedKeywords,
    canonical: analysis.canonical,
    canonicalOk,
    h1Count: analysis.h1s.length,
    jsonLdCount: analysis.jsonLdCount,
    issues,
  };
}

function recommendationList(siteAnalysis, targetPageAnalyses) {
  const recommendations = [];
  if (!siteAnalysis.title || siteAnalysis.title.length < 35 || siteAnalysis.title.length > 65) {
    recommendations.push('Review home page title length and keep a clear trade CRM / import-export value phrase near the front.');
  }
  if (!siteAnalysis.description || siteAnalysis.description.length < 120 || siteAnalysis.description.length > 170) {
    recommendations.push('Review the home page meta description length and keep import-export CRM, quotes, orders, and execution language clear.');
  }
  if (!siteAnalysis.canonical) recommendations.push('Add or verify canonical link coverage for the public home page.');
  if (siteAnalysis.h1s.length !== 1) recommendations.push(`Home page should have exactly one clear H1. Current detected H1 count: ${siteAnalysis.h1s.length}.`);
  if (siteAnalysis.jsonLdCount < 1) recommendations.push('Add JSON-LD structured data for Organization and SoftwareApplication.');

  for (const audit of targetPageAnalyses) {
    if (!audit.canonicalOk) recommendations.push(`Fix the self-referencing canonical on ${audit.targetPage}.`);
    if (audit.h1Count !== 1) recommendations.push(`Review H1 structure on ${audit.targetPage}.`);
    if (audit.hits === 0) recommendations.push(`Strengthen ${audit.targetPage} with natural language for its target cluster: ${audit.cluster}.`);
    if (audit.jsonLdCount === 0) recommendations.push(`Consider relevant structured data on ${audit.targetPage}.`);
  }
  recommendations.push('Add internal links from high-authority marketing pages to target SEO landing pages where they genuinely help the reader.');
  recommendations.push('Use Search Console non-brand queries and landing-page impressions to decide the next SEO PR instead of creating pages from keyword guesses alone.');
  return [...new Set(recommendations)];
}

function buildReport({ siteAnalysis, targetPageAnalyses, competitorAnalyses, recommendations }) {
  const competitorRows = competitorAnalyses.map((item) => `| ${item.name} | ${item.category} | ${item.analysis?.title || 'Fetch failed'} | ${item.analysis?.description || item.error || 'No description'} |`).join('\n');
  const clusterRows = keywordClusters.map((cluster) => `| ${cluster.cluster} | ${cluster.priority} | ${cluster.targetPage} | ${cluster.keywords.join(', ')} |`).join('\n');
  const homeCoverageRows = siteAnalysis.clusterCoverage.map((cluster) => `| ${cluster.cluster} | ${cluster.hits}/${cluster.keywordCount} |`).join('\n');
  const targetRows = targetPageAnalyses.map((audit) => `| ${audit.cluster} | ${audit.targetPage} | ${audit.hits}/${audit.keywordCount} | ${audit.canonicalOk ? 'OK' : 'Mismatch'} | ${audit.issues.length ? audit.issues.join('; ') : 'Healthy'} |`).join('\n');
  const recLines = recommendations.map((rec) => `- ${rec}`).join('\n');

  return `# SEO Bot Report\n\n_Last generated: ${runDate}_\n\n## Site analyzed\n\n- URL: ${siteAnalysis.url}\n- Title: ${siteAnalysis.title || 'Missing'}\n- Description: ${siteAnalysis.description || 'Missing'}\n- Canonical: ${siteAnalysis.canonical || 'Missing'}\n- H1 count: ${siteAnalysis.h1s.length}\n- JSON-LD blocks: ${siteAnalysis.jsonLdCount}\n\n## Homepage positioning context\n\nThis is a homepage content signal only, not a Google ranking score.\n\n| Cluster | Direct keyword hits |\n| --- | --- |\n${homeCoverageRows}\n\n## Target landing-page audit\n\n| Cluster | Target page | Phrase coverage | Canonical | Audit |\n| --- | --- | --- | --- | --- |\n${targetRows}\n\n## Competitor snapshot\n\n| Competitor | Category | Detected title | Detected description / status |\n| --- | --- | --- | --- |\n${competitorRows}\n\n## Tracked keyword clusters\n\n| Cluster | Priority | Recommended target page | Example keywords |\n| --- | --- | --- | --- |\n${clusterRows}\n\n## Recommendations for next PRs\n\n${recLines}\n\n## Bot policy\n\nThis bot must open reviewable pull requests. It should not silently publish AI-written claims, competitor comparisons, pricing statements, or search-volume claims without human review.\n`;
}

async function main() {
  await fs.mkdir(reportDir, { recursive: true });
  const siteHtml = await fetchHtml(siteUrl);
  const siteAnalysisRaw = analyzeHtml(siteUrl, siteHtml);
  const { text: _homeText, ...siteAnalysis } = siteAnalysisRaw;

  const targetPageAnalyses = [];
  for (const cluster of keywordClusters) {
    const url = new URL(cluster.targetPage, siteUrl).toString();
    try {
      const html = await fetchHtml(url);
      const analysis = analyzeHtml(url, html);
      targetPageAnalyses.push(auditTargetPage(cluster, analysis));
    } catch (error) {
      targetPageAnalyses.push({
        cluster: cluster.cluster,
        targetPage: cluster.targetPage,
        url,
        hits: 0,
        keywordCount: cluster.keywords.length,
        matchedKeywords: [],
        canonical: '',
        canonicalOk: false,
        h1Count: 0,
        jsonLdCount: 0,
        issues: [error instanceof Error ? error.message : String(error)],
      });
    }
  }

  const competitorAnalyses = [];
  for (const competitor of competitors) {
    try {
      const html = await fetchHtml(competitor.url);
      const raw = analyzeHtml(competitor.url, html);
      const { text: _text, ...analysis } = raw;
      competitorAnalyses.push({ ...competitor, analysis });
    } catch (error) {
      competitorAnalyses.push({ ...competitor, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const recommendations = recommendationList(siteAnalysis, targetPageAnalyses);
  const report = buildReport({ siteAnalysis, targetPageAnalyses, competitorAnalyses, recommendations });
  const data = { generatedAt: runDate, siteUrl, competitors, keywordClusters, siteAnalysis, targetPageAnalyses, competitorAnalyses, recommendations };

  await fs.writeFile(reportPath, report, 'utf8');
  await fs.writeFile(dataPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log(`SEO bot report written to ${reportPath}`);
  console.log(`SEO bot data written to ${dataPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
