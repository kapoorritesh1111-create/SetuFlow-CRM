import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const masterPlan = readFileSync("docs/master-plan.md", "utf8");
const releaseReadiness = readFileSync("docs/RELEASE_READINESS.md", "utf8");
const statusContract = readFileSync("src/lib/product-status-contract.ts", "utf8");

test("docs and status contract describe the same current baseline", () => {
  assert.match(masterPlan, /Sprint 6/i);
  assert.match(masterPlan, /Sprint 7/i);
  assert.match(masterPlan, /Sprint 8/i);
  assert.match(releaseReadiness, /proof refresh pending/i);
  assert.match(statusContract, /Sprint 6 closed · Sprint 7 active/i);
});
