import type { SprintIssue } from '@/lib/queries/workspace';

export const SMC_RANGE_OPTIONS = ['today', 'yesterday', '7d', '14d', '30d', '90d', 'all'] as const;
export type SmcRange = (typeof SMC_RANGE_OPTIONS)[number] | 'custom';

export type SmcFilterInput = Record<string, string | string[] | undefined> | undefined;

export type SmcFilters = {
  range: SmcRange;
  start?: string;
  end?: string;
  sprint?: number;
  severity?: string;
  status?: string;
  area?: string;
  reporter?: string;
  q?: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toDateOnly(value?: string) {
  if (!value) return undefined;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

export function normalizeSmcFilters(searchParams?: SmcFilterInput): SmcFilters {
  const rawRange = first(searchParams?.range);
  const range: SmcRange = rawRange === 'today' || rawRange === 'yesterday' || rawRange === '7d' || rawRange === '30d' || rawRange === '90d' || rawRange === 'all' || rawRange === 'custom'
    ? rawRange
    : '14d';
  const sprintValue = Number(first(searchParams?.sprint));
  return {
    range,
    start: toDateOnly(first(searchParams?.start)),
    end: toDateOnly(first(searchParams?.end)),
    sprint: Number.isFinite(sprintValue) && sprintValue > 0 ? sprintValue : undefined,
    severity: first(searchParams?.severity) || undefined,
    status: first(searchParams?.status) || undefined,
    area: first(searchParams?.area) || undefined,
    reporter: first(searchParams?.reporter) || undefined,
    q: first(searchParams?.q)?.trim() || undefined,
  };
}

function safeDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfUtcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function endOfUtcDay(value: Date) {
  const date = startOfUtcDay(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
}

function parseDateOnly(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getRangeBounds(filters: SmcFilters, issues: SprintIssue[]) {
  const today = startOfUtcDay(new Date());
  let start = new Date(today);
  let end = endOfUtcDay(today);
  let label = 'Last 14 days';

  if (filters.range === 'today') {
    label = 'Today';
  } else if (filters.range === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setUTCDate(today.getUTCDate() - 1);
    start = startOfUtcDay(yesterday);
    end = endOfUtcDay(yesterday);
    label = 'Yesterday';
  } else if (filters.range === 'custom') {
    const oldest = issues
      .map((issue) => safeDate(issue.created_at))
      .filter(Boolean)
      .sort((a, b) => a!.getTime() - b!.getTime())[0] ?? today;
    start = parseDateOnly(filters.start) ?? startOfUtcDay(oldest);
    end = endOfUtcDay(parseDateOnly(filters.end) ?? today);
    label = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  } else if (filters.range === 'all') {
    const oldest = issues
      .map((issue) => safeDate(issue.created_at))
      .filter(Boolean)
      .sort((a, b) => a!.getTime() - b!.getTime())[0];
    start = startOfUtcDay(oldest ?? today);
    label = 'All time';
  } else {
    const days = filters.range === '90d' ? 90 : filters.range === '30d' ? 30 : filters.range === '7d' ? 7 : 14;
    start.setUTCDate(today.getUTCDate() - (days - 1));
    label = `Last ${days} days`;
  }

  if (start.getTime() > end.getTime()) {
    const originalStart = start;
    start = startOfUtcDay(end);
    end = endOfUtcDay(originalStart);
  }

  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86_400_000));
  const bucket: 'day' | 'week' | 'month' = days > 210 ? 'month' : days > 45 ? 'week' : 'day';
  return { start, end, label, bucket, days };
}

function isBetween(date: Date | null, start: Date, end: Date) {
  if (!date) return false;
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function issueMatchesRange(issue: SprintIssue, filters: SmcFilters, issues: SprintIssue[]) {
  if (filters.range === 'all') return true;
  const { start, end } = getRangeBounds(filters, issues);
  // Range filters on created_at only — "show issues created in this window"
  // Also include issues updated within range so active work stays visible
  return isBetween(safeDate(issue.created_at), start, end)
    || isBetween(safeDate(issue.updated_at), start, end);
}

function issueMatchesSearch(issue: SprintIssue, query?: string) {
  if (!query) return true;
  const q = query.toLowerCase();
  const searchable = [
    issue.issue_ref,
    issue.title,
    issue.description,
    issue.area,
    issue.workflow_area,
    issue.status,
    issue.severity,
    issue.assigned_to,
    issue.reporter_name,
    issue.sprint_name,
    issue.issue_category,
    issue.effort,
  ];
  return searchable.some((value) => String(value ?? '').toLowerCase().includes(q));
}

export function issueMatchesSmcFilters(issue: SprintIssue, filters: SmcFilters, issues: SprintIssue[]) {
  if (filters.sprint && issue.sprint_number !== filters.sprint) return false;
  if (filters.severity && issue.severity !== filters.severity) return false;
  if (filters.status && issue.status !== filters.status) return false;
  if (filters.area) {
    const area = issue.area ?? issue.workflow_area ?? '';
    if (area !== filters.area) return false;
  }
  if (filters.reporter) {
    const reporter = issue.reporter_name ?? '';
    if (reporter !== filters.reporter) return false;
  }
  if (!issueMatchesSearch(issue, filters.q)) return false;
  return issueMatchesRange(issue, filters, issues);
}

export function filterIssuesForSmc(issues: SprintIssue[], filters: SmcFilters) {
  return issues.filter((issue) => issueMatchesSmcFilters(issue, filters, issues));
}

export function appendSmcQuery(path: string, filters: SmcFilters, overrides: Partial<SmcFilters> = {}) {
  const merged = { ...filters, ...overrides };
  const params = new URLSearchParams();
  if (merged.range && merged.range !== '14d') params.set('range', merged.range);
  if (merged.range === 'custom') {
    if (merged.start) params.set('start', merged.start);
    if (merged.end) params.set('end', merged.end);
  }
  if (merged.sprint) params.set('sprint', String(merged.sprint));
  if (merged.severity) params.set('severity', merged.severity);
  if (merged.status) params.set('status', merged.status);
  if (merged.area) params.set('area', merged.area);
  if (merged.reporter) params.set('reporter', merged.reporter);
  if (merged.q) params.set('q', merged.q);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
