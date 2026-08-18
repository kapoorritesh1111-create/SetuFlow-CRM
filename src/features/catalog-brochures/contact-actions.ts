'use server';

import { revalidatePath } from 'next/cache';

import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function normalizePhone(value: unknown) {
  const raw = clean(value);
  if (!raw) return null;
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length < 8 || digits.length > 15) throw new Error('Enter a valid international phone number.');
  return raw.startsWith('+') ? `+${digits}` : `+${digits}`;
}

export async function updateCatalogBuyerContact(formData: FormData): Promise<void> {
  const workspace = await requireAdminWorkspace();
  if (!workspace.organization || !workspace.membership || !workspace.user) throw new Error('Admin workspace access is required.');

  const contactPhone = normalizePhone(formData.get('contact_phone'));
  const whatsappPhone = normalizePhone(formData.get('whatsapp_phone')) || contactPhone;
  if (!contactPhone && !whatsappPhone) throw new Error('Add at least one customer contact number.');

  const db: any = await createClient();
  const { error } = await db
    .from('organizations')
    .update({
      contact_phone: contactPhone,
      whatsapp_phone: whatsappPhone,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspace.organization.id);

  if (error) throw new Error(`Buyer contact details could not be saved: ${String(error.message ?? 'database error')}`);
  revalidatePath('/admin/catalog');
  revalidatePath('/admin/organization');
}
