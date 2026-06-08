import { TRIAL_TEMPLATE_KEYS, type TrialTemplateKey } from '@/lib/trial/capability';

export type TrialSeedProduct = {
  name: string;
  sku: string;
  description: string;
  packSize: string;
  family: string;
  pricingType: 'unit' | 'dimensional';
  exwPrice: number;
  fobPrice: number;
  currency: 'USD';
};

export type TrialTemplateConfig = {
  key: TrialTemplateKey;
  label: string;
  audience: string;
  summary: string;
  workflowSteps: string[];
  sampleProducts: TrialSeedProduct[];
  pricingScenario: {
    title: string;
    description: string;
    formulaLabel: string;
  };
};

const BASE_WORKFLOW = [
  'Capture up to 2 leads',
  'Create 1 quote',
  'Convert to 1 order',
  'Dispatch the order',
] as const;

export const TRIAL_TEMPLATE_CONFIGS: Record<TrialTemplateKey, TrialTemplateConfig> = {
  export_foods_basic: {
    key: 'export_foods_basic',
    label: 'Export foods basic',
    audience: 'Food exporters validating lead-to-dispatch',
    summary: 'Safe guided workspace for packaged food export demos with controlled limits.',
    workflowSteps: [...BASE_WORKFLOW],
    sampleProducts: [
      { name: 'Vacuum-Cooked Sweet Potato Chips', sku: 'TRIAL-FOOD-SWTPOT-60G', description: 'Representative snack SKU for export quote walkthroughs.', packSize: '60g pouch x 24', family: 'vacuum_cooked_chips', pricingType: 'unit', exwPrice: 0.82, fobPrice: 1.08, currency: 'USD' },
      { name: 'Spray-Dried Mango Powder', sku: 'TRIAL-FOOD-MANGO-PWD', description: 'Representative ingredient SKU for distributor quote testing.', packSize: '10kg carton', family: 'fruit_powders', pricingType: 'unit', exwPrice: 38, fobPrice: 44, currency: 'USD' },
    ],
    pricingScenario: { title: 'Simple export margin', description: 'Use EXW and FOB fields to test distributor margin and quote value.', formulaLabel: 'FOB = EXW + inland + handling + export margin' },
  },
  ingredient_trader: {
    key: 'ingredient_trader',
    label: 'Ingredient trader',
    audience: 'Ingredient brokers and traders',
    summary: 'Compact trial setup for ingredient sourcing, quote comparison, and controlled handoff.',
    workflowSteps: [...BASE_WORKFLOW],
    sampleProducts: [
      { name: 'Dehydrated Red Onion Flakes', sku: 'TRIAL-ING-ONION-FLK', description: 'Ingredient sample for B2B trading quote flows.', packSize: '20kg carton', family: 'dehydrated_onion', pricingType: 'unit', exwPrice: 28, fobPrice: 33, currency: 'USD' },
      { name: 'Dehydrated Garlic Granules', sku: 'TRIAL-ING-GARLIC-GRN', description: 'Ingredient sample for multi-product quote walkthroughs.', packSize: '25kg bag', family: 'dehydrated_garlic', pricingType: 'unit', exwPrice: 46, fobPrice: 54, currency: 'USD' },
    ],
    pricingScenario: { title: 'Trader quote spread', description: 'Use supplier cost, FOB price, and trader margin to test quote economics.', formulaLabel: 'Trader price = supplier cost + logistics + margin' },
  },
  distributor_importer: {
    key: 'distributor_importer',
    label: 'Distributor / importer',
    audience: 'Importers and distributors testing landed pricing',
    summary: 'Trial data for distributor pricing, landed cost review, and first order simulation.',
    workflowSteps: [...BASE_WORKFLOW],
    sampleProducts: [
      { name: 'Kabuli Chana Crunch Snack', sku: 'TRIAL-DIST-CHANA-80G', description: 'Retail-ready sample SKU for distributor pricing review.', packSize: '80g pouch x 30', family: 'snacks', pricingType: 'unit', exwPrice: 0.64, fobPrice: 0.91, currency: 'USD' },
      { name: 'Palm Jaggery Cubes', sku: 'TRIAL-DIST-PALM-JAG', description: 'Natural sweetener SKU for import/distribution walkthroughs.', packSize: '500g pack x 20', family: 'natural_sweeteners', pricingType: 'unit', exwPrice: 1.22, fobPrice: 1.56, currency: 'USD' },
    ],
    pricingScenario: { title: 'Distributor landed margin', description: 'Use FOB, duty, destination charges, distributor margin, and retail margin.', formulaLabel: 'Retail = landed cost + distributor margin + retail margin' },
  },
  packaging_converter: {
    key: 'packaging_converter',
    label: 'Packaging converter',
    audience: 'Stark Packmate and packaging clients',
    summary: 'Stark Packmate-ready catalog and dimensional pricing trial for cartons, mailers, and custom packaging.',
    workflowSteps: ['Capture packaging buyer lead', 'Select dimensional packaging SKU', 'Calculate price from size, material, and quantity', 'Quote and convert to first order'],
    sampleProducts: [
      { name: 'Custom Corrugated Mailer Box', sku: 'PACKMATE-MAILER-CORR', description: 'Dimensional pricing sample for Stark Packmate carton quotes.', packSize: 'Custom L x W x H', family: 'corrugated_mailer', pricingType: 'dimensional', exwPrice: 0.42, fobPrice: 0.58, currency: 'USD' },
      { name: 'Retail Folding Carton', sku: 'PACKMATE-FOLD-CARTON', description: 'Paperboard carton sample for quantity-break quote testing.', packSize: 'Custom die-cut', family: 'folding_carton', pricingType: 'dimensional', exwPrice: 0.31, fobPrice: 0.45, currency: 'USD' },
      { name: 'E-commerce Shipping Carton', sku: 'PACKMATE-SHIP-CARTON', description: 'Shipping carton sample for dimensional price rules.', packSize: 'Custom fluted board', family: 'shipping_carton', pricingType: 'dimensional', exwPrice: 0.76, fobPrice: 0.98, currency: 'USD' },
    ],
    pricingScenario: { title: 'Stark Packmate dimensional pricing', description: 'Estimate packaging price from surface area, material factor, and quantity break.', formulaLabel: 'Unit price = base + surface-area factor + material factor - quantity break' },
  },
};

export function getTrialTemplateConfig(key: string | null | undefined) {
  const normalized = TRIAL_TEMPLATE_KEYS.includes(key as TrialTemplateKey) ? (key as TrialTemplateKey) : 'export_foods_basic';
  return TRIAL_TEMPLATE_CONFIGS[normalized];
}

export function resolveTrialTemplateKeyForRequest(input: { requestedPlan?: string | null; isTrialRequest?: boolean | null; pricingNotes?: string | null; productNotes?: string | null; companyName?: string | null }): TrialTemplateKey {
  const haystack = [input.requestedPlan, input.pricingNotes, input.productNotes, input.companyName].map((value) => String(value ?? '').toLowerCase()).join(' ');
  if (haystack.includes('packmate') || haystack.includes('packaging') || haystack.includes('carton') || haystack.includes('corrugated')) return 'packaging_converter';
  if (haystack.includes('ingredient') || haystack.includes('onion') || haystack.includes('garlic')) return 'ingredient_trader';
  if (haystack.includes('distributor') || haystack.includes('importer') || haystack.includes('landed')) return 'distributor_importer';
  return 'export_foods_basic';
}

export function calculatePackmateDimensionalPrice(input: { widthIn: number; heightIn: number; depthIn: number; quantity: number; material: 'corrugated' | 'paperboard' | 'kraft' }) {
  const width = Math.max(input.widthIn, 0);
  const height = Math.max(input.heightIn, 0);
  const depth = Math.max(input.depthIn, 0);
  const quantity = Math.max(Math.floor(input.quantity), 1);
  const surfaceArea = 2 * ((width * height) + (width * depth) + (height * depth));
  const materialFactor = input.material === 'corrugated' ? 0.018 : input.material === 'paperboard' ? 0.014 : 0.012;
  const quantityBreak = quantity >= 5000 ? 0.18 : quantity >= 1000 ? 0.1 : quantity >= 250 ? 0.04 : 0;
  const unitPrice = Math.max(0.18, 0.22 + surfaceArea * materialFactor - quantityBreak);
  const roundedUnitPrice = Math.round(unitPrice * 100) / 100;
  return { surfaceArea, unitPrice: roundedUnitPrice, extendedPrice: Math.round(roundedUnitPrice * quantity * 100) / 100, quantity, material: input.material };
}
