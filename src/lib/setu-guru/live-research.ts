export type SetuGuruLiveResearchMode = 'hsn_enrichment' | 'document_requirements' | 'margin_benchmark';

type ResearchSourceSeed = {
  title: string;
  url: string;
  sourceType: 'official' | 'trade_reference' | 'market_reference' | 'internal_review';
  why: string;
};

export type SetuGuruResearchSource = ResearchSourceSeed & {
  id: string;
  citation: string;
};

export type SetuGuruLiveResearchInput = {
  question: string;
  route?: string;
  pageText?: string;
  mode: SetuGuruLiveResearchMode;
};

const RESEARCH_SOURCES: Record<SetuGuruLiveResearchMode, ResearchSourceSeed[]> = {
  hsn_enrichment: [
    {
      title: 'World Customs Organization HS Nomenclature',
      url: 'https://www.wcoomd.org/en/topics/nomenclature/instrument-and-tools/hs-nomenclature-2022-edition.aspx',
      sourceType: 'official',
      why: 'Use for HS chapter and heading structure before selecting a product code.',
    },
    {
      title: 'India ICEGATE customs portal',
      url: 'https://www.icegate.gov.in/',
      sourceType: 'official',
      why: 'Use for India-specific HSN/tariff validation when India is the origin or destination context.',
    },
    {
      title: 'US Harmonized Tariff Schedule',
      url: 'https://hts.usitc.gov/',
      sourceType: 'official',
      why: 'Use for US HTS candidates, notes, and duty references when the US is the destination context.',
    },
    {
      title: 'EU Access2Markets',
      url: 'https://trade.ec.europa.eu/access-to-markets/en/home',
      sourceType: 'official',
      why: 'Use for EU import requirements, tariffs, and product-specific market access checks.',
    },
  ],
  document_requirements: [
    {
      title: 'EU Access2Markets',
      url: 'https://trade.ec.europa.eu/access-to-markets/en/home',
      sourceType: 'official',
      why: 'Use for destination-specific EU import requirements, duties, and document guidance.',
    },
    {
      title: 'UK Trade Tariff',
      url: 'https://www.gov.uk/trade-tariff',
      sourceType: 'official',
      why: 'Use for UK commodity codes, duties, measures, and import document checks.',
    },
    {
      title: 'US Customs and Border Protection import guidance',
      url: 'https://www.cbp.gov/trade/basic-import-export',
      sourceType: 'official',
      why: 'Use for US import process, document, customs, and compliance review.',
    },
    {
      title: 'India ICEGATE customs portal',
      url: 'https://www.icegate.gov.in/',
      sourceType: 'official',
      why: 'Use for India customs references and import/export document checks.',
    },
  ],
  margin_benchmark: [
    {
      title: 'Trade.gov Country Commercial Guides',
      url: 'https://www.trade.gov/ccg-landing-page',
      sourceType: 'trade_reference',
      why: 'Use for market structure, channel, distribution, and commercial environment context.',
    },
    {
      title: 'International Trade Centre Trade Map',
      url: 'https://www.intracen.org/resources/tools/trade-map',
      sourceType: 'market_reference',
      why: 'Use for trade flow context before deciding whether a margin benchmark is reasonable.',
    },
    {
      title: 'World Bank Data',
      url: 'https://data.worldbank.org/',
      sourceType: 'market_reference',
      why: 'Use for macro market context that may affect landed-cost and channel assumptions.',
    },
    {
      title: 'SETU Flow pricing defaults and quote history',
      url: 'internal:setu-flow-pricing-defaults',
      sourceType: 'internal_review',
      why: 'Use internal organization defaults and prior quote context before saving any new margin assumption.',
    },
  ],
};

const MODE_LABELS: Record<SetuGuruLiveResearchMode, string> = {
  hsn_enrichment: 'HS/HSN enrichment',
  document_requirements: 'document requirements and duties/tariffs',
  margin_benchmark: 'margin benchmark research',
};

function compactText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function getResearchSubject(question: string, pageText = '') {
  const combined = compactText(`${question} ${pageText.slice(0, 500)}`);
  const cleaned = combined
    .replace(/\b(what|which|how|many|do|does|should|need|needed|please|find|research|source|sources|citation|citations|hsn|hs code|hs-code|tariff|tariffs|duty|duties|document|documents|requirement|requirements|margin|benchmark)\b/gi, ' ')
    .replace(/[^a-z0-9\s/-]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 140) || question.slice(0, 140) || 'current product, country, and route context';
}

function getResearchSteps(mode: SetuGuruLiveResearchMode) {
  if (mode === 'hsn_enrichment') {
    return [
      'Identify product composition, use case, form, packaging, and destination country.',
      'Compare candidate HS chapters/headings against official notes before choosing a code.',
      'Treat the suggested code as draft until a human reviews the official source and product facts.',
    ];
  }
  if (mode === 'document_requirements') {
    return [
      'Identify product, destination country, buyer/supplier role, and workflow stage: quote, order, or dispatch.',
      'Separate mandatory quote-send blockers from order/dispatch and advisory documents.',
      'Treat source-backed requirements as draft until a human reviews and updates organization policy.',
    ];
  }
  return [
    'Identify product category, buyer market, channel role, landed-cost assumptions, and quote currency.',
    'Compare internal pricing defaults with market/channel references before using an external benchmark.',
    'Keep the benchmark quote-only unless a human approves saving product/category/organization defaults.',
  ];
}

function hydrateSources(mode: SetuGuruLiveResearchMode): SetuGuruResearchSource[] {
  return RESEARCH_SOURCES[mode].map((source, index) => ({
    ...source,
    id: `S${index + 1}`,
    citation: `[S${index + 1}]`,
  }));
}

export function buildLiveResearchExecutionAnswer(input: SetuGuruLiveResearchInput) {
  const mode = input.mode;
  const label = MODE_LABELS[mode];
  const subject = getResearchSubject(input.question, input.pageText);
  const sources = hydrateSources(mode);
  const steps = getResearchSteps(mode);
  const sourceSummary = sources.map((source) => `${source.citation} ${source.title}`).join('; ');
  const answer = [
    `I prepared a source-backed draft research brief for ${label}.`,
    `Research scope: ${subject}.`,
    `Reviewable sources: ${sourceSummary}.`,
    `Recommended review path: ${steps.map((step, index) => `${index + 1}. ${step}`).join(' ')}`,
    'No CRM values were saved. Human approval is required before saving HS/HSN codes, document rules, duties/tariffs, margin defaults, compliance policies, quote sends, waivers, or write-backs.',
  ].join('\n\n');

  return {
    answer,
    confidence: 'medium',
    mode,
    researchStatus: 'source_backed_draft',
    requiresHumanApproval: true,
    subject,
    citations: sources,
    rows: sources.map((source) => ({
      id: source.id,
      name: source.title,
      type: source.sourceType,
      url: source.url,
      citation: source.citation,
      next: source.why,
    })),
    actions: ['Review sources', 'Ask live research follow-up', mode === 'margin_benchmark' ? 'Review pricing defaults' : 'Open compliance'],
  };
}
