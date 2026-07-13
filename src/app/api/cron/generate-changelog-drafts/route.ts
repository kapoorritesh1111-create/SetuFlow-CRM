import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { INTERNAL_ORG_ID } from '@/lib/config/internal';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error(
    '[SetuFlow CRON] CRITICAL: CRON_SECRET env var is not set. All cron requests will be rejected. Set it in Vercel > Settings > Environment Variables.',
  );
}

function isAuthorized(request: NextRequest, secret: string) {
  const auth = request.headers.get('authorization') ?? '';
  const querySecret = request.nextUrl.searchParams.get('secret') ?? '';
  return auth === `Bearer ${secret}` || querySecret === secret;
}

type SprintIssueRow = {
  sprint_number: number | null;
  sprint_name: string | null;
  title: string;
  workflow_area: string | null;
  resolved_at: string | null;
};

// Turns a batch of resolved-issue titles into a short, functional-language
// draft summary. Deliberately conservative: no sprint numbers, no issue refs
// in the drafted prose (the sprint_number/sprint_name are stored as real
// columns on smc_changelog for internal filtering, never rendered as text
// to a customer). A human always reviews and rewrites this before publishing
// — this draft exists to save typing, not to be published verbatim.
function draftSummary(sprintName: string, titles: string[]) {
  const cleanTitles = titles.filter(Boolean).slice(0, 12);
  const bullets = cleanTitles.map((t) => `- ${t}`).join('\n');
  return `Draft summary for "${sprintName}" — rewrite in customer-facing language before publishing.\n\nWhat shipped (internal titles, for reference only):\n${bullets}${titles.length > 12 ? `\n- …and ${titles.length - 12} more` : ''}`;
}

export async function GET(request: NextRequest) {
  if (!CRON_SECRET) {
    return NextResponse.json({ ok: false, error: 'Cron not configured - CRON_SECRET missing on server.' }, { status: 503 });
  }
  if (!isAuthorized(request, CRON_SECRET)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceRoleClient();
  if (!db) {
    return NextResponse.json({ ok: false, error: 'Service role client unavailable' }, { status: 500 });
  }

  const { data: issues, error: issuesError } = await db
    .from('sprint_issues')
    .select('sprint_number, sprint_name, title, workflow_area, resolved_at')
    .eq('organization_id', INTERNAL_ORG_ID)
    .eq('status', 'Resolved')
    .not('sprint_number', 'is', null)
    .order('sprint_number', { ascending: true });

  if (issuesError) {
    return NextResponse.json({ ok: false, error: issuesError.message }, { status: 500 });
  }

  const { data: existingDrafts, error: existingError } = await db
    .from('smc_changelog')
    .select('sprint_number')
    .not('sprint_number', 'is', null);

  if (existingError) {
    return NextResponse.json({ ok: false, error: existingError.message }, { status: 500 });
  }

  const alreadyDrafted = new Set((existingDrafts ?? []).map((row) => row.sprint_number));

  const bySprintNumber = new Map<number, { sprintName: string; titles: string[] }>();
  for (const issue of (issues ?? []) as SprintIssueRow[]) {
    if (issue.sprint_number == null) continue;
    if (alreadyDrafted.has(issue.sprint_number)) continue;
    const entry = bySprintNumber.get(issue.sprint_number) ?? { sprintName: issue.sprint_name ?? `Sprint ${issue.sprint_number}`, titles: [] };
    entry.titles.push(issue.title);
    bySprintNumber.set(issue.sprint_number, entry);
  }

  const created: number[] = [];
  for (const [sprintNumber, { sprintName, titles }] of bySprintNumber.entries()) {
    const { error: insertError } = await db.from('smc_changelog').insert({
      title: sprintName,
      content: draftSummary(sprintName, titles),
      version: null,
      category: 'release',
      sprint_number: sprintNumber,
      is_client_facing: false, // never auto-publishes — a human must review and flip this
      published_at: null,
      auto_drafted: true,
      author_name: 'Auto-draft (unreviewed)',
    });
    if (!insertError) created.push(sprintNumber);
  }

  return NextResponse.json({
    ok: true,
    sprintsConsidered: bySprintNumber.size,
    draftsCreated: created,
    note: 'Drafts are never client-facing by default. Review and publish from /smc/changelog.',
  });
}
