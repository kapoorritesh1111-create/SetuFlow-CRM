"use server";

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { PRODUCT_ROUTES } from '@/lib/product-contract';
import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { getReadOnlyWorkspaceMessage, hasWorkspaceCapability } from '@/lib/workspace/permissions';
import { enforceTrialAction } from '@/lib/trial/enforcement';
import { safeUserError, logServerError } from '@/lib/safe-error';
import { writeAuditLog } from '@/lib/auditLog';

type LeadQuoteDraftResult = {
  quote_id?: string;
  quote_version_id?: string;
  line_count?: number;
  created?: boolean;
};

function readFormText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim();
}

function parseRequestedQuantity(value: unknown) {
  const match=String(value??'').replace(/,/g,'').match(/\d+(?:\.\d+)?/);
  const parsed=match?Number(match[0]):1;
  return Number.isFinite(parsed)&&parsed>0?parsed:1;
}

function buildLeadQuoteDraftKey(input: { organizationId: string; leadId: string; forceNew: boolean }) {
  if (input.forceNew) {
    const nonce = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return `lead-quote-draft:${input.organizationId}:${input.leadId}:revision:${nonce}`;
  }

  return `lead-quote-draft:${input.organizationId}:${input.leadId}:initial`;
}

async function revalidateLeadQuotePaths(leadId: string) {
  revalidatePath(PRODUCT_ROUTES.app.dashboard);
  revalidatePath(PRODUCT_ROUTES.app.leads);
  revalidatePath(`${PRODUCT_ROUTES.app.leads}/${leadId}`);
  revalidatePath(`${PRODUCT_ROUTES.app.leads}/${leadId}/quote`);
  revalidatePath('/quotes');
}

export async function createLeadQuoteDraftFromLead(formData: FormData): Promise<void> {
  if (!hasSupabaseEnv) redirect('/leads?quoteDraftError=missing-env');

  const workspace = await getWorkspaceAccess();
  if (!workspace.user || !workspace.organization) redirect('/leads?quoteDraftError=auth');
  if (!hasWorkspaceCapability(workspace.currentRoles, 'lead.manage')) {
    const message = getReadOnlyWorkspaceMessage(workspace.currentRoles, 'lead.manage') ?? 'readonly';
    redirect(`/leads?quoteDraftError=${encodeURIComponent(message)}`);
  }

  const leadId = readFormText(formData, 'lead_id');
  const sourceQuoteId = readFormText(formData, 'source_quote_id') || null;
  const forceNew = readFormText(formData, 'force_new') === 'true';

  if (!leadId) redirect('/leads?quoteDraftError=missing-lead');

  const supabase: any = await createClient();
  const db: any = supabase;

  const { data: leadRecord, error: leadError } = await db
    .from('leads')
    .select('id, organization_id, lead_type')
    .eq('organization_id', workspace.organization.id)
    .eq('id', leadId)
    .maybeSingle();

  if (leadError || !leadRecord?.id) {
    if (leadError) logServerError('createLeadQuoteDraftFromLead.load-lead', leadError);
    redirect(`/leads/${leadId}?quoteDraftError=lead-not-found`);
  }

  if (String(leadRecord.lead_type ?? '').toLowerCase() === 'supplier') {
    await writeAuditLog({
      organizationId: workspace.organization.id,
      action: 'supplier_quote_blocked',
      entityType: 'lead',
      entityId: leadId,
      actorUserId: workspace.user.id,
      payload: { metadata: { source: 'createLeadQuoteDraftFromLead', reason: 'supplier_records_use_cost_requests' } },
    });
    redirect(`/leads/${leadId}?mode=suppliers&quoteDraftError=${encodeURIComponent('Supplier records use Cost Requests, not buyer quotes.')}`);
  }

  if (sourceQuoteId) {
    const { data: sourceQuote, error: sourceQuoteError } = await db
      .from('quotes')
      .select('id, status, lead_id')
      .eq('organization_id', workspace.organization.id)
      .eq('id', sourceQuoteId)
      .maybeSingle();

    if (sourceQuoteError) {
      logServerError('createLeadQuoteDraftFromLead.load-source-quote', sourceQuoteError);
      redirect(`/leads/${leadId}/quote?quoteId=${sourceQuoteId}&quoteDraftError=source-load`);
    }

    if (!sourceQuote || sourceQuote.lead_id !== leadId) {
      redirect(`/leads/${leadId}/quote?quoteDraftError=source-mismatch`);
    }
  }

  const trialDecision = await enforceTrialAction({
    organizationId: workspace.organization.id,
    action: 'create_quote',
    client: supabase,
  });
  if (!trialDecision.allowed) {
    redirect(`/leads/${leadId}/quote?quoteDraftError=${encodeURIComponent(trialDecision.reason ?? 'trial-limit')}`);
  }

  const idempotencyKey = buildLeadQuoteDraftKey({
    organizationId: workspace.organization.id,
    leadId,
    forceNew,
  });

  const { data: draftResult, error: rpcError } = await db.rpc('app_create_lead_quote_draft_tx', {
    p_organization_id: workspace.organization.id,
    p_lead_id: leadId,
    p_actor_user_id: workspace.user.id,
    p_idempotency_key: idempotencyKey,
  });

  if (rpcError) {
    logServerError('createLeadQuoteDraftFromLead.rpc', rpcError);
    redirect(`/leads/${leadId}/quote?quoteDraftError=${encodeURIComponent(safeUserError(rpcError, 'Quote draft could not be created.'))}`);
  }

  const draft: LeadQuoteDraftResult = Array.isArray(draftResult) ? draftResult[0] : draftResult;
  if (!draft?.quote_id) redirect(`/leads/${leadId}/quote?quoteDraftError=empty-rpc-result`);

  if (draft.created && draft.quote_version_id) {
    const [{ data: quoteRow }, { data: requirements }] = await Promise.all([
      db.from('quotes').select('currency,display_currency').eq('organization_id',workspace.organization.id).eq('id',draft.quote_id).maybeSingle(),
      db.from('lead_product_interests').select('id,label,product_id,source_context,created_at').eq('organization_id',workspace.organization.id).eq('lead_id',leadId).in('interest_type',['captured_requirement','manual_requirement']).is('product_id',null).order('created_at',{ascending:true})
    ]);
    const currency=quoteRow?.display_currency||quoteRow?.currency||'USD';
    const reqs=requirements??[];
    if(reqs.length){
      const quoteLines=reqs.map((r:any)=>{const sc=r.source_context||{};const quantity=parseRequestedQuantity(sc.quantity_text);const dims=String(sc.dimensions_text||sc.dimensions_print||'').trim();const note=[sc.requirement_notes,dims?`Dimensions: ${dims}`:null,sc.quantity_text?`Requested quantity: ${sc.quantity_text}`:null].filter(Boolean).join(' · ');return{quote_id:draft.quote_id,product_id:null,quantity,unit_price:0,currency,notes:note||r.label,line_type:'packaging',packaging_family_id:sc.family_id||null,packaging_size_profile_v5_id:sc.size_profile_id||null,input_snapshot_json:{source:'lead_requirement',lead_product_interest_id:r.id,label:r.label,quantity_text:sc.quantity_text||null,dimensions_text:dims||null,dimensions_structured:sc.dimensions_structured||null,dimension_mode:sc.dimension_mode||null,requirement_notes:sc.requirement_notes||null,family_id:sc.family_id||null,size_profile_id:sc.size_profile_id||null}}});
      const{error:lineError}=await db.from('quote_line_items').insert(quoteLines);
      if(lineError)logServerError('createLeadQuoteDraftFromLead.seed-requirement-lines',lineError);
      const versionLines=reqs.map((r:any,index:number)=>{const sc=r.source_context||{};const dims=String(sc.dimensions_text||sc.dimensions_print||'').trim();const note=[sc.requirement_notes,dims?`Dimensions: ${dims}`:null,sc.quantity_text?`Requested quantity: ${sc.quantity_text}`:null].filter(Boolean).join(' · ');return{quote_version_id:draft.quote_version_id,product_id:null,product_variant_id:null,sku_code:`REQ-${index+1}`,product_name:r.label||`Requirement ${index+1}`,category_type:'Packaging Requirement',pack_label:dims||null,basis_applied:'unit',pricing_mode:'unit',moq:parseRequestedQuantity(sc.quantity_text),final_unit_price:0,display_currency:currency,is_overridden:false,line_notes:note||'Seeded from lead requirement.',sort_order:Number(draft.line_count||0)+index,calculation_meta:{source:'lead_requirement',lead_product_interest_id:r.id,quantity_text:sc.quantity_text||null,dimensions_text:dims||null,dimensions_structured:sc.dimensions_structured||null,dimension_mode:sc.dimension_mode||null,family_id:sc.family_id||null,size_profile_id:sc.size_profile_id||null},catalog_price_snapshot:{},line_type:'packaging'}});
      const{error:versionError}=await db.from('quote_version_line_items').insert(versionLines);
      if(versionError)logServerError('createLeadQuoteDraftFromLead.seed-requirement-version-lines',versionError);
      if(!versionError)await db.from('quote_versions').update({total_line_count:Number(draft.line_count||0)+versionLines.length}).eq('id',draft.quote_version_id);
      draft.line_count=Number(draft.line_count||0)+versionLines.length;
    }
  }

  await writeAuditLog({
    organizationId: workspace.organization.id,
    action: 'quote_created',
    entityType: 'quote',
    entityId: draft.quote_id,
    actorUserId: workspace.user.id,
    payload: {
      previous: sourceQuoteId ? { source_quote_id: sourceQuoteId } : null,
      new: {
        quote_id: draft.quote_id,
        quote_version_id: draft.quote_version_id ?? null,
        line_count: draft.line_count ?? null,
        created: draft.created ?? null,
      },
      metadata: {
        lead_id: leadId,
        source: 'createLeadQuoteDraftFromLead',
        force_new: forceNew,
        idempotency_key: idempotencyKey,
      },
    },
  });

  await revalidateLeadQuotePaths(leadId);
  redirect(`/leads/${leadId}/quote?quoteId=${draft.quote_id}&step=1`);
}
