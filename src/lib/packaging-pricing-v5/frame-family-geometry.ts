export type FrameFamilySupplyFormV5 =
  | 'center_seal_roll'
  | 'center_seal_pouch'
  | 'three_side_seal_roll'
  | 'three_side_seal_pouch';

export type FrameFamilyGeometryV5 = {
  supply_form: FrameFamilySupplyFormV5;
  entered_width_mm: number;
  entered_height_mm: number;
  machine_width_mm: number;
  machine_length_mm: number;
  open_laminate_width_mm: number;
  repeat_length_mm: number;
  across: number;
  along: number;
  units_per_frame: number;
  frame_web_area_m2: number;
  material_web_width_mm: number;
  material_run_mm_per_frame: number;
  apply_pouching: boolean;
  geometry_source: 'stark_v4_workbook_rule';
};

function n(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Pricing v5 migration geometry for Stark's existing Center Seal / 3SS workbook families.
 *
 * IMPORTANT:
 * - These rules intentionally preserve the v4 workbook orientation and do not rotate
 *   dimensions to improve yield.
 * - 3SS Pouch Form accepts FINISHED pouch width and height. Its open laminate
 *   width is (2 * finished height) + 12 mm, and repeat length is finished width.
 * - Center Seal Pouch accepts finished pouch width / height and calculates
 *   open laminate width = (2 * finished width) + 20 mm for the fin seal.
 * - Center Seal Roll and 3SS Roll retain the existing direct open-web inputs.
 * - The frame costing footprint remains the full machine web (740 x 1120) per frame.
 *   This is the migration basis only; owner review must confirm any family-specific
 *   trim/edge allowances before publication.
 */
export function resolveFrameFamilyGeometryV5(
  supplyForm: FrameFamilySupplyFormV5,
  widthMm: number,
  heightMm: number,
  machineWidthMm = 740,
  machineLengthMm = 1120,
): FrameFamilyGeometryV5 {
  const width = n(widthMm);
  const height = n(heightMm);
  const machineWidth = n(machineWidthMm) || 740;
  const machineLength = n(machineLengthMm) || 1120;

  // Finished-pouch geometry is specific to the two pouch forms.
  // Roll forms continue to receive production open width and repeat directly.
  const isThreeSideSealPouch = supplyForm === 'three_side_seal_pouch';
  const isCenterSealPouch = supplyForm === 'center_seal_pouch';
  const openLaminateWidth = isThreeSideSealPouch
    ? (2 * height) + 12
    : isCenterSealPouch ? (2 * width) + 20 : width;
  const repeatLength = isThreeSideSealPouch ? width : height;

  const across = width > 0 && height > 0 ? Math.floor(machineWidth / openLaminateWidth) : 0;
  const along = width > 0 && height > 0 ? Math.floor(machineLength / repeatLength) : 0;
  const unitsPerFrame = Math.max(0, across * along);

  return {
    supply_form: supplyForm,
    entered_width_mm: width,
    entered_height_mm: height,
    machine_width_mm: machineWidth,
    machine_length_mm: machineLength,
    open_laminate_width_mm: openLaminateWidth,
    repeat_length_mm: repeatLength,
    across,
    along,
    units_per_frame: unitsPerFrame,
    frame_web_area_m2: (machineWidth * machineLength) / 1_000_000,
    material_web_width_mm: machineWidth,
    material_run_mm_per_frame: machineLength,
    apply_pouching: supplyForm === 'center_seal_pouch' || supplyForm === 'three_side_seal_pouch',
    geometry_source: 'stark_v4_workbook_rule',
  };
}
