import { redirect } from 'next/navigation';

// Moved to /smc/clients — SMC is now the canonical home for internal
// tooling. Kept as a redirect rather than deleted so existing bookmarks/
// links still land somewhere real, ahead of /workspace being retired
// entirely.
export default function WorkspaceClientsRedirectPage() {
  redirect('/smc/clients');
}
