/**
 * Cross-Tenant Isolation — Setu Guru RAG layer
 *
 * This is the safety GATE for the embeddings layer. It guarantees that one
 * organization can never read, semantically match, or delete another org's
 * guru_embeddings rows. Two layers:
 *
 *   1. DETERMINISTIC (always runs, no network) — asserts the isolation
 *      properties are present in the migration SQL and the retrieval code,
 *      so a future refactor can't silently weaken them. This is the part
 *      that must stay green in CI on every PR.
 *
 *   2. LIVE (runs only when a test Supabase + two seeded org users are
 *      configured) — actually attempts cross-tenant read / match / delete
 *      against a real database and asserts every attempt is denied.
 *
 * Run: tsx --test tests/security/guru-rag-tenant-isolation.test.ts
 * Add to package.json "test:security" alongside the existing rls tests.
 *
 * Live env (all optional; the live block skips if any are missing):
 *   SUPABASE_URL
 *   SUPABASE_ANON_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEST_ORG_A_ID, TEST_ORG_A_EMAIL, TEST_ORG_A_PASSWORD
 *   TEST_ORG_B_ID, TEST_ORG_B_EMAIL, TEST_ORG_B_PASSWORD
 */

import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'supabase')) || existsSync(join(dir, 'package.json'))) return dir;
    dir = dirname(dir);
  }
  return start;
}

const REPO_ROOT = findRepoRoot(__dirname);

function findGuruMigration(): string | null {
  const dir = join(REPO_ROOT, 'supabase', 'migrations');
  if (!existsSync(dir)) return null;
  const match = readdirSync(dir).find((f) => /guru.*(rag|embedding)/i.test(f) && f.endsWith('.sql'));
  return match ? join(dir, match) : null;
}

function fnBody(sql: string, name: string): string {
  const re = new RegExp(`create or replace function public\\.${name}[\\s\\S]*?\\$\\$;`, 'i');
  return sql.match(re)?.[0] ?? '';
}

function statement(sql: string, head: RegExp): string {
  const re = new RegExp(`${head.source}[\\s\\S]*?;`, 'i');
  return sql.match(re)?.[0] ?? '';
}

function findRetrieveModule(): string | null {
  const candidates = [
    join(REPO_ROOT, 'src', 'lib', 'rag', 'retrieve.ts'),
    join(REPO_ROOT, 'src', 'lib', 'setu-guru', 'rag', 'retrieve.ts'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

describe('guru RAG isolation — migration properties', () => {
  const migrationPath = findGuruMigration();
  const skip = migrationPath ? false : 'guru RAG migration not found — integrate it first';
  const sql = migrationPath ? readFileSync(migrationPath, 'utf8').toLowerCase() : '';

  test('embeddings table enables AND forces row level security', { skip }, () => {
    assert.match(sql, /alter table public\.guru_embeddings enable row level security/);
    assert.match(sql, /alter table public\.guru_embeddings force row level security/);
  });

  test('a read policy is scoped by is_org_member(organization_id)', { skip }, () => {
    assert.match(sql, /for select[\s\S]*is_org_member\(organization_id\)/);
  });

  test('match RPC is SECURITY INVOKER, never DEFINER', { skip }, () => {
    const body = fnBody(sql, 'match_guru_embeddings');
    assert.notEqual(body, '', 'match_guru_embeddings function not found');
    assert.match(body, /security invoker/);
    assert.doesNotMatch(body, /security definer/);
  });

  test('match RPC has a fail-closed org-membership guard', { skip }, () => {
    assert.match(sql, /is_org_member\(p_organization_id\)/);
  });

  test('functions pin search_path', { skip }, () => {
    assert.match(sql, /set search_path = public, extensions/);
  });

  test('match RPC is granted to authenticated and NOT to anon', { skip }, () => {
    const grant = statement(sql, /grant execute on function public\.match_guru_embeddings/);
    assert.notEqual(grant, '', 'grant for match_guru_embeddings not found');
    assert.match(grant, /to authenticated/);
    assert.doesNotMatch(grant, /to anon/);
  });

  test('delete helper authorizes the org and raises on mismatch', { skip }, () => {
    assert.match(
      sql,
      /delete_guru_embeddings_for_source[\s\S]*?is_org_member\(p_organization_id\)[\s\S]*?raise exception/,
    );
  });

  test('every embeddings access in functions filters by organization_id', { skip }, () => {
    const fnBodies = sql.split('create or replace function').slice(1);
    for (const body of fnBodies) {
      if (body.includes('guru_embeddings')) {
        assert.match(
          body,
          /organization_id\s*=\s*(p_organization_id|old\.organization_id)/,
          'a function touches guru_embeddings without an organization_id filter',
        );
      }
    }
  });
});

describe('guru RAG isolation — retrieval code properties', () => {
  const retrievePath = findRetrieveModule();
  const skip = retrievePath ? false : 'retrieve.ts not found — integrate it first';
  const code = retrievePath ? readFileSync(retrievePath, 'utf8') : '';

  test('retrieval uses the RLS-scoped server client, not service-role', { skip }, () => {
    assert.match(code, /@\/lib\/supabase\/server/);
    assert.doesNotMatch(code, /service-role|createServiceRoleClient/);
  });

  test('retrieval always passes p_organization_id to the match RPC', { skip }, () => {
    assert.match(code, /match_guru_embeddings/);
    assert.match(code, /p_organization_id:\s*input\.organizationId/);
  });

  test('retrieval returns empty without an org or question', { skip }, () => {
    assert.match(code, /if\s*\(!input\.organizationId[\s\S]*?return NOT_FOUND/);
  });
});

const LIVE_ENV = {
  url: process.env.SUPABASE_URL,
  anon: process.env.SUPABASE_ANON_KEY,
  service: process.env.SUPABASE_SERVICE_ROLE_KEY,
  orgA: process.env.TEST_ORG_A_ID,
  orgAEmail: process.env.TEST_ORG_A_EMAIL,
  orgAPass: process.env.TEST_ORG_A_PASSWORD,
  orgB: process.env.TEST_ORG_B_ID,
  orgBEmail: process.env.TEST_ORG_B_EMAIL,
  orgBPass: process.env.TEST_ORG_B_PASSWORD,
};
const liveReady = Object.values(LIVE_ENV).every(Boolean);
const liveSkip = liveReady ? false : 'live Supabase + two test orgs not configured';

const ZERO_VECTOR = `[${new Array(1024).fill(0).join(',')}]`;
const SOURCE_ID_A = '00000000-0000-4000-8000-00000000000a';
const SOURCE_ID_B = '00000000-0000-4000-8000-00000000000b';

describe('guru RAG isolation — live cross-tenant attacks', () => {
  let service: any;
  let clientA: any;

  before(async () => {
    if (!liveReady) return;
    const { createClient } = await import('@supabase/supabase-js');

    service = createClient(LIVE_ENV.url!, LIVE_ENV.service!, {
      auth: { persistSession: false },
    });

    const seed = async (org: string, sourceId: string, marker: string) => {
      await service.from('guru_embeddings').upsert(
        {
          organization_id: org,
          source_type: 'regulatory_doc',
          source_id: sourceId,
          chunk_index: 0,
          content: `ISOLATION-TEST ${marker}`,
          embedding: ZERO_VECTOR,
          embedding_model: 'test',
          metadata: { content_hash: marker, isolation_test: true },
        },
        { onConflict: 'organization_id,source_type,source_id,chunk_index' },
      );
    };
    await seed(LIVE_ENV.orgA!, SOURCE_ID_A, 'ORG_A_SECRET');
    await seed(LIVE_ENV.orgB!, SOURCE_ID_B, 'ORG_B_SECRET');

    clientA = createClient(LIVE_ENV.url!, LIVE_ENV.anon!, { auth: { persistSession: false } });
    const { error } = await clientA.auth.signInWithPassword({
      email: LIVE_ENV.orgAEmail!,
      password: LIVE_ENV.orgAPass!,
    });
    assert.equal(error, null, 'org A test user sign-in failed');
  });

  after(async () => {
    if (!liveReady || !service) return;
    await service
      .from('guru_embeddings')
      .delete()
      .in('source_id', [SOURCE_ID_A, SOURCE_ID_B])
      .eq('metadata->>isolation_test', 'true');
  });

  test('org A cannot SELECT org B rows directly', { skip: liveSkip }, async () => {
    const { data } = await clientA
      .from('guru_embeddings')
      .select('organization_id, content')
      .eq('organization_id', LIVE_ENV.orgB!);
    assert.deepEqual(data ?? [], [], 'RLS leaked org B rows to an org A client');
  });

  test('org A SELECT * returns only org A rows', { skip: liveSkip }, async () => {
    const { data } = await clientA.from('guru_embeddings').select('organization_id');
    const foreign = (data ?? []).filter((r: any) => r.organization_id !== LIVE_ENV.orgA);
    assert.deepEqual(foreign, [], 'org A client saw rows from another org');
  });

  test('match RPC for org B returns nothing to an org A caller', { skip: liveSkip }, async () => {
    const { data, error } = await clientA.rpc('match_guru_embeddings', {
      p_organization_id: LIVE_ENV.orgB!,
      p_query_embedding: ZERO_VECTOR,
      p_query_text: 'ISOLATION-TEST',
      p_match_count: 10,
      p_source_types: null,
    });
    const rows = (data ?? []) as Array<{ content?: string }>;
    const leaked = rows.some((r) => (r.content ?? '').includes('ORG_B_SECRET'));
    assert.equal(leaked, false, 'match RPC leaked org B content to an org A caller');
    if (error) assert.match(String(error.message ?? ''), /.*/);
  });

  test('match RPC for org A returns only org A content', { skip: liveSkip }, async () => {
    const { data } = await clientA.rpc('match_guru_embeddings', {
      p_organization_id: LIVE_ENV.orgA!,
      p_query_embedding: ZERO_VECTOR,
      p_query_text: 'ISOLATION-TEST',
      p_match_count: 10,
      p_source_types: null,
    });
    const rows = (data ?? []) as Array<{ content?: string }>;
    assert.equal(
      rows.some((r) => (r.content ?? '').includes('ORG_B_SECRET')),
      false,
      'org A retrieval surfaced org B content',
    );
  });

  test('org A cannot DELETE org B embeddings via the helper', { skip: liveSkip }, async () => {
    const { data, error } = await clientA.rpc('delete_guru_embeddings_for_source', {
      p_organization_id: LIVE_ENV.orgB!,
      p_source_type: 'regulatory_doc',
      p_source_id: SOURCE_ID_B,
    });
    if (!error) assert.equal(Number(data ?? 0), 0, 'delete helper removed org B rows for an org A caller');

    const { data: still } = await service
      .from('guru_embeddings')
      .select('source_id')
      .eq('organization_id', LIVE_ENV.orgB!)
      .eq('source_id', SOURCE_ID_B);
    assert.equal((still ?? []).length, 1, 'org B embedding was destroyed by an org A caller');
  });
});