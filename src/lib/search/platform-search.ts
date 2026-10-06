export function normalizeSearchText(value: unknown) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizePhoneSearch(value: unknown) {
  return String(value ?? '').replace(/\D/g, '');
}

function phoneVariants(value: unknown) {
  const digits = normalizePhoneSearch(value);
  if (!digits) return [] as string[];
  const variants = new Set<string>([digits]);
  const withoutTrunkPrefix = digits.replace(/^0+/, '');
  if (withoutTrunkPrefix) variants.add(withoutTrunkPrefix);
  if (digits.length > 10) variants.add(digits.slice(-10));
  if (withoutTrunkPrefix.length > 10) variants.add(withoutTrunkPrefix.slice(-10));
  return Array.from(variants).filter(Boolean);
}

export function matchesPlatformSearch(query: unknown, values: unknown[], phoneValues: unknown[] = []) {
  const textNeedle = normalizeSearchText(query);
  if (!textNeedle) return true;
  if (values.some((value) => normalizeSearchText(value).includes(textNeedle))) return true;

  const queryVariants = phoneVariants(query).filter((value) => value.length >= 3);
  if (!queryVariants.length) return false;

  return phoneValues.some((value) => {
    const candidateVariants = phoneVariants(value);
    return queryVariants.some((needle) =>
      candidateVariants.some((candidate) => candidate.includes(needle) || needle.includes(candidate))
    );
  });
}
