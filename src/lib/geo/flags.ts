export function iso2ToFlagEmoji(value?: string | null) {
  const iso2 = String(value ?? '').trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(iso2)) return '🌐';
  return iso2
    .split('')
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join('');
}

export function countryLabelWithFlag(country?: { name?: string | null; iso2_code?: string | null } | null) {
  if (!country?.name) return 'Select country';
  return `${iso2ToFlagEmoji(country.iso2_code)} ${country.name}`;
}
