export function normalizeSearchText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizePhoneSearch(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

export function matchesPlatformSearch(query: unknown, values: unknown[], phoneValues: unknown[] = []) {
  const textNeedle = normalizeSearchText(query);
  if (!textNeedle) return true;
  if (values.some((value) => normalizeSearchText(value).includes(textNeedle))) return true;
  const phoneNeedle = normalizePhoneSearch(query);
  if (phoneNeedle.length < 3) return false;
  return phoneValues.some((value) => normalizePhoneSearch(value).includes(phoneNeedle));
}
