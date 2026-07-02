'use client';

import { useState, useTransition, useRef } from 'react';

type Lead = {
  id: string; company_name: string; primary_admin_name: string | null;
  primary_admin_email: string; primary_phone: string | null;
  pipeline_stage: string | null; next_follow_up_at: string | null;
  last_contact_at: string | null; lead_score: number | null;
  internal_notes: string | null; assigned_to_name: string | null;
  source: string | null; demo_scheduled_at: string | null;
  demo_completed_at: string | null; demo_outcome: string | null;
  activity_log: Array<{ id: string; kind: string; note: string; actor_name: string; created_at: string }>;
};

type Props = {
  overdue: Lead[];
  dueToday: Lead[];
  thisWeek: Lead[];
  logActivity: (fd: FormData) => Promise<void>;
  reschedule: (fd: FormData) => Promise<void>;
};

const ACTIVITY_KINDS = [
  { key: 'call',     label: '📞 Call',      color: '#1F487C' },
  { key: 'whatsapp', label: '💬 WhatsApp',  color: '#25D366' },
  { key: 'email',    label: '✉️ Email',      color: '#6366f1' },
  { key: 'note',     label: '📝 Note',       color: '#64748b' },
  { key: 'demo_completed', label: '🖥 Demo Done', color: '#279491' },
];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function waLink(phone: string | null, name: string | null) {
  if (!phone) return null;
  const c = phone.replace(/[^0-9+]/g, '');
  const num = c.startsWith('+') ? c.slice(1) : c;
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hi${name ? ' ' + name : ''}, following up from SETU Flow.`)}`;
}

function stageBadge(stage: string | null) {
  const s = stage ?? 'inquiry';
  const map: Record<string, string> = {
    inquiry: '#8b5cf6', qualified: '#279491', trial: '#d97706',
    negotiating: '#10b981', converted: '#1F487C', lost: '#dc2626',
  };
  return <span style={{ background: `${map[s] ?? '#64748b'}22`, color: map[s] ?? '#64748b', border: `1px solid ${map[s] ?? '#64748b'}44`, borderRadius: 8, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'capitalize' }}>{s}</span>;
}

function ActivityDrawer({ lead, logActivity, reschedule, onClose }: {
  lead: Lead;
  logActivity: (fd: FormData) => Promise<void>;
  reschedule: (fd: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'log' | 'history' | 'reschedule'>('log');
  const [kind, setKind] = useState('call');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [newDate, setNewDate] = useState('');
  const [rescNote, setRescNote] = useState('');
  const actorName = 'Ritesh Kapoor'; // pulled from session in real usage

  function submitLog() {
    if (!note.trim()) return;
    const fd = new FormData();
    fd.set('lead_id', lead.id); fd.set('kind', kind);
    fd.set('note', note); fd.set('actor_name', actorName);
    startTransition(async () => { await logActivity(fd); setNote(''); });
  }

  function submitReschedule() {
    if (!newDate) return;
    const fd = new FormData();
    fd.set('lead_id', lead.id); fd.set('next_follow_up_at', newDate);
    fd.set('note', rescNote); fd.set('actor_name', actorName);
    startTransition(async () => { await reschedule(fd); onClose(); });
  }

  const wa = waLink(lead.primary_phone, lead.primary_admin_name);
  const log = [...(lead.activity_log ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 999, background: 'rgba(15,23,42,.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 22, width: '100%', maxWidth: 540, maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 32px 80px rgba(15,23,42,.22)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: '#279491', textTransform: 'uppercase', margin: 0 }}>Follow-up</p>
              <h3 style={{ margin: '4px 0 2px', fontSize: 17, fontWeight: 700, color: '#0f172a' }}>{lead.company_name}</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#64748b' }}>{lead.primary_admin_name} · {stageBadge(lead.pipeline_stage)}</p>
            </div>
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 13, color: '#64748b' }}>✕</button>
          </div>
          {/* Quick contact */}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {wa && <a href={wa} target="_blank" rel="noopener" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 9, padding: '5px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>💬 WhatsApp</a>}
            <a href={`mailto:${lead.primary_admin_email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 9, padding: '5px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>✉ Email</a>
            {lead.primary_phone && <a href={`tel:${lead.primary_phone}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: 9, padding: '5px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>📞 Call</a>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
          {(['log', 'history', 'reschedule'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, border: 'none', background: 'none', padding: '10px 0', fontSize: 11, fontWeight: 700, color: tab === t ? '#1F487C' : '#94a3b8', borderBottom: tab === t ? '2px solid #1F487C' : '2px solid transparent', cursor: 'pointer', textTransform: 'capitalize' }}>
              {t === 'log' ? '+ Log Activity' : t === 'history' ? `History (${log.length})` : '📅 Reschedule'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {/* LOG */}
          {tab === 'log' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {ACTIVITY_KINDS.map(k => (
                  <button key={k.key} onClick={() => setKind(k.key)} style={{ border: `2px solid ${kind === k.key ? k.color : '#e2e8f0'}`, background: kind === k.key ? `${k.color}15` : '#fff', color: kind === k.key ? k.color : '#64748b', borderRadius: 10, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{k.label}</button>
                ))}
              </div>
              <textarea
                value={note} onChange={e => setNote(e.target.value)}
                placeholder={kind === 'call' ? 'Call notes — what was discussed, outcome, next action...' : kind === 'whatsapp' ? 'WhatsApp message summary...' : kind === 'email' ? 'Email summary — subject and key points...' : kind === 'demo_completed' ? 'Demo outcome — what was shown, prospect reaction, next steps...' : 'Note...'}
                rows={4}
                style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: 12, padding: '10px 12px', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <button onClick={submitLog} disabled={!note.trim() || pending} style={{ background: '#1F487C', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: pending || !note.trim() ? 'not-allowed' : 'pointer', opacity: !note.trim() || pending ? 0.6 : 1 }}>
                {pending ? 'Saving...' : 'Log Activity'}
              </button>
            </div>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {log.length === 0 && <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 20 }}>No activity logged yet.</p>}
              {log.map(entry => {
                const k = ACTIVITY_KINDS.find(a => a.key === entry.kind);
                return (
                  <div key={entry.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: k?.color ?? '#64748b', textTransform: 'uppercase', letterSpacing: '.08em' }}>{k?.label ?? entry.kind}</span>
                      <span style={{ fontSize: 10, color: '#94a3b8' }}>{new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {entry.actor_name}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap' }}>{entry.note}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* RESCHEDULE */}
          {tab === 'reschedule' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                New follow-up date
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} style={{ display: 'block', marginTop: 4, width: '100%', border: '1px solid #dbe6ef', borderRadius: 10, padding: '9px 11px', fontSize: 13, boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#475569' }}>
                Reason / note (optional)
                <textarea value={rescNote} onChange={e => setRescNote(e.target.value)} rows={2} placeholder="Why rescheduling..." style={{ display: 'block', marginTop: 4, width: '100%', border: '1px solid #dbe6ef', borderRadius: 10, padding: '9px 11px', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </label>
              <button onClick={submitReschedule} disabled={!newDate || pending} style={{ background: '#279491', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: !newDate || pending ? 'not-allowed' : 'pointer', opacity: !newDate || pending ? 0.6 : 1 }}>
                {pending ? 'Saving...' : 'Confirm Reschedule'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeadCard({ lead, logActivity, reschedule }: { lead: Lead; logActivity: (fd: FormData) => Promise<void>; reschedule: (fd: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const wa = waLink(lead.primary_phone, lead.primary_admin_name);

  return (
    <>
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, boxShadow: '0 2px 8px rgba(15,23,42,.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.primary_admin_name} · {lead.primary_admin_email}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {stageBadge(lead.pipeline_stage)}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11 }}>
          <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '3px 8px', color: '#475569', fontWeight: 600 }}>📅 {fmtDate(lead.next_follow_up_at)}</span>
          {lead.last_contact_at && <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '3px 8px', color: '#475569', fontWeight: 600 }}>Last: {fmtDate(lead.last_contact_at)}</span>}
          {lead.assigned_to_name && <span style={{ background: '#e0f2fe', borderRadius: 6, padding: '3px 8px', color: '#0369a1', fontWeight: 600 }}>→ {lead.assigned_to_name}</span>}
          {lead.demo_scheduled_at && !lead.demo_completed_at && <span style={{ background: '#fef3c7', borderRadius: 6, padding: '3px 8px', color: '#d97706', fontWeight: 600 }}>🖥 Demo: {fmtDate(lead.demo_scheduled_at)}</span>}
          {lead.demo_completed_at && <span style={{ background: '#dcfce7', borderRadius: 6, padding: '3px 8px', color: '#16a34a', fontWeight: 600 }}>✅ Demo done</span>}
        </div>

        {lead.internal_notes && <p style={{ margin: 0, fontSize: 11, color: '#475569', whiteSpace: 'pre-line', borderLeft: '3px solid #e2e8f0', paddingLeft: 8 }}>{lead.internal_notes}</p>}

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setOpen(true)} style={{ background: '#1F487C', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>+ Log Activity</button>
          {wa && <a href={wa} target="_blank" rel="noopener" style={{ background: '#dcfce7', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>💬 WA</a>}
          <a href={`mailto:${lead.primary_admin_email}`} style={{ background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, textDecoration: 'none' }}>✉ Email</a>
          <button onClick={() => setOpen(true)} style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>📅 Reschedule</button>
          <a href={`/smc/leads?open=${lead.id}`} style={{ background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Open Lead →</a>
        </div>
      </div>

      {open && <ActivityDrawer lead={lead} logActivity={logActivity} reschedule={reschedule} onClose={() => setOpen(false)} />}
    </>
  );
}

function Section({ title, count, tone, leads, logActivity, reschedule }: {
  title: string; count: number; tone: 'red' | 'amber' | 'slate';
  leads: Lead[]; logActivity: (fd: FormData) => Promise<void>; reschedule: (fd: FormData) => Promise<void>;
}) {
  const colors = { red: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#fee2e2' }, amber: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', badge: '#fef3c7' }, slate: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', badge: '#f1f5f9' } }[tone];
  return (
    <section style={{ background: colors.bg, border: `1px solid ${colors.border}`, borderRadius: 20, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: colors.text, textTransform: 'uppercase', letterSpacing: '.1em' }}>{title}</h2>
        <span style={{ background: colors.badge, color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{count}</span>
      </div>
      {leads.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>None {tone === 'red' ? '— great!' : ''}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leads.map(l => <LeadCard key={l.id} lead={l} logActivity={logActivity} reschedule={reschedule} />)}
        </div>
      )}
    </section>
  );
}

export function FollowUpBoard({ overdue, dueToday, thisWeek, logActivity, reschedule }: Props) {
  const total = overdue.length + dueToday.length + thisWeek.length;
  return (
    <>
      <div className="smc-ph">
        <div>
          <div className="bc">Growth</div>
          <h1>Follow-up Queue</h1>
        </div>
        <div className="ha">
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>{total} action{total !== 1 ? 's' : ''} this week</span>
          <a href="/smc/leads" style={{ marginLeft: 12, fontSize: 11, fontWeight: 700, color: '#279491', textDecoration: 'none' }}>← All Leads</a>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
        {/* Summary bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {[
            { label: 'Overdue', count: overdue.length, color: '#dc2626', bg: '#fef2f2' },
            { label: 'Due Today', count: dueToday.length, color: '#d97706', bg: '#fffbeb' },
            { label: 'This Week', count: thisWeek.length, color: '#475569', bg: '#f8fafc' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}22`, borderRadius: 14, padding: '12px 14px', textAlign: 'center' }}>
              <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <Section title="Overdue" count={overdue.length} tone="red" leads={overdue} logActivity={logActivity} reschedule={reschedule} />
        <Section title="Due Today" count={dueToday.length} tone="amber" leads={dueToday} logActivity={logActivity} reschedule={reschedule} />
        <Section title="This Week" count={thisWeek.length} tone="slate" leads={thisWeek} logActivity={logActivity} reschedule={reschedule} />
      </div>
    </>
  );
}
