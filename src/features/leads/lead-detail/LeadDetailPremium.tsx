import Link from 'next/link';
// S37_DELETE_CANDIDATE: legacy premium detail surface. Canonical lead detail is /leads/[leadId].
import type { LeadProfileData } from '@/lib/queries/leads';
import type { LeadProfileSnapshot, QuoteVersionTimelineItem } from '@/features/leads/command-center/types';
import LeadDetailActionBar from '@/features/leads/lead-detail/LeadDetailActionBar';

// S37-UX-009: premium Lead Detail surface. Renders the dedicated /leads/[leadId] route to match the
// approved design — lead header, readiness stat strip, status timeline, About Buyer, Quotes on this
// lead (v1/v2 with first-class approval posture), Setu Guru guidance, and recent activity.

const NAVY = '#0b2e4a';
const TEAL = '#0d9488';
const GREEN = '#059669';
const AMBER = '#b45309';
const MUTED = '#64748b';

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('') || 'L';
}
function titleCase(value?: string | null) {
  return String(value ?? '').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function readinessScore(snapshot: LeadProfileSnapshot) {
  let score = 8;
  if (snapshot.qualification.status === 'qualified') score += 32;
  else if (snapshot.qualification.status === 'in_review') score += 16;
  if (snapshot.mapping.productCount > 0) score += 22;
  if (snapshot.mapping.marketCount > 0) score += 10;
  if (snapshot.commercial.quoteCount > 0) score += 16;
  const latest = String(snapshot.commercial.latestQuoteStatus ?? '').toLowerCase();
  if (['sent', 'accepted', 'in_review'].includes(latest)) score += 12;
  return Math.max(4, Math.min(100, score));
}

function approvalChip(state: QuoteVersionTimelineItem['approvalState']) {
  switch (state) {
    case 'pending': return { label: 'Approval pending', bg: '#fef3c7', fg: AMBER, bd: '#fde68a' };
    case 'approved': return { label: 'Approved', bg: '#d1fae5', fg: GREEN, bd: '#a7f3d0' };
    case 'rejected': return { label: 'Rejected', bg: '#fee2e2', fg: '#b91c1c', bd: '#fecaca' };
    default: return null;
  }
}

function versionStatusChip(version: QuoteVersionTimelineItem) {
  const status = String(version.status ?? 'draft').toLowerCase();
  if (version.isAccepted || status === 'accepted') return { label: 'Accepted', bg: '#d1fae5', fg: GREEN, bd: '#a7f3d0' };
  if (status === 'sent' || version.isSent) return { label: 'Sent', bg: '#dbeafe', fg: '#1d4ed8', bd: '#bfdbfe' };
  if (status === 'approval_pending') return { label: 'In review', bg: '#fef3c7', fg: AMBER, bd: '#fde68a' };
  if (status === 'rejected') return { label: 'Rejected', bg: '#fee2e2', fg: '#b91c1c', bd: '#fecaca' };
  return { label: titleCase(status), bg: '#f1f5f9', fg: '#475569', bd: '#e2e8f0' };
}

const cardStyle: React.CSSProperties = { background: 'white', border: '1px solid #e8eef5', borderRadius: '16px', padding: '20px 22px', boxShadow: '0 1px 3px rgba(15,23,42,.05)' };
const sectionTitle: React.CSSProperties = { fontSize: '13px', fontWeight: 800, color: '#0f172a', letterSpacing: '-.2px', marginBottom: '14px' };
const kicker: React.CSSProperties = { fontSize: '9px', fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase', color: '#94a3b8' };

export default function LeadDetailPremium({ data, snapshot, currentUserId }: { data: LeadProfileData; snapshot: LeadProfileSnapshot; currentUserId?: string }) {
  const lead = data.lead;
  if (!lead) return null;
  const leadId = lead.id;
  const company = lead.company_name ?? 'Lead';
  const stageLabel = snapshot.lead.currentStage ?? snapshot.pipeline.stages.find((s) => s.state === 'current')?.label ?? 'New';
  const ownerName = snapshot.lead.ownerName ?? 'Unassigned';
  const score = readinessScore(snapshot);

  const versions = snapshot.quoteVersions ?? [];
  const currentVersion = versions.find((v) => v.isCurrent) ?? versions[0] ?? null;
  const sentVersion = versions.find((v) => v.isSent) ?? null;
  const productNames = snapshot.mapping.productNames ?? [];
  const marketNames = snapshot.mapping.marketNames ?? [];

  const locationBits = [lead.country, lead.lead_type === 'supplier' ? 'Supplier' : 'Retail importer', lead.source_label ? `Source: ${lead.source_label}` : lead.source_type ? `Source: ${titleCase(lead.source_type)}` : null].filter(Boolean);
  const quoteHref = `/leads/${leadId}/quote${currentVersion?.quoteId ? `?quoteId=${currentVersion.quoteId}` : ''}`;
  const activities = (data.activities ?? []).slice(0, 6);

  const nextStepLabel = snapshot.nextAction?.primaryLabel || snapshot.nextAction?.title || 'Plan next step';
  const description = String(lead.notes ?? '').split(/\n+/).map((s) => s.trim()).find((s) => s && !/^[a-z _-]+:/i.test(s))
    || `${company} is a ${lead.lead_type === 'supplier' ? 'supplier' : 'buyer'} mapped to ${marketNames.join(', ') || 'your markets'}${productNames.length ? `, interested in ${productNames.slice(0, 3).join(', ')}.` : '.'}`;

  return (
    <div style={{ background: '#eef2f7', minHeight: '100vh' }}>
      <div style={{ padding: '22px 26px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '1320px', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ fontSize: '11px', color: MUTED }}>
          <Link href="/leads" style={{ color: MUTED, textDecoration: 'none' }}>Leads</Link>
          <span style={{ margin: '0 6px', color: '#cbd5e1' }}>/</span>
          <span style={{ color: '#334155', fontWeight: 600 }}>{company}</span>
        </div>

        {/* Header card */}
        <div style={{ ...cardStyle, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '18px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start', minWidth: 0 }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '13px', background: `linear-gradient(135deg, ${NAVY}, #1a5fa0)`, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: 800, flexShrink: 0 }}>{initials(company)}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0f172a', letterSpacing: '-.5px' }}>{company}</h1>
                  <span style={{ padding: '3px 11px', borderRadius: '999px', fontSize: '10px', fontWeight: 800, background: '#ecfdf5', color: GREEN, border: '1px solid #a7f3d0', letterSpacing: '.04em' }}>{stageLabel}</span>
                </div>
                <div style={{ fontSize: '12px', color: MUTED, marginTop: '5px' }}>{locationBits.join(' · ')}</div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '12px', fontSize: '12px', color: '#475569' }}>
                  {lead.email ? <span>✉&nbsp; {lead.email}</span> : null}
                  {lead.phone ? <span>📞&nbsp; {lead.phone}</span> : null}
                  {lead.whatsapp_number ? <span>🟢&nbsp; {lead.whatsapp_number}</span> : null}
                </div>
              </div>
            </div>
            <LeadDetailActionBar
              data={data}
              currentUserId={currentUserId}
              quoteHref={quoteHref}
              shareHref={`/leads/${leadId}/share-price-list`}
              isQualified={snapshot.qualification.status === 'qualified'}
            />
          </div>

          {/* Stat strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5" style={{ gap: '14px', marginTop: '20px', paddingTop: '18px', borderTop: '1px solid #eef2f7' }}>
            <div>
              <div style={kicker}>Readiness score</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{score} <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>/ 100</span></div>
            </div>
            <div>
              <div style={kicker}>Current quote</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: currentVersion?.approvalState === 'pending' ? AMBER : '#0f172a', marginTop: '6px' }}>
                {currentVersion ? `v${currentVersion.versionNo ?? '—'} · ${currentVersion.approvalState === 'pending' ? 'Approval pending' : titleCase(currentVersion.status)}` : 'No quote yet'}
              </div>
            </div>
            <div>
              <div style={kicker}>Products</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{snapshot.mapping.productCount} selected</div>
            </div>
            <div>
              <div style={kicker}>Quote status (parent)</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{titleCase(snapshot.commercial.latestQuoteStatus) || '—'}</div>
            </div>
            <div>
              <div style={kicker}>Next step</div>
              <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>{nextStepLabel}</div>
            </div>
          </div>
        </div>

        {/* Three columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px]" style={{ gap: '16px', alignItems: 'start' }}>

          {/* Left — Lead Status timeline */}
          <div style={cardStyle}>
            <div style={sectionTitle}>Lead Status</div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {snapshot.pipeline.stages.map((stage, idx) => {
                const done = stage.state === 'completed' || stage.state === 'won';
                const current = stage.state === 'current';
                const dot = done ? GREEN : current ? TEAL : '#cbd5e1';
                const last = idx === snapshot.pipeline.stages.length - 1;
                return (
                  <div key={stage.id} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <div style={{ width: '13px', height: '13px', borderRadius: '50%', background: done || current ? dot : 'white', border: `2px solid ${dot}`, marginTop: '2px', flexShrink: 0 }} />
                      {!last ? <div style={{ width: '2px', flex: 1, minHeight: '26px', background: done ? GREEN : '#e2e8f0' }} /> : null}
                    </div>
                    <div style={{ paddingBottom: last ? 0 : '12px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: current ? 800 : 600, color: current ? '#0f172a' : done ? '#334155' : '#94a3b8' }}>{stage.label}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{current ? 'Current stage' : done ? 'Completed' : 'Upcoming'}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Middle — About Buyer + Quotes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={cardStyle}>
              <div style={sectionTitle}>About {lead.lead_type === 'supplier' ? 'Supplier' : 'Buyer'}</div>
              <p style={{ fontSize: '12.5px', color: '#475569', lineHeight: 1.65 }}>{description}</p>
              <div className="grid grid-cols-2 sm:grid-cols-4" style={{ gap: '10px', marginTop: '16px' }}>
                {[
                  { k: 'Account', v: titleCase(lead.lead_type) },
                  { k: 'Deal value', v: lead.deal_value ? `${lead.deal_currency ?? ''} ${Number(lead.deal_value).toLocaleString()}`.trim() : '—' },
                  { k: 'Market', v: marketNames[0] ?? lead.country ?? '—' },
                  { k: 'Owner', v: ownerName },
                ].map((m) => (
                  <div key={m.k} style={{ background: '#f8fafc', border: '1px solid #eef2f7', borderRadius: '10px', padding: '10px 12px' }}>
                    <div style={kicker}>{m.k}</div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', marginTop: '4px' }}>{m.v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={sectionTitle}>Quotes on this Lead</div>
                <Link href={quoteHref} style={{ fontSize: '11px', fontWeight: 700, color: TEAL, textDecoration: 'none' }}>Open Quote Builder →</Link>
              </div>
              {versions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#94a3b8', background: '#f8fafc', borderRadius: '10px' }}>
                  No quotes yet. Use <strong>Create Quote</strong> to start the first version.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {versions.map((v) => {
                    const vchip = versionStatusChip(v);
                    const achip = approvalChip(v.approvalState);
                    return (
                      <Link key={v.id} href={`/leads/${leadId}/quote${v.quoteId ? `?quoteId=${v.quoteId}` : ''}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', borderRadius: '11px', border: v.isCurrent ? `1px solid ${TEAL}` : '1px solid #e8eef5', background: v.isCurrent ? '#f0fdfa' : 'white', textDecoration: 'none' }}>
                        <div style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', minWidth: '52px' }}>v{v.versionNo ?? '—'}</div>
                        <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '9px', fontWeight: 800, background: vchip.bg, color: vchip.fg, border: `1px solid ${vchip.bd}` }}>{vchip.label}</span>
                        {achip ? <span style={{ padding: '2px 9px', borderRadius: '999px', fontSize: '9px', fontWeight: 800, background: achip.bg, color: achip.fg, border: `1px solid ${achip.bd}` }}>{achip.label}</span> : null}
                        {v.isCurrent ? <span style={{ fontSize: '9px', fontWeight: 800, color: TEAL, letterSpacing: '.08em', textTransform: 'uppercase' }}>Current</span> : null}
                        {!v.isCurrent && v.isSent ? <span style={{ fontSize: '9px', fontWeight: 700, color: '#94a3b8', letterSpacing: '.06em', textTransform: 'uppercase' }}>Superseded</span> : null}
                        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#94a3b8' }}>{fmtDate(v.sentAt ?? v.createdAt)}</span>
                      </Link>
                    );
                  })}
                  <div style={{ fontSize: '10.5px', color: '#94a3b8', lineHeight: 1.6, marginTop: '4px', paddingTop: '10px', borderTop: '1px dashed #e2e8f0' }}>
                    One quote, versioned. The version is the workflow authority — <strong style={{ color: '#475569' }}>current_version_id</strong> points to the working draft, <strong style={{ color: '#475569' }}>sent_version_id</strong> stays locked and customer-facing. Parent <strong style={{ color: '#475569' }}>quotes.status</strong> is derived from the current version.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right — Setu Guru + Recent activity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ ...cardStyle, background: 'linear-gradient(180deg,#f0fdfa,#ffffff)', border: '1px solid #ccfbf1' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '7px', background: TEAL, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800 }}>G</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>Setu Guru</div>
              </div>
              {[
                { t: 'Recommended action', b: snapshot.nextAction?.summary || `${nextStepLabel} to keep ${company} moving.` },
                { t: 'Price-list opportunity', b: `Share a curated ${marketNames[0] ?? 'buyer'} price list with the ${snapshot.mapping.productCount} selected product${snapshot.mapping.productCount === 1 ? '' : 's'}.` },
                { t: 'Version rule', b: currentVersion?.isSent ? 'This version was sent — editing creates a new version; the sent one stays locked.' : 'Edits stay on the current draft version until it is sent.' },
              ].map((g) => (
                <div key={g.t} style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f766e' }}>{g.t}</div>
                  <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.55, marginTop: '3px' }}>{g.b}</div>
                </div>
              ))}
            </div>

            <div style={cardStyle}>
              <div style={sectionTitle}>Recent Activities</div>
              {activities.length === 0 ? (
                <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>No activity logged yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {activities.map((a) => (
                    <div key={a.id} style={{ display: 'flex', gap: '10px' }}>
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: TEAL, marginTop: '5px', flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155', lineHeight: 1.4 }}>{a.message || titleCase(a.kind)}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '1px' }}>{fmtDateTime(a.occurred_at ?? a.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
