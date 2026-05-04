export type VCardIdentity = {
  fullName: string;
  email: string;
  organizationName: string;
  roleLabel?: string | null;
  username?: string | null;
  previewPath?: string | null;
  avatarUrl?: string | null;
  primaryPhone?: string | null;
  secondaryPhone?: string | null;
  website?: string | null;
  address?: string | null;
};

function escapeVCardValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

function slugifyFilePart(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'setu-flow-contact';
}

function hasRealValue(value?: string | null) {
  const normalized = String(value ?? '').trim();
  return Boolean(normalized && !normalized.toLowerCase().startsWith('add '));
}

function normalizeUrl(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizePhone(value?: string | null) {
  return String(value ?? '').trim().replace(/[^+0-9]/g, '');
}

function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { given: parts[0] || fullName.trim(), family: '' };
  const family = parts.pop() || '';
  return { given: parts.join(' '), family };
}

function dataImageToVCardPhoto(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  const match = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(trimmed);
  if (!match) return null;
  const type = match[1].toUpperCase() === 'JPG' ? 'JPEG' : match[1].toUpperCase();
  const base64 = match[2].replace(/\s/g, '');
  // iOS Contacts is much more reliable when embedded contact photos are small.
  // Larger photos may be silently ignored by the native preview/import sheet.
  if (!base64 || base64.length > 260_000) return null;
  return { type, base64 };
}

function foldLine(line: string) {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return parts.join('\r\n');
}

export function buildVCard(identity: VCardIdentity) {
  const fullName = identity.fullName.trim() || 'SETU Flow contact';
  const { given, family } = splitName(fullName);
  const organizationName = identity.organizationName.trim() || 'SETU Flow';
  const email = identity.email.trim();
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'PRODID:-//Setu Flow//Digital vCard//EN',
    `N:${escapeVCardValue(family)};${escapeVCardValue(given)};;;`,
    `FN:${escapeVCardValue(fullName)}`,
    `ORG:${escapeVCardValue(organizationName)}`,
  ];

  if (identity.roleLabel?.trim()) lines.push(`TITLE:${escapeVCardValue(identity.roleLabel.trim())}`);
  if (email) lines.push(`EMAIL;TYPE=WORK,INTERNET:${escapeVCardValue(email)}`);

  const primaryPhone = normalizePhone(identity.primaryPhone);
  const secondaryPhone = normalizePhone(identity.secondaryPhone);
  if (primaryPhone) lines.push(`TEL;TYPE=CELL,VOICE:${escapeVCardValue(primaryPhone)}`);
  if (secondaryPhone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCardValue(secondaryPhone)}`);

  if (hasRealValue(identity.website)) lines.push(`URL;TYPE=WORK:${escapeVCardValue(normalizeUrl(identity.website))}`);
  if (hasRealValue(identity.address)) lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(String(identity.address).trim())};;;;`);

  const photo = dataImageToVCardPhoto(identity.avatarUrl);
  if (photo) lines.push(`PHOTO;ENCODING=b;TYPE=${photo.type}:${photo.base64}`);

  lines.push('NOTE:Shared via Setu Flow');
  lines.push(`REV:${now}`);
  lines.push('END:VCARD');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function getVCardFilename(identity: Pick<VCardIdentity, 'fullName'>) {
  return `${slugifyFilePart(identity.fullName)}-setu-flow-contact.vcf`;
}
