import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

function load(relative, stubs = {}) {
  const filename = path.resolve(relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, allowSyntheticDefaultImports: true },
  }).outputText;
  const module = { exports: {} };
  const resolve = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      for (const candidate of [base, `${base}.ts`, `${base}.tsx`]) if (fs.existsSync(candidate)) return load(candidate, stubs);
    }
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(resolve, module, module.exports);
  return module.exports;
}

async function withScannerFetch(payload, fn) {
  const oldKey = process.env.CLOUDMERSIVE_API_KEY;
  const oldFetch = globalThis.fetch;
  process.env.CLOUDMERSIVE_API_KEY = 'fixture-key';
  globalThis.fetch = async (url, options) => {
    assert.equal(String(url), 'https://api.cloudmersive.com/virus/scan/file');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Apikey, 'fixture-key');
    assert.ok(options.body instanceof FormData);
    assert.ok(options.body.get('inputFile') instanceof Blob);
    return Response.json(payload);
  };
  try { await fn(); }
  finally {
    globalThis.fetch = oldFetch;
    if (oldKey === undefined) delete process.env.CLOUDMERSIVE_API_KEY; else process.env.CLOUDMERSIVE_API_KEY = oldKey;
  }
}

test('Vercel Mail deployments require the malware-scanner credential', () => {
  if (process.env.VERCEL) {
    assert.ok(process.env.CLOUDMERSIVE_API_KEY?.trim(), 'CLOUDMERSIVE_API_KEY must be configured for Vercel Mail deployments');
  }
});

test('security PR preview reaches Cloudmersive and distinguishes clean from EICAR', async t => {
  if (process.env.VERCEL_GIT_COMMIT_REF !== 'mail/security-retention-20260911') {
    t.skip('Live provider smoke test only runs on the security PR preview branch.');
    return;
  }
  const security = load('src/lib/mail/attachment-security.ts');
  const clean = await security.scanMailAttachmentBytes(new TextEncoder().encode('Setu Mail clean attachment security smoke test.'), 'setu-clean-smoke.txt', 'text/plain');
  assert.equal(clean.status, 'clean', `Expected clean Cloudmersive verdict, got ${clean.status}: ${clean.error ?? ''}`);

  // Assemble the industry-standard EICAR antivirus test string at runtime so no static malware signature is stored in source.
  const eicar = ['X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR', '-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join('');
  const blocked = await security.scanMailAttachmentBytes(new TextEncoder().encode(eicar), 'setu-eicar-smoke.txt', 'text/plain');
  assert.equal(blocked.status, 'quarantined', `Expected EICAR quarantine verdict, got ${blocked.status}: ${blocked.error ?? ''}`);
});

test('scanner fails closed when no malware-scanner credential is configured', async () => {
  const security = load('src/lib/mail/attachment-security.ts');
  const oldKey = process.env.CLOUDMERSIVE_API_KEY;
  delete process.env.CLOUDMERSIVE_API_KEY;
  try {
    const result = await security.scanMailAttachmentBytes(new Uint8Array([1, 2, 3]), 'sample.txt', 'text/plain');
    assert.equal(result.status, 'scan_error');
    assert.match(result.error, /not configured/i);
  } finally {
    if (oldKey !== undefined) process.env.CLOUDMERSIVE_API_KEY = oldKey;
  }
});

test('scanner accepts a clean verdict only when provider explicitly returns CleanResult true', async () => {
  const security = load('src/lib/mail/attachment-security.ts');
  await withScannerFetch({ CleanResult: true, FoundViruses: [] }, async () => {
    const result = await security.scanMailAttachmentBytes(new Uint8Array([1, 2, 3]), 'clean.txt', 'text/plain');
    assert.equal(result.status, 'clean');
    assert.equal(result.signature, null);
  });
});

test('scanner converts malware verdict to quarantine and retains signature evidence', async () => {
  const security = load('src/lib/mail/attachment-security.ts');
  await withScannerFetch({ CleanResult: false, FoundViruses: [{ VirusName: 'Fixture.Test.Signature' }] }, async () => {
    const result = await security.scanMailAttachmentBytes(new Uint8Array([4, 5, 6]), 'blocked.txt', 'text/plain');
    assert.equal(result.status, 'quarantined');
    assert.match(result.signature, /Fixture\.Test\.Signature/);
  });
});

test('outbound Mail refuses every attachment security state except clean', () => {
  const send = fs.readFileSync('src/app/api/mail/send/route.ts', 'utf8');
  assert.match(send, /attachment\.security_status !== 'clean'/);
  assert.match(send, /has not passed malware scanning and cannot be sent/);
  assert.match(send, /blocked by malware scanning and cannot be sent/);
  assert.match(send, /\.eq\('security_status', 'clean'\)/);
});

test('attachment download is fail-closed and only clean files receive signed URLs', () => {
  const route = fs.readFileSync('src/app/api/mail/attachments/route.ts', 'utf8');
  assert.match(route, /attachment\.security_status !== 'clean'/);
  assert.match(route, /securityStatus: attachment\.security_status/);
  assert.match(route, /status: 423/);
  const securityGate = route.indexOf("attachment.security_status !== 'clean'");
  const signedUrl = route.indexOf('createSignedUrl');
  assert.ok(securityGate >= 0 && signedUrl > securityGate, 'security gate must run before signed URL creation');
});

test('both composer uploads and Resend inbound ingestion invoke malware scanning', () => {
  const upload = fs.readFileSync('src/app/api/mail/attachments/route.ts', 'utf8');
  const inbound = fs.readFileSync('src/app/api/mail/webhooks/resend/route.ts', 'utf8');
  assert.match(upload, /secureStoredMailAttachment\(access\.admin, attachment, bytes\)/);
  assert.match(inbound, /secureStoredMailAttachment\(admin, attachment, bytes\)/);
  assert.match(inbound, /attachment blocked/);
  assert.match(inbound, /The message remains available even when an attachment is unavailable/);
});

test('security migration creates private quarantine storage, status constraints and owner-admin retention RLS', () => {
  const migration = fs.readFileSync('supabase/migrations/20260911162526_mail_attachment_security_and_retention.sql', 'utf8');
  assert.match(migration, /security_status text not null default 'pending'/);
  assert.match(migration, /'pending','scanning','clean','quarantined','scan_error'/);
  assert.match(migration, /create table if not exists public\.mail_retention_policies/);
  assert.match(migration, /alter table public\.mail_retention_policies enable row level security/);
  assert.match(migration, /lower\(r\.name\) = any\(array\['owner'::text,'admin'::text\]\)/);
  assert.match(migration, /'setu-mail-quarantine'/);
  assert.match(migration, /false,\s*20971520/);
});

test('daily retention purges only expired Trash, quarantine and orphan attachment candidates', () => {
  const cron = fs.readFileSync('src/app/api/cron/mail-retention/route.ts', 'utf8');
  assert.match(cron, /authorization.*Bearer \$\{CRON_SECRET\}/s);
  assert.match(cron, /\.eq\('folder', 'trash'\)/);
  assert.match(cron, /\.in\('security_status', \['quarantined','scan_error'\]\)/);
  assert.match(cron, /\.is\('message_id', null\)/);
  assert.match(cron, /last_run_status/);
  assert.doesNotMatch(cron, /\.eq\('folder', '(inbox|sent|archive|drafts)'\)/);
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.ok(vercel.crons.some(entry => entry.path === '/api/cron/mail-retention' && entry.schedule === '30 6 * * *'));
});

test('Mail admin exposes scanner readiness and configurable retention controls', () => {
  const api = fs.readFileSync('src/app/api/mail/admin/route.ts', 'utf8');
  const ui = fs.readFileSync('src/features/mail/components/mail-admin-workspace.tsx', 'utf8');
  assert.match(api, /malwareScannerConfigured: mailMalwareScannerConfigured\(\)/);
  assert.match(api, /action === 'update_retention'/);
  assert.match(ui, /Safety & retention/);
  assert.match(ui, /Malware scanning/);
  assert.match(ui, /Trash/);
  assert.match(ui, /Quarantine/);
  assert.match(ui, /Unlinked files/);
  assert.match(ui, /Save retention policy/);
});
