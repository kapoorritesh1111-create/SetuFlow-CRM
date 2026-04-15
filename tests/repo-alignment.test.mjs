import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

test("repo no longer keeps dead legacy JSX duplicates", () => {
  assert.equal(existsSync("src/features/quotes/components/quote-workspace.jsx"), false);
  assert.equal(existsSync("src/features/quotes/components/quote-wizard-form.jsx"), false);
});

test("package scripts point to checked-in smoke assets", () => {
  assert.match(pkg.scripts.test, /tests\/repo-alignment\.test\.mjs/);
  assert.match(pkg.scripts["check:dashboard"], /scripts\/check-dashboard-freeze\.mjs/);
  assert.equal(existsSync("tests/repo-alignment.test.mjs"), true);
  assert.equal(existsSync("scripts/check-dashboard-freeze.mjs"), true);
});
