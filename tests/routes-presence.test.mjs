import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

const requiredRoutes = [
  "src/app/(app)/orders/page.tsx",
  "src/app/(app)/dashboard/page.tsx",
  "src/app/workspace/my-card/page.tsx",
  "src/app/(app)/contact-exchange/vcard/page.tsx",
  "src/app/(app)/contact-exchange/scan/page.tsx",
];

test("key routes that drive current status language exist", () => {
  requiredRoutes.forEach((route) => assert.equal(existsSync(route), true, `${route} should exist`));
});
