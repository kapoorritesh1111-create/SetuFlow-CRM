import type { MouseEvent } from 'react'
import { formatDate } from '@/lib/utils'
import { getLeadContactActions } from './contact-actions'
import type { GateStatus, LeadProfileSnapshot, PricingReadiness, QuoteFocusSummary } from './types'

/**
 * PR03 spec match: Lead header card styling from the approved command-center design spec
 * Structure:
 *   .lhc-top
 *     .lhc-chips  — status chip row
 *     .lhc-hero   — avatar + company name + actions
 *   .next-move-bar
 * Pipeline strip is rendered separately by LeadPipelineStageStrip
 */

function getAvatarGradient(companyName: string): string {
  const gradients = [
    'linear-gradient(135deg,#0b2e4a,#0c7fff)',
    'linear-gradient(135deg,#0f766e,#0d9488)',
    'linear-gradient(135deg,#5b21b6,#7c3aed)',
    'linear-gradient(135deg,#9f1239,#e11d48)',
    'linear-gradient(135deg,#92400e,#d97706)',
  ];
  let hash = 0;
  for (let i = 0; i < companyName.length; i++) {
    hash = (hash * 31 + companyName.charCodeAt(i)) & 0xffff;
  }
  return gradients[hash % gradients.length];
}

function getLeadInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

export function LeadCommandHeader({
  lead,
  currentStageLabel,
  pricingReadiness,
  complianceGate,
  nextFollowUpAt,
  quoteFocus,
  nextActionSummary,
  onOpenQuote,
  onQuickEdit,
  onEditCoverage,
  onOpenActivity,
  onScheduleFollowUp,
}: {
  lead: LeadProfileSnapshot['lead']
  currentStageLabel?: string
  pricingReadiness: PricingReadiness
  complianceGate: GateStatus
  nextFollowUpAt?: string | null
  quoteFocus: QuoteFocusSummary
  nextActionSummary: string
  onOpenQuote: () => void
  onQuickEdit: () => void
  onEditCoverage: () => void
  onOpenActivity: () => void
  onScheduleFollowUp: () => void
}) {
  const avatarGradient = getAvatarGradient(lead.companyName);
  const initials = getLeadInitials(lead.companyName);
  const contactActions = getLeadContactActions(lead);

  const runToolAction = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    event.preventDefault();
    event.stopPropagation();
    const menu = event.currentTarget.closest('details') as HTMLDetailsElement | null;
    if (menu) menu.open = false;
    action();
  };

  // Status chips — spec: .lhc-chip variants
  const chips: Array<{ label: string; tone: 'amber' | 'green' | 'slate' | 'blue' }> = [
    {
      label: pricingReadiness === 'ready' ? '✓ Pricing ready' : pricingReadiness === 'partial' ? '⚠ Pricing partial' : '⚠ Pricing missing',
      tone: pricingReadiness === 'ready' ? 'green' : 'amber',
    },
    {
      label: complianceGate === 'CLEAR' ? '✓ Compliance clear' : complianceGate === 'WARNING' ? '⚠ Compliance watch' : '🚫 Compliance blocked',
      tone: complianceGate === 'CLEAR' ? 'green' : 'amber',
    },
    ...(nextFollowUpAt
      ? [{ label: `📅 Next follow-up: ${formatDate(nextFollowUpAt)}`, tone: 'slate' as const }]
      : []),
    {
      label: `${lead.leadType === 'buyer' ? 'Buyer' : 'Supplier'}`,
      tone: 'blue' as const,
    },
  ];

  const chipStyle = (tone: 'amber' | 'green' | 'slate' | 'blue') => {
    if (tone === 'green') return { background: '#ecfdf5', border: '1px solid #a7f3d0', color: '#047857' };
    if (tone === 'amber') return { background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' };
    if (tone === 'blue') return { background: '#f0f9ff', border: '1px solid #7dd3fc', color: '#0369a1' };
    return { background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569' };
  };

  return (
    <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '22px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,.06)' }}>
      {/* .lhc-top */}
      <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

        {/* Status chip row — .lhc-chips */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {chips.map((chip) => (
            <span
              key={chip.label}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '999px', fontSize: '10px', fontWeight: 700, ...chipStyle(chip.tone) }}
            >
              {chip.label}
            </span>
          ))}
        </div>

        {/* Hero row — .lhc-hero */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          {/* Company identity — .lhc-company-row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Avatar — spec: 48px, 12px border-radius, navy-to-brand gradient */}
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: avatarGradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 800, color: 'white', flexShrink: 0 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: '26px', fontWeight: 800, color: '#0f172a', letterSpacing: '-.5px' }}>{lead.companyName}</div>
              {(lead.contactName || lead.jobTitle) ? (
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '2px' }}>
                  {lead.contactName ?? ''}
                  {lead.jobTitle ? <span style={{ fontWeight: 400, color: '#64748b' }}>{lead.contactName ? ' · ' : ''}{lead.jobTitle}</span> : null}
                </div>
              ) : null}
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                {lead.leadType}
                {lead.ownerName ? ` · Owner: ${lead.ownerName}` : ''}
                {lead.sourceLabel ? ` · Source: ${lead.sourceLabel}` : ''}
                {lead.country ? ` · ${lead.country}` : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px', fontSize: '12px' }}>
                <span style={{ border: '1px solid #e2e8f0', background: '#f8fafc', color: '#334155', borderRadius: '999px', padding: '4px 9px', fontWeight: 700 }}>
                  👤 {lead.contactName || 'Missing contact name'}
                </span>
                {lead.email ? (
                  <a href={contactActions.emailHref ?? undefined} style={{ border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', borderRadius: '999px', padding: '4px 9px', fontWeight: 700, textDecoration: 'none' }}>
                    ✉ {lead.email}
                  </a>
                ) : (
                  <button type="button" onClick={onQuickEdit} style={{ border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', borderRadius: '999px', padding: '4px 9px', fontWeight: 700, cursor: 'pointer' }}>
                    Missing email · Quick edit
                  </button>
                )}
                {contactActions.primaryPhoneDisplay ? (
                  <a href={contactActions.callHref ?? undefined} style={{ border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#15803d', borderRadius: '999px', padding: '4px 9px', fontWeight: 700, textDecoration: 'none' }}>
                    ☎ {contactActions.primaryPhoneDisplay}
                  </a>
                ) : (
                  <button type="button" onClick={onQuickEdit} style={{ border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', borderRadius: '999px', padding: '4px 9px', fontWeight: 700, cursor: 'pointer' }}>
                    Missing phone · Quick edit
                  </button>
                )}
                {contactActions.whatsappHref ? (
                  <a href={contactActions.whatsappHref} target="_blank" rel="noreferrer" style={{ border: '1px solid #a7f3d0', background: '#ecfdf5', color: '#047857', borderRadius: '999px', padding: '4px 9px', fontWeight: 700, textDecoration: 'none' }}>
                    WhatsApp {contactActions.whatsappDisplay ? `· ${contactActions.whatsappDisplay}` : ''}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          {/* CTA buttons — .lhc-actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {contactActions.emailHref ? (
              <a href={contactActions.emailHref} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #bfdbfe', background: '#eff6ff', fontSize: '12px', fontWeight: 700, color: '#1d4ed8', textDecoration: 'none' }}>Email</a>
            ) : null}
            {contactActions.whatsappHref ? (
              <a href={contactActions.whatsappHref} target="_blank" rel="noreferrer" style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #bbf7d0', background: '#f0fdf4', fontSize: '12px', fontWeight: 700, color: '#15803d', textDecoration: 'none' }}>WhatsApp</a>
            ) : null}
            {contactActions.callHref ? (
              <a href={contactActions.callHref} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '12px', fontWeight: 700, color: '#334155', textDecoration: 'none' }}>Call</a>
            ) : null}
            {/* Primary: Create quote */}
            <button type="button" onClick={onOpenQuote}
              style={{ padding: '9px 18px', borderRadius: '6px', background: '#0b2e4a', color: 'white', border: 'none', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
            >
              🖊 {quoteFocus.hasActiveQuote ? 'View quote' : 'Create quote'}
            </button>
            {/* Secondary: Schedule follow-up */}
            <button type="button" onClick={onScheduleFollowUp}
              style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
            >
              📅 Schedule follow-up
            </button>
            {/* Tools dropdown */}
            <details style={{ position: 'relative' }}>
              <summary style={{ padding: '8px 14px', borderRadius: '6px', border: '1px solid #e2e8f0', background: 'white', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer', listStyle: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ fontSize: '18px', lineHeight: 1 }}>⋯</span> Lead tools
              </summary>
              <div style={{ position: 'absolute', right: 0, top: '40px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '6px', boxShadow: '0 12px 32px rgba(15,23,42,.09)', minWidth: '180px', zIndex: 20 }}>
                {[
                  { label: '✏ Edit lead details', onClick: onQuickEdit },
                  { label: '📦 Adjust coverage', onClick: onEditCoverage },
                  { label: '📝 Add note to log', onClick: onOpenActivity },
                ].map((item) => (
                  <button key={item.label} type="button" onClick={(event) => runToolAction(event, item.onClick)}
                    style={{ display: 'block', width: '100%', padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#334155', border: 'none', background: 'none', textAlign: 'left' }}
                    onMouseOver={(e) => { (e.target as HTMLElement).style.background = '#f8fafc'; }}
                    onMouseOut={(e) => { (e.target as HTMLElement).style.background = ''; }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </details>
          </div>
        </div>
      </div>

      {/* Next move bar — spec: .next-move-bar, blue left border */}
      <div style={{ background: '#f8fafc', borderLeft: '3px solid #0c7fff', padding: '9px 14px', fontSize: '12px', color: '#475569', margin: '0 22px 14px', borderRadius: '0 6px 6px 0' }}>
        <strong style={{ color: '#0f172a' }}>Next move:</strong> {nextActionSummary}
      </div>
    </div>
  )
}
