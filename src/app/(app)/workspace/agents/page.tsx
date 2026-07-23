import { redirect } from 'next/navigation';

// Moved to /smc/agents — SMC is now the canonical home for internal tooling,
// including multi-agent coding workflows (Claude, OpenAI, Cursor, or human,
// tracked via agent_type in agent_actions). Kept as a redirect rather than
// deleted so existing bookmarks/links still land somewhere real, ahead of
// /workspace being retired entirely.
export default function WorkspaceAgentsRedirectPage() {
  redirect('/smc/agents');
}
