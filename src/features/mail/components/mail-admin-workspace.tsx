'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  CircleAlert,
  Copy,
  Globe2,
  Mail,
  Plus,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react';

type Domain = {
  id: string;
  domain: string;
  status: string;
  sending_status: string;
  receiving_status: string;
  dns_records: Array<Record<string, unknown>>;
  last_checked_at: string | null;
};

type Mailbox = {
  id: string;
  user_id: string;
  address: string;
  display_name: string | null;
  status: string;
  inbound_enabled: boolean;
};

type Alias = {
  id: string;
  mailbox_id: string;
  address: string;
  alias_type: string;
  is_active: boolean;
};

type Member = {
  id: string;
  user_id: string;
  display_name: string | null;
  is_active: boolean;
};

type Entitlement = {
  plan_key: string;
  status: string;
  mailbox_limit: number;
  domain_limit: number;
  storage_limit_bytes: number;
  monthly_message_limit: number;
  current_period_messages: number;
};

type Payload = {
  organization: { name: string };
  domains: Domain[];
  mailboxes: Mailbox[];
  aliases: Alias[];
  members: Member[];
  entitlement: Entitlement | null;
  providerConfigured: boolean;
  webhookConfigured: boolean;
  senderConfigured: boolean;
  webhookPath: string;
};

const READY = new Set(['enabled', 'verified', 'active', 'ready']);

function isReady(value: string | undefined | null) {
  return READY.has(String(value || '').toLowerCase());
}

function friendlyStatus(value: string | undefined | null) {
  const normalized = String(value || '').toLowerCase();
  if (READY.has(normalized)) return 'Ready';
  if (['pending', 'pending_verification', 'not_started'].includes(normalized)) return 'Pending verification';
  if (['failed', 'error', 'invalid'].includes(normalized)) return 'Needs attention';
  return normalized ? normalized.replaceAll('_', ' ') : 'Not configured';
}

function dnsValue(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return value == null ? '' : String(value);
}

function formatLimit(value: number | undefined, internal: boolean) {
  if (internal) return 'Unlimited';
  return new Intl.NumberFormat().format(Number(value ?? 0));
}

export function MailAdminWorkspace() {
  const [data, setData] = useState<Payload | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [domain, setDomain] = useState('');
  const [userId, setUserId] = useState('');
  const [localPart, setLocalPart] = useState('');
  const [mailboxDomain, setMailboxDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [aliasMailbox, setAliasMailbox] = useState('');
  const [aliasLocalPart, setAliasLocalPart] = useState('');

  const readyDomains = useMemo(
    () => data?.domains.filter((item) => isReady(item.sending_status) && isReady(item.receiving_status)) ?? [],
    [data?.domains],
  );

  const activeMailboxes = useMemo(
    () => data?.mailboxes.filter((item) => item.status === 'active') ?? [],
    [data?.mailboxes],
  );

  async function load() {
    const response = await fetch('/api/mail/admin', { cache: 'no-store' });
    const payload = (await response.json()) as Payload & { error?: string };

    if (!response.ok) {
      setNotice(payload.error || 'Setu Mail could not be loaded.');
      return;
    }

    setData(payload);

    if (!userId && payload.members?.[0]?.user_id) setUserId(payload.members[0].user_id);

    const firstReady = payload.domains?.find(
      (item) => isReady(item.sending_status) && isReady(item.receiving_status),
    );
    if (!mailboxDomain && firstReady?.domain) setMailboxDomain(firstReady.domain);

    const firstActive = payload.mailboxes?.find((item) => item.status === 'active');
    if (!aliasMailbox && firstActive?.id) setAliasMailbox(firstActive.id);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function act(payload: Record<string, unknown>, success = 'Changes saved.') {
    setBusy(true);
    setNotice(null);

    try {
      const response = await fetch('/api/mail/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || 'We could not complete that action.');
      setNotice(success);
      await load();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'We could not complete that action.');
    } finally {
      setBusy(false);
    }
  }

  const entitlement = data?.entitlement;
  const internalPlan = entitlement?.plan_key === 'internal';
  const mailboxAddress = localPart.trim() && mailboxDomain
    ? `${localPart.trim().toLowerCase()}@${mailboxDomain}`
    : '';
  const aliasDestination = data?.mailboxes.find((item) => item.id === aliasMailbox);
  const aliasDomain = aliasDestination?.address.split('@')[1] || '';
  const aliasAddress = aliasLocalPart.trim() && aliasDomain
    ? `${aliasLocalPart.trim().toLowerCase()}@${aliasDomain}`
    : '';

  const mailReady = Boolean(data?.providerConfigured && data?.webhookConfigured);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <Mail size={17} />
              </span>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Setu Mail</p>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">Business email</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Manage your company email domains, team mailboxes and shared addresses from one place.
            </p>
          </div>
          <Link
            href="/mail"
            className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
          >
            Open Mail
          </Link>
        </div>
      </section>

      {notice ? (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-900">
          {notice}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <Stat
          title="Mail service"
          value={mailReady ? 'Ready' : 'Setup needed'}
          icon={<ShieldCheck size={18} />}
          tone={mailReady ? 'success' : 'warning'}
        />
        <Stat
          title="Mailboxes"
          value={internalPlan ? `${activeMailboxes.length} active` : `${activeMailboxes.length} / ${formatLimit(entitlement?.mailbox_limit, false)}`}
          icon={<Users size={18} />}
        />
        <Stat
          title="Domains"
          value={internalPlan ? `${data?.domains.length ?? 0} connected` : `${data?.domains.length ?? 0} / ${formatLimit(entitlement?.domain_limit, false)}`}
          icon={<Globe2 size={18} />}
        />
        <Stat
          title="Messages this month"
          value={internalPlan
            ? new Intl.NumberFormat().format(entitlement?.current_period_messages ?? 0)
            : `${new Intl.NumberFormat().format(entitlement?.current_period_messages ?? 0)} / ${formatLimit(entitlement?.monthly_message_limit, false)}`}
          icon={<CheckCircle2 size={18} />}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Mail service status</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Setu Mail checks the services needed to send and receive business email securely.
            </p>
          </div>
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${mailReady ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {mailReady ? 'Service ready' : 'Setup in progress'}
          </span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <Readiness
            label="Outgoing mail"
            ready={Boolean(data?.providerConfigured)}
            readyText="Ready to send"
            missingText="Sending setup required"
          />
          <Readiness
            label="Incoming mail"
            ready={Boolean(data?.webhookConfigured)}
            readyText="Ready to receive"
            missingText="Receiving setup required"
          />
          <Readiness
            label="Default sender"
            ready={Boolean(data?.senderConfigured)}
            readyText="Configured"
            missingText="Available after domain setup"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900">Company domains</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Add a domain you own to create professional email addresses for your team.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-black ${data?.providerConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {data?.providerConfigured ? 'Mail service connected' : 'Mail service setup needed'}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="yourcompany.com"
            className="h-11 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          <button
            disabled={busy || !domain.trim()}
            onClick={() => void act({ action: 'create_domain', domain }, 'Domain added. Complete the DNS records below to activate email.')}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-50"
          >
            <Plus size={16} className="mr-1.5" />
            Add domain
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {data?.domains.length ? data.domains.map((item) => {
            const ready = isReady(item.sending_status) && isReady(item.receiving_status);
            return (
              <div key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-black text-slate-900">{item.domain}</div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${ready ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {ready ? 'Ready' : 'Action needed'}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>Sending: <strong className="font-bold text-slate-700">{friendlyStatus(item.sending_status)}</strong></span>
                      <span>Receiving: <strong className="font-bold text-slate-700">{friendlyStatus(item.receiving_status)}</strong></span>
                    </div>
                  </div>
                  <button
                    disabled={busy}
                    onClick={() => void act({ action: 'refresh_domain', id: item.id }, 'Domain status refreshed.')}
                    className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
                  >
                    <RefreshCw size={14} /> Refresh status
                  </button>
                </div>

                {Array.isArray(item.dns_records) && item.dns_records.length ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <div className="grid grid-cols-[70px_minmax(110px,.7fr)_minmax(160px,1.3fr)_36px] border-b border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-slate-400">
                      <span>Type</span><span>Host</span><span>Value</span><span />
                    </div>
                    {item.dns_records.map((record, index) => {
                      const type = dnsValue(record, 'type') || dnsValue(record, 'record') || 'DNS';
                      const host = dnsValue(record, 'name') || dnsValue(record, 'host') || '@';
                      const value = dnsValue(record, 'value') || dnsValue(record, 'content');
                      return (
                        <div key={`${type}-${index}`} className="grid grid-cols-[70px_minmax(110px,.7fr)_minmax(160px,1.3fr)_36px] items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-xs last:border-0">
                          <span className="font-black text-slate-600">{type}</span>
                          <span className="truncate font-mono text-slate-600" title={host}>{host}</span>
                          <span className="truncate font-mono text-slate-600" title={value}>{value}</span>
                          <button
                            type="button"
                            onClick={() => navigator.clipboard?.writeText(value)}
                            className="rounded-md p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                            title="Copy value"
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : ready ? null : (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs font-semibold leading-5 text-amber-800">
                    <CircleAlert size={14} className="mt-0.5 shrink-0" />
                    DNS setup details will appear here when the domain is ready for verification.
                  </div>
                )}
              </div>
            );
          }) : (
            <EmptyState
              icon={<Globe2 size={20} />}
              title="No email domain connected"
              description="Add your company domain to start creating team mailboxes."
            />
          )}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-900">Team mailboxes</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Give team members their own company email address inside Setu Flow.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <select value={userId} onChange={(event) => setUserId(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
              <option value="">Select team member</option>
              {data?.members.map((member) => (
                <option key={member.user_id} value={member.user_id}>{member.display_name || 'Team member'}</option>
              ))}
            </select>
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Sender name, e.g. Ritesh Kapoor" className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm" />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input value={localPart} onChange={(event) => setLocalPart(event.target.value.replace(/@.*/, ''))} placeholder="ritesh" className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm" />
              <span className="text-slate-400">@</span>
              <select value={mailboxDomain} onChange={(event) => setMailboxDomain(event.target.value)} className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm">
                <option value="">Choose domain</option>
                {readyDomains.map((item) => <option key={item.id} value={item.domain}>{item.domain}</option>)}
              </select>
            </div>

            {readyDomains.length === 0 ? (
              <div className="rounded-xl bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
                Complete domain verification before creating a mailbox.
              </div>
            ) : null}

            <button
              disabled={busy || !userId || !mailboxAddress}
              onClick={() => void act({ action: 'create_mailbox', userId, address: mailboxAddress, displayName }, 'Mailbox created and ready for the selected team member.')}
              className="h-11 w-full rounded-xl bg-blue-600 text-sm font-black text-white disabled:opacity-50"
            >
              Create mailbox
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {data?.mailboxes.length ? data.mailboxes.map((mailbox) => (
              <div key={mailbox.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-blue-700 shadow-sm"><Mail size={15} /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800">{mailbox.display_name || 'Team mailbox'}</div>
                  <div className="truncate text-sm text-slate-500">{mailbox.address}</div>
                  <div className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-400">
                    {mailbox.status === 'active' ? 'Active' : 'Disabled'} · {mailbox.inbound_enabled ? 'Receiving enabled' : 'Receiving unavailable'}
                  </div>
                </div>
                <button
                  disabled={busy}
                  onClick={() => void act({ action: 'set_mailbox_status', id: mailbox.id, status: mailbox.status === 'active' ? 'disabled' : 'active' }, mailbox.status === 'active' ? 'Mailbox disabled.' : 'Mailbox enabled.')}
                  className={`rounded-lg border px-3 py-2 text-xs font-black ${mailbox.status === 'active' ? 'border-slate-200 bg-white text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                >
                  {mailbox.status === 'active' ? 'Disable' : 'Enable'}
                </button>
              </div>
            )) : <EmptyState icon={<Users size={20} />} title="No team mailboxes yet" description="Create the first mailbox after your company domain is ready." />}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-lg font-black text-slate-900">Shared addresses</h3>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Add addresses such as sales@, orders@ or accounts@ and route them to an active team mailbox.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <select value={aliasMailbox} onChange={(event) => setAliasMailbox(event.target.value)} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm">
              <option value="">Choose destination mailbox</option>
              {activeMailboxes.map((mailbox) => <option key={mailbox.id} value={mailbox.id}>{mailbox.address}</option>)}
            </select>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <input value={aliasLocalPart} onChange={(event) => setAliasLocalPart(event.target.value.replace(/@.*/, ''))} placeholder="sales" className="h-11 min-w-0 rounded-xl border border-slate-200 px-3 text-sm" />
              <span className="text-slate-400">@</span>
              <input value={aliasDomain} readOnly placeholder="domain" className="h-11 min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500" />
            </div>
            <button
              disabled={busy || !aliasMailbox || !aliasAddress}
              onClick={() => void act({ action: 'create_alias', mailboxId: aliasMailbox, address: aliasAddress, aliasType: 'shared' }, 'Shared address added.')}
              className="h-11 w-full rounded-xl border border-blue-200 bg-blue-50 text-sm font-black text-blue-700 disabled:opacity-50"
            >
              Add shared address
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {data?.aliases.length ? data.aliases.map((alias) => (
              <div key={alias.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-violet-700 shadow-sm"><Users size={15} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold text-slate-800">{alias.address}</div>
                  <div className="text-xs text-slate-500">Routes to {data?.mailboxes.find((mailbox) => mailbox.id === alias.mailbox_id)?.address || 'team mailbox'}</div>
                </div>
                <button
                  disabled={busy}
                  onClick={() => void act({ action: 'set_alias_status', id: alias.id, isActive: !alias.is_active }, alias.is_active ? 'Shared address disabled.' : 'Shared address enabled.')}
                  className={`rounded-lg border px-3 py-2 text-xs font-black ${alias.is_active ? 'border-slate-200 bg-white text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}
                >
                  {alias.is_active ? 'Disable' : 'Enable'}
                </button>
              </div>
            )) : <EmptyState icon={<Users size={20} />} title="No shared addresses yet" description="Shared addresses can be added after the first team mailbox is active." />}
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ title, value, icon, tone = 'default' }: { title: string; value: string; icon: ReactNode; tone?: 'default' | 'success' | 'warning' }) {
  const toneClasses = tone === 'success'
    ? 'border-emerald-100 bg-emerald-50/50 text-emerald-700'
    : tone === 'warning'
      ? 'border-amber-100 bg-amber-50/50 text-amber-700'
      : 'border-slate-200 bg-white text-slate-400';

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClasses}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-black uppercase tracking-wide">{title}</span>
      </div>
      <div className="mt-3 text-xl font-black text-slate-900">{value}</div>
    </div>
  );
}

function Readiness({ label, ready, readyText, missingText }: { label: string; ready: boolean; readyText: string; missingText: string }) {
  return (
    <div className={`rounded-xl border p-3 ${ready ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
      <div className="flex items-center gap-2">
        {ready ? <CheckCircle2 size={16} className="text-emerald-600" /> : <CircleAlert size={16} className="text-amber-600" />}
        <span className="text-sm font-black text-slate-800">{label}</span>
      </div>
      <p className={`mt-1.5 text-xs font-semibold ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>
        {ready ? readyText : missingText}
      </p>
    </div>
  );
}

function EmptyState({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">{icon}</div>
      <div className="mt-3 text-sm font-black text-slate-800">{title}</div>
      <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
    </div>
  );
}
