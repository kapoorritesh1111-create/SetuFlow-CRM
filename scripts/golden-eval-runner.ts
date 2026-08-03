/**
 * scripts/golden-eval-runner.ts
 * Module F — Golden Evaluation grading script (the "separate deliverable"
 * the dataset file's own TODO said didn't exist yet).
 *
 * Runs every case in GOLDEN_DATASET through the real pipeline
 * (guru-agentic-orchestrator.ts, which wires both retrieve.ts and
 * agentic-tools.ts) and scores it:
 *
 *   - Cases with isPlaceholder: true are SKIPPED, printed visibly, not
 *     silently passed or failed.
 *   - `rag` cases with expectNotFound: checked for the exact
 *     "Data Not Found" phrase.
 *   - `agentic` cases: checked for whether at least one of expectedTools
 *     was actually invoked by Claude (proves the tool-calling wiring
 *     works, not just that an answer was produced).
 *   - `agentic-002`'s {{LEAD_NAME}} template is resolved against a real
 *     lead fetched live from this org's `leads` table before running.
 *
 * KNOWN RISK: agentic tool execution goes through
 * src/lib/queries/query-core.ts (via agentic-tools.ts), which has not
 * been reviewed for the same "createClient() needs a Next.js request
 * scope" issue that dedup.ts/ingest.ts/retrieve.ts all had. If agentic
 * cases fail with a `cookies` / request-scope error, that's the same
 * class of bug, fixable the same way (inject dbClient) — read
 * query-core.ts and apply the same pattern before assuming this script
 * is broken.
 *
 * Run with: npx tsx --env-file=.env.local scripts/golden-eval-runner.ts
 */

import { createClient } from '@supabase/supabase-js';
import { GOLDEN_DATASET, type GoldenCase } from '@/lib/rag/eval/golden-dataset';
import { runGuruAgenticQuery } from '@/lib/rag/guru-agentic-orchestrator';

async function buildAuthenticatedOrgAClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.TEST_ORG_A_EMAIL;
  const password = process.env.TEST_ORG_A_PASSWORD;
  if (!url || !anonKey || !email || !password) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / TEST_ORG_A_EMAIL / TEST_ORG_A_PASSWORD');
  }
  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Org A test user sign-in failed: ${error.message}`);
  return client;
}

async function resolveLeadName(dbClient: any, orgId: string): Promise<string | null> {
  const { data, error } = await dbClient
    .from('leads')
    .select('company_name, contact_name')
    .eq('organization_id', orgId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data.company_name || data.contact_name || null;
}

interface CaseResult {
  id: string;
  status: 'pass' | 'fail' | 'skipped' | 'error';
  detail: string;
}

async function runCase(dbClient: any, orgId: string, testCase: GoldenCase, leadName: string | null): Promise<CaseResult> {
  if (testCase.isPlaceholder) {
    return { id: testCase.id, status: 'skipped', detail: 'placeholder — no real document ingested for this case yet' };
  }

  const query = testCase.query.replace('{{LEAD_NAME}}', leadName ?? '');
  if (testCase.query.includes('{{LEAD_NAME}}') && !leadName) {
    return { id: testCase.id, status: 'skipped', detail: 'no lead found in this org to resolve {{LEAD_NAME}} against' };
  }

  try {
    const result = await runGuruAgenticQuery(orgId, query, dbClient);

    if (testCase.type === 'rag' && testCase.expectNotFound) {
      const pass = result.answer.includes('Data Not Found');
      return {
        id: testCase.id,
        status: pass ? 'pass' : 'fail',
        detail: pass ? 'correctly returned Data Not Found' : `expected "Data Not Found", got: "${result.answer}"`,
      };
    }

    if (testCase.type === 'agentic') {
      const expected = testCase.expectedTools ?? [];
      const matched = result.toolsUsed.filter((t) => expected.includes(t));
      const pass = matched.length > 0;
      return {
        id: testCase.id,
        status: pass ? 'pass' : 'fail',
        detail: pass
          ? `invoked ${matched.join(', ')} (expected one of: ${expected.join(', ')})`
          : `expected one of [${expected.join(', ')}], but tools invoked were: [${result.toolsUsed.join(', ') || 'none'}]. Answer: "${result.answer}"`,
      };
    }

    // rag case without expectNotFound and without isPlaceholder (none currently exist,
    // but handle it): no automated grading possible without a real expected answer —
    // print the answer for manual/LLM-judge review rather than guessing pass/fail.
    return { id: testCase.id, status: 'skipped', detail: `no automated grading rule for this case — answer was: "${result.answer}"` };
  } catch (err) {
    return {
      id: testCase.id,
      status: 'error',
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main() {
  const orgId = process.env.TEST_ORG_A_ID;
  if (!orgId) {
    console.error('TEST_ORG_A_ID not found in env');
    process.exit(1);
  }

  const dbClient = await buildAuthenticatedOrgAClient();
  console.log('Signed in as TEST_ORG_A user.\n');

  const leadName = await resolveLeadName(dbClient, orgId);
  console.log(`Resolved {{LEAD_NAME}} -> ${leadName ?? '(no lead found)'}\n`);

  const results: CaseResult[] = [];
  for (const testCase of GOLDEN_DATASET) {
    console.log(`Running ${testCase.id}...`);
    const result = await runCase(dbClient, orgId, testCase, leadName);
    results.push(result);
    console.log(`  ${result.status.toUpperCase()}: ${result.detail}\n`);
  }

  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errored = results.filter((r) => r.status === 'error').length;

  console.log('--- SUMMARY ---');
  console.log(`${results.length} cases: ${pass} pass, ${fail} fail, ${skipped} skipped, ${errored} errored`);
  if (fail > 0 || errored > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error('\nSCRIPT CRASHED:', err);
  process.exit(1);
});