'use server';

import { createClient } from '@/lib/supabase/server';
import { hasSupabaseEnv } from '@/lib/env';
import { requireWorkspace } from '@/lib/workspace/auth';
import { buildContactPostApplyAssist, type ContactAssistLeadCandidate, type ContactPostApplyAssistDraft, type ContactPostApplyAssistResult } from '@/lib/contact-exchange/contact-post-apply-assist';
import { extractContactSource, extractPdfTextLayer, type ContactServerExtractionResult } from '@/lib/contact-exchange/contact-extraction';
import type { ContactSourceProfile } from '@/lib/contact-exchange/contact-parser';

export type ContactScanActionState = {
  error?: string;
  extraction?: ContactServerExtractionResult;
};

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

function normalizeSearchValue(value: string) {
  return value.replace(/[%_]/g, '').trim();
}

async function fetchLeadCandidates(organizationId: string, draft: ContactPostApplyAssistDraft) {
  if (!hasSupabaseEnv) return [] as ContactAssistLeadCandidate[];

  const db = (await createClient()) as any;
  const selectColumns = 'id, company_name, contact_name, email, phone, phone_secondary, website, next_follow_up_at';
  const candidates = new Map<string, ContactAssistLeadCandidate>();

  const collect = async (runner: (() => Promise<{ data: ContactAssistLeadCandidate[] | null; error?: { message?: string } }>) | null) => {
    if (!runner) return;
    try {
      const result = await runner();
      for (const row of result.data ?? []) {
        if (!row?.id) continue;
        candidates.set(row.id, row);
      }
    } catch {
      // fall through to heuristic-only assist
    }
  };

  const email = normalizeSearchValue(draft.email);
  const companyName = normalizeSearchValue(draft.companyName);
  const contactName = normalizeSearchValue(draft.contactName);
  const website = normalizeSearchValue(draft.website);
  const phoneDigits = String(draft.phone ?? '').replace(/\D/g, '');
  const phoneSecondaryDigits = String(draft.phoneSecondary ?? '').replace(/\D/g, '');
  const phoneTail = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : '';
  const phoneSecondaryTail = phoneSecondaryDigits.length >= 4 ? phoneSecondaryDigits.slice(-4) : '';

  await collect(email ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('email', email).limit(6) : null);
  await collect(companyName ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('company_name', `%${companyName}%`).limit(8) : null);
  await collect(contactName ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('contact_name', `%${contactName}%`).limit(8) : null);
  await collect(website ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('website', `%${website}%`).limit(6) : null);
  await collect(phoneTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone', `%${phoneTail}%`).limit(6) : null);
  await collect(phoneTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone_secondary', `%${phoneTail}%`).limit(6) : null);
  await collect(phoneSecondaryTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone', `%${phoneSecondaryTail}%`).limit(6) : null);
  await collect(phoneSecondaryTail ? () => db.from('leads').select(selectColumns).eq('organization_id', organizationId).ilike('phone_secondary', `%${phoneSecondaryTail}%`).limit(6) : null);

  return Array.from(candidates.values());
}

export async function extractContactScan(_: ContactScanActionState | undefined, formData: FormData): Promise<ContactScanActionState> {
  const assistText = String(formData.get('assist_text') ?? '').trim();
  const sourceModeValue = String(formData.get('source_mode') ?? 'upload').trim();
  const sourceMode = sourceModeValue === 'camera' ? 'camera' : sourceModeValue === 'manual' ? 'manual' : 'upload';
  const source = formData.get('source');

  if (!(source instanceof File) && !assistText) {
    return { error: 'Attach a source or provide assist text before running extraction.' };
  }

  if (source instanceof File && source.size > MAX_SOURCE_BYTES) {
    return { error: 'Source file is too large for quick-entry extraction. Keep files under 10 MB in this batch.' };
  }

  let fileText = '';
  let pdfText = '';
  let filename = '';
  let fileType = '';

  if (source instanceof File) {
    filename = source.name;
    fileType = source.type;

    if (fileType.startsWith('text/') || fileType === 'application/json') {
      fileText = await source.text();
    } else if (fileType === 'application/pdf') {
      const pdfBuffer = Buffer.from(await source.arrayBuffer());
      pdfText = extractPdfTextLayer(pdfBuffer);
    }
  }

  return {
    extraction: await extractContactSource({
      assistText,
      sourceMode,
      filename,
      fileType,
      fileText,
      pdfText,
      source: source instanceof File ? source : null,
    }),
  };
}

export async function suggestContactScanPostApplyAssist(formData: FormData): Promise<ContactPostApplyAssistResult> {
  const draft: ContactPostApplyAssistDraft = {
    currentLeadId: String(formData.get('current_lead_id') ?? '').trim() || null,
    companyName: String(formData.get('company_name') ?? '').trim(),
    contactName: String(formData.get('contact_name') ?? '').trim(),
    jobTitle: String(formData.get('job_title') ?? '').trim(),
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim(),
    phoneSecondary: String(formData.get('phone_secondary') ?? '').trim(),
    website: String(formData.get('website') ?? '').trim(),
    notes: String(formData.get('notes') ?? '').trim(),
    sourceType: String(formData.get('source_type') ?? '').trim(),
    sourceLabel: String(formData.get('source_label') ?? '').trim(),
    sourceProfile: (String(formData.get('source_profile') ?? '').trim() || 'generic') as ContactSourceProfile,
  };

  const enoughSignal = Boolean(draft.email || draft.phone || draft.phoneSecondary || draft.companyName || draft.contactName || draft.website);
  if (!enoughSignal || !hasSupabaseEnv) {
    return buildContactPostApplyAssist({ draft, lookupMode: 'heuristic' });
  }

  try {
    const workspace = await requireWorkspace();
    const organizationId = workspace.organization?.id;
    if (!organizationId) {
      return buildContactPostApplyAssist({ draft, lookupMode: 'heuristic' });
    }

    const candidates = await fetchLeadCandidates(organizationId, draft);
    return buildContactPostApplyAssist({
      draft,
      candidates,
      lookupMode: candidates.length ? 'live' : 'heuristic',
    });
  } catch {
    return buildContactPostApplyAssist({ draft, lookupMode: 'heuristic' });
  }
}
