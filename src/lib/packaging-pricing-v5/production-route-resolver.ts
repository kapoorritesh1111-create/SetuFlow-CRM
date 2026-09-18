import type { BottomPrintModeV5, ProductionComponentV5, SizeProfileV5 } from './types';

function n(value: unknown): number { return typeof value === 'number' ? value : Number(value ?? 0); }

export type ResolvedProductionRouteV5 = {
  route_type: 'integrated' | 'separate' | 'conditional';
  effective_route: 'integrated' | 'split_gusset';
  components: Array<ProductionComponentV5 & { web_needed_mm: number }>;
  validation_errors: string[];
};

function component(params: {
  key: 'main_body' | 'bottom_gusset';
  description: string;
  openWebMm: number;
  widthMm: number;
  quantity: number;
  machineWidthMm: number;
  machineLengthMm: number;
  applyPouching: boolean;
  applyZipper: boolean;
  bandSource: 'self' | 'parent';
  applyMargin: boolean;
}) {
  const lanesAcross = params.openWebMm > 0 ? Math.floor(params.machineWidthMm / params.openWebMm) : 0;
  const repeatsAlong = params.widthMm > 0 ? Math.floor(params.machineLengthMm / params.widthMm) : 0;
  const unitsPerFrame = lanesAcross * repeatsAlong;
  const webRunMmPerFrame = params.widthMm * repeatsAlong;
  const framesExact = unitsPerFrame ? params.quantity / unitsPerFrame : 0;
  const runLengthM = framesExact * webRunMmPerFrame / 1000;
  return {
    key: params.key,
    description: params.description,
    web_width_mm: params.openWebMm,
    web_needed_mm: params.openWebMm * lanesAcross,
    web_run_mm_per_frame: webRunMmPerFrame,
    lanes_across: lanesAcross,
    repeats_along: repeatsAlong,
    units_per_frame: unitsPerFrame,
    frames_exact: framesExact,
    run_length_m: runLengthM,
    apply_printing: true,
    apply_lamination: true,
    apply_slitting: true,
    apply_pouching: params.applyPouching,
    apply_zipper: params.applyZipper,
    commercial_band_source: params.bandSource,
    apply_wastage: true,
    apply_margin: params.applyMargin,
  } as const;
}

export function resolveProductionRouteV5(
  size: SizeProfileV5,
  quantity: number,
  rules: Record<string, any>,
  bottomPrintMode?: BottomPrintModeV5,
): ResolvedProductionRouteV5 {
  const errors: string[] = [];
  const machineWidthMm = n(rules.machine_width_mm ?? 740);
  const machineLengthMm = n(rules.machine_length_mm ?? 1120);
  const sizeTrimMm = n(size.metadata?.trim_allowance_mm);
  const mainTrimMm = sizeTrimMm > 0 ? sizeTrimMm : n(rules.trim_allowance_mm ?? 20);
  const gussetTrimMm = n(rules.gusset_trim_allowance_mm ?? 3);

  let effective: 'integrated' | 'split_gusset' = 'integrated';
  if (size.gusset_production_mode === 'separate') effective = 'split_gusset';
  if (size.gusset_production_mode === 'conditional') {
    if (!bottomPrintMode) errors.push(`${size.name} requires a bottom-print selection before pricing.`);
    effective = bottomPrintMode === 'solid_unregistered' ? 'split_gusset' : 'integrated';
  }

  if (size.bottom_registration_mode === 'required_registered' && bottomPrintMode !== 'registered_artwork') {
    errors.push(`${size.name} requires registered bottom artwork.`);
  }
  if (size.bottom_registration_mode === 'required_unregistered' && bottomPrintMode !== 'solid_unregistered') {
    errors.push(`${size.name} requires an unregistered solid-color bottom.`);
  }

  if (effective === 'integrated') {
    const openWebMm = 2 * n(size.height_mm) + 2 * n(size.bottom_gusset_each_mm) + mainTrimMm;
    const main = component({
      key:'main_body',description:'Integrated SUP body + bottom gusset',openWebMm,widthMm:n(size.width_mm),quantity,
      machineWidthMm,machineLengthMm,applyPouching:true,applyZipper:true,bandSource:'self',applyMargin:true,
    });
    if (!main.units_per_frame) errors.push(`${size.name} does not fit the integrated ${machineWidthMm} × ${machineLengthMm} mm production profile.`);
    return { route_type:size.gusset_production_mode,effective_route:effective,components:[main],validation_errors:errors };
  }

  const mainOpenWebMm = 2 * n(size.height_mm) + mainTrimMm;
  const gussetOpenWebMm = 2 * n(size.bottom_gusset_each_mm) + gussetTrimMm;
  const main = component({
    key:'main_body',description:'SUP main body without bottom gusset',openWebMm:mainOpenWebMm,widthMm:n(size.width_mm),quantity,
    machineWidthMm,machineLengthMm,applyPouching:true,applyZipper:true,bandSource:'self',applyMargin:true,
  });
  const gusset = component({
    key:'bottom_gusset',description:'Separate bottom gusset web',openWebMm:gussetOpenWebMm,widthMm:n(size.width_mm),quantity,
    machineWidthMm,machineLengthMm,applyPouching:false,applyZipper:false,bandSource:'parent',applyMargin:false,
  });
  if (!main.units_per_frame) errors.push(`${size.name} main body does not fit the split-gusset production profile.`);
  if (!gusset.units_per_frame) errors.push(`${size.name} bottom gusset does not fit the split-gusset production profile.`);
  return { route_type:size.gusset_production_mode,effective_route:effective,components:[main,gusset],validation_errors:errors };
}
