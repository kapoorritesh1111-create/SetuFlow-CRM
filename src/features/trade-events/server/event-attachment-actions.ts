'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';
import { uploadEventInteractionAttachments, validateEventAttachmentFiles } from './event-attachments';

export type EventAttachmentState = { error?: string; success?: string };

export async function addEventInteractionAttachments(_previous: EventAttachmentState | undefined, formData: FormData): Promise<EventAttachmentState> {
  const workspace = await requireWorkspace();
  if (!workspace.user || !workspace.organization) return { error: 'Not authenticated.' };
  const entryId = String(formData.get('trade_event_entry_id') ?? '').trim();
  if (!entryId) return { error: 'Save the event interaction before adding attachments.' };

  const files = formData.getAll('attachments').filter((item): item is File => item instanceof File && item.size > 0);
  if (!files.length) return { error: 'Choose at least one photo, PDF, or specification file.' };
  const validationError = validateEventAttachmentFiles(files);
  if (validationError) return { error: validationError };

  const db: any = await createClient();
  const { data: entry, error: entryError } = await db.from('trade_event_entries').select('id, trade_event_id').eq('organization_id', workspace.organization.id).eq('id', entryId).maybeSingle();
  if (entryError || !entry?.id) return { error: entryError?.message ?? 'Event interaction was not found in this organization.' };

  const result = await uploadEventInteractionAttachments({ db, organizationId: workspace.organization.id, entryId, userId: workspace.user.id, files });
  revalidatePath('/trade-events');
  if (!result.uploaded) return { error: result.warning || 'Attachments could not be uploaded. The interaction itself is still saved.' };
  return { success: `${result.uploaded} attachment${result.uploaded === 1 ? '' : 's'} added to this event interaction.${result.warning ? ` ${result.warning}` : ''}` };
}
