/**
 * scripts/manual-deletion-smoke-test.ts
 *
 * Tests handleSourceDeletion() (Module E) against real data: finds the
 * test document previously ingested by manual-ingest-smoke-test.ts
 * (source_type = 'test_manual_ingest'), deletes its embeddings, and
 * verifies:
 *   1. The correct number of rows were deleted.
 *   2. The rows are actually gone from guru_embeddings.
 *   3. Calling it again with the SAME idempotencyKey is recognized as a
 *      duplicate (doesn't error, doesn't try to delete again).
 *   4. An audit_logs row was written.
 *
 * IMPORTANT: uses an authenticated TEST_ORG_A session (signed in via
 * password, same as the tenant-isolation test), NOT the service-role key.
 * `delete_guru_embeddings_for_source` calls `is_org_member(p_organization_id)`,
 * which checks against the CALLER's real auth session — service-role has
 * no session, so it correctly fails that check (this is the RLS/RPC
 * security working as intended, not a bug). Production call sites (the
 * API route) always use a real logged-in user's session for the same
 * reason, so this test now matches real usage.
 *
 * Run with: npx tsx --env-file=.env.local scripts/manual-deletion-smoke-test.ts
 */

import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { handleSourceDeletion } from '@/lib/rag/deletion-handler';

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
  if (error) {
    throw new Error(`Org A test user sign-in failed: ${error.message}`);
  }
  return client;
}

async function main() {
  const orgId = process.env.TEST_ORG_A_ID;
  if (!orgId) {
    console.error('TEST_ORG_A_ID not found in env');
    process.exit(1);
  }

  const dbClient = await buildAuthenticatedOrgAClient();
  console.log('Signed in as TEST_ORG_A user.\n');

  // --- Find the test document previously ingested ---------------------------
  const { data: existingRows, error: findError } = await dbClient
    .from('guru_embeddings')
    .select('source_id, chunk_index')
    .eq('organization_id', orgId)
    .eq('source_type', 'test_manual_ingest');

  if (findError) {
    console.error('Lookup failed:', findError.message);
    process.exit(1);
  }

  if (!existingRows || existingRows.length === 0) {
    console.error(
      'No test_manual_ingest rows found. Run manual-ingest-smoke-test.ts first so there is something to delete.',
    );
    process.exit(1);
  }

  const sourceId = existingRows[0].source_id;
  const expectedCount = existingRows.filter((r) => r.source_id === sourceId).length;
  console.log(`Found ${expectedCount} chunk(s) for source_id=${sourceId}. Deleting...\n`);

  const idempotencyKey = `manual-deletion-test-${randomUUID()}`;

  // --- Run 1: actual deletion -------------------------------------------------
  console.log('--- RUN 1 (first deletion attempt) ---');
  const result1 = await handleSourceDeletion({
    organizationId: orgId,
    sourceType: 'test_manual_ingest',
    sourceId,
    idempotencyKey,
    actorUserId: null,
    dbClient,
  });
  console.log(JSON.stringify(result1, null, 2));

  // --- Verify rows are actually gone -----------------------------------------
  const { data: afterDelete, error: verifyError } = await dbClient
    .from('guru_embeddings')
    .select('id')
    .eq('organization_id', orgId)
    .eq('source_type', 'test_manual_ingest')
    .eq('source_id', sourceId);

  if (verifyError) {
    console.error('Post-delete verification query failed:', verifyError.message);
  } else {
    console.log(`\nRows remaining after delete: ${afterDelete?.length ?? 'unknown'} (expected: 0)`);
  }

  // --- Run 2: same idempotencyKey, should be recognized as duplicate ---------
  console.log('\n--- RUN 2 (same idempotencyKey — should be a no-op duplicate) ---');
  const result2 = await handleSourceDeletion({
    organizationId: orgId,
    sourceType: 'test_manual_ingest',
    sourceId,
    idempotencyKey,
    actorUserId: null,
    dbClient,
  });
  console.log(JSON.stringify(result2, null, 2));

  // --- Verify audit log was written -------------------------------------------
  const { data: auditRows, error: auditError } = await dbClient
    .from('audit_logs')
    .select('id, action, payload')
    .eq('organization_id', orgId)
    .eq('entity_type', 'guru_embeddings_deletion')
    .contains('payload', { idempotencyKey });

  console.log(`\nAudit log rows found for this idempotencyKey: ${auditRows?.length ?? 'query failed'}`);
  if (auditError) console.error('Audit query error:', auditError.message);

  console.log('\n--- SUMMARY ---');
  console.log(`Run 1: ok=${result1.ok}, deletedCount=${result1.deletedCount}, duplicate=${result1.duplicate} (expected: ok=true, deletedCount=${expectedCount}, duplicate=false)`);
  console.log(`Run 2: ok=${result2.ok}, deletedCount=${result2.deletedCount}, duplicate=${result2.duplicate} (expected: ok=true, deletedCount=0, duplicate=true)`);
  console.log(`Rows remaining: ${afterDelete?.length ?? 'unknown'} (expected: 0)`);
  console.log(`Audit log entries: ${auditRows?.length ?? 'unknown'} (expected: 1 — not 2, since run 2 was a duplicate no-op)`);
}

main().catch((err) => {
  console.error('\nSCRIPT CRASHED:', err);
  process.exit(1);
});