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
  return value.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
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

function dataImageToVCardPhoto(value?: string | null) {
  const trimmed = String(value ?? '').trim();
  const match = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(trimmed);
  if (!match) return null;
  const type = match[1].toUpperCase() === 'JPG' ? 'JPEG' : match[1].toUpperCase();
  const base64 = match[2].replace(/\s/g, '');
  if (!base64 || base64.length > 700_000) return null;
  return { type, base64 };
}

function foldLine(line: string) {
  if (line.length <= 72) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 72));
  remaining = remaining.slice(72);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 71)}`);
    remaining = remaining.slice(71);
  }
  return parts.join('\r\n');
}

export function buildVCard(identity: VCardIdentity) {
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN:${escapeVCardValue(identity.fullName)}`,
    `ORG:${escapeVCardValue(identity.organizationName)}`,
    `EMAIL;TYPE=INTERNET:${escapeVCardValue(identity.email)}`,
  ];

  if (identity.roleLabel?.trim()) lines.push(`TITLE:${escapeVCardValue(identity.roleLabel.trim())}`);
  if (identity.username?.trim()) lines.push(`NICKNAME:${escapeVCardValue(identity.username.trim())}`);
  if (hasRealValue(identity.primaryPhone)) lines.push(`TEL;TYPE=CELL:${escapeVCardValue(String(identity.primaryPhone).trim())}`);
  if (hasRealValue(identity.secondaryPhone)) lines.push(`TEL;TYPE=WORK:${escapeVCardValue(String(identity.secondaryPhone).trim())}`);
  if (hasRealValue(identity.website)) lines.push(`URL:${escapeVCardValue(normalizeUrl(identity.website))}`);
  if (hasRealValue(identity.address)) lines.push(`ADR;TYPE=WORK:;;${escapeVCardValue(String(identity.address).trim())}`);
  const photo = dataImageToVCardPhoto(identity.avatarUrl);
  if (photo) lines.push(`PHOTO;ENCODING=b;TYPE=${photo.type}:${photo.base64}`);
  lines.push('NOTE:Shared via Setu Flow');
  lines.push('END:VCARD');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function getVCardFilename(identity: Pick<VCardIdentity, 'fullName'>) {
  return `${slugifyFilePart(identity.fullName)}-setu-flow-contact.vcf`;
}
