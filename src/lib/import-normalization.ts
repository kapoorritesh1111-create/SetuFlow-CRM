export function normalizeImportText(value: FormDataEntryValue | string | null | undefined) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function normalizeImportOptionalText(value: FormDataEntryValue | string | null | undefined) {
  const normalized = normalizeImportText(value);
  return normalized || null;
}

export function normalizeImportComparableText(value: FormDataEntryValue | string | null | undefined) {
  return normalizeImportText(value).toLocaleLowerCase();
}

export function normalizeImportEmail(value: FormDataEntryValue | string | null | undefined) {
  const normalized = normalizeImportText(value).toLocaleLowerCase();
  return normalized || null;
}
