import { redirect } from 'next/navigation';

// Moved to /smc — SMC is now the canonical home for internal tooling. The
// main app-shell nav item labeled "SMC" was pointing here by mistake (see
// src/lib/routes/manifest.json, fixed alongside this redirect) — it now
// points straight at /smc. Kept as a redirect rather than deleted so
// existing bookmarks/links still land somewhere real, ahead of /workspace
// being retired entirely.
export default function WorkspaceRootRedirectPage() {
  redirect('/smc');
}
