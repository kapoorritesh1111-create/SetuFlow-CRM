export type SeoBotClusterCoverage = {
  cluster: string;
  hits: number;
  keywordCount: number;
};

export type SeoBotTargetPageAudit = {
  cluster: string;
  targetPage: string;
  url: string;
  hits: number;
  keywordCount: number;
  matchedKeywords: string[];
  canonical: string;
  canonicalOk: boolean;
  h1Count: number;
  jsonLdCount: number;
  issues: string[];
};

export type SeoBotData = {
  generatedAt: string;
  siteUrl: string;
  siteAnalysis: {
    title: string;
    description: string;
    canonical: string;
    h1s: string[];
    jsonLdCount: number;
    clusterCoverage: SeoBotClusterCoverage[];
  };
  targetPageAnalyses?: SeoBotTargetPageAudit[];
  recommendations: string[];
};

export type SeoBotStatus = {
  status: 'healthy' | 'stale' | 'unavailable';
  message: string;
  data: SeoBotData | null;
  ageHours: number | null;
};

const DEFAULT_STATUS_URL =
  'https://raw.githubusercontent.com/kapoorritesh1111-create/SetuFlow-CRM/seo/autobot-report/docs/seo/seo-bot-data.json';

export async function getSeoBotStatus(): Promise<SeoBotStatus> {
  const statusUrl = process.env.SEO_BOT_STATUS_URL?.trim() || DEFAULT_STATUS_URL;

  try {
    const response = await fetch(statusUrl, {
      headers: { 'user-agent': 'SETU Flow SMC SEO Status' },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return {
        status: 'unavailable',
        message: `SEO bot telemetry returned ${response.status}.`,
        data: null,
        ageHours: null,
      };
    }

    const data = (await response.json()) as SeoBotData;
    const generatedAt = new Date(data.generatedAt);
    const ageHours = Number.isFinite(generatedAt.getTime())
      ? Math.max(0, (Date.now() - generatedAt.getTime()) / 3_600_000)
      : null;

    if (ageHours === null) {
      return {
        status: 'unavailable',
        message: 'SEO bot telemetry did not include a valid generation timestamp.',
        data,
        ageHours: null,
      };
    }

    if (ageHours > 36) {
      return {
        status: 'stale',
        message: `Latest SEO bot run is ${Math.round(ageHours)} hours old.`,
        data,
        ageHours,
      };
    }

    return {
      status: 'healthy',
      message: `SEO bot checked the public site ${Math.max(1, Math.round(ageHours))} hour${Math.round(ageHours) === 1 ? '' : 's'} ago.`,
      data,
      ageHours,
    };
  } catch (error) {
    return {
      status: 'unavailable',
      message: error instanceof Error ? error.message : 'SEO bot telemetry could not be loaded.',
      data: null,
      ageHours: null,
    };
  }
}
