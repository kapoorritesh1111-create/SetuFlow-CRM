import { redirect } from 'next/navigation';

// Moved to /smc/board — SMC's Board View is the sprint planning/kanban
// equivalent of the old Sprints page. Kept as a redirect rather than deleted
// so existing bookmarks/links still land somewhere real, ahead of /workspace
// being retired entirely.
export default function WorkspaceSprintsRedirectPage() {
  redirect('/smc/board');
}
