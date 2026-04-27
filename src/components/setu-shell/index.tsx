import type { CSSProperties, ReactNode } from 'react';

const navy = '#0b2e4a';
const slateBorder = '#e2e8f0';

export type SetuTopbarAction = { label: ReactNode; href?: string; active?: boolean; variant?: 'primary' | 'secondary' | 'ghost' };
export type SetuStat = { label: ReactNode; value: ReactNode; meta?: ReactNode; accent?: string };

export function SetuWorkspaceShell({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

function actionStyle(action: SetuTopbarAction): CSSProperties {
  const isPrimary = action.variant === 'primary' || action.active;
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '32px',
    padding: '6px 14px',
    borderRadius: 'var(--r-sm)',
    border: isPrimary ? `1px solid ${navy}` : `1px solid ${slateBorder}`,
    background: isPrimary ? navy : action.variant === 'ghost' ? 'transparent' : 'white',
    color: isPrimary ? 'white' : '#334155',
    fontSize: '12px',
    fontWeight: 700,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  };
}

export function SetuTopbarActions({ actions }: { eyebrow?: ReactNode; title: ReactNode; subtitle?: ReactNode; section?: ReactNode; actions?: SetuTopbarAction[] }) {
  if (!actions?.length) return null;
  return <div style={{ display: 'none' }} aria-hidden="true">{actions.map((action, index) => action.href ? <a key={index} href={action.href} style={actionStyle(action)}>{action.label}</a> : <span key={index} style={actionStyle(action)}>{action.label}</span>)}</div>;
}

export function SetuFilterBar(_props: { children: ReactNode; meta?: ReactNode }) {
  return null;
}

export function SetuStatsStrip({ stats }: { stats: SetuStat[] }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(Math.max(stats.length, 1), 6)}, minmax(0, 1fr))`, gap: '10px', padding: 0 }}>{stats.map((stat, index) => <div key={index} style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-lg)', border: `1px solid ${slateBorder}`, background: 'white', padding: '13px 15px', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}><div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: stat.accent ?? '#0c7fff', borderRadius: 'var(--r-lg) var(--r-lg) 0 0' }} /><div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '7px' }}>{stat.label}</div><div style={{ fontSize: '22px', fontWeight: 800, letterSpacing: '-.03em', color: '#0f172a', lineHeight: 1 }}>{stat.value}</div>{stat.meta ? <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '4px', fontWeight: 600 }}>{stat.meta}</div> : null}</div>)}</div>;
}

export function SetuSlideInDrawer({ title, children, open = true }: { title: ReactNode; children: ReactNode; open?: boolean }) {
  if (!open) return null;
  return <aside style={{ background: 'white', border: `1px solid ${slateBorder}`, borderRadius: 'var(--r-xl)', boxShadow: '0 18px 45px rgba(15,23,42,.12)', overflow: 'hidden' }}><div style={{ padding: '14px 18px', borderBottom: `1px solid ${slateBorder}`, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{title}</div><div style={{ padding: '16px 18px' }}>{children}</div></aside>;
}
