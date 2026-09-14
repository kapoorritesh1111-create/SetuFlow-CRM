import { pricingSourceHash } from '@/lib/packaging-pricing/snapshot';
import type { PackagingPricingResultV5, PricingTemplateV5, SupPricingInputV5 } from './types';

function clone<T>(value:T):T{return JSON.parse(JSON.stringify(value)) as T;}
function record(value:unknown):Record<string,unknown>|null{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;}

export type PackagingPricingInputSnapshotV5={
  engine_version:5;
  family_id:string;
  family_name:string;
  template_id:string;
  template_name:string;
  template_version:5;
  calculation_engine_key:PricingTemplateV5['calculation_engine_key'];
  input:SupPricingInputV5;
  source_hash:string;
  kld:Record<string,unknown>|null;
};

export type PackagingPricingSnapshotV5={
  snapshot_version:1;
  input_snapshot:PackagingPricingInputSnapshotV5;
  pricing_result:PackagingPricingResultV5;
  snapshotted_at:string;
  snapshot_hash:string;
};

type SnapshotBody=Omit<PackagingPricingSnapshotV5,'snapshot_hash'>;

export function createPackagingPricingSnapshotV5(inputSnapshot:PackagingPricingInputSnapshotV5,pricingResult:PackagingPricingResultV5,snapshottedAt=new Date().toISOString()):PackagingPricingSnapshotV5{
  if(pricingResult.engine_version!==5||inputSnapshot.engine_version!==5) throw new Error('Only Packaging Pricing v5 results can be snapshotted by this helper.');
  if(!pricingResult.source_hash||pricingResult.source_hash!==inputSnapshot.source_hash) throw new Error('Packaging Pricing v5 source hash does not match the input snapshot.');
  const body:SnapshotBody={snapshot_version:1,input_snapshot:clone(inputSnapshot),pricing_result:clone(pricingResult),snapshotted_at:snapshottedAt};
  return {...body,snapshot_hash:pricingSourceHash(body)};
}

export function reproducePackagingPricingSnapshotV5(snapshot:unknown):PackagingPricingSnapshotV5{
  const source=record(snapshot);
  if(!source||source.snapshot_version!==1) throw new Error('Unsupported Packaging Pricing v5 snapshot version.');
  const input=record(source.input_snapshot); const result=record(source.pricing_result);
  if(!input||input.engine_version!==5||!result||result.engine_version!==5) throw new Error('Packaging Pricing v5 snapshot is invalid.');
  if(String(input.source_hash??'')!==String(result.source_hash??'')) throw new Error('Packaging Pricing v5 snapshot source hash is inconsistent.');
  const body:SnapshotBody={snapshot_version:1,input_snapshot:clone(source.input_snapshot) as PackagingPricingInputSnapshotV5,pricing_result:clone(source.pricing_result) as PackagingPricingResultV5,snapshotted_at:String(source.snapshotted_at??'')};
  if(!body.snapshotted_at||pricingSourceHash(body)!==String(source.snapshot_hash??'')) throw new Error('Packaging Pricing v5 snapshot integrity check failed.');
  return clone({...body,snapshot_hash:String(source.snapshot_hash)});
}
