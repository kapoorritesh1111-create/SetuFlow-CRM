import Link from 'next/link';

import { StatusBadge } from '@/components/ui/status-badge';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { assessInteraktContact } from '@/features/integrations/interakt/qualification';
import {
  readStagedStarkInteraktContacts,
  refreshStarkInteraktStaging,
  updateStarkInteraktIntakeStatus,
} from '@/features/integrations/interakt/server';
import type { NormalizedInteraktContact } from '@/features/integrations/interakt/types';
import { getWorkspaceAccess } from '@/lib/workspace/auth';

const STARK_PACKMATE_ORG_ID = 'b97913cb-3b95-4247-8ced-ffdc0d392d2a';
const STARK_PACKMATE_SLUG = 'starkpackmate';

type SearchParams = { review?: string; status?: string };

type StagedRow = {
  id: string;
  external_contact_id: string;
  external_user_id: string | null;
  contact_name: string | null;
  email: string | null;
  phone_number: string | null;
  country_code: string | null;
  full_phone_number: string | null;
  whatsapp_opted_in: boolean | null;
  source_created_at: string | null;
  source_modified_at: string | null;
  source_created_via: string | null;
  traits: Record<string, unknown> | null;
  raw_payload: Record<string, unknown> | null;
  intake_status: string | null;
  fetched_at: string | null;
  updated_at: string | null;
};

function tagsFrom(value: unknown) {
  if (!value) return [] as string[];
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item.trim();
      if (item && typeof item === 'object') {
        const row = item as Record<string, unknown>;
        return String(row.name ?? row.tag ?? row.label ?? row.value ?? '').trim();
      }
      return '';
    }).filter(Boolean);
  }
  if (typeof value === 'string') return value.split(',').map((item) => item.trim()).filter(Boolean);
  return [] as string[];
}

function toContact(row: StagedRow): NormalizedInteraktContact {
  const raw = (row.raw_payload ?? {}) as Record<string, unknown>;
  const traits = (row.traits ?? {}) as Record<string, unknown>;
  return {
    externalContactId: row.external_contact_id,
    externalUserId: row.external_user_id,
    phoneNumber: row.phone_number,
    countryCode: row.country_code,
    fullPhoneNumber: row.full_phone_number,
    contactName: row.contact_name,
    email: row.email,
    whatsappOptedIn: row.whatsapp_opted_in,
    sourceCreatedAt: row.source_created_at,
    sourceModifiedAt: row.source_modified_at,
    sourceCreatedVia: row.source_created_via,
    tags: tagsFrom(raw.tags ?? traits.tags),
    traits,
    rawPayload: raw,
  };
}

function timeAgo(value: string | null) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB');
}

function scoreClasses(score: number) {
  if (score >= 70) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (score >= 50) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (score >= 30) return 'border-blue-200 bg-blue-50 text-blue-700';
  return 'border-slate-200 bg-slate-100 text-slate-600';
}

function identityLabel(contact: NormalizedInteraktContact) {
  const assessment = assessInteraktContact(contact);
  if (assessment.identity.kind === 'company') return `Company · ${assessment.identity.companyName}`;
  if (assessment.identity.kind === 'person') return `Person · ${assessment.identity.personName}`;
  return 'Unclear identity';
}

function statusLabel(status: string | null) {
  switch (status) {
    case 'needs_info': return 'Needs info';
    case 'ready_to_qualify': return 'Ready to qualify';
    case 'nurture': return 'Nurture';
    case 'reviewed': return 'Reviewed';
    default: return 'New';
  }
}

function statusTone(status: string | null) {
  if (status === 'ready_to_qualify') return 'success' as const;
  if (status === 'needs_info') return 'info' as const;
  return 'neutral' as const;
}

export default async function InboundLeadsPage({ searchParams }: { searchParams?: SearchParams }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Leads · Inbound" title="Workspace membership needed" description="Sign in to your organization to review inbound inquiries." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  const isStark = workspace.organization.id === STARK_PACKMATE_ORG_ID || String(workspace.organization.slug ?? '').toLowerCase() === STARK_PACKMATE_SLUG;
  if (!isStark || !workspace.canAccessAdmin) {
    return <WorkspaceState eyebrow="Leads · Inbound" title="Inbound connector not enabled" description="The Interakt qualification desk is currently enabled only for Stark Packmate admins during this PR test." primaryActionHref="/leads" primaryActionLabel="Back to Leads" />;
  }

  const staged = await readStagedStarkInteraktContacts(250, true);
  const rows = (staged.rows ?? []) as StagedRow[];
  const selectedId = String(searchParams?.review ?? '').trim();
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const selectedContact = selected ? toContact(selected) : null;
  const selectedAssessment = selectedContact ? assessInteraktContact(selectedContact) : null;

  const assessments = rows.map((row) => ({ row, contact: toContact(row), assessment: assessInteraktContact(toContact(row)) }));
  const newCount = rows.filter((row) => !row.intake_status || ['new', 'staged'].includes(row.intake_status)).length;
  const readyCount = rows.filter((row) => row.intake_status === 'ready_to_qualify').length;
  const needsInfoCount = rows.filter((row) => row.intake_status === 'needs_info').length;
  const warmCount = assessments.filter(({ assessment }) => assessment.score >= 50 && assessment.score < 70).length;

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white shadow-soft">
        <div className="flex items-center border-b border-slate-200 px-5">
          <Link href="/leads" className="border-b-2 border-transparent px-4 py-3 text-xs font-bold text-slate-500 hover:text-slate-900">📋 Lead Queue</Link>
          <Link href="/leads/inbound" className="flex items-center gap-2 border-b-2 border-blue-500 px-4 py-3 text-xs font-bold text-slate-900">💬 Inbound <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[9px] font-black text-white">{rows.length}</span></Link>
          <span className="px-4 py-3 text-xs font-bold text-slate-300">🎯 Command Center</span>
          <span className="px-4 py-3 text-xs font-bold text-slate-300">◇ Quote Preview</span>
          <span className="px-4 py-3 text-xs font-bold text-slate-300">✅ Approval Queue</span>
          <Link href="/pipeline" className="ml-auto px-4 py-3 text-xs font-bold text-slate-500 hover:text-blue-700">⊕ View in Pipeline →</Link>
        </div>

        <div className="px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-500">Trade Command Center · Leads</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-950">Inbound Qualification Desk</h1>
              <p className="mt-1 text-sm text-slate-500">Review Interakt inquiries before they become Leads. Terminal items stay auditable but disappear from this active queue.</p>
            </div>
            <form action={refreshStarkInteraktStaging}>
              <button type="submit" disabled={!staged.tableReady} className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:bg-slate-300">↻ Sync new/changed Interakt</button>
            </form>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-blue-600">New</p><p className="mt-1 text-2xl font-bold text-slate-950">{newCount}</p><p className="mt-1 text-xs text-slate-500">Unreviewed inquiries</p></div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Ready to qualify</p><p className="mt-1 text-2xl font-bold text-slate-950">{readyCount}</p><p className="mt-1 text-xs text-slate-500">Human review still required</p></div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Needs info</p><p className="mt-1 text-2xl font-bold text-slate-950">{needsInfoCount}</p><p className="mt-1 text-xs text-slate-500">Missing qualification details</p></div>
            <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-violet-700">Warm</p><p className="mt-1 text-2xl font-bold text-slate-950">{warmCount}</p><p className="mt-1 text-xs text-slate-500">Preliminary metadata score</p></div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs font-semibold text-blue-900">ⓘ Setu Guru is using contact evidence only. Contact-only scores stay below automatic qualification until message intent is connected.</div>
        </div>
      </div>

      {!staged.tableReady ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">The PR staging migration has not been applied to this database yet. The Inbound view is wired, but incremental staging cannot persist until that isolated migration is approved/applied.</div>
      ) : null}
      {staged.error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{staged.error}</div> : null}

      <div className={`grid gap-4 ${selected ? 'xl:grid-cols-[minmax(0,1fr)_390px]' : ''}`}>
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead><tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-black uppercase tracking-[0.12em] text-slate-400"><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Source</th><th className="px-4 py-3">Received</th><th className="px-4 py-3">Setu Guru</th><th className="px-4 py-3">Qualification</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody>
                {assessments.map(({ row, contact, assessment }) => {
                  const active = selected?.id === row.id;
                  return (
                    <tr key={row.id} className={`border-b border-slate-100 align-middle ${active ? 'bg-blue-50/70 ring-1 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}>
                      <td className="px-4 py-3"><div className="font-bold text-slate-950">{row.contact_name ?? 'Unnamed contact'}</div><div className="mt-0.5 text-xs text-slate-500">{row.full_phone_number ?? row.email ?? 'No direct contact detail'}</div></td>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-700">{assessment.source.label}</div>{contact.tags.length ? <div className="mt-1 text-[10px] font-bold text-violet-600">{contact.tags.join(' · ')}</div> : null}</td>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-700">{timeAgo(row.source_created_at)}</div><div className="mt-0.5 text-[10px] text-slate-400">Contact created</div></td>
                      <td className="px-4 py-3"><div className="font-semibold text-slate-800">{identityLabel(contact)}</div><div className="mt-0.5 max-w-[220px] text-xs text-slate-500">{assessment.identity.confidence} confidence</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-2"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${scoreClasses(assessment.score)}`}>{assessment.score}/100</span><span className="text-xs font-semibold text-slate-600">{assessment.bandLabel}</span></div><div className="mt-1 max-w-[230px] text-[11px] text-slate-500">{assessment.score >= 50 ? 'Priority review · intent still unverified' : 'Needs qualification context'}</div></td>
                      <td className="px-4 py-3"><StatusBadge label={statusLabel(row.intake_status)} tone={statusTone(row.intake_status)} dot={false} /></td>
                      <td className="px-4 py-3 text-right"><Link href={`/leads/inbound?review=${encodeURIComponent(row.id)}`} className="inline-flex rounded-xl border border-blue-200 bg-white px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">Review</Link></td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? <tr><td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-500">No active inbound inquiries. Sync Interakt to check for new or changed contacts.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>

        {selected && selectedContact && selectedAssessment ? (
          <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft xl:sticky xl:top-24 xl:self-start">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div><p className="text-[10px] font-black uppercase tracking-[0.14em] text-blue-600">Qualification Review</p><h2 className="mt-1 text-lg font-bold text-slate-950">{selected.contact_name ?? 'Unnamed contact'}</h2><p className="mt-1 text-xs text-slate-500">{selected.full_phone_number ?? selected.email ?? 'No direct contact detail'}</p></div>
              <Link href="/leads/inbound" className="text-xl text-slate-400 hover:text-slate-700">×</Link>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs font-bold text-slate-600">{selectedAssessment.source.label}</span><span className={`rounded-full border px-3 py-1 text-xs font-black ${scoreClasses(selectedAssessment.score)}`}>{selectedAssessment.score}/100 · {selectedAssessment.bandLabel}</span></div>
            <p className="mt-2 text-[11px] text-slate-400">Preliminary · contact evidence only</p>

            <section className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-black text-slate-900">Setu Guru identity</h3><dl className="mt-3 grid grid-cols-[100px_1fr] gap-y-2 text-xs"><dt className="text-slate-400">Person</dt><dd className="font-semibold text-slate-700">{selectedAssessment.identity.personName ?? 'Unknown'}</dd><dt className="text-slate-400">Company</dt><dd className="font-semibold text-slate-700">{selectedAssessment.identity.companyName ?? 'Unknown'}</dd><dt className="text-slate-400">Confidence</dt><dd className="font-semibold capitalize text-slate-700">{selectedAssessment.identity.confidence}</dd></dl></section>

            <section className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-black text-slate-900">Inquiry status</h3><p className="mt-2 text-xs leading-5 text-slate-600">Exact inquiry message and received time are not available from the Contacts API. Message webhook integration is still required before Setu Guru can score commercial intent.</p></section>

            <section className="mt-5 border-t border-slate-100 pt-4"><h3 className="text-xs font-black text-slate-900">Missing before qualification</h3><div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-slate-600"><span className="rounded-xl bg-amber-50 px-3 py-2">• Company/contact split</span><span className="rounded-xl bg-amber-50 px-3 py-2">• Product / pouch type</span><span className="rounded-xl bg-amber-50 px-3 py-2">• Quantity / MOQ</span><span className="rounded-xl bg-amber-50 px-3 py-2">• Dimensions / print</span><span className="rounded-xl bg-amber-50 px-3 py-2">• Delivery location</span><span className="rounded-xl bg-amber-50 px-3 py-2">• Buying timeline</span></div></section>

            <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4"><h3 className="text-xs font-black text-blue-950">Setu Guru recommendation</h3><p className="mt-2 text-xs leading-5 text-blue-900">{selectedAssessment.nextStep}</p></section>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="needs_info" /><button className="w-full rounded-xl border border-blue-200 px-3 py-2.5 text-xs font-bold text-blue-700">Needs info</button></form>
              <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="ready_to_qualify" /><button className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">Ready to qualify</button></form>
              <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="nurture" /><button className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">Nurture</button></form>
              <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="not_relevant" /><button className="w-full rounded-xl border border-rose-200 px-3 py-2.5 text-xs font-bold text-rose-600">Not relevant</button></form>
              <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="duplicate" /><button className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">Duplicate</button></form>
              <form action={updateStarkInteraktIntakeStatus}><input type="hidden" name="rowId" value={selected.id} /><input type="hidden" name="status" value="existing_customer" /><button className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold text-slate-600">Existing customer</button></form>
            </div>

            <button disabled className="mt-3 w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-xs font-black text-slate-400">🔒 Qualify as Lead</button>
            <p className="mt-2 text-center text-[10px] text-slate-400">Lead creation remains intentionally disabled in PR #70.</p>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
