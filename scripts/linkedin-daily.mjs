#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const siteUrl = process.env.SETU_MARKETING_SITE_URL || 'https://www.setuflowcrm.com';
const accessToken = process.env.LINKEDIN_ACCESS_TOKEN?.trim();
const authorUrn = process.env.LINKEDIN_AUTHOR_URN?.trim();
const apiVersion = process.env.LINKEDIN_API_VERSION?.trim() || '202604';
const dryRun = process.env.LINKEDIN_DRY_RUN === 'true';
const now = new Date();

const campaigns = [
  {
    theme: 'Import-export CRM',
    path: '/solutions/import-export-crm',
    commentary: `Most CRMs stop at the deal. Importers and exporters still have to manage quotations, approvals, documents, suppliers and shipment readiness somewhere else. Setu Flow connects that work in one trade execution CRM.\n\nSee how it works: ${siteUrl}/solutions/import-export-crm?utm_source=linkedin&utm_medium=organic&utm_campaign=daily_growth\n\n#ImportExport #CRM #TradeTechnology #Exporters`,
  },
  {
    theme: 'Export quote workflow',
    path: '/features/export-quote-management',
    commentary: `Export quotations are more than a price and a PDF. Incoterms, FX, approvals, product pricing and version control all affect whether a quote can actually be executed. Setu Flow keeps that commercial workflow connected to the customer and the order.\n\nExplore the workflow: ${siteUrl}/features/export-quote-management?utm_source=linkedin&utm_medium=organic&utm_campaign=daily_growth\n\n#ExportSales #Quotation #CRM #InternationalTrade`,
  },
  {
    theme: 'Trade show lead capture',
    path: '/features/trade-show-lead-capture',
    commentary: `A trade-show lead should not disappear into a spreadsheet after the event. Capture the contact on mobile, attribute it to the event, assign the follow-up and move it directly into the sales workflow.\n\nSee Setu Flow trade-show capture: ${siteUrl}/features/trade-show-lead-capture?utm_source=linkedin&utm_medium=organic&utm_campaign=daily_growth\n\n#TradeShow #LeadCapture #SalesCRM #ExportBusiness`,
  },
  {
    theme: 'Export management software',
    path: '/solutions/export-management-software',
    commentary: `Small and mid-sized exporters do not need another disconnected tool. They need one place to find opportunities, manage buyers and suppliers, build quotes, control documents and move orders toward dispatch. That is the problem Setu Flow is built to solve.\n\nLearn more: ${siteUrl}/solutions/export-management-software?utm_source=linkedin&utm_medium=organic&utm_campaign=daily_growth\n\n#ExportManagement #SME #TradeSoftware #B2B`,
  },
  {
    theme: 'CRM comparison',
    path: '/compare/crm-for-exporters',
    commentary: `HubSpot, Zoho and Pipedrive are strong general CRMs. Export teams often need something different after the opportunity is created: trade pricing, documents, approvals, suppliers and execution. Setu Flow is designed around that full operating journey.\n\nCompare the approaches: ${siteUrl}/compare/crm-for-exporters?utm_source=linkedin&utm_medium=organic&utm_campaign=daily_growth\n\n#CRM #Exporters #TradeExecution #SalesOperations`,
  },
  {
    theme: 'Setu Guru',
    path: '/setu-guru-ai',
    commentary: `AI is most useful in trade when it understands the work around the user. Setu Guru helps surface opportunities, prepare follow-ups and support execution while keeping the operator in control of what gets sent or changed.\n\nMeet Setu Guru: ${siteUrl}/setu-guru-ai?utm_source=linkedin&utm_medium=organic&utm_campaign=daily_growth\n\n#AI #CRM #InternationalTrade #SalesAutomation`,
  },
  {
    theme: 'Trade Execution OS',
    path: '/platform',
    commentary: `Find opportunities. Win buyers. Execute every order.\n\nSetu Flow connects Growth Intelligence, Trade CRM, Commercial Operations and Trade Execution so the same customer and order information does not have to be re-entered across different tools.\n\nExplore the platform: ${siteUrl}/platform?utm_source=linkedin&utm_medium=organic&utm_campaign=daily_growth\n\n#TradeExecution #CRM #ImportExport #SaaS`,
  },
];

function dayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const current = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor((current - start) / 86_400_000);
}

const campaign = campaigns[dayOfYear(now) % campaigns.length];
const reportDir = path.join(process.cwd(), 'docs', 'growth');
const reportPath = path.join(reportDir, 'linkedin-daily.json');

async function writeReport(payload) {
  await fs.mkdir(reportDir, { recursive: true });
  await fs.writeFile(reportPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function main() {
  const baseReport = {
    generatedAt: now.toISOString(),
    theme: campaign.theme,
    targetPath: campaign.path,
    commentary: campaign.commentary,
    apiVersion,
  };

  if (!accessToken || !authorUrn) {
    await writeReport({
      ...baseReport,
      status: 'not_configured',
      message: 'Add LINKEDIN_ACCESS_TOKEN and LINKEDIN_AUTHOR_URN as GitHub Actions secrets to enable publishing.',
    });
    console.log('LinkedIn publisher not configured; draft generated only.');
    return;
  }

  if (dryRun) {
    await writeReport({ ...baseReport, status: 'dry_run', authorUrn });
    console.log('LinkedIn dry run complete; no post was published.');
    return;
  }

  const response = await fetch('https://api.linkedin.com/rest/posts', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${accessToken}`,
      'content-type': 'application/json',
      'x-restli-protocol-version': '2.0.0',
      'linkedin-version': apiVersion,
    },
    body: JSON.stringify({
      author: authorUrn,
      commentary: campaign.commentary,
      visibility: 'PUBLIC',
      distribution: {
        feedDistribution: 'MAIN_FEED',
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: 'PUBLISHED',
      isReshareDisabledByAuthor: false,
    }),
  });

  const responseText = await response.text();
  const postId = response.headers.get('x-restli-id') || response.headers.get('x-linkedin-id') || null;

  if (!response.ok) {
    await writeReport({
      ...baseReport,
      status: 'error',
      httpStatus: response.status,
      response: responseText.slice(0, 2000),
    });
    throw new Error(`LinkedIn Posts API returned ${response.status}`);
  }

  await writeReport({
    ...baseReport,
    status: 'published',
    authorUrn,
    postId,
    httpStatus: response.status,
  });
  console.log(`LinkedIn post published${postId ? `: ${postId}` : ''}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
