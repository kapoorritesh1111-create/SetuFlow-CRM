'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireWorkspace } from '@/lib/workspace/auth';

function normalizeName(value?: FormDataEntryValue | null) {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
  return text.length > 0 ? text.slice(0, 120) : null;
}

export async function updateOwnProfile(formData: FormData): Promise<void> {
  const fullName = normalizeName(formData.get('full_name'));
  const username = normalizeName(formData.get('username'));
  const workspace = await requireWorkspace();
  if (!workspace.user?.id) redirect('/login');

  const supabase = await createClient();
  const payload: Record<string, unknown> = { full_name: fullName, updated_at: new Date().toISOString() };
  if (username) payload.username = username;

  const { error } = await (supabase.from('profiles') as any).update(payload).eq('id', workspace.user.id);
  if (error) redirect('/profile?notice=profile-update-failed');

  revalidatePath('/profile');
  revalidatePath('/contact-exchange/vcard');
  redirect('/profile?notice=profile-updated');
}
