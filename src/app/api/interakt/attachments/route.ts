import { randomBytes, randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { requireWorkspace } from '@/lib/workspace/auth';

export const dynamic = 'force-dynamic';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';
const BUCKET = 'organization-assets';
const MAX_BYTES = 12 * 1024 * 1024;
const WRITE_ROLES = new Set(['owner', 'admin', 'manager', 'sales']);
const ALLOWED = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
]);

function clean(value: unknown) {
  return String(value ?? '').trim();
}

function safeName(value: string) {
  return value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 100) || 'attachment';
}

export async function POST(request: NextRequest) {
  try {
    const workspace = await requireWorkspace();
    const organization = workspace.organization;
    const isStark = organization?.id === STARK_PACKMATE_ORG_ID || clean(organization?.slug).toLowerCase() === STARK_PACKMATE_SLUG;
    if (!workspace.user || !organization || !isStark) return NextResponse.json({ error: 'This upload is restricted to Stark Packmate.' }, { status: 403 });
    if (!workspace.currentRoles.some((role) => WRITE_ROLES.has(String(role)))) return NextResponse.json({ error: 'Sales permission is required.' }, { status: 403 });

    const form = await request.formData();
    const file = form.get('file');
    const intakeId = clean(form.get('intakeId')) || null;
    const leadId = clean(form.get('leadId')) || null;
    if (!(file instanceof File) || file.size <= 0) return NextResponse.json({ error: 'Choose a file to attach.' }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: 'WhatsApp attachments must be 12 MB or smaller.' }, { status: 400 });
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: 'Use an image, PDF, Word, Excel or CSV file.' }, { status: 400 });
    if (!intakeId && !leadId) return NextResponse.json({ error: 'An inbound inquiry or lead is required.' }, { status: 400 });

    const admin = createAdminSupabaseClient() as any;
    if (!admin) return NextResponse.json({ error: 'File storage is not configured.' }, { status: 503 });

    if (intakeId) {
      const { data: intake } = await admin.from('lead_intake_staging').select('id').eq('id', intakeId).eq('organization_id', organization.id).eq('source_provider', 'interakt').maybeSingle();
      if (!intake?.id) return NextResponse.json({ error: 'Inbound inquiry not found.' }, { status: 404 });
    }
    if (leadId) {
      const { data: lead } = await admin.from('leads').select('id').eq('id', leadId).eq('organization_id', organization.id).maybeSingle();
      if (!lead?.id) return NextResponse.json({ error: 'Lead not found.' }, { status: 404 });
    }

    const id = randomUUID();
    const token = randomBytes(18).toString('base64url');
    const fileName = safeName(file.name);
    const storagePath = `${organization.id}/whatsapp-attachments/${id}-${fileName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(storagePath, bytes, { contentType: file.type, upsert: false });
    if (uploadError) return NextResponse.json({ error: `Attachment upload failed: ${String(uploadError.message ?? 'storage error')}` }, { status: 400 });

    const { error: insertError } = await admin.from('whatsapp_attachment_shares').insert({
      id,
      organization_id: organization.id,
      intake_id: intakeId,
      lead_id: leadId,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size,
      token,
      status: 'staged',
      created_by: workspace.user.id,
      expires_at: new Date(Date.now() + 30 * 864e5).toISOString(),
    });
    if (insertError) {
      await admin.storage.from(BUCKET).remove([storagePath]);
      return NextResponse.json({ error: `Attachment could not be staged: ${String(insertError.message ?? 'database error')}` }, { status: 400 });
    }

    const url = `${request.nextUrl.origin}/api/public/whatsapp-attachments/${token}`;
    return NextResponse.json({ attachment: { id, fileName: file.name, mimeType: file.type, fileSize: file.size, url } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Attachment upload failed.' }, { status: 400 });
  }
}
