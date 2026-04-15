import { existsSync } from "node:fs";

const required = [
  "src/app/(app)/dashboard/page.tsx",
  "src/features/dashboard/components/dashboard-interactive.tsx",
  "src/features/dashboard/components/dashboard-world-map-section.tsx",
  "src/lib/queries/dashboard.ts",
];

const missing = required.filter((file) => !existsSync(file));
if (missing.length > 0) {
  console.error(
    "Dashboard validation failed. Missing files:\n" +
      missing.map((file) => `- ${file}`).join("\n"),
  );
  process.exit(1);
}

console.log("Dashboard validation passed.");
