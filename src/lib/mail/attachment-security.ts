import { createHash } from 'crypto';

const CLEAN_BUCKET = 'setu-mail-attachments';
const QUARANTINE_BUCKET = 'setu-mail-quarantine';
const DEFAULT_SCAN_URL = 'https://api.cloudmersive.com/virus/scan/file';
const SCAN_TIMEOUT_MS = 20_000;

export type MailAttachmentSecurityStatus = 'pending' | 'scanning' | 'clean' | 'quarantined' | 'scan_error';

type ScanResult = {
  status: Exclude<MailAttachmentSecurityStatus, 'pending' | 'scanning'>;
  provider: 'cloudmersive';
  engine: string;
  signature: string | null;
  error: string | null;
};

type StoredAttachment = {
  id: string;
  organization_id: string;
  mailbox_id: string;
  filename: string;
  content_type?: string | null;
  storage_path?: string | null;
  quarantine_storage_path?: string | null;
  scan_attempts?: number | null;
};

function contentHash(bytes: Uint8Array) {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 160) || 'attachment';
}

export function mailMalwareScannerConfigured() {
  return Boolean(process.env.CLOUDMERSIVE_API_KEY?.trim());
}

export async function scanMailAttachmentBytes(bytes: Uint8Array, filename: string, contentType?: string | null): Promise<ScanResult> {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY?.trim();
  if (!apiKey) {
    return { status: 'scan_error', provider: 'cloudmersive', engine: 'virus-scan-api', signature: null, error: 'Malware scanner is not configured.' };
  }

  const endpoint = process.env.CLOUDMERSIVE_VIRUS_SCAN_URL?.trim() || DEFAULT_SCAN_URL;
  try {
    const form = new FormData();
    form.append('inputFile', new Blob([bytes], { type: contentType || 'application/octet-stream' }), filename);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { Apikey: apiKey },
      body: form,
      cache: 'no-store',
      signal: AbortSignal.timeout(SCAN_TIMEOUT_MS),
    });
    const payload = await response.json().catch(() => ({})) as any;
    if (!response.ok) {
      return { status: 'scan_error', provider: 'cloudmersive', engine: 'virus-scan-api', signature: null, error: `Scanner returned HTTP ${response.status}.` };
    }
    if (payload?.CleanResult === true) {
      return { status: 'clean', provider: 'cloudmersive', engine: 'virus-scan-api', signature: null, error: null };
    }
    if (payload?.CleanResult === false) {
      const names = Array.isArray(payload?.FoundViruses)
        ? payload.FoundViruses.map((entry: any) => String(entry?.VirusName ?? '').trim()).filter(Boolean)
        : [];
      return {
        status: 'quarantined',
        provider: 'cloudmersive',
        engine: 'virus-scan-api',
        signature: names.slice(0, 8).join(', ') || 'Malware detected',
        error: null,
      };
    }
    return { status: 'scan_error', provider: 'cloudmersive', engine: 'virus-scan-api', signature: null, error: 'Scanner returned an indeterminate verdict.' };
  } catch (error) {
    return {
      status: 'scan_error',
      provider: 'cloudmersive',
      engine: 'virus-scan-api',
      signature: null,
      error: error instanceof Error ? error.message.slice(0, 500) : 'Malware scan failed.',
    };
  }
}

export async function secureStoredMailAttachment(admin: any, attachment: StoredAttachment, bytes: Uint8Array) {
  const now = new Date().toISOString();
  const attempts = Number(attachment.scan_attempts ?? 0) + 1;
  const sha256 = contentHash(bytes);
  await admin.from('mail_attachments').update({
    security_status: 'scanning',
    scan_attempts: attempts,
    scan_error: null,
    content_sha256: sha256,
  }).eq('id', attachment.id).eq('organization_id', attachment.organization_id).eq('mailbox_id', attachment.mailbox_id);

  const result = await scanMailAttachmentBytes(bytes, attachment.filename, attachment.content_type);
  if (result.status === 'clean') {
    const { data, error } = await admin.from('mail_attachments').update({
      security_status: 'clean',
      scan_provider: result.provider,
      scan_engine: result.engine,
      scan_signature: null,
      scan_error: null,
      scanned_at: now,
      quarantined_at: null,
      content_sha256: sha256,
    }).eq('id', attachment.id).eq('organization_id', attachment.organization_id).eq('mailbox_id', attachment.mailbox_id)
      .select('id,filename,content_type,size_bytes,message_id,created_at,security_status,scan_provider,scanned_at').single();
    if (error) throw error;
    return data;
  }

  const quarantinePath = `${attachment.organization_id}/${attachment.mailbox_id}/${attachment.id}/${crypto.randomUUID()}-${safeFilename(attachment.filename)}`;
  const { error: quarantineError } = await admin.storage.from(QUARANTINE_BUCKET).upload(quarantinePath, bytes, {
    contentType: attachment.content_type || 'application/octet-stream',
    upsert: false,
  });

  let finalError = result.error;
  let finalQuarantinePath: string | null = null;
  if (!quarantineError) {
    finalQuarantinePath = quarantinePath;
    if (attachment.storage_path) await admin.storage.from(CLEAN_BUCKET).remove([attachment.storage_path]);
  } else {
    finalError = `${finalError ? `${finalError} ` : ''}Quarantine storage failed.`.trim();
  }

  const { data, error } = await admin.from('mail_attachments').update({
    security_status: result.status,
    scan_provider: result.provider,
    scan_engine: result.engine,
    scan_signature: result.signature,
    scan_error: finalError,
    scanned_at: now,
    quarantined_at: now,
    content_sha256: sha256,
    ...(finalQuarantinePath ? { storage_path: null, quarantine_storage_path: finalQuarantinePath } : {}),
  }).eq('id', attachment.id).eq('organization_id', attachment.organization_id).eq('mailbox_id', attachment.mailbox_id)
    .select('id,filename,content_type,size_bytes,message_id,created_at,security_status,scan_provider,scan_signature,scan_error,scanned_at').single();
  if (error) throw error;
  return data;
}
