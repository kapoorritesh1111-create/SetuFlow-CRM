import Link from 'next/link';

// S37-UX-010: premium Version History + approval posture + Setu Guru guidance rail for the Quote
// Builder route. Reads the already-enriched quote versions (approval_state derived from
// approval_requests) so the surface reflects the first-class approval flow and the DB authority rules.

type EnrichedVersion = {
  id: string;
  quote_id?: string | null;
  version_no?: number | null;
  status?: string | null;
  created_at?: string | null;
  sent_at?: string | null;
  approved_at?: string | null;
  approval_state?: 'none' | 'pending' | 'approved' | 'rejected';
  approval_reason?: string | null;
  approval_requested_at?: string | null;
  approval_decided_at?: string | null;
};

const TEAL = '#0d9488';
const GREEN = '#059669';
const AMBER = '#b45309';

function fmtDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function titleCase(value?: string | null) {
  return String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function approvalChip(state?: EnrichedVersion['approval_state']) {
  switch (state) {
    case 'pending': return { label: 'approval_pending', bg: '#fef3c7', fg: AMBER, bd: '#fde68a' };
    case 'approved': return { label: 'approved', bg: '#d1fae5', fg: GREEN, bd: '#a7f3d0' };
    case 'rejected': return { label: 'rejected', bg: '#fee2e2', fg: '#b91c1c', bd: '#fecaca' };
    default: return null;
  }
}

const card: React.CSSProperties = { background: 'white', border: '1px solid #e8eef5', borderRadius: '16px', padding: '20px 22px', boxShadow: '0 1px 3px rgba(15,23,42,.05)' };
const h: React.CSSProperties = { fontSize: '13px', fontWeight: 800, color: '#0f172a', marginBottom: '14px' };

export default function QuoteVersionRail({ versions, leadId, currentVersionId, sentVersionId }: { versions: EnrichedVersion[]; leadId: string; currentVersionId?: string | null; sentVersionId?: string | null }) {
  const sorted = [...(versions ?? [])].sort((a, b) => Number(b.version_no ?? 0) - Number(a.version_no ?? 0));
  const current = sorted.find((v) => v.id === currentVersionId) ?? sorted[0] ?? null;
  const hasSentVersion = sorted.some((v) => v.id === sentVersionId || String(v.status ?? '').toLowerCase() === 'sent');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]" style={{ gap: '16px', alignItems: 'start' }}>
      {/* Version history */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={h}>Version History</div>
          <span style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '.14em', textTransform: 'uppercase', color: '#94a3b8' }}>One quote · many versions</span>
        </div>
        {sorted.length === 0 ? (
          <div style={{ fontSize: '12px', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>No versions yet — create a draft to begin.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {sorted.map((v) => {
              const isCurrent = v.id === currentVersionId;
              const status = String(v.status ?? 'draft').toLowerCase();
              const locked = ['sent', 'approved', 'accepted', 'rejected', 'expired'].includes(status);
              const superseded = !isCurrent && (status === 'sent' || v.id === sentVersionId) && Boolean(currentVersionId) && currentVersionId !== v.id;
              const achip = approvalChip(v.approval_state);
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '11px', border: isCurrent ? `1px solid ${TEAL}` : '1px solid #e8eef5', background: isCurrent ? '#f0fdfa' : 'white' }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', minWidth: '46px' }}>v{v.version_no ?? '—'}</div>
                  <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '9px', fontWeight: 800, background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }}>{titleCase(status)}</span>
                  {achip ? <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '9px', fontWeight: 800, background: achip.bg, color: achip.fg, border: `1px solid ${achip.bd}`, fontFamily: 'var(--font-dm-mono, monospace)' }}>{achip.label}</span> : null}
                  {isCurrent ? <span style={{ fontSize: '9px', fontWeight: 800, color: TEAL, letterSpacing: '.08em', textTransform: 'uppercase' }}>Current</span> : null}
                  {locked && !isCurrent ? <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase' }}>Locked</span> : null}
                  {superseded ? <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase' }}>Superseded</span> : null}
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>{fmtDate(v.sent_at ?? v.approved_at ?? v.created_at)}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* What happens on save */}
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #e2e8f0' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>What happens on save</div>
          <p style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.6, marginBottom: '10px' }}>
            {hasSentVersion
              ? 'This quote was already sent. Saving an edit writes through a single canonical transaction: the sent version stays locked, a new draft version is opened, a first-class approval request is filed when required, and the change is logged to the audit trail.'
              : 'Saving writes through a single canonical transaction and keeps the draft version current. The parent quote status is derived from the version by the DB — never written from the app.'}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(hasSentVersion ? ['v(n-1) preserved', 'new version editable', 'approval_requests created', 'audit logged'] : ['draft current', 'parent status derived', 'audit logged']).map((chip) => (
              <span key={chip} style={{ padding: '3px 10px', borderRadius: '999px', fontSize: '9.5px', fontWeight: 700, background: '#f0fdfa', color: '#0f766e', border: '1px solid #ccfbf1' }}>{chip}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Setu Guru rail */}
      <div style={{ ...card, background: 'linear-gradient(180deg,#f0fdfa,#ffffff)', border: '1px solid #ccfbf1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: TEAL, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>G</div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Setu Guru</div>
        </div>
        {[
          { t: 'Version safety', b: hasSentVersion ? 'Editing a sent quote creates a new version because the prior one was already sent to the buyer.' : 'Edits stay on the current draft version until it is sent.' },
          { t: 'Approval posture', b: current?.approval_state === 'pending' ? 'An approval request is pending for this version — send unlocks only after it is approved.' : current?.approval_state === 'approved' ? 'This version is approved and clear to send.' : current?.approval_state === 'rejected' ? 'The last approval was rejected — revise and resubmit before sending.' : 'No approval is currently required for this version.' },
          { t: 'Send guard', b: 'Send unlocks only when the version, approval, and line-item checks all clear. Blockers are explained inline before any send attempt.' },
        ].map((g) => (
          <div key={g.t} style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e' }}>{g.t}</div>
            <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.55, marginTop: '3px' }}>{g.b}</div>
          </div>
        ))}
        <Link href={`/leads/${leadId}`} style={{ display: 'inline-block', marginTop: '4px', fontSize: '11px', fontWeight: 700, color: TEAL, textDecoration: 'none' }}>← Back to Lead Detail</Link>
      </div>
    </div>
  );
}
