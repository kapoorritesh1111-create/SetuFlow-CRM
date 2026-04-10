function formatWithIntl(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions,
) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(date);
}

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export function getInitials(value?: string | null) {
  const text = value?.trim();
  if (!text) return 'SF';
  const initials = text
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return initials || 'SF';
}

export function formatDate(value?: string | null) {
  return formatWithIntl(value, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(value?: string | null) {
  return formatWithIntl(value, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

export function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function parseInteger(value: FormDataEntryValue | string | null | undefined, fallback = 0) {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseNullableNumber(value: FormDataEntryValue | string | null | undefined) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBoolean(value: FormDataEntryValue | string | null | undefined) {
  return ['true', 'on', '1', 'yes'].includes(String(value ?? '').toLowerCase());
}

export function uniqueTrimmed(values: string[]) {
  return [...new Set(values.map((item) => item.trim()).filter(Boolean))];
}
