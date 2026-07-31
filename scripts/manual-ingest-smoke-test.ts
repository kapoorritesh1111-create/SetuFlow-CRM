/**
 * scripts/manual-ingest-smoke-test.ts
 *
 * Run with: npx tsx scripts/manual-ingest-smoke-test.ts "C:\path\to\some.pdf"
 *
 * Calls the REAL ingestDocument() against your real Supabase + Anthropic
 * setup. Uses TEST_ORG_A_ID from .env (seeded test org) so this never
 * touches real client data.
 *
 * Runs ingestion TWICE on the same file to also verify SHA-256 dedup:
 * the 2nd call should return status 'skipped_duplicate'.
 */

import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { ingestDocument } from '@/lib/rag/ingest';

/**
 * ⚠️ SERVICE-ROLE CLIENT — bypasses RLS entirely.
 * Only used here because this is a standalone script with no Next.js
 * request/cookies to build the normal RLS-scoped client from. The API
 * route (production path) does NOT do this — it uses the normal
 * request-scoped client via `@/lib/supabase/server`, which still goes
 * through `is_org_member()` checks. This script intentionally writes only
 * to TEST_ORG_A_ID with sourceType 'test_manual_ingest' to stay isolated
 * from real client data despite the RLS bypass.
 */
function buildServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from env');
  }
  return createClient(url, serviceKey);
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Usage: npx tsx scripts/manual-ingest-smoke-test.ts <path-to-pdf>');
    process.exit(1);
  }

  const orgId = process.env.TEST_ORG_A_ID;
  if (!orgId) {
    console.error('TEST_ORG_A_ID not found in env — is .env loaded?');
    process.exit(1);
  }

  const dbClient = buildServiceRoleClient();
  const fileBuffer = readFileSync(filePath);
  const sourceId = randomUUID();

  console.log(`\n--- RUN 1 (fresh document, org=${orgId}, sourceId=${sourceId}) ---`);
  const result1 = await ingestDocument({
    organizationId: orgId,
    sourceType: 'test_manual_ingest',
    sourceId,
    fileBuffer,
    mimeType: 'application/pdf',
    dbClient,
  });
  console.log(JSON.stringify(result1, null, 2));

  console.log(`\n--- RUN 2 (same file, same sourceId — should skip as duplicate) ---`);
  const result2 = await ingestDocument({
    organizationId: orgId,
    sourceType: 'test_manual_ingest',
    sourceId,
    fileBuffer,
    mimeType: 'application/pdf',
    dbClient,
  });
  console.log(JSON.stringify(result2, null, 2));

  console.log('\n--- SUMMARY ---');
  console.log('Run 1 status:', result1.status, '(expected: "ingested")');
  console.log('Run 2 status:', result2.status, '(expected: "skipped_duplicate")');
}

main().catch((err) => {
  console.error('\nSCRIPT CRASHED:', err);
  process.exit(1);
});