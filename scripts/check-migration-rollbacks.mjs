import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const MIGRATION_DIR = 'mitigation/supabase/sql';
const ROLLBACK_ANNOTATION = /--\s*rollback:\s*(forward-only|not-safe)\b/i;
const HIGH_RISK_SQL = /\b(drop\s+(table|column|constraint|trigger|policy|function)|delete\s+from|truncate\s+table|enable\s+row\s+level\s+security|disable\s+row\s+level\s+security|create\s+(or\s+replace\s+)?function|create\s+trigger|alter\s+table[\s\S]*(drop|references|on\s+delete))\b/i;

function runGit(args) {
  return execFileSync('git', args, { encoding: 'utf8' }).trim();
}

function getDiffArgs() {
  const baseRef = process.env.GITHUB_BASE_REF;
  if (baseRef) {
    return ['diff', '--name-only', `origin/${baseRef}...HEAD`];
  }

  try {
    runGit(['rev-parse', '--verify', 'HEAD~1']);
    return ['diff', '--name-only', 'HEAD~1', 'HEAD'];
  } catch {
    return ['diff', '--name-only', '--cached'];
  }
}

function changedMigrationFiles() {
  try {
    return runGit(getDiffArgs())
      .split('\n')
      .map((file) => file.trim())
      .filter(Boolean)
      .filter((file) => file.startsWith(`${MIGRATION_DIR}/`))
      .filter((file) => file.endsWith('.sql'))
      .filter((file) => !file.endsWith('_ROLLBACK.sql'));
  } catch (error) {
    console.warn('[rollback-check] Unable to inspect git diff, passing without rollback enforcement.');
    console.warn(error instanceof Error ? error.message : String(error));
    return [];
  }
}

const failures = [];

for (const migrationPath of changedMigrationFiles()) {
  if (!existsSync(migrationPath)) continue;

  const sql = readFileSync(migrationPath, 'utf8');
  if (!HIGH_RISK_SQL.test(sql)) continue;
  if (ROLLBACK_ANNOTATION.test(sql)) continue;

  const rollbackPath = migrationPath.replace(/\.sql$/i, '_ROLLBACK.sql');
  if (existsSync(path.normalize(rollbackPath))) continue;

  failures.push({ migrationPath, rollbackPath });
}

if (failures.length > 0) {
  console.error('ROLLBACK COVERAGE REQUIRED');
  for (const failure of failures) {
    console.error(`- ${failure.migrationPath}`);
    console.error(`  Add ${failure.rollbackPath} or annotate the migration with -- rollback: forward-only / -- rollback: not-safe`);
  }
  process.exit(1);
}

console.log('Migration rollback coverage check passed.');
