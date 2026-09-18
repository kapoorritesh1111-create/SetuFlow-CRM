import type { ConstructionV5, SizeProfileV5 } from './types';

const APPROVED_SUP_PE_MICRONS_BY_SIZE_KEY: Record<string, number[]> = {
  '80x130_bg25_25':[60],
  '98x150_bg30_30':[60],
  '110x170_bg30_30':[75],
  '150x150_bg40_40':[75],
  '120x210_bg40_40':[75],
  '125x210_bg40_40':[75],
  '130x210_bg40_40':[75],
  '140x210_bg40_40':[75],
  '145x210_bg40_40':[75],
  '150x220_bg50_50':[75],
  '160x240_bg50_50':[75],
  '170x250_bg50_50':[95],
  '185x270_bg50_50':[95],
  '200x300_bg55_55':[95],
  '210x300_bg55_55':[95],
  '220x300_bg55_55':[95],
  '230x310_bg55_55':[95],
  '245x320_bg55_55':[95],
  '260x340_bg60_60':[95],
  '280x360_bg60_60':[120],
};

function micronList(value: unknown): number[] {
  if(!Array.isArray(value)) return [];
  return [...new Set(value.map(Number).filter((item)=>Number.isFinite(item)&&item>0).map((item)=>Math.round(item)))];
}

export function allowedPeMicronsForSupSizeV5(size: Pick<SizeProfileV5,'size_key'|'metadata'>): number[] {
  const configured=micronList(size.metadata?.allowed_pe_microns);
  if(configured.length) return configured;
  return [...(APPROVED_SUP_PE_MICRONS_BY_SIZE_KEY[String(size.size_key)]??[])];
}

export function constructionPeMicronV5(construction: Pick<ConstructionV5,'sealant_code'|'construction_key'|'name'|'metadata'>): number | null {
  const configured=Number(construction.metadata?.pe_micron ?? construction.metadata?.sealant_micron);
  if(Number.isFinite(configured)&&configured>0) return Math.round(configured);
  const source=[construction.sealant_code,construction.construction_key,construction.name].filter(Boolean).join(' ');
  const match=source.match(/(?:MAT[_\s/-]*)?PE[_\s/-]?(60|75|95|120)(?:\D|$)/i);
  return match?Number(match[1]):null;
}

export function constructionAllowedForSizeV5(
  size: Pick<SizeProfileV5,'size_key'|'metadata'>,
  construction: Pick<ConstructionV5,'sealant_code'|'construction_key'|'name'|'metadata'>,
): boolean {
  const allowed=allowedPeMicronsForSupSizeV5(size);
  const micron=constructionPeMicronV5(construction);
  return Boolean(allowed.length&&micron!=null&&allowed.includes(micron));
}

export function constructionCompatibilityErrorV5(
  size: Pick<SizeProfileV5,'size_key'|'name'|'metadata'>,
  construction: Pick<ConstructionV5,'sealant_code'|'construction_key'|'name'|'metadata'>,
): string {
  const allowed=allowedPeMicronsForSupSizeV5(size);
  const micron=constructionPeMicronV5(construction);
  const allowedText=allowed.length?allowed.map((item)=>`PE ${item}µ`).join(' / '):'no approved PE thickness';
  const actual=micron==null?'an unknown PE thickness':`PE ${micron}µ`;
  return `${construction.name} uses ${actual} and is not compatible with ${size.name}. Approved sealant for this size: ${allowedText}.`;
}
