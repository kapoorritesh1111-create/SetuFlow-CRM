import type { ConstructionLayerV5, ConstructionV5, CostMasterRateV5 } from './types';

export type ResolvedConstructionV5 = {
  construction: ConstructionV5;
  layers: Array<ConstructionLayerV5 & { master: CostMasterRateV5 }>;
  structure_label: string;
  validation_errors: string[];
};

function micronLabel(master: CostMasterRateV5) {
  return master.micron == null ? master.name : `${Number(master.micron)}µ ${master.name.replace(/^\d+\s*/,'')}`;
}

export function resolveConstructionV5(
  constructionId: string,
  constructions: ConstructionV5[],
  layers: ConstructionLayerV5[],
  masters: CostMasterRateV5[],
): ResolvedConstructionV5 | null {
  const construction = constructions.find((item) => item.id === constructionId);
  if (!construction) return null;

  const validation_errors: string[] = [];
  const resolvedLayers = layers
    .filter((item) => item.construction_id === constructionId)
    .sort((a, b) => a.layer_position - b.layer_position)
    .map((layer) => {
      const master = masters.find((item) => item.id === layer.cost_master_item_id);
      if (!master) {
        validation_errors.push(`Construction layer ${layer.layer_position} is not mapped to Cost Master.`);
        return null;
      }
      if (master.current_rate == null) validation_errors.push(`${master.name} needs a rate before this construction can be quoted.`);
      if (master.gsm == null && (master.micron == null || master.density == null)) {
        validation_errors.push(`${master.name} needs GSM or micron+density before this construction can be quoted.`);
      }
      return { ...layer, master };
    })
    .filter((item): item is ConstructionLayerV5 & { master: CostMasterRateV5 } => Boolean(item));

  if (resolvedLayers.length !== Number(construction.layer_count)) {
    validation_errors.push(`${construction.name} expects ${construction.layer_count} layers but ${resolvedLayers.length} are configured.`);
  }

  return {
    construction,
    layers: resolvedLayers,
    structure_label: resolvedLayers.map((item) => micronLabel(item.master)).join(' / '),
    validation_errors,
  };
}
