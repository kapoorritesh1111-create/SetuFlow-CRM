export type ExtractionConfidence = 'High' | 'Medium' | 'Low';
export type ContactSourceProfile = 'business_card' | 'screenshot' | 'scan_pdf' | 'generic';

export type ExtractedField = {
  label: string;
  value: string;
  confidence: ExtractionConfidence;
};

export type ParsedContactDraft = {
  contactName: string;
  companyName: string;
  jobTitle: string;
  email: string;
  phone: string;
  phoneSecondary: string;
  website: string;
  notes: string;
};

export type ContactExtractionResult = {
  fields: ExtractedField[];
  notes: string[];
  draft: ParsedContactDraft;
  sourceLabel: string;
  sourceType: string;
  sourceProfile: ContactSourceProfile;
};

const TITLE_PATTERNS = /(manager|director|head|lead|founder|co-?founder|sales|procurement|buyer|supplier|marketing|owner|ceo|cto|coo|vp|president|executive|partner|consultant|specialist|account manager|business development|bdm|general manager|vice president)/i;
const COMPANY_PATTERNS = /(inc\.?|ltd\.?|llc|group|foods|exports|imports|trading|private limited|pvt\.? ltd\.?|company|co\.?|corp\.?|limited|solutions|systems|technologies|industries|labs|global|international|holdings|enterprises)/i;
const ADDRESS_PATTERNS = /(street|st\.?|road|rd\.?|avenue|ave\.?|building|floor|suite|sector|block|district|city|state|country|zip|postal|po box)/i;
const LABEL_PATTERNS = /^(name|contact|person|company|organization|organisation|title|designation|role|email|e-mail|mail|phone|mobile|tel|telephone|office|website|web|url|address|location|notes?)\s*[:|-]\s*(.+)$/i;
const SCREENSHOT_HINTS = /(screenshot|whatsapp|telegram|linkedin|signature|gmail|outlook|sent from|forwarded message|contact info)/i;
const GENERIC_NOISE = /^(contact|email|e-mail|phone|mobile|tel|telephone|website|web|address|location|notes?)$/i;

type LabeledFields = {
  name: string[];
  company: string[];
  title: string[];
  email: string[];
  phone: string[];
  website: string[];
  address: string[];
  notes: string[];
  consumed: Set<string>;
};

function compactLines(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function normalizeWebsite(value: string) {
  if (!value) return '';
  const cleaned = value.replace(/^website\s*[:|-]?\s*/i, '').trim();
  if (!cleaned) return '';
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned.replace(/^www\./i, 'www.')}`;
}

function cleanPhone(value: string) {
  return value.replace(/^(phone|mobile|tel|telephone|office)\s*[:|-]?\s*/i, '').replace(/\s+/g, ' ').trim();
}

function detectEmails(text: string) {
  return uniqueValues(text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []);
}

function detectWebsites(text: string) {
  return uniqueValues((text.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\/[\w./?%&=+#-]*)?/gi) ?? [])
    .filter((candidate) => !candidate.includes('@'))
    .map(normalizeWebsite));
}

function detectPhones(text: string) {
  return uniqueValues((text.match(/(?:\+?\d[\d\s()\-]{7,}\d)/g) ?? [])
    .map(cleanPhone)
    .filter((candidate) => candidate.replace(/\D/g, '').length >= 8));
}

function looksLikePersonName(line: string) {
  if (/[@\d]/.test(line) || GENERIC_NOISE.test(line)) return false;
  const words = line.split(/\s+/).filter(Boolean);
  return words.length >= 2 && words.length <= 4 && words.every((word) => /^[A-Z][A-Za-z'’-]+$/.test(word));
}

function looksLikeTitle(line: string) {
  return TITLE_PATTERNS.test(line);
}

function looksLikeCompany(line: string) {
  return COMPANY_PATTERNS.test(line) || /^[A-Z][A-Za-z0-9&,'(). -]{2,40}$/.test(line);
}

function looksLikeAddress(line: string) {
  return ADDRESS_PATTERNS.test(line) || /\d{5,}/.test(line);
}

function humanizeFilename(filename: string) {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return '';
  return base.replace(/\b\w/g, (match) => match.toUpperCase());
}

function inferSourceProfile(lines: string[], options?: { filename?: string | null; fileType?: string | null }) : ContactSourceProfile {
  const text = lines.join('\n');
  const filename = String(options?.filename ?? '');
  const fileType = String(options?.fileType ?? '').toLowerCase();
  if (fileType === 'application/pdf') return 'scan_pdf';
  if (/card|vcard|business card|visiting card/i.test(`${filename}\n${text}`)) return 'business_card';
  if (SCREENSHOT_HINTS.test(`${filename}\n${text}`)) return 'screenshot';
  return 'generic';
}

function extractLabeledFields(lines: string[]) : LabeledFields {
  const labeled: LabeledFields = {
    name: [], company: [], title: [], email: [], phone: [], website: [], address: [], notes: [], consumed: new Set<string>(),
  };

  for (const line of lines) {
    const match = line.match(LABEL_PATTERNS);
    if (!match) continue;
    const key = match[1].toLowerCase();
    const value = match[2].trim();
    if (!value) continue;
    labeled.consumed.add(line);
    if (/^name|contact|person$/.test(key)) labeled.name.push(value);
    else if (/^company|organization|organisation$/.test(key)) labeled.company.push(value);
    else if (/^title|designation|role$/.test(key)) labeled.title.push(value);
    else if (/^email|e-mail|mail$/.test(key)) labeled.email.push(...detectEmails(value));
    else if (/^phone|mobile|tel|telephone|office$/.test(key)) labeled.phone.push(...detectPhones(value));
    else if (/^website|web|url$/.test(key)) labeled.website.push(...detectWebsites(value));
    else if (/^address|location$/.test(key)) labeled.address.push(value);
    else labeled.notes.push(value);
  }

  labeled.name = uniqueValues(labeled.name);
  labeled.company = uniqueValues(labeled.company);
  labeled.title = uniqueValues(labeled.title);
  labeled.email = uniqueValues(labeled.email);
  labeled.phone = uniqueValues(labeled.phone);
  labeled.website = uniqueValues(labeled.website);
  labeled.address = uniqueValues(labeled.address);
  labeled.notes = uniqueValues(labeled.notes);
  return labeled;
}

function pickCompany(lines: string[], title: string, name: string, profile: ContactSourceProfile) {
  if (profile === 'business_card') {
    return lines.find((line) => line !== title && line !== name && looksLikeCompany(line) && !looksLikePersonName(line))
      ?? lines.find((line) => line !== title && line !== name && !/[.@]/.test(line) && line.split(/\s+/).length <= 5 && !looksLikePersonName(line))
      ?? '';
  }
  return lines.find((line) => line !== title && line !== name && looksLikeCompany(line) && !looksLikePersonName(line))
    ?? lines.find((line) => line !== title && line !== name && !/[.@]/.test(line) && line.split(/\s+/).length <= 6)
    ?? '';
}

function buildNotes(extraLines: string[], address: string, secondaryEmails: string[], secondaryPhones: string[], labeledNotes: string[]) {
  const notes: string[] = [];
  if (address) notes.push(`Address: ${address}`);
  if (secondaryEmails.length) notes.push(`Additional emails: ${secondaryEmails.join(', ')}`);
  if (secondaryPhones.length) notes.push(`Additional phones: ${secondaryPhones.join(', ')}`);
  if (labeledNotes.length) notes.push(labeledNotes.join(' · '));
  const extraContext = uniqueValues(extraLines).slice(0, 2);
  if (extraContext.length) notes.push(extraContext.join(' · '));
  return notes.join('\n');
}

function deriveSourceType(fileType: string | undefined, sourceMode: 'upload' | 'camera' | 'manual' | undefined) {
  if (sourceMode === 'camera') return 'contact_scan_camera';
  if (fileType?.startsWith('image/')) return 'contact_scan_image_upload';
  if (fileType === 'application/pdf') return 'contact_scan_pdf_upload';
  if (fileType?.startsWith('text/') || fileType === 'application/json') return 'contact_scan_text_upload';
  if (sourceMode === 'manual') return 'contact_scan_manual_text';
  return 'contact_scan_upload';
}

function labelConfidence(value: string, strength: 'strong' | 'moderate' | 'weak'): ExtractionConfidence {
  if (!value.trim()) return 'Low';
  if (strength === 'strong') return 'High';
  if (strength === 'moderate') return 'Medium';
  return 'Low';
}

function buildConfidenceNotes(profile: ContactSourceProfile, fields: ExtractedField[]) {
  const lowFields = fields.filter((field) => field.value && field.confidence === 'Low').map((field) => field.label);
  const mediumFields = fields.filter((field) => field.value && field.confidence === 'Medium').map((field) => field.label);
  const notes: string[] = [];
  if (profile === 'business_card') notes.push('Business card profile is active: name, role, company, and direct contact lines are prioritized over decorative text.');
  if (profile === 'screenshot') notes.push('Screenshot profile is active: labeled rows and signature-style blocks are prioritized before free-form OCR text.');
  if (profile === 'scan_pdf') notes.push('Scan-PDF profile is active: extracted lines are merged with OCR output and embedded text-layer recovery when available.');
  if (lowFields.length) notes.push(`Needs extra review: ${lowFields.join(', ')}.`);
  else if (mediumFields.length) notes.push(`Review suggested for: ${mediumFields.join(', ')}.`);
  return notes;
}

export function parseContactText(input: string, options?: { filename?: string | null; sourceMode?: 'upload' | 'camera' | 'manual'; fileType?: string | null }): ContactExtractionResult {
  const lines = compactLines(input);
  const combined = lines.join('\n');
  const sourceProfile = inferSourceProfile(lines, options);
  const labeled = extractLabeledFields(lines);
  const emails = uniqueValues([...labeled.email, ...detectEmails(combined)]);
  const websites = uniqueValues([...labeled.website, ...detectWebsites(combined)]);
  const phones = uniqueValues([...labeled.phone, ...detectPhones(combined)]);
  const unlabeledLines = lines.filter((line) => !labeled.consumed.has(line));
  const name = labeled.name[0] ?? unlabeledLines.find(looksLikePersonName) ?? '';
  const remaining = unlabeledLines.filter((line) => ![name, emails[0] ?? '', websites[0] ?? '', phones[0] ?? ''].includes(line));
  const title = labeled.title[0] ?? remaining.find(looksLikeTitle) ?? '';
  const company = labeled.company[0] ?? pickCompany(remaining, title, name, sourceProfile);
  const address = labeled.address[0] ?? remaining.find((line) => line !== title && line !== company && looksLikeAddress(line)) ?? '';
  const extraLines = remaining.filter((line) => ![title, company, address].includes(line));
  const fileHint = options?.filename ? humanizeFilename(options.filename) : '';
  const sourceType = deriveSourceType(options?.fileType ?? undefined, options?.sourceMode);
  const sourceLabel = options?.filename?.trim() || 'Quick entry contact scan';
  const fallbackCompany = company || (fileHint && !looksLikePersonName(fileHint) ? fileHint : '');
  const draft: ParsedContactDraft = {
    contactName: name,
    companyName: fallbackCompany,
    jobTitle: title,
    email: emails[0] ?? '',
    phone: phones[0] ?? '',
    phoneSecondary: phones[1] ?? '',
    website: websites[0] ?? '',
    notes: buildNotes(extraLines, address, emails.slice(1), phones.slice(2), labeled.notes),
  };

  const fields: ExtractedField[] = [
    { label: 'Full name', value: draft.contactName, confidence: labelConfidence(draft.contactName, labeled.name[0] ? 'strong' : sourceProfile === 'business_card' ? 'moderate' : 'weak') },
    { label: 'Role', value: draft.jobTitle, confidence: labelConfidence(draft.jobTitle, labeled.title[0] ? 'strong' : 'moderate') },
    { label: 'Company', value: draft.companyName, confidence: labelConfidence(draft.companyName, labeled.company[0] || COMPANY_PATTERNS.test(draft.companyName) ? 'strong' : 'moderate') },
    { label: 'Email', value: draft.email, confidence: labelConfidence(draft.email, labeled.email[0] ? 'strong' : 'moderate') },
    { label: 'Phone', value: draft.phone, confidence: labelConfidence(draft.phone, labeled.phone[0] ? 'strong' : sourceProfile === 'business_card' ? 'moderate' : 'weak') },
    { label: 'Phone 2', value: draft.phoneSecondary, confidence: labelConfidence(draft.phoneSecondary, phones.length > 1 ? 'moderate' : 'weak') },
    { label: 'Website', value: draft.website, confidence: labelConfidence(draft.website, labeled.website[0] ? 'strong' : 'moderate') },
    { label: 'Notes', value: draft.notes, confidence: labelConfidence(draft.notes, address || labeled.notes.length ? 'moderate' : 'weak') },
  ];

  const notes = [
    draft.contactName || draft.companyName
      ? 'Review-only extraction prefilled the lead form. Review and edit inline before saving.'
      : 'Review-only extraction found limited structured contact data. Add or correct values inline before saving.',
    options?.sourceMode === 'camera'
      ? 'Camera capture is mapped into the same Quick Entry save path as manual lead creation.'
      : 'Uploaded source metadata is retained in the lead payload for provenance.',
    ...buildConfidenceNotes(sourceProfile, fields),
  ];

  return {
    draft,
    sourceLabel,
    sourceType,
    sourceProfile,
    fields,
    notes,
  };
}
