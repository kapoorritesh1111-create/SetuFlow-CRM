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
  assert.match(releaseReadiness, /Sprint 7 closed, Sprint 8 ready/i);
  assert.match(statusContract, /Sprints 1-7 closed · Sprint 8 ready in development/i);
});
