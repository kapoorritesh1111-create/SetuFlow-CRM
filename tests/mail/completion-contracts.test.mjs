import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ORG = '33333333-3333-4333-8333-333333333333';
const BOX = '22222222-2222-4222-8222-222222222222';
const USER = '44444444-4444-4444-8444-444444444444';
const A = '11111111-1111-4111-8111-111111111111';
const B = '55555555-5555-4555-8555-555555555555';

function load(relative, stubs = {}) {
  const filename = path.resolve(relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
    },
  }).outputText;
  const module = { exports: {} };
  const resolve = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`]) {
        if (fs.existsSync(candidate)) return load(candidate, stubs);
      }
    }
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(resolve, module, module.exports);
  return module.exports;
}

const next = { NextResponse: { json: (data, init) => Response.json(data, init) } };
class MailAccessError extends Error { constructor(message, status) { super(message); this.status = status; } }

function request(url, options = {}) {
  const value = new Request(url, options);
  value.nextUrl = new URL(value.url);
  return value;
}

test('rich HTML sanitizer keeps safe formatting and removes active content', () => {
  const html = load('src/lib/mail/safe-html.ts');
  const clean = html.sanitizeMailHtml('<p>Hello <strong>team</strong><script>alert(1)</script><a href="javascript:alert(1)">bad</a><a href="mailto:a@example.com">mail</a></p>');
  assert.match(clean, /<strong>team<\/strong>/);
  assert.doesNotMatch(clean, /<script|javascript:/i);
  assert.match(clean, /href="mailto:a@example.com"/);
  assert.equal(html.mailHtmlToText('<p>Hello <b>team</b></p><p>Next</p>'), 'Hello team\nNext');
});

test('draft and send routes persist sanitized HTML plus plain text, with signature controlled separately', () => {
  const draft = fs.readFileSync('src/app/api/mail/drafts/route.ts', 'utf8');
  const send = fs.readFileSync('src/app/api/mail/send/route.ts', 'utf8');
  assert.match(draft, /sanitizeMailHtml\(body\.html\)/);
  assert.match(draft, /text_body: cleanText, html_body: cleanHtml/);
  assert.match(draft, /compose_options: \{ includeSignature: body\.includeSignature \}/);
  assert.match(send, /sanitizeMailHtml\(body\?\.html\)/);
  assert.match(send, /data-setu-mail-signature="true"/);
  assert.match(send, /text_body: text, html_body: html/);
});

test('Junk API deduplicates messages and keeps trust/block explicit', async () => {
  const rpcCalls = [];
  const db = { rpc: async (name, args) => { rpcCalls.push({ name, args }); return { data: { id: args.p_message_id, folder: args.p_junk ? 'junk' : 'inbox' }, error: null }; } };
  const route = load('src/app/api/mail/junk/route.ts', {
    'next/server': next,
    '@/lib/mail/organizer-context': {
      MailAccessError,
      mailOrganizerContext: async () => ({ db, organizationId: ORG, mailbox: { id: BOX }, canMove: true, canManage: true }),
    },
  });
  const response = await route.POST(request(`https://setu.example/api/mail/junk?mailboxId=${BOX}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds: [A, A, B], junk: true, senderPolicy: 'blocked' }) }));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(payload.messages.length, 2);
  assert.equal(rpcCalls.length, 2);
  assert.equal(rpcCalls[0].name, 'mail_set_junk');
  assert.equal(rpcCalls[0].args.p_sender_policy, 'blocked');
  assert.equal((await route.POST(request('https://setu.example/api/mail/junk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds: [A], junk: true, senderPolicy: 'trusted' }) }))).status, 400);
  assert.equal((await route.POST(request('https://setu.example/api/mail/junk', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageIds: [A], junk: false, senderPolicy: 'blocked' }) }))).status, 400);
});

test('mail search uses mailbox-scoped cursor RPC and returns a stable next cursor', async () => {
  const calls = [];
  const rows = [
    { id: A, created_at: '2026-09-11T12:00:00.000Z', folder: 'inbox' },
    { id: B, created_at: '2026-09-11T11:00:00.000Z', folder: 'inbox' },
    { id: USER, created_at: '2026-09-11T10:00:00.000Z', folder: 'inbox' },
  ];
  const db = { rpc: async (name, args) => { calls.push({ name, args }); return { data: rows, error: null }; } };
  const route = load('src/app/api/mail/search/route.ts', {
    'next/server': next,
    '@/lib/mail/organizer-context': { MailAccessError, mailOrganizerContext: async () => ({ db, organizationId: ORG, mailbox: { id: BOX } }) },
  });
  const response = await route.GET(request(`https://setu.example/api/mail/search?mailboxId=${BOX}&folder=inbox&q=quote&limit=10`));
  const payload = await response.json();
  assert.equal(response.status, 200);
  assert.equal(calls[0].name, 'mail_search_messages');
  assert.equal(calls[0].args.p_mailbox_id, BOX);
  assert.equal(calls[0].args.p_query, 'quote');
  assert.equal(calls[0].args.p_limit, 11);
  assert.equal(payload.messages.length, 3);
  assert.equal(payload.nextCursor, null);
  const badCursor = await route.GET(request(`https://setu.example/api/mail/search?mailboxId=${BOX}&beforeAt=2026-09-11T12:00:00Z`));
  assert.equal(badCursor.status, 400);
});

test('Setu Guru Compose reserves usage, returns preview-only output, and does not mutate CRM', async () => {
  const tables = [];
  const db = {
    from(table) {
      tables.push(table);
      const q = {
        select() { return q; }, eq() { return q; }, ilike() { return q; }, order() { return q; }, limit() { return q; },
        maybeSingle() {
          if (table === 'org_module_grants') return Promise.resolve({ data: { enabled: true }, error: null });
          if (table === 'leads') return Promise.resolve({ data: null, error: null });
          return Promise.resolve({ data: null, error: null });
        },
      };
      return q;
    },
  };
  const reservations = [];
  const admin = { rpc: async (name, args) => { reservations.push({ name, args }); return { data: true, error: null }; } };
  const oldKey = process.env.OPENAI_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.OPENAI_API_KEY = 'fixture-key';
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.openai.com/v1/responses');
    const sent = JSON.parse(String(options.body));
    assert.match(sent.input, /fixture prompt/i);
    return Response.json({ output_text: 'Suggested reply' });
  };
  try {
    const route = load('src/app/api/mail/compose/guru/route.ts', {
      'next/server': next,
      '@/lib/supabase/server': { createClient: async () => db },
      '@/lib/supabase/admin': { createAdminSupabaseClient: () => admin },
      '@/lib/workspace/auth': { getCurrentWorkspace: async () => ({ user: { id: USER }, organization: { id: ORG }, membership: { id: 'member' }, profile: { full_name: 'User' } }) },
      '@/lib/mail/resolve-user-mailbox': { resolveUserMailbox: async () => ({ id: BOX, address: 'sales@example.test', status: 'active' }) },
      '@/lib/mail/compose-guru': { buildComposeGuruPrompt: () => 'fixture prompt with permission scoped CRM context' },
    });
    const response = await route.POST(new Request('https://setu.example/api/mail/compose/guru', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'improve', to: ['buyer@example.test'], subject: 'Hello', text: 'Draft' }) }));
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.suggestion, 'Suggested reply');
    assert.equal(payload.autonomousActions, false);
    assert.equal(payload.permissionScope, 'current-user-crm-access');
    assert.equal(reservations.length, 1);
    assert.equal(reservations[0].name, 'mail_reserve_guru');
    assert.ok(tables.includes('leads'));
    assert.ok(!tables.some(table => /lead.*(insert|update)/i.test(table)));
  } finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.OPENAI_API_KEY; else process.env.OPENAI_API_KEY = oldKey;
  }
});

test('mobile Mail exposes the same completion contracts as desktop', () => {
  const mobile = fs.readFileSync('src/features/mail/components/mobile-setu-mail-workspace.tsx', 'utf8');
  assert.match(mobile, /RichMailEditor/);
  assert.match(mobile, /\/api\/mail\/search/);
  assert.match(mobile, /\/api\/mail\/junk/);
  assert.match(mobile, /\/api\/mail\/compose\/guru/);
  assert.match(mobile, /setShowCc\(Boolean\(restored\.cc \|\| restored\.bcc\)\)/);
  assert.match(mobile, /Guru never sends mail or changes CRM automatically/);
  assert.match(mobile, /Include signature/);
  assert.match(mobile, /Reply all/);
  assert.match(mobile, /Not junk \+ trust/);
  assert.match(mobile, /Junk \+ block/);
});

test('production Mail migrations are reconciled in source, including explicit sender UPDATE columns', () => {
  const unread = fs.readFileSync('supabase/migrations/20260911122005_mail_thread_unread_count_alignment.sql', 'utf8');
  const composer = fs.readFileSync('supabase/migrations/20260911122803_mail_junk_and_composer_mvp.sql', 'utf8');
  const search = fs.readFileSync('supabase/migrations/20260911123835_mail_search_cursor_pagination.sql', 'utf8');
  assert.match(unread, /mail_threads add column if not exists unread_count/);
  assert.match(composer, /grant update\(disposition,updated_by,updated_at\) on public\.mail_sender_preferences to authenticated/);
  assert.match(composer, /security invoker/);
  assert.match(composer, /mail_set_junk/);
  assert.match(composer, /mail_reserve_guru/);
  assert.match(search, /mail_search_messages/);
  assert.match(search, /mail_messages_mailbox_cursor_idx/);
});
