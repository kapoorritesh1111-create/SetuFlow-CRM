'use client';

import { useState, useTransition } from 'react';

type ActivityEntry = { id: string; kind: string; note: string; actor_name: string; created_at: string };
type Lead = {
  id: string; company_name: string; primary_admin_name: string | null;
  primary_admin_email: string; primary_phone: string | null;
  pipeline_stage: string | null; next_follow_up_at: string | null;
  last_contact_at: string | null; lead_score: number | null;
  internal_notes: string | null; assigned_to_name: string | null;
  source: string | null; source_detail: string | null;
  demo_scheduled_at: string | null; demo_completed_at: string | null;
  demo_outcome: string | null; activity_log: ActivityEntry[];
};

type Props = {
  overdue: Lead[]; dueToday: Lead[]; thisWeek: Lead[];
  logActivity: (fd: FormData) => Promise<void>;
  reschedule: (fd: FormData) => Promise<void>;
};

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function waLink(phone: string | null, name: string | null, msg: string) {
  if (!phone) return null;
  const c = phone.replace(/[^0-9+]/g, '');
  const num = c.startsWith('+') ? c.slice(1) : c;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

function stageDot(stage: string | null) {
  const s = stage ?? 'inquiry';
  const map: Record<string, string> = {
    inquiry: '#8b5cf6', qualified: '#279491', trial: '#d97706',
    negotiating: '#10b981', converted: '#1F487C', lost: '#dc2626',
  };
  return <span style={{ width: 8, height: 8, borderRadius: '50%', background: map[s] ?? '#94a3b8', display: 'inline-block', flexShrink: 0 }} />;
}

// ─── Full follow-up action drawer ───────────────────────────────────
function ActionDrawer({ lead, logActivity, reschedule, onClose }: {
  lead: Lead;
  logActivity: (fd: FormData) => Promise<void>;
  reschedule: (fd: FormData) => Promise<void>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'whatsapp' | 'email' | 'note' | 'reschedule' | 'history'>('whatsapp');
  const [msgText, setMsgText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [noteText, setNoteText] = useState('');
  const [newDate, setNewDate] = useState('');
  const [rescNote, setRescNote] = useState('');
  const [pending, startTransition] = useTransition();
  const actorName = lead.assigned_to_name || 'Ritesh Kapoor';

  async function generateMessage(kind: 'whatsapp' | 'email') {
    setGenerating(true); setGenError('');
    try {
      const res = await fetch('/api/smc/suggest-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: lead.company_name,
          contact_name: lead.primary_admin_name,
          pipeline_stage: lead.pipeline_stage,
          source: lead.source,
          source_detail: lead.source_detail,
          internal_notes: lead.internal_notes,
          last_contact_at: lead.last_contact_at,
          next_follow_up_at: lead.next_follow_up_at,
          lead_score: lead.lead_score,
          activity_log: lead.activity_log,
          kind,
          sender_name: actorName,
        }),
      });
      const d = await res.json();
      if (d.message) setMsgText(d.message);
      else setGenError(d.error || 'Generation failed');
    } catch (err) { setGenError(String(err)); }
    setGenerating(false);
  }

  function submitLog(kind: string, note: string) {
    if (!note.trim()) return;
    const fd = new FormData();
    fd.set('lead_id', lead.id); fd.set('kind', kind);
    fd.set('note', note.trim()); fd.set('actor_name', actorName);
    startTransition(async () => { await logActivity(fd); onClose(); });
  }

  function submitReschedule() {
    if (!newDate) return;
    const fd = new FormData();
    fd.set('lead_id', lead.id); fd.set('next_follow_up_at', newDate);
    fd.set('note', rescNote || `Rescheduled to ${newDate}`); fd.set('actor_name', actorName);
    startTransition(async () => { await reschedule(fd); onClose(); });
  }

  const wa = lead.primary_phone ? waLink(lead.primary_phone, lead.primary_admin_name, msgText || `Hi ${lead.primary_admin_name || lead.company_name}, following up on SETU Flow CRM.`) : null;
  const log = [...(lead.activity_log ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const daysSince = lead.last_contact_at ? Math.floor((Date.now() - new Date(lead.last_contact_at).getTime()) / 86400000) : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,23,42,.6)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end' }} onClick={onClose}>
      <div style={{ background: '#fff', width: 'min(520px,100vw)', height: '100vh', display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 50px rgba(15,23,42,.2)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 18px 12px', background: 'linear-gradient(135deg,#1f487c,#279491)', color: '#fff', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ margin: 0, fontSize: 10, opacity: .75, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase' }}>Follow-up Action</p>
              <h3 style={{ margin: '3px 0 2px', fontSize: 18, fontWeight: 800 }}>{lead.company_name}</h3>
              <p style={{ margin: 0, fontSize: 12, opacity: .85 }}>
                {lead.primary_admin_name} · {lead.pipeline_stage}
                {daysSince !== null && <span> · {daysSince === 0 ? 'contacted today' : `${daysSince}d since contact`}</span>}
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: 'none', color: '#fff', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          {/* Context strip */}
          {(lead.internal_notes || lead.lead_score) && (
            <div style={{ marginTop: 10, background: 'rgba(255,255,255,.12)', borderRadius: 10, padding: '8px 12px', fontSize: 11 }}>
              {lead.lead_score && <span style={{ fontWeight: 700, marginRight: 10 }}>Score: {lead.lead_score}/100</span>}
              {lead.internal_notes && <span style={{ opacity: .9 }}>{lead.internal_notes.slice(0, 120)}{lead.internal_notes.length > 120 ? '…' : ''}</span>}
            </div>
          )}

          {/* Follow-up date */}
          <div style={{ marginTop: 8, display: 'flex', gap: 6, alignItems: 'center', fontSize: 11 }}>
            <span style={{ background: 'rgba(255,255,255,.18)', borderRadius: 6, padding: '3px 8px', fontWeight: 700 }}>
              📅 {fmtDate(lead.next_follow_up_at)}
            </span>
            {lead.source && <span style={{ background: 'rgba(255,255,255,.12)', borderRadius: 6, padding: '3px 8px' }}>{lead.source.replace('_', ' ')}</span>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', flexShrink: 0, overflowX: 'auto' }}>
          {([
            { k: 'whatsapp', l: '💬 WhatsApp' },
            { k: 'email', l: '✉ Email' },
            { k: 'note', l: '📝 Note' },
            { k: 'reschedule', l: '📅 Reschedule' },
            { k: 'history', l: `🕐 History (${log.length})` },
          ] as const).map(({ k, l }) => (
            <button key={k} onClick={() => { setTab(k); setMsgText(''); setGenError(''); }}
              style={{ flex: 'none', padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: tab === k ? '#1F487C' : '#94a3b8', borderBottom: tab === k ? '2px solid #1F487C' : '2px solid transparent', whiteSpace: 'nowrap' }}>
              {l}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* WHATSAPP */}
          {tab === 'whatsapp' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569' }}>WhatsApp Message</p>
                <button onClick={() => generateMessage('whatsapp')} disabled={generating}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: generating ? '#f1f5f9' : '#1F487C', color: generating ? '#94a3b8' : '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer' }}>
                  {generating ? '⏳ Generating…' : '✨ Setu Guru Suggest'}
                </button>
              </div>
              {genError && <p style={{ margin: 0, fontSize: 11, color: '#dc2626', background: '#fef2f2', borderRadius: 8, padding: '6px 10px' }}>{genError}</p>}
              {!msgText && !generating && (
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                  Click "Setu Guru Suggest" to generate a contextual message, or write your own below.
                </p>
              )}
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder="Write or edit your WhatsApp message here…"
                rows={8}
                style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                {wa && (
                  <a href={waLink(lead.primary_phone, lead.primary_admin_name, msgText || `Hi ${lead.primary_admin_name || lead.company_name}, following up on SETU Flow CRM.`) || '#'}
                    target="_blank" rel="noopener"
                    onClick={() => msgText && submitLog('whatsapp', msgText)}
                    style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#25D366', color: '#fff', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                    💬 Open WhatsApp
                  </a>
                )}
                {msgText && (
                  <button onClick={() => submitLog('whatsapp', msgText)} disabled={pending}
                    style={{ flex: 1, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Log only
                  </button>
                )}
              </div>
            </>
          )}

          {/* EMAIL */}
          {tab === 'email' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569' }}>Email Message</p>
                <button onClick={() => generateMessage('email')} disabled={generating}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, background: generating ? '#f1f5f9' : '#1F487C', color: generating ? '#94a3b8' : '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 11, fontWeight: 700, cursor: generating ? 'not-allowed' : 'pointer' }}>
                  {generating ? '⏳ Generating…' : '✨ Setu Guru Suggest'}
                </button>
              </div>
              {genError && <p style={{ margin: 0, fontSize: 11, color: '#dc2626', background: '#fef2f2', borderRadius: 8, padding: '6px 10px' }}>{genError}</p>}
              {!msgText && !generating && (
                <p style={{ margin: 0, fontSize: 11, color: '#94a3b8', textAlign: 'center', padding: '12px 0' }}>
                  Click "Setu Guru Suggest" for a contextual email draft, or write your own.
                </p>
              )}
              <textarea
                value={msgText}
                onChange={e => setMsgText(e.target.value)}
                placeholder="Subject: …\n\nHi [name],\n\n…"
                rows={12}
                style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={`mailto:${lead.primary_admin_email}?body=${encodeURIComponent(msgText)}`}
                  onClick={() => msgText && submitLog('email', msgText)}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#6366f1', color: '#fff', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  ✉ Open in Mail
                </a>
                {msgText && (
                  <button onClick={() => submitLog('email', msgText)} disabled={pending}
                    style={{ flex: 1, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', borderRadius: 10, padding: '10px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Log only
                  </button>
                )}
              </div>
            </>
          )}

          {/* NOTE */}
          {tab === 'note' && (
            <>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569' }}>Log a Note</p>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="What happened? What's the status? Next step?" rows={6}
                style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: 12, padding: '10px 12px', fontSize: 12.5, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <button onClick={() => submitLog('note', noteText)} disabled={!noteText.trim() || pending}
                style={{ background: noteText.trim() ? '#1F487C' : '#e2e8f0', color: noteText.trim() ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: noteText.trim() ? 'pointer' : 'not-allowed' }}>
                {pending ? 'Saving…' : 'Save Note'}
              </button>
            </>
          )}

          {/* RESCHEDULE */}
          {tab === 'reschedule' && (
            <>
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#475569' }}>New Follow-up Date</p>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: 10, padding: '10px 12px', fontSize: 13, boxSizing: 'border-box' }} />
              <textarea value={rescNote} onChange={e => setRescNote(e.target.value)} rows={3}
                placeholder="Reason for rescheduling (optional)…"
                style={{ width: '100%', border: '1px solid #dbe6ef', borderRadius: 10, padding: '10px 12px', fontSize: 12, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              <button onClick={submitReschedule} disabled={!newDate || pending}
                style={{ background: newDate ? '#279491' : '#e2e8f0', color: newDate ? '#fff' : '#94a3b8', border: 'none', borderRadius: 10, padding: '10px', fontSize: 13, fontWeight: 700, cursor: newDate ? 'pointer' : 'not-allowed' }}>
                {pending ? 'Saving…' : 'Confirm Reschedule'}
              </button>
            </>
          )}

          {/* HISTORY */}
          {tab === 'history' && (
            log.length === 0
              ? <p style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 20 }}>No activity logged yet.</p>
              : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {log.map(entry => (
                  <div key={entry.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 12px', background: '#fafafa' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#279491', textTransform: 'uppercase', letterSpacing: '.08em' }}>{entry.kind}</span>
                      <span style={{ fontSize: 9, color: '#94a3b8' }}>{new Date(entry.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} · {entry.actor_name}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#334155', whiteSpace: 'pre-wrap' }}>{entry.note}</p>
                  </div>
                ))}
              </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Lead card ───────────────────────────────────────────────────────
function LeadCard({ lead, tone, logActivity, reschedule }: {
  lead: Lead; tone: 'red' | 'amber' | 'slate';
  logActivity: (fd: FormData) => Promise<void>;
  reschedule: (fd: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const toneMap = {
    red: { border: '#fecaca', bg: '#fff', accent: '#dc2626' },
    amber: { border: '#fcd34d', bg: '#fff', accent: '#d97706' },
    slate: { border: '#e2e8f0', bg: '#fff', accent: '#64748b' },
  }[tone];

  return (
    <>
      <div style={{ border: `1px solid ${toneMap.border}`, borderLeft: `3px solid ${toneMap.accent}`, borderRadius: 14, background: toneMap.bg, padding: '13px 15px', boxShadow: '0 1px 4px rgba(15,23,42,.05)' }}>
        {/* Top row: company + stage + score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 7 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              {stageDot(lead.pipeline_stage)}
              <span style={{ fontWeight: 800, fontSize: 13, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.company_name}</span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: '#64748b' }}>
              {lead.primary_admin_name}{lead.primary_admin_name && lead.primary_admin_email && ' · '}{lead.primary_admin_email}
            </p>
          </div>
          {lead.lead_score != null && (
            <span style={{ flexShrink: 0, background: lead.lead_score >= 70 ? '#dcfce7' : lead.lead_score >= 40 ? '#fef3c7' : '#fee2e2', color: lead.lead_score >= 70 ? '#166534' : lead.lead_score >= 40 ? '#92400e' : '#991b1b', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 800 }}>
              {lead.lead_score}/100
            </span>
          )}
        </div>

        {/* Badges row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
          <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: toneMap.accent }}>
            📅 {fmtDate(lead.next_follow_up_at)}
          </span>
          {lead.last_contact_at && (
            <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 600, color: '#475569' }}>
              Last: {fmtDate(lead.last_contact_at)}
            </span>
          )}
          {lead.assigned_to_name && (
            <span style={{ background: '#e0f2fe', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 600, color: '#0369a1' }}>
              → {lead.assigned_to_name}
            </span>
          )}
          {lead.source && (
            <span style={{ background: '#f0fdf4', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 600, color: '#16a34a' }}>
              {lead.source.replace('_', ' ')}
            </span>
          )}
          {lead.demo_scheduled_at && !lead.demo_completed_at && (
            <span style={{ background: '#fef3c7', borderRadius: 6, padding: '2px 7px', fontSize: 10, fontWeight: 700, color: '#d97706' }}>
              🖥 Demo: {fmtDate(lead.demo_scheduled_at)}
            </span>
          )}
        </div>

        {/* Notes preview */}
        {lead.internal_notes && (
          <p style={{ margin: '0 0 8px', fontSize: 11, color: '#475569', borderLeft: '3px solid #e2e8f0', paddingLeft: 8, whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {lead.internal_notes}
          </p>
        )}

        {/* Last activity preview */}
        {lead.activity_log && lead.activity_log.length > 0 && (() => {
          const last = [...lead.activity_log].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
          return (
            <p style={{ margin: '0 0 8px', fontSize: 10, color: '#94a3b8', borderLeft: '2px solid #f1f5f9', paddingLeft: 7, fontStyle: 'italic' }}>
              Last: {last.kind} — {last.note.slice(0, 80)}{last.note.length > 80 ? '…' : ''}
            </p>
          );
        })()}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => setOpen(true)}
            style={{ background: '#1F487C', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            ✨ Follow Up
          </button>
          <a href={`/smc/leads?open=${lead.id}`}
            style={{ background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '6px 10px', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
            Open Lead →
          </a>
        </div>
      </div>

      {open && (
        <ActionDrawer lead={lead} logActivity={logActivity} reschedule={reschedule} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ─── Section ─────────────────────────────────────────────────────────
function Section({ title, tone, leads, logActivity, reschedule }: {
  title: string; tone: 'red' | 'amber' | 'slate';
  leads: Lead[]; logActivity: (fd: FormData) => Promise<void>; reschedule: (fd: FormData) => Promise<void>;
}) {
  const toneMap = {
    red:   { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', badge: '#fee2e2' },
    amber: { bg: '#fffbeb', border: '#fcd34d', text: '#d97706', badge: '#fef3c7' },
    slate: { bg: '#f8fafc', border: '#e2e8f0', text: '#475569', badge: '#f1f5f9' },
  }[tone];

  return (
    <section style={{ background: toneMap.bg, border: `1px solid ${toneMap.border}`, borderRadius: 18, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 11, fontWeight: 900, color: toneMap.text, textTransform: 'uppercase', letterSpacing: '.12em' }}>{title}</h2>
        <span style={{ background: toneMap.badge, color: toneMap.text, border: `1px solid ${toneMap.border}`, borderRadius: 20, padding: '1px 8px', fontSize: 11, fontWeight: 800 }}>{leads.length}</span>
      </div>
      {leads.length === 0
        ? <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>{tone === 'red' ? 'None — great! 🎉' : 'None'}</p>
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {leads.map(l => <LeadCard key={l.id} lead={l} tone={tone} logActivity={logActivity} reschedule={reschedule} />)}
        </div>
      }
    </section>
  );
}

// ─── Main board ──────────────────────────────────────────────────────
export function FollowUpBoard({ overdue, dueToday, thisWeek, logActivity, reschedule }: Props) {
  const total = overdue.length + dueToday.length + thisWeek.length;
  return (
    <>
      <div className="smc-ph">
        <div><div className="bc">Growth</div><h1>Follow-up Queue</h1></div>
        <div className="ha">
          <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>
            {total === 0 ? 'All clear this week 🎉' : `${total} action${total !== 1 ? 's' : ''} this week`}
          </span>
          <a href="/smc/leads" style={{ marginLeft: 12, fontSize: 11, fontWeight: 700, color: '#279491', textDecoration: 'none' }}>— All Leads</a>
        </div>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {[
            { label: 'Overdue', count: overdue.length, color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
            { label: 'Due Today', count: dueToday.length, color: '#d97706', bg: '#fffbeb', icon: '🟡' },
            { label: 'This Week', count: thisWeek.length, color: '#475569', bg: '#f8fafc', icon: '🔵' },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: 14, padding: '12px 14px', textAlign: 'center', border: `1px solid ${s.bg}` }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.count}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: '#eef4ff', border: '1px solid #c7d2fe', borderRadius: 12, padding: '9px 13px', fontSize: 11, color: '#3730a3', fontWeight: 600 }}>
          ✨ Click <strong>Follow Up</strong> on any lead to get Setu Guru to write a contextual WhatsApp or email message — then edit and send.
        </div>

        <Section title="Overdue" tone="red" leads={overdue} logActivity={logActivity} reschedule={reschedule} />
        <Section title="Due Today" tone="amber" leads={dueToday} logActivity={logActivity} reschedule={reschedule} />
        <Section title="This Week" tone="slate" leads={thisWeek} logActivity={logActivity} reschedule={reschedule} />
      </div>
    </>
  );
}
