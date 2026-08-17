'use server';

const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

function safeName(value: string) {
  const normalized = value.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return normalized.slice(0, 100) || 'attachment';
}

export function validateEventAttachmentFiles(files: File[]) {
  if (files.length > MAX_FILES) return `Attach at most ${MAX_FILES} files to one booth interaction.`;
  for (const file of files) {
    if (!file.size) continue;
    if (file.size > MAX_BYTES) return `${file.name} is larger than 10 MB.`;
    if (!ALLOWED_TYPES.has(file.type)) return `${file.name} must be JPG, PNG, WebP, or PDF.`;
  }
  return null;
}

export async function uploadEventInteractionAttachments(input: {
  db: any;
  organizationId: string;
  entryId: string;
  userId: string;
  files: File[];
}) {
  const files = input.files.filter((file) => file.size > 0);
  if (!files.length) return { uploaded: 0, warning: '' };
  const validationError = validateEventAttachmentFiles(files);
  if (validationError) return { uploaded: 0, warning: validationError };

  let uploaded = 0;
  const warnings: string[] = [];
  for (const file of files) {
    const path = `${input.organizationId}/${input.entryId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = input.db.storage.from('trade-event-attachments');
    const { error: uploadError } = await storage.upload(path, buffer, { contentType: file.type || 'application/octet-stream', upsert: false });
    if (uploadError) {
      warnings.push(`${file.name}: attachment upload unavailable`);
      continue;
    }
    const { error: rowError } = await input.db.from('trade_event_entry_attachments').insert({
      organization_id: input.organizationId,
      trade_event_entry_id: input.entryId,
      file_path: path,
      file_name: file.name,
      content_type: file.type || null,
      file_size: file.size,
      created_by: input.userId,
    });
    if (rowError) {
      await storage.remove([path]);
      warnings.push(`${file.name}: attachment record unavailable`);
      continue;
    }
    uploaded += 1;
  }
  return { uploaded, warning: warnings.join('; ') };
}
