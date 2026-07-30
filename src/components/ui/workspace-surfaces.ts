// Design-system class strings for the workspace UI. These are thin wrappers
// over tokens defined in design-tokens.css (see DESIGN-SYSTEM.md section 4).
// Consumers import the named export; components in features/ compose these
// instead of hand-rolling arbitrary-value Tailwind classes.
//
// Note: token colors (surface-1, line, etc.) are plain hex/rgba custom
// properties, not RGB-triplet vars, so they intentionally don't take
// Tailwind opacity modifiers (e.g. `bg-surface-1/95`) — those silently
// no-op. Use backdrop-blur alone for the "glass" feel where needed.

export const workspacePanelClass =
  'rounded-panel border border-line bg-surface-1 shadow-panel ring-1 ring-black/[0.02] backdrop-blur';

export const workspaceInsetClass =
  'rounded-card border border-line bg-surface-2';

// The final variant forces a deliberately featured KPI background to win over
// the shared surface background. Without it, Tailwind generation order can
// leave white featured text on the pale surface, making the card look blank.
export const workspaceMetricClass =
  'rounded-card border border-line bg-surface-2 p-5 shadow-card [&.bg-brand-900]:!bg-brand-900';

export const workspaceActionClass =
  'rounded-card border border-line bg-surface-1 shadow-card';

export const workspaceGlassClass =
  'rounded-hero border border-line bg-surface-1 shadow-panel';

export const workspaceHeroClass =
  'overflow-hidden rounded-hero border border-line bg-surface-1 shadow-hero ring-1 ring-black/[0.03] backdrop-blur';

export const workspaceTableShellClass =
  'overflow-hidden rounded-hero border border-line bg-surface-1 shadow-panel ring-1 ring-black/[0.03] backdrop-blur';

export const workspaceTableHeaderClass =
  'bg-surface-2 text-content-muted';

export const workspaceTableBodyClass =
  'bg-surface-1';

export const workspaceTableRowClass =
  'group border-b border-line bg-surface-1 transition hover:bg-surface-2';

export const workspaceFieldSurfaceClass =
  'border-line bg-surface-2 text-content-primary placeholder:text-content-faint focus:border-brand-500 focus:bg-surface-1 focus-visible:shadow-focus-ring focus-visible:outline-none';

export const workspacePrimaryButtonClass =
  'border border-brand-700 bg-brand-700 text-white shadow-card transition hover:-translate-y-0.5 hover:bg-brand-800 focus-visible:shadow-focus-ring focus-visible:outline-none';

export const workspaceSecondaryButtonClass =
  'border border-line bg-surface-1 text-content-secondary shadow-card transition hover:-translate-y-0.5 hover:bg-surface-2 focus-visible:shadow-focus-ring focus-visible:outline-none';

export const workspaceDangerButtonClass =
  'border border-danger-border bg-danger-bg text-danger-fg transition hover:-translate-y-0.5 hover:opacity-90 focus-visible:shadow-focus-ring focus-visible:outline-none';
