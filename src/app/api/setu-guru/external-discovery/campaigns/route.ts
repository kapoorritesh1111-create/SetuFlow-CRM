import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { createGuidedDiscoveryCampaign, listGuidedExternalDiscovery } from '@/lib/setu-guru/external-discovery-campaigns';
import { updateGuidedDiscoveryCampaign } from '@/lib/setu-guru/external-discovery-campaign-update';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const CampaignModeSchema = z.enum(['saved_icp', 'new_market', 'lookalike', 'fresh_research', 'supplier_partner']);
const ResearchDirectionSchema = z.enum(['buyers', 'suppliers', 'partners', 'manufacturers']);
const SourceStrategySchema = z.enum(['crm_and_external', 'crm_only', 'external_only']);
const RequiredList = z.array(z.string().trim().min(1)).min(1);

const SearchConfigSchema = z.object({
  objective: z.string().trim().min(10).max(1000),
  products: RequiredList.max(30),
  target_countries: RequiredList.max(30),
  target_company_types: RequiredList.max(40),
  target_industries: z.array(z.string().trim().min(1)).max(30),
  excluded_company_types: z.array(z.string().trim().min(1)).max(40),
  result_limit: z.number().int().min(5).max(100),
  minimum_fit_score: z.number().int().min(0).max(100),
  search_languages: RequiredList.max(20),
  source_requirements: RequiredList.max(20),
  duplicate_detection: z.boolean(),
  suggest_contact_roles: z.boolean(),
  source_strategy: SourceStrategySchema,
  lookalike_lead_id: z.string().uuid().nullable(),
}).strict();

const CampaignPayloadSchema = z.object({
  name: z.string().trim().min(3).max(120),
  campaignMode: CampaignModeSchema,
  researchDirection: ResearchDirectionSchema,
  sourceStrategy: SourceStrategySchema,
  goal: z.string().trim().min(10).max(1000),
  icpProfileId: z.string().uuid().nullable(),
  lookalikeLeadId: z.string().uuid().nullable(),
  searchConfig: SearchConfigSchema,
}).strict().superRefine((value, context) => {
  if ((value.campaignMode === 'saved_icp' || value.campaignMode === 'new_market') && !value.icpProfileId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['icpProfileId'], message: 'Choose a saved ICP for this campaign mode.' });
  }
  if (value.campaignMode === 'lookalike' && !value.lookalikeLeadId) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['lookalikeLeadId'], message: 'Choose an existing CRM company for lookalike research.' });
  }
  if (value.campaignMode === 'supplier_partner' && value.researchDirection === 'buyers') {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['researchDirection'], message: 'Supplier or partner campaigns cannot use buyer research direction.' });
  }
  if (value.sourceStrategy !== value.searchConfig.source_strategy) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['searchConfig', 'source_strategy'], message: 'Source strategy must match the confirmed campaign scope.' });
  }
  if (value.lookalikeLeadId !== value.searchConfig.lookalike_lead_id) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['searchConfig', 'lookalike_lead_id'], message: 'Lookalike company must match the confirmed campaign scope.' });
  }
});

const UpdateCampaignSchema = z.object({
  campaignId: z.string().uuid(),
  name: z.string().trim().min(3).max(120),
  campaignMode: CampaignModeSchema,
  researchDirection: ResearchDirectionSchema,
  sourceStrategy: SourceStrategySchema,
  goal: z.string().trim().min(10).max(1000),
  icpProfileId: z.string().uuid().nullable(),
  lookalikeLeadId: z.string().uuid().nullable(),
  searchConfig: SearchConfigSchema,
}).strict().superRefine((value, context) => {
  const payload = CampaignPayloadSchema.safeParse({
    name: value.name,
    campaignMode: value.campaignMode,
    researchDirection: value.researchDirection,
    sourceStrategy: value.sourceStrategy,
    goal: value.goal,
    icpProfileId: value.icpProfileId,
    lookalikeLeadId: value.lookalikeLeadId,
    searchConfig: value.searchConfig,
  });
  if (!payload.success) {
    for (const issue of payload.error.issues) context.addIssue(issue);
  }
});

async function organizationId() {
  const workspace = await requireWorkspace();
  return workspace.organization?.id ?? null;
}

export async function GET() {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  try {
    const result = await listGuidedExternalDiscovery(orgId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[external-discovery-campaigns] list failed', { orgId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'External Discovery campaigns could not be loaded.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  const parsed = CampaignPayloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? 'Complete the required campaign scope before continuing.',
      details: parsed.error.flatten(),
    }, { status: 422 });
  }

  try {
    const campaign = await createGuidedDiscoveryCampaign(orgId, parsed.data);
    return NextResponse.json({ campaign, researchStarted: false }, { status: 201 });
  } catch (error) {
    console.error('[external-discovery-campaigns] create failed', { orgId, error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'External Discovery campaign could not be created.' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const orgId = await organizationId();
  if (!orgId) return NextResponse.json({ error: 'No active organization workspace.' }, { status: 403 });

  const parsed = UpdateCampaignSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({
      error: parsed.error.issues[0]?.message ?? 'Complete the required campaign scope before saving.',
      details: parsed.error.flatten(),
    }, { status: 422 });
  }

  const { campaignId, ...input } = parsed.data;
  try {
    const campaign = await updateGuidedDiscoveryCampaign(orgId, campaignId, input);
    return NextResponse.json({ campaign, researchStarted: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'External Discovery campaign could not be updated.';
    const status = message.includes('not found') ? 404 : message.includes('current research run') ? 409 : 500;
    console.error('[external-discovery-campaigns] update failed', { orgId, campaignId, error: message });
    return NextResponse.json({ error: message }, { status });
  }
}
