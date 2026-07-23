import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';

// ─────────────────────────────────────────────────────────────────────────
// This file exists because the Documentation Hub, Setu Guru's knowledge base,
// and the main app nav all drifted from reality over several sprints without
// anything catching it — a full audit had to find it by hand. This test
// turns the highest-value findings from that audit into permanent, automated
// checks. It intentionally does NOT check live Supabase/schema state (that
// needs a DB connection this fast unit-test suite doesn't have) — see the
// "Not covered here" note at the bottom for what still needs a separate,
// DB-connected CI job.
// ─────────────────────────────────────────────────────────────────────────

const docsBundle = readFileSync('public/internal/setuflow-docs-workspace.js', 'utf8');
const guruWorkflows = readFileSync('docs/setu-guru/SETUFLOW_WORKFLOWS.md', 'utf8');
const helpRegistry = readFileSync('src/lib/setu-guru/help-registry.ts', 'utf8');
const pageContext = readFileSync('src/lib/setu-guru/page-context.ts', 'utf8');
const manifest = JSON.parse(readFileSync('src/lib/routes/manifest.json', 'utf8'));

// Sprint references are allowed only in things that are genuinely about the
// internal sprint tracker as a named tool (e.g. the real "/workspace/sprints"
// -> "/smc/board" Sprint Tracker feature) — not as dev-speak leaking into
// docs a customer or a newly-onboarded internal user would read. Setu Guru
// literally reads SETUFLOW_WORKFLOWS.md as an answer source, so a sprint
// reference there can end up verbatim in a chat response.
const SPRINT_REF = /Sprint\s*\d+/gi;
const SPRINT_REF_ALLOWLIST = [
  '/smc/board', // internal Sprint Tracker tool name/description context only
];
// Patterns that are legitimate even though they match /Sprint\s*\d+/i:
// real migration filenames (can't rename history) and internal, non-prose
// JS object keys (readiness-score tracking, never rendered to a reader).
const SPRINT_REF_PATTERN_ALLOWLIST = [
  /_sprint\d+_/i,        // migration filenames, e.g. 20260523072000_sprint18_notifications_foundation.sql
  /'[a-z0-9-]*sprint\d+[a-z0-9-]*':\s*[\d.]/i, // internal readiness-score object keys, e.g. 'mobile-sprint19-redesign': 0.97
];

function findDisallowedSprintRefs(content, allowedContextHints = []) {
  const matches = [...content.matchAll(SPRINT_REF)];
  return matches.filter((match) => {
    const windowStart = Math.max(0, match.index - 80);
    const windowEnd = Math.min(content.length, match.index + 80);
    const context = content.slice(windowStart, windowEnd);
    if (allowedContextHints.some((hint) => context.includes(hint))) return false;
    if (SPRINT_REF_PATTERN_ALLOWLIST.some((pattern) => pattern.test(context))) return false;
    return true;
  });
}

test('Documentation Hub bundle has no stray sprint references', () => {
  const disallowed = findDisallowedSprintRefs(docsBundle, SPRINT_REF_ALLOWLIST);
  assert.deepEqual(
    disallowed.map((m) => m[0]),
    [],
    'Found sprint reference(s) in the Documentation Hub outside the allowlist. ' +
    'Rewrite as functional/feature language, or add to SPRINT_REF_ALLOWLIST in this ' +
    'test if it is a genuine reference to a named internal tool.'
  );
});

test("Setu Guru's knowledge base (SETUFLOW_WORKFLOWS.md) has no stray sprint references", () => {
  const disallowed = findDisallowedSprintRefs(guruWorkflows);
  assert.deepEqual(
    disallowed.map((m) => m[0]),
    [],
    'SETUFLOW_WORKFLOWS.md is read directly by Setu Guru as an answer source — a sprint ' +
    'reference here can come out verbatim in a chat response to an operator or customer.'
  );
});

test('help-registry.ts answer text has no stray sprint references', () => {
  const disallowed = findDisallowedSprintRefs(helpRegistry);
  assert.deepEqual(
    disallowed.map((m) => m[0]),
    [],
    'help-registry.ts "answer" arrays are spoken back to users by Setu Guru directly.'
  );
});

test('docs/help/*.md route help files have no stray sprint references', () => {
  const dir = 'docs/help';
  const offenders = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    const content = readFileSync(path.join(dir, file), 'utf8');
    const disallowed = findDisallowedSprintRefs(content);
    if (disallowed.length) offenders.push(`${file}: ${disallowed.map((m) => m[0]).join(', ')}`);
  }
  assert.deepEqual(offenders, []);
});

test('every top-level (app) route folder has a Module Reference card in the Documentation Hub', () => {
  const appDir = 'src/app/(app)';
  const routeFolders = readdirSync(appDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    // Route groups / non-navigable internal folders that don't need a module card.
    .filter((name) => !['workspace', 'settings', 'trail'].includes(name));

  // Isolate just the Module Reference topic's content block so a route mentioned
  // in some unrelated topic doesn't count as a false pass, then check the route
  // appears anywhere in it as a whole path segment (covers both the structured
  // mod-card-route badge format and compact inline mentions).
  const modulesStart = docsBundle.indexOf("map['modules'] =");
  const modulesBacktickStart = docsBundle.indexOf('`', modulesStart);
  const modulesBacktickEnd = docsBundle.indexOf('`;', modulesBacktickStart + 1);
  const modulesContent = docsBundle.slice(modulesBacktickStart, modulesBacktickEnd);

  const missing = routeFolders.filter((route) => {
    const pattern = new RegExp(`/${route}(?:[/"\\s<]|$)`);
    return !pattern.test(modulesContent);
  });

  assert.deepEqual(
    missing,
    [],
    `Route folder(s) with no Module Reference mention: ${missing.join(', ')}. ` +
    'This is exactly how Growth Center (/growth-agent) went undocumented after Sprint 47 shipped. ' +
    'If a route is intentionally covered under a differently-named card (check the mod-card-route ' +
    'text), that is fine — just confirm it is actually mentioned somewhere, not silently absent.'
  );
});

test('every route in manifest.json shellSections points at a route that actually exists', () => {
  const shellSections = manifest.shellSections ?? [];
  const hrefs = shellSections.flatMap((section) => section.items.map((item) => item.href));
  const missing = hrefs.filter((href) => {
    const cleanHref = href.split('?')[0].split('#')[0];
    if (cleanHref.startsWith('/api/')) return false; // API routes checked separately if needed
    const segments = cleanHref.split('/').filter(Boolean);
    // Check against both the (app) and smc route trees, and top-level app dir.
    const candidates = [
      path.join('src/app/(app)', ...segments, 'page.tsx'),
      path.join('src/app', ...segments, 'page.tsx'),
    ];
    return !candidates.some((candidate) => existsSync(candidate));
  });

  assert.deepEqual(
    missing,
    [],
    `Nav item(s) in manifest.json point at routes with no page.tsx: ${missing.join(', ')}. ` +
    'This is exactly the class of bug that had the main nav "SMC" link pointing at ' +
    '/workspace instead of /smc.'
  );
});

// ─────────────────────────────────────────────────────────────────────────
// Not covered here — needs a separate CI job with a live Supabase connection
// (this suite runs fast and offline by design, so it can't do these):
//
// 1. Every <code>table_name</code> / <code>column_name</code> referenced in
//    the Documentation Hub actually exists in the live schema (caught 7 wrong
//    table names and 19 fabricated columns in the manual audit this replaces
//    the first pass of). Query information_schema.columns and diff.
// 2. Route/API endpoint counts quoted in topic summaries (e.g. "159 app
//    routes, 136 API endpoints") match the real count via readdirSync.
//    This one CAN run offline — consider promoting it here.
// 3. Every route.ts under src/app/api actually exists at the path quoted in
//    the API Reference topic (caught one /api/products/route typo).
// ─────────────────────────────────────────────────────────────────────────
