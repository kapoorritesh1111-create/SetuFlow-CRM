import type {
  AllowedDimensionRanges,
  FinishAddonRate,
  LeadTimeRules,
  MaterialRate,
  MoqTiers,
  PackagingPricingMode,
  PackagingQuoteTimeInput,
  PrintRules,
  RushOption,
  SetupCharge,
} from './types';

/**
 * S24-SPEN-207 — Packaging seed definitions.
 *
 * Source of truth for the default service families and sample pricing
 * templates seeded into packaging-enabled organizations. Seeding is
 * idempotent (upsert on organization_id + slug) so re-running is always safe.
 */

export type PackagingFamilySeed = {
  slug: string;
  name: string;
  description: string;
  pricing_mode: PackagingPricingMode;
  quote_time_inputs: PackagingQuoteTimeInput[];
  default_unit: string;
  default_lead_time: string;
  sort_order: number;
};

export type PackagingTemplateSeed = {
  family_slug: string;
  slug: string;
  name: string;
  description: string;
  currency: string;
  allowed_dimension_ranges_json: AllowedDimensionRanges;
  material_rates_json: MaterialRate[];
  print_rules_json: PrintRules;
  finish_addon_rates_json: FinishAddonRate[];
  moq_tiers_json: MoqTiers;
  setup_charges_json: SetupCharge[];
  rush_options_json: RushOption[];
  lead_time_rules_json: LeadTimeRules;
  waste_factor_pct: number;
  adhesive_options_json?: { key: string; label: string }[];
  print_process?: 'digital' | 'flexo';
  flexo_rules_json?: {
    repeat_length_mm: { min: number; max: number };
    web_width_mm: { min: number; max: number };
    cylinder_rate_tiers: { max_repeat_mm: number; rate_per_color: number }[];
  } | null;
};

export const PACKAGING_FAMILY_SEEDS: PackagingFamilySeed[] = [
  { slug: 'digital-labels', name: 'Digital Labels', description: 'Premium labels in any shape and size with high-quality digital printing.', pricing_mode: 'dimensional', quote_time_inputs: [{ key: 'width_mm', label: 'Width' }, { key: 'height_mm', label: 'Height' }, { key: 'material', label: 'Material' }, { key: 'adhesive', label: 'Adhesive' }, { key: 'print_colors', label: 'Print colors' }, { key: 'finish', label: 'Finish' }, { key: 'quantity', label: 'Quantity' }, { key: 'designs', label: 'Designs' }, { key: 'artwork_status', label: 'Artwork status' }], default_unit: 'pcs', default_lead_time: '7-9 business days', sort_order: 1 },
  { slug: 'stand-up-pouches', name: 'Stand Up Pouches', description: 'High-barrier pouches with custom size and features.', pricing_mode: 'dimensional', quote_time_inputs: [{ key: 'width_mm', label: 'Width' }, { key: 'height_mm', label: 'Height' }, { key: 'gusset_mm', label: 'Gusset' }, { key: 'material', label: 'Material structure' }, { key: 'thickness', label: 'Thickness' }, { key: 'print_colors', label: 'Print colors' }, { key: 'finish', label: 'Finish' }, { key: 'addons', label: 'Add-ons' }, { key: 'quantity', label: 'Quantity' }, { key: 'designs', label: 'Designs' }, { key: 'artwork_status', label: 'Artwork status' }], default_unit: 'pcs', default_lead_time: '10-12 business days', sort_order: 2 },
  { slug: 'digital-shrink-sleeves', name: 'Digital Shrink Sleeves', description: '360° branding with full-color shrink sleeves.', pricing_mode: 'dimensional', quote_time_inputs: [{ key: 'width_mm', label: 'Lay-flat width' }, { key: 'height_mm', label: 'Cut length' }, { key: 'material', label: 'Film' }, { key: 'print_colors', label: 'Print colors' }, { key: 'finish', label: 'Finish' }, { key: 'quantity', label: 'Quantity' }, { key: 'designs', label: 'Designs' }, { key: 'artwork_status', label: 'Artwork status' }], default_unit: 'pcs', default_lead_time: '8-10 business days', sort_order: 3 },
  { slug: 'digital-flexible-packaging', name: 'Digital Flexible Packaging', description: 'Rollstock and flexible packs in any size.', pricing_mode: 'dimensional', quote_time_inputs: [{ key: 'width_mm', label: 'Web width' }, { key: 'height_mm', label: 'Repeat length' }, { key: 'material', label: 'Structure' }, { key: 'print_colors', label: 'Print colors' }, { key: 'finish', label: 'Finish' }, { key: 'quantity', label: 'Quantity' }, { key: 'designs', label: 'Designs' }, { key: 'artwork_status', label: 'Artwork status' }], default_unit: 'pcs', default_lead_time: '10-14 business days', sort_order: 4 },
  { slug: 'prototypes-mockups', name: 'Prototypes & Mockups', description: 'Concept to mockup with rapid turnaround.', pricing_mode: 'service', quote_time_inputs: [{ key: 'service_items', label: 'Service scope' }, { key: 'designs', label: 'Designs' }, { key: 'artwork_status', label: 'Artwork status' }], default_unit: 'job', default_lead_time: '3-5 business days', sort_order: 5 },
  { slug: 'variable-data-printing', name: 'Variable Data Printing', description: 'Personalized content, barcodes, and variable data.', pricing_mode: 'service', quote_time_inputs: [{ key: 'service_items', label: 'Data type' }, { key: 'quantity', label: 'Quantity' }, { key: 'designs', label: 'Designs' }, { key: 'artwork_status', label: 'Artwork status' }], default_unit: 'pcs', default_lead_time: '5-7 business days', sort_order: 6 },
  { slug: '3d-packshots', name: '3D Packshots', description: 'Photorealistic 3D renders for marketing & approvals.', pricing_mode: 'service', quote_time_inputs: [{ key: 'service_items', label: 'Render scope' }, { key: 'designs', label: 'Designs' }], default_unit: 'render', default_lead_time: '4-6 business days', sort_order: 7 },
  { slug: 'pre-press', name: 'Pre-Press', description: 'Artwork checks, color management & preflight.', pricing_mode: 'service', quote_time_inputs: [{ key: 'service_items', label: 'Pre-press scope' }, { key: 'designs', label: 'Designs' }, { key: 'artwork_status', label: 'Artwork status' }], default_unit: 'job', default_lead_time: '2-3 business days', sort_order: 8 },
  { slug: 'packaging-add-ons', name: 'Packaging Add-ons', description: 'Special finishes, functional features & enhancements.', pricing_mode: 'service', quote_time_inputs: [{ key: 'service_items', label: 'Add-on scope' }, { key: 'quantity', label: 'Quantity' }], default_unit: 'pcs', default_lead_time: 'varies', sort_order: 9 },
];

export const PACKAGING_TEMPLATE_SEEDS: PackagingTemplateSeed[] = [
  {
    family_slug: 'digital-labels',
    slug: 'dl-standard-matte-permanent',
    name: 'DL — Standard Matte Permanent',
    description: 'Standard digital labels on BOPP with permanent adhesive.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'label_single', width_mm: { min: 10, max: 500 }, height_mm: { min: 10, max: 700 } },
    material_rates_json: [
      { key: 'bopp_white_60', label: 'BOPP White', thickness: '60 micron', rate_per_sqm: 85 },
      { key: 'bopp_clear_50', label: 'BOPP Clear', thickness: '50 micron', rate_per_sqm: 80 },
    ],
    print_rules_json: { basis: 'color_multiplier', tiers: [{ max_colors: 1, multiplier: 1.0 }, { max_colors: 2, multiplier: 1.25 }, { max_colors: 3, multiplier: 1.45 }, { max_colors: 99, multiplier: 1.7 }] },
    finish_addon_rates_json: [
      { key: 'matte_lamination', label: 'Matte Lamination', basis: 'per_sqm', rate: 18 },
      { key: 'gloss_lamination', label: 'Gloss Lamination', basis: 'per_sqm', rate: 15 },
      { key: 'uv_varnish', label: 'UV Varnish (Spot)', basis: 'per_sqm', rate: 25 },
      { key: 'embossing', label: 'Embossing', basis: 'per_sqm', rate: 40 },
    ],
    moq_tiers_json: { moq: 500, tiers: [{ min_qty: 500, max_qty: 2499, multiplier: 1.0 }, { min_qty: 2500, max_qty: 9999, multiplier: 0.92 }, { min_qty: 10000, max_qty: null, multiplier: 0.82 }] },
    setup_charges_json: [
      { key: 'plate_setup', label: 'Plate / Cylinder Setup', amount: 1200, basis: 'per_job', required: true },
      { key: 'artwork_check', label: 'Artwork Check', amount: 300, basis: 'per_job', required: true },
      { key: 'digital_proof', label: 'Digital Proof', amount: 250, basis: 'per_job', required: false },
    ],
    rush_options_json: [{ key: 'rush', label: 'Rush (3-5 days)', uplift_pct: 15 }, { key: 'express', label: 'Express (1-2 days)', uplift_pct: 25 }],
    lead_time_rules_json: { standard: '7-9 business days', rush: '3-5 business days', express: '1-2 business days' },
    waste_factor_pct: 8,
    adhesive_options_json: [
      { key: 'permanent', label: 'Permanent' },
      { key: 'removable', label: 'Removable' },
      { key: 'freezer_grade', label: 'Freezer-grade' },
    ],
  },
  {
    family_slug: 'stand-up-pouches',
    slug: 'sup-pet-metpet-pe',
    name: 'SUP — PET / MET PET / PE Standard Pouch',
    description: 'High-barrier stand up pouch, PET / MET PET / PE laminate.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'pouch_gusset', width_mm: { min: 80, max: 300 }, height_mm: { min: 120, max: 400 }, gusset_mm: { min: 40, max: 120 } },
    material_rates_json: [
      { key: 'pet_metpet_pe', label: 'PET / MET PET / PE', thickness: '120 / 12 / 80 micron', rate_per_sqm: 95 },
      { key: 'pet_pe', label: 'PET / PE', thickness: '120 / 80 micron', rate_per_sqm: 80 },
    ],
    print_rules_json: { basis: 'color_multiplier', tiers: [{ max_colors: 1, multiplier: 1.0 }, { max_colors: 4, multiplier: 1.2 }, { max_colors: 6, multiplier: 1.35 }, { max_colors: 99, multiplier: 1.5 }] },
    finish_addon_rates_json: [
      { key: 'matte', label: 'Matte', basis: 'per_sqm', rate: 12 },
      { key: 'gloss', label: 'Gloss', basis: 'per_sqm', rate: 10 },
      { key: 'zipper', label: 'Zipper', basis: 'per_unit', rate: 0.6 },
      { key: 'tear_notch', label: 'Tear notch', basis: 'per_unit', rate: 0.05 },
      { key: 'valve', label: 'Valve', basis: 'per_unit', rate: 1.5 },
      { key: 'hang_hole', label: 'Hang hole', basis: 'per_unit', rate: 0.05 },
    ],
    moq_tiers_json: { moq: 1000, tiers: [{ min_qty: 1000, max_qty: 4999, multiplier: 1.0 }, { min_qty: 5000, max_qty: 9999, multiplier: 0.93 }, { min_qty: 10000, max_qty: null, multiplier: 0.85 }] },
    setup_charges_json: [
      { key: 'cylinder_prepress', label: 'Setup / Cylinder (pre-press)', amount: 2000, basis: 'per_job', required: true },
      { key: 'extra_design', label: 'Extra design change-over', amount: 750, basis: 'per_extra_design', required: false },
    ],
    rush_options_json: [{ key: 'rush', label: 'Rush (5-7 days)', uplift_pct: 15 }, { key: 'express', label: 'Express (3-4 days)', uplift_pct: 25 }],
    lead_time_rules_json: { standard: '10-12 business days', rush: '5-7 business days', express: '3-4 business days' },
    waste_factor_pct: 10,
  },
  {
    family_slug: 'stand-up-pouches',
    slug: 'sup-flexo-high-volume',
    name: 'SUP — Flexographic High-Volume',
    description: 'High-volume stand up pouch on flexo cylinders. Best for repeat runs above 50,000 units — cylinder cost is a one-time plate charge, reusable on reorders of the same spec.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'pouch_gusset', width_mm: { min: 100, max: 350 }, height_mm: { min: 150, max: 450 }, gusset_mm: { min: 40, max: 120 } },
    material_rates_json: [
      { key: 'pet_metpet_pe', label: 'PET / MET PET / PE', thickness: '120 / 12 / 80 micron', rate_per_sqm: 78 },
      { key: 'pet_pe', label: 'PET / PE', thickness: '120 / 80 micron', rate_per_sqm: 65 },
    ],
    print_rules_json: { basis: 'color_multiplier', tiers: [{ max_colors: 1, multiplier: 1.0 }, { max_colors: 4, multiplier: 1.15 }, { max_colors: 6, multiplier: 1.25 }, { max_colors: 99, multiplier: 1.4 }] },
    finish_addon_rates_json: [
      { key: 'matte', label: 'Matte', basis: 'per_sqm', rate: 10 },
      { key: 'gloss', label: 'Gloss', basis: 'per_sqm', rate: 8 },
      { key: 'zipper', label: 'Zipper', basis: 'per_unit', rate: 0.5 },
      { key: 'tear_notch', label: 'Tear notch', basis: 'per_unit', rate: 0.04 },
      { key: 'valve', label: 'Valve', basis: 'per_unit', rate: 1.3 },
      { key: 'hang_hole', label: 'Hang hole', basis: 'per_unit', rate: 0.04 },
    ],
    // Flexo economics: MOQ and tiers are volume-scaled for cylinder amortization —
    // very different from the digital template's 1,000-10,000 range.
    moq_tiers_json: { moq: 50000, tiers: [{ min_qty: 50000, max_qty: 149999, multiplier: 1.0 }, { min_qty: 150000, max_qty: 299999, multiplier: 0.88 }, { min_qty: 300000, max_qty: null, multiplier: 0.78 }] },
    setup_charges_json: [
      { key: 'extra_design', label: 'Extra design change-over', amount: 1500, basis: 'per_extra_design', required: false },
    ],
    rush_options_json: [{ key: 'rush', label: 'Rush (10-12 days)', uplift_pct: 12 }],
    lead_time_rules_json: { standard: '18-22 business days', rush: '10-12 business days' },
    waste_factor_pct: 6,
    print_process: 'flexo',
    flexo_rules_json: {
      repeat_length_mm: { min: 150, max: 600 },
      web_width_mm: { min: 300, max: 1400 },
      // Rate per color cylinder, tiered by repeat length — larger repeat = larger,
      // costlier cylinder. Reused automatically-detected-free on confirmed reorders
      // of the same spec (S27-STARK-B3).
      cylinder_rate_tiers: [
        { max_repeat_mm: 250, rate_per_color: 4500 },
        { max_repeat_mm: 400, rate_per_color: 6500 },
        { max_repeat_mm: 600, rate_per_color: 9000 },
      ],
    },
  },
  {
    family_slug: 'digital-shrink-sleeves',
    slug: 'sleeve-standard-pvc-petg',
    name: 'Shrink Sleeve — Standard PVC/PETG',
    description: '360° shrink sleeve on standard PVC or PETG film.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'label_single', width_mm: { min: 40, max: 320 }, height_mm: { min: 40, max: 300 } },
    material_rates_json: [
      { key: 'pvc_40', label: 'PVC Film', thickness: '40 micron', rate_per_sqm: 90 },
      { key: 'petg_45', label: 'PETG Film', thickness: '45 micron', rate_per_sqm: 110 },
    ],
    print_rules_json: { basis: 'color_multiplier', tiers: [{ max_colors: 1, multiplier: 1.0 }, { max_colors: 4, multiplier: 1.2 }, { max_colors: 8, multiplier: 1.4 }, { max_colors: 99, multiplier: 1.55 }] },
    finish_addon_rates_json: [
      { key: 'matte', label: 'Matte overprint varnish', basis: 'per_sqm', rate: 12 },
      { key: 'perforation', label: 'Perforation', basis: 'per_unit', rate: 0.02 },
    ],
    moq_tiers_json: { moq: 1000, tiers: [{ min_qty: 1000, max_qty: 4999, multiplier: 1.0 }, { min_qty: 5000, max_qty: 14999, multiplier: 0.92 }, { min_qty: 15000, max_qty: null, multiplier: 0.84 }] },
    setup_charges_json: [
      { key: 'seaming_setup', label: 'Seaming / Setup', amount: 1500, basis: 'per_job', required: true },
      { key: 'artwork_check', label: 'Artwork Check', amount: 300, basis: 'per_job', required: true },
    ],
    rush_options_json: [{ key: 'rush', label: 'Rush (4-6 days)', uplift_pct: 15 }],
    lead_time_rules_json: { standard: '8-10 business days', rush: '4-6 business days' },
    waste_factor_pct: 9,
  },
  {
    family_slug: 'pre-press',
    slug: 'prepress-artwork-check-proof',
    name: 'Pre-Press — Artwork Check & Proof',
    description: 'Artwork check, preflight, color management, and proof.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'service' },
    material_rates_json: [
      { key: 'artwork_check', label: 'Artwork Check & Preflight', basis: 'per_design', rate: 750 },
      { key: 'digital_proof', label: 'Digital Proof', basis: 'per_design', rate: 500 },
      { key: 'color_management', label: 'Color Management', basis: 'per_job', rate: 1200 },
    ],
    print_rules_json: { basis: 'none' },
    finish_addon_rates_json: [],
    moq_tiers_json: { moq: 1, tiers: [] },
    setup_charges_json: [],
    rush_options_json: [{ key: 'rush', label: 'Rush (same day)', uplift_pct: 30 }],
    lead_time_rules_json: { standard: '2-3 business days', rush: 'same day' },
    waste_factor_pct: 0,
  },
  {
    family_slug: 'variable-data-printing',
    slug: 'vdp-barcode-qr-serial',
    name: 'Variable Data — Barcode / QR / Serial Print',
    description: 'Per-piece variable data: barcodes, QR codes, serial numbers.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'service' },
    material_rates_json: [
      { key: 'vdp_per_piece', label: 'Variable data print', basis: 'per_unit', rate: 0.35 },
      { key: 'data_setup', label: 'Data file setup', basis: 'per_job', rate: 750 },
    ],
    print_rules_json: { basis: 'none' },
    finish_addon_rates_json: [],
    moq_tiers_json: { moq: 500, tiers: [{ min_qty: 500, max_qty: 9999, multiplier: 1.0 }, { min_qty: 10000, max_qty: null, multiplier: 0.9 }] },
    setup_charges_json: [],
    rush_options_json: [{ key: 'rush', label: 'Rush (2-3 days)', uplift_pct: 20 }],
    lead_time_rules_json: { standard: '5-7 business days', rush: '2-3 business days' },
    waste_factor_pct: 0,
  },
  {
    family_slug: 'digital-flexible-packaging',
    slug: 'dfp-rollstock-standard',
    name: 'DFP — Standard Rollstock',
    description: 'Digitally printed flexible rollstock for flow-wrap and pillow-pack applications.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'label_single', width_mm: { min: 80, max: 600 }, height_mm: { min: 80, max: 1000 } },
    material_rates_json: [
      { key: 'bopp_laminate', label: 'BOPP Laminate', thickness: '70 micron', rate_per_sqm: 70 },
      { key: 'pet_laminate', label: 'PET Laminate', thickness: '90 micron', rate_per_sqm: 85 },
    ],
    print_rules_json: { basis: 'color_multiplier', tiers: [{ max_colors: 1, multiplier: 1.0 }, { max_colors: 4, multiplier: 1.2 }, { max_colors: 8, multiplier: 1.4 }, { max_colors: 99, multiplier: 1.6 }] },
    finish_addon_rates_json: [
      { key: 'matte', label: 'Matte', basis: 'per_sqm', rate: 9 },
      { key: 'gloss', label: 'Gloss', basis: 'per_sqm', rate: 7 },
    ],
    moq_tiers_json: { moq: 2000, tiers: [{ min_qty: 2000, max_qty: 9999, multiplier: 1.0 }, { min_qty: 10000, max_qty: 49999, multiplier: 0.9 }, { min_qty: 50000, max_qty: null, multiplier: 0.8 }] },
    setup_charges_json: [{ key: 'cylinder_prepress', label: 'Setup / Cylinder (pre-press)', amount: 1800, basis: 'per_job', required: true }],
    rush_options_json: [{ key: 'rush', label: 'Rush (5-7 days)', uplift_pct: 15 }],
    lead_time_rules_json: { standard: '9-11 business days', rush: '5-7 business days' },
    waste_factor_pct: 9,
  },
  {
    family_slug: 'prototypes-mockups',
    slug: 'proto-concept-to-mockup',
    name: 'Prototypes — Concept to Mockup',
    description: 'Retail-ready functional mockups filled with actual product for launch review.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'service' },
    material_rates_json: [
      { key: 'concept_mockup', label: 'Concept mockup (per design)', basis: 'per_design', rate: 3500 },
      { key: 'retail_ready_sample', label: 'Retail-ready filled sample', basis: 'per_unit', rate: 450 },
      { key: 'rapid_turnaround', label: 'Rapid turnaround fee', basis: 'per_job', rate: 2000 },
    ],
    print_rules_json: { basis: 'none' },
    finish_addon_rates_json: [],
    moq_tiers_json: { moq: 1, tiers: [] },
    setup_charges_json: [],
    rush_options_json: [{ key: 'rush', label: 'Rush (2-3 days)', uplift_pct: 20 }],
    lead_time_rules_json: { standard: '5-7 business days', rush: '2-3 business days' },
    waste_factor_pct: 0,
  },
  {
    family_slug: '3d-packshots',
    slug: 'packshot-render-standard',
    name: '3D Packshots — Photorealistic Renders',
    description: 'Photorealistic 3D packshot renders for marketing, e-commerce, and approvals.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'service' },
    material_rates_json: [
      { key: 'single_render', label: 'Single packshot render', basis: 'per_design', rate: 2500 },
      { key: 'render_bundle_5', label: 'Bundle of 5 renders', basis: 'per_job', rate: 9500 },
      { key: 'turntable_animation', label: '360° turntable animation', basis: 'per_job', rate: 6000 },
    ],
    print_rules_json: { basis: 'none' },
    finish_addon_rates_json: [],
    moq_tiers_json: { moq: 1, tiers: [] },
    setup_charges_json: [],
    rush_options_json: [{ key: 'rush', label: 'Rush (24-48 hrs)', uplift_pct: 25 }],
    lead_time_rules_json: { standard: '3-5 business days', rush: '24-48 hours' },
    waste_factor_pct: 0,
  },
  {
    family_slug: 'packaging-add-ons',
    slug: 'addons-special-finishes',
    name: 'Packaging Add-ons — Special Finishes',
    description: 'Functional and decorative add-ons applied to any packaging line: spot UV, embossing, tear notches, and custom die-cuts.',
    currency: 'INR',
    allowed_dimension_ranges_json: { area_formula: 'service' },
    material_rates_json: [
      { key: 'spot_uv', label: 'Spot UV coating', basis: 'per_unit', rate: 0.8 },
      { key: 'embossing_addon', label: 'Embossing', basis: 'per_unit', rate: 1.2 },
      { key: 'custom_die_cut', label: 'Custom die-cut setup', basis: 'per_job', rate: 3500 },
    ],
    print_rules_json: { basis: 'none' },
    finish_addon_rates_json: [],
    moq_tiers_json: { moq: 500, tiers: [] },
    setup_charges_json: [],
    rush_options_json: [],
    lead_time_rules_json: { standard: '4-6 business days' },
    waste_factor_pct: 0,
  },
];
