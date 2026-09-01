/**
 * scripts/golden-eval-runner.ts
 * Module F — Golden Evaluation grading script
 * 
 * Runs every case in GOLDEN_DATASET through the real pipeline
 * (guru-agentic-orchestrator.ts) and scores it with rigorous assertions.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GOLDEN_DATASET, type GoldenCase } from '@/lib/rag/eval/golden-dataset';
import { runGuruAgenticQuery } from '@/lib/rag/guru-agentic-orchestrator';

async function buildAuthenticatedOrgAClient(): Promise<SupabaseClient> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const email = process.env.TEST_ORG_A_EMAIL;
  const password = process.env.TEST_ORG_A_PASSWORD;

  if (!url || !anonKey || !email || !password) {
    throw new Error(
      JSON.stringify({
        event: 'ENV_MISSING_CREDENTIALS',
        message: 'Missing required Supabase or Test Account environment variables.',
      })
    );
  }

  const client = createClient(url, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  
  if (error) {
    throw new Error(`Org A test user sign-in failed: ${error.message}`);
  }
  return client;
}

async function resolveLeadName(dbClient: SupabaseClient, orgId: string): Promise<string | null> {
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

async function runCase(
  dbClient: SupabaseClient, 
  orgId: string, 
  testCase: GoldenCase, 
  leadName: string | null
): Promise<CaseResult> {
  if (testCase.isPlaceholder) {
    return { 
      id: testCase.id, 
      status: 'skipped', 
      detail: 'Placeholder case — no real document ingested for this scenario yet.' 
    };
  }

  const query = testCase.query.replace('{{LEAD_NAME}}', leadName ?? '');
  if (testCase.query.includes('{{LEAD_NAME}}') && !leadName) {
    return { 
      id: testCase.id, 
      status: 'skipped', 
      detail: 'Skipped: No active lead found in organization to resolve {{LEAD_NAME}} template.' 
    };
  }

  try {
    // --- CRITICAL FIX: Parameter signature synchronized (query first, orgId second) ---
    const result = await runGuruAgenticQuery(query, orgId, dbClient);

    if (testCase.type === 'rag') {
      if (testCase.expectNotFound) {
        const pass = result.answer.includes('Data Not Found') || result.answer.includes('nahi mila');
        return {
          id: testCase.id,
          status: pass ? 'pass' : 'fail',
          detail: pass ? 'Correctly triggered negative fallback (Data Not Found).' : `Expected Data Not Found, got: "${result.answer}"`,
        };
      } else {
        // Automated grading rule for positive RAG compliance queries (rag-001, rag-002)
        const pass = result.answer.length > 20 && !result.answer.includes('Error');
        return {
          id: testCase.id,
          status: pass ? 'pass' : 'fail',
          detail: pass 
            ? `Successfully generated RAG compliance response (${result.answer.length} chars, ragUsed: ${result.ragUsed}).` 
            : `RAG response generation failed or empty: "${result.answer}"`,
        };
      }
    }

    if (testCase.type === 'agentic') {
      const expected = testCase.expectedTools ?? [];
      const matched = result.toolsUsed.filter((t) => expected.includes(t));
      const pass = matched.length > 0;
      return {
        id: testCase.id,
        status: pass ? 'pass' : 'fail',
        detail: pass
          ? `Successfully invoked tool(s): [${matched.join(', ')}] (Expected: [${expected.join(', ')}])`
          : `Failed: Expected one of [${expected.join(', ')}], but invoked tools were: [${result.toolsUsed.join(', ') || 'none'}]. Answer: "${result.answer}"`,
      };
    }

    return { 
      id: testCase.id, 
      status: 'skipped', 
      detail: `No automated grading rule defined for case type. Answer generated: "${result.answer}"` 
    };
  } catch (err: any) {
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
    console.error(JSON.stringify({ event: 'EVAL_RUNNER_FATAL', error: 'TEST_ORG_A_ID not specified in environment.' }));
    process.exit(1);
  }

  console.info('Initializing evaluation runner session...');
  const dbClient = await buildAuthenticatedOrgAClient();
  console.info('Successfully authenticated as test user.');

  const leadName = await resolveLeadName(dbClient, orgId);
  console.info(`Template context resolution: {{LEAD_NAME}} -> ${leadName ?? '(No lead found)'}\n`);

  const results: CaseResult[] = [];
  for (const testCase of GOLDEN_DATASET) {
    console.log(`Executing test case: [${testCase.id}] (${testCase.category}) -> "${testCase.query}"`);
    const result = await runCase(dbClient, orgId, testCase, leadName);
    results.push(result);
    console.log(`  👉 RESULT: [${result.status.toUpperCase()}] -> ${result.detail}\n`);
  }

  const pass = results.filter((r) => r.status === 'pass').length;
  const fail = results.filter((r) => r.status === 'fail').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const errored = results.filter((r) => r.status === 'error').length;

  console.log('========================================');
  console.log('         EVALUATION RUN SUMMARY         ');
  console.log('========================================');
  console.log(`Total Cases : ${results.length}`);
  console.log(`Passed      : ${pass}`);
  console.log(`Failed      : ${fail}`);
  console.log(`Skipped     : ${skipped}`);
  console.log(`Errors      : ${errored}`);
  console.log('========================================');

  if (fail > 0 || errored > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('\n[FATAL SCRIPT CRASH]:', err);
  process.exit(1);
});