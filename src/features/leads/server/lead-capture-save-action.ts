"use server";

import type { ActionState } from './shared';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { saveLead as saveLeadBase } from './actions/legacy-actions';
import { recordLeadCaptureIntro } from './lead-capture-intro-service';

const unique = (items: FormDataEntryValue[]) => Array.from(new Set(items.map((item) => String(item ?? '').trim()).filter(Boolean)));

export async function saveLead(previousState: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const result = await saveLeadBase(previousState, formData);
  if (!result?.success || !result.lead?.id || result.lead.intro_sent) return result;

  try {
    const workspace = await requireWorkspace();
    if (!workspace.user || !workspace.organization) return result;
    const db: any = await createClient();
    await recordLeadCaptureIntro({
      db,
      organization: workspace.organization,
      actorUserId: workspace.user.id,
      lead: result.lead,
      productIds: result.selectedProductIds?.length ? result.selectedProductIds : unique(formData.getAll('product_ids')),
      categoryIds: unique(formData.getAll('category_ids')),
      rawInterestNote: String(formData.get('notes') ?? '').trim(),
    });
  } catch {
    return result;
  }

  return result;
}
