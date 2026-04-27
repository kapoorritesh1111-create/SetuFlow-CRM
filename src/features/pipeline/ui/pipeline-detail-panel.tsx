'use client';

import { useRouter } from 'next/navigation';
import { navigateToLeadCommandCenter } from '@/lib/lead-command-center-navigation';

type Lead = {
  id: string;
  company_name: string;
  contact_name: string | null;
  country: string | null;
  lead_type: 'buyer' | 'supplier' | null;
  deal_value: number | null;
  deal_currency: string | null;
  stage_id: string | null;
  next_follow_up_at: string | null;
  source_type?: string | null;
};

type Stage = { id: string; name: string; sort_order: number | null };

type MoveReadiness = { status: 'ready' | 'at_risk' | 'blocked'; blockers: string[]; summary: string };

export interface PipelineDetailPanelProps {
  lead: Lead | null;
  stages: Stage[];
  ownerLabel: string;
  health: string;
  moveReadiness: MoveReadiness;
  pricingLabel: string;
  commandCenterHref: string;
  onClose: () => void;
  onMove: (leadId: string, stageId: string) => void;
  onSchedule: (leadId: string, scheduledAt: string) => void;
  onAddNote: (leadId: string, note: string) => void;
  isPending: boolean;
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff > 0) return `${diff} day${diff === 1 ? '' : 's'} overdue`;
  return `In ${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'}`;
}

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (!value) return '—';
  return `${currency ?? 'USD'} ${Number(value).toLocaleString()}`;
}

function getFollowUpColor(iso: string | null | undefined) {
  if (!iso) return '#64748b';
  const diff = Math.floor((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '#dc2626';
  if (diff === 0) return '#d97706';
  return '#059669';
}

export function PipelineDetailPanel({
  lead,
  stages,
  ownerLabel,
  health,
  moveReadiness,
  pricingLabel,
  commandCenterHref,
  onClose,
  onMove,
  onSchedule,
  onAddNote,
  isPending,
}: PipelineDetailPanelProps) {
  const router = useRouter();
  if (!lead) return null;

  const currentStage = stages.find(s => s.id === lead.stage_id);
  const currentSortOrder = currentStage?.sort_order ?? 0;
  const stageCount = stages.length;
  const progress = stageCount > 0 ? Math.max(0.04, Math.min(1, (currentSortOrder ?? 0) / stageCount)) : 0.04;
  const followUpColor = getFollowUpColor(lead.next_follow_up_at);
  const isOverdue = lead.next_follow_up_at ? new Date(lead.next_follow_up_at) < new Date() : false;
  const healthLabel = health.includes('at_risk') ? 'At risk · stalled' : health.includes('stalled') ? 'Stalled · cold' : 'Healthy · active';
  const healthColor = health.includes('at_risk') ? '#d97706' : health.includes('stalled') ? '#64748b' : '#059669';

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.35)', zIndex: 100, backdropFilter: 'blur(2px)' }}
      />
      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '420px', maxWidth: '95vw',
        background: 'white', zIndex: 101, boxShadow: '-8px 0 32px rgba(15,23,42,.18)',
        display: 'flex', flexDirection: 'column', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', background: 'linear-gradient(135deg,#0b2e4a,#1a4f7a)', color: 'white' }}>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 800, letterSpacing: '-.3px', marginBottom: '2px' }}>{lead.company_name}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.75)' }}>
              {lead.lead_type === 'buyer' ? 'Buyer' : 'Supplier'} · {currentStage?.name ?? 'Unstaged'} · {ownerLabel}
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.2)', color: 'white', borderRadius: '8px', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0' }}>

          {/* Contact section */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.16em', color: '#94a3b8', marginBottom: '9px' }}>Contact</div>
            {[
              ['Contact', lead.contact_name ?? '—'],
              ['Country', lead.country ?? '—'],
              ['Source', lead.source_type ?? 'Direct'],
              ['Deal value', formatMoney(lead.deal_value, lead.deal_currency)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Status section */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.16em', color: '#94a3b8', marginBottom: '9px' }}>Status</div>
            {[
              ['Follow-up', formatDate(lead.next_follow_up_at), isOverdue ? '#dc2626' : '#059669'],
              ['Health', healthLabel, healthColor],
              ['Pricing', pricingLabel, '#64748b'],
              ['Move readiness', moveReadiness.status === 'blocked' ? 'Blocked' : moveReadiness.status === 'at_risk' ? 'Guarded' : 'Ready', moveReadiness.status === 'blocked' ? '#dc2626' : '#059669'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '3px 0', borderBottom: '1px solid #f8fafc' }}>
                <span style={{ color: '#64748b' }}>{k}</span>
                <span style={{ fontWeight: 600, color: c as string }}>{v}</span>
              </div>
            ))}
            {/* Stage progress bar */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>Pipeline progress — {currentStage?.name ?? 'Unstaged'}</div>
              <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${progress * 100}%`, background: isOverdue ? '#dc2626' : '#059669', borderRadius: '999px', transition: 'width .3s' }} />
              </div>
            </div>
          </div>

          {/* Blockers */}
          {moveReadiness.blockers.length > 0 && (
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', background: '#fff1f2' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.16em', color: '#dc2626', marginBottom: '8px' }}>Blockers — resolve before advancing</div>
              {moveReadiness.blockers.slice(0, 4).map((b, i) => (
                <div key={i} style={{ fontSize: '12px', color: '#991b1b', padding: '5px 0', borderBottom: i < moveReadiness.blockers.length - 1 ? '1px solid #fecaca' : 'none' }}>⚠ {b}</div>
              ))}
            </div>
          )}

          {/* Move to stage */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.16em', color: '#94a3b8', marginBottom: '9px' }}>Move to stage</div>
            <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const sid = fd.get('stage_id') as string; if (sid && sid !== lead.stage_id) onMove(lead.id, sid); }}>
              <select name="stage_id" defaultValue={lead.stage_id ?? ''} style={{ width: '100%', height: '36px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 10px', fontSize: '12px', marginBottom: '8px' }}>
                <option value="">— Select stage —</option>
                {stages.filter(s => s.id !== lead.stage_id).map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <button type="submit" disabled={isPending} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0b2e4a', color: 'white', fontSize: '12px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Confirm move</button>
            </form>
          </div>

          {/* Quick actions */}
          <div style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.16em', color: '#94a3b8', marginBottom: '10px' }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const at = fd.get('scheduled_at') as string; if (at) onSchedule(lead.id, at); }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="datetime-local" name="scheduled_at" style={{ flex: 1, height: '34px', borderRadius: '7px', border: '1px solid #e2e8f0', padding: '0 9px', fontSize: '11px' }} />
                  <button type="submit" style={{ padding: '0 12px', borderRadius: '7px', background: '#0b2e4a', color: 'white', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>📅 Schedule</button>
                </div>
              </form>
              <form onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); const note = fd.get('note') as string; if (note?.trim()) onAddNote(lead.id, note.trim()); }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="text" name="note" placeholder="Add a note…" style={{ flex: 1, height: '34px', borderRadius: '7px', border: '1px solid #e2e8f0', padding: '0 9px', fontSize: '11px' }} />
                  <button type="submit" style={{ padding: '0 12px', borderRadius: '7px', background: '#0b2e4a', color: 'white', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>📝 Note</button>
                </div>
              </form>
              <button type="button"
                onClick={() => navigateToLeadCommandCenter(router, commandCenterHref)}
                style={{ width: '100%', padding: '9px', borderRadius: '8px', border: '1px solid #0b2e4a', background: 'white', color: '#0b2e4a', fontSize: '12px', fontWeight: 700, cursor: 'pointer', textAlign: 'center' }}>
                ↗ Open in Command Center
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
