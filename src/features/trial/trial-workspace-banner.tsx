import Link from 'next/link';
import { getTrialCapability } from '@/lib/trial/capability';
import { getTrialTemplateConfig } from '@/lib/trial/templates';
import { TrialTourRelaunchButton } from '@/features/trial/tour-provider';

function remainingLabel(value: number | null | undefined) {
  return value === null || typeof value === 'undefined' ? 'Unlimited' : String(value);
}

function mobileTrialCompressionEnabled() {
  return process.env.NEXT_PUBLIC_TRIAL_MOBILE_COMPRESSION !== 'off' && process.env.SETUFLOW_TRIAL_MOBILE_COMPRESSION !== 'off';
}

export async function TrialWorkspaceBanner({ organizationId }: { organizationId: string }) {
  const { capability } = await getTrialCapability(organizationId);
  if (!capability?.is_trial || !capability.guided_mode_enabled) return null;

  const template = getTrialTemplateConfig(capability.trial_template_key);
  const compressionEnabled = mobileTrialCompressionEnabled();
  const summary = `${template.label}: ${remainingLabel(capability.remaining_leads)} leads, ${remainingLabel(capability.remaining_quotes)} quote, and ${remainingLabel(capability.remaining_orders)} order remaining.`;

  return (
    <div className="sf-guided-trial-banner border-b border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-white px-4 py-3 text-sm text-amber-950">
      {compressionEnabled ? <span className="sf-mobile-trial-compress sr-only" aria-hidden="true">Mobile trial compression enabled</span> : null}
      <div className="mx-auto flex max-w-7xl flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="sf-guided-trial-eyebrow text-xs font-extrabold uppercase tracking-[0.18em] text-amber-700">Guided trial workspace</p>
          <p className="sf-guided-trial-summary font-bold">{summary}</p>
        </div>
        <div className="sf-guided-trial-actions flex flex-wrap items-center gap-2">
          <TrialTourRelaunchButton />
          <Link href="/trial" className="inline-flex w-fit items-center rounded-full border border-amber-300 bg-white px-4 py-2 text-xs font-extrabold text-amber-800 shadow-sm hover:bg-amber-50">
            Open trial guide
          </Link>
        </div>
      </div>
    </div>
  );
}
