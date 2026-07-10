'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  filterLeadsForRole,
  mobileLeadDemoData,
  mobileLeadDemoUsers,
  type MobileLead,
  type MobileLeadType,
  type MobileUserContext,
  type MobileUserRole,
} from '../lib/role-aware-leads';
import { LeadRow, SearchBar, SegmentedControl, type PillTone } from './primitives';

type SignedInSummary = {
  name: string;
  email?: string | null;
  roleLabel: string;
  organizationName?: string | null;
  shareHref?: string;
  avatarUrl?: string | null;
};

function followUpState(lead: MobileLead): 'overdue' | 'today' | 'upcoming' | 'none' {
  if (!lead.nextFollowUpAt) return 'none';
  const now = Date.now(); const fu = new Date(lead.nextFollowUpAt).getTime();
  const today = new Date(); today.setHours(0,0,0,0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
  if (fu < today.getTime()) return 'overdue';
  if (fu < tomorrow.getTime()) return 'today';
  return 'upcoming';
}

function leadTypeLabel(leadType: MobileLeadType) {
  if (leadType === 'buyer') return 'Buyer';
  if (leadType === 'supplier') return 'Supplier';
  return 'All';
}

function initialsFor(company: string) {
  const parts = company.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return company.slice(0, 2).toUpperCase();
}

/** Maps a lead's free-text status to a semantic pill tone. Falls back to a
 * neutral/urgency-based tone when the status string doesn't match a known
 * pipeline stage name, rather than guessing at a color. */
function statusToneFor(lead: MobileLead): PillTone {
  const s = lead.status.toLowerCase();
  if (s.includes('won') || s.includes('accepted') || s.includes('received')) return 'stage-won';
  if (s.includes('negotiat')) return 'stage-negotiation';
  if (s.includes('sample')) return 'stage-sample';
  if (s.includes('qualif')) return 'stage-qualified';
  if (s.includes('contact')) return 'stage-contacted';
  if (s.includes('lost') || s.includes('reject')) return 'stage-lost';
  if (followUpState(lead) === 'overdue') return 'danger';
  return 'stage-new';
}

function telHref(phone?: string | null) {
  return phone ? `tel:${phone.replace(/[^+0-9]/g, '')}` : null;
}
function whatsappHref(lead: MobileLead) {
  const source = lead.whatsappNumber || lead.phone || '';
  const digits = source.replace(/[^0-9]/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

export function RoleAwareLeadList({
  leads: providedLeads,
  user: providedUser,
  signedIn: _signedIn,
  allowRolePreview = true,
  initialLeadType = '',
}: {
  leads?: MobileLead[];
  user?: MobileUserContext;
  signedIn?: SignedInSummary;
  allowRolePreview?: boolean;
  initialLeadType?: MobileLeadType;
}) {
  const demoMode = !providedLeads || !providedUser;
  const [role, setRole] = useState<MobileUserRole>(providedUser?.role ?? 'owner');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');

  const activeUser = useMemo(() => {
    if (providedUser && (!demoMode || !allowRolePreview)) return providedUser;
    return mobileLeadDemoUsers[role];
  }, [allowRolePreview, demoMode, providedUser, role]);

  const sourceLeads = providedLeads ?? mobileLeadDemoData;
  const leads = useMemo(() => filterLeadsForRole(sourceLeads, activeUser, { query, status, leadType: initialLeadType }), [activeUser, initialLeadType, query, sourceLeads, status]);
  const router = useRouter();
  function changeLeadTypeMode(next: 'all' | 'buyer' | 'supplier') {
    const params = new URLSearchParams();
    params.set('mode', next === 'buyer' ? 'buyers' : next === 'supplier' ? 'suppliers' : 'all');
    router.push(`/leads?${params.toString()}`);
  }

  return (
    <section className="sf-mobile-lead-queue space-y-3.5">
      <div className="flex items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight text-content-primary">{leadTypeLabel(initialLeadType)} leads</h1>
        <p className="shrink-0 text-xs font-medium text-content-muted">{leads.length} shown</p>
      </div>
      <SegmentedControl
        options={[
          { value: 'all' as const, label: 'All' },
          { value: 'buyer' as const, label: 'Buyer' },
          { value: 'supplier' as const, label: 'Supplier' },
        ]}
        value={initialLeadType || 'all'}
        onChange={changeLeadTypeMode}
      />
      {demoMode && allowRolePreview ? (
        <div className="grid grid-cols-4 gap-1.5">
          {(['owner', 'admin', 'manager', 'member'] as MobileUserRole[]).map((item) => (
            <button key={item} onClick={() => setRole(item)} className={`min-h-9 rounded-[9px] text-[11px] font-semibold capitalize ${role === item ? 'bg-brand-700 text-white' : 'bg-surface-2 text-content-secondary'}`}>
              {item}
            </button>
          ))}
        </div>
      ) : null}
      <SearchBar placeholder="Search leads" value={query} onChange={setQuery} onSort={() => setStatus(status === 'All' ? statusOptions(sourceLeads)[1] ?? 'All' : 'All')} />

      {/* SF-18-118: urgency-based grouping */}
      {[
        { id: 'critical', label: '⚠ Critical', dot: 'bg-danger-solid animate-pulse', style: 'bg-danger-bg border-danger-border', filter: (l: MobileLead) => followUpState(l) === 'overdue' },
        { id: 'today', label: '⏰ Due today', dot: 'bg-warning-solid animate-pulse', style: 'bg-warning-bg border-warning-border', filter: (l: MobileLead) => followUpState(l) === 'today' },
        { id: 'active', label: '✓ Active', dot: 'bg-success-solid', style: 'bg-success-bg border-success-border', filter: (l: MobileLead) => followUpState(l) !== 'overdue' && followUpState(l) !== 'today' },
      ].map(group => {
        const groupLeads = leads.filter(group.filter);
        if (!groupLeads.length) return null;
        return (
          <div key={group.id}>
            <div className={`mb-2 flex items-center gap-2 rounded-2xl border ${group.style} px-4 py-2.5`}>
              <span className={`h-2 w-2 shrink-0 rounded-full ${group.dot}`} />
              <span className="text-[10.5px] font-semibold uppercase tracking-[.1em] text-content-secondary">{group.label}</span>
              <span className="ml-auto text-[10px] font-semibold text-content-muted">{groupLeads.length} leads</span>
            </div>
            <div>
              {groupLeads.map(lead => {
                const call = telHref(lead.phone);
                const whatsapp = whatsappHref(lead);
                const isSupplier = lead.leadType === 'supplier';
                return (
                  <LeadRow
                    key={lead.id}
                    id={lead.id}
                    initials={initialsFor(lead.company)}
                    name={lead.company}
                    meta={`${lead.contact} · ${lead.market} · ${lead.valueUsd ? `$${lead.valueUsd.toLocaleString()}` : 'No value yet'}`}
                    statusLabel={lead.status}
                    statusTone={statusToneFor(lead)}
                    onOpen={() => { window.location.href = `/leads/${encodeURIComponent(lead.id)}`; }}
                    onCall={call ? () => { window.location.href = call!; } : undefined}
                    onWhatsApp={whatsapp ? () => window.open(whatsapp, '_blank', 'noreferrer') : undefined}
                    thirdAction={
                      isSupplier
                        ? { icon: '⏰', label: 'Nudge supplier', tone: 'warning', onClick: () => { window.location.href = `/leads/${encodeURIComponent(lead.id)}`; } }
                        : { icon: '▤', label: 'Create quote', tone: 'stage-contacted', onClick: () => { window.location.href = `/leads/${encodeURIComponent(lead.id)}/quote?handoff=mobile-lead-row`; } }
                    }
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </section>
  );
}

function statusOptions(leads: MobileLead[]) {
  return ['All', ...Array.from(new Set(leads.map((lead) => lead.status)))];
}
