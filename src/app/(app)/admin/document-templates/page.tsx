import Link from 'next/link';
import { SectionCard } from '@/components/ui/section-card';
import { StateMessage } from '@/components/ui/state-message';
import { StatusBadge } from '@/components/ui/status-badge';
import { AdminPageHero, AdminSettingsShell, type AdminGapItem } from '@/features/admin/components/admin-settings-shell';
import { KitNextStep } from '@/features/admin/components/admin-ui-kit';
import { TermsEditor, BankDetailsEditor, ExportDeclarationsEditor } from '@/features/admin/components/document-terms-editor';
import { hasSupabaseEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { requireAdminWorkspace } from '@/lib/workspace/auth';

type TermsProfile = {
  id: string;
  region_type: string;
  document_type: string;
  profile_name: string;
  org_country: string | null;
  is_default: boolean;
  is_active: boolean;
  page_one_terms: string[] | null;
  annexure_terms: string[] | null;
  tax_profile: Record<string, unknown> | null;
  identity_fields: Record<string, unknown> | null;
  stamp_settings: Record<string, unknown> | null;
  bank_details: Record<string, unknown> | null;
  export_declarations: Record<string, unknown> | null;
};

function titleCaseDocType(value: string | null | undefined) {
  return (
    String(value ?? '')
      .split(/[\s_-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || 'Profile'
  );
}

function getDefaultTermsByCountry(
  country: string | null,
  docType: string,
): { page_one: string[]; annexure: string[] } {
  const isIN = (country ?? '').toUpperCase() === 'IN';
  const isUS = (country ?? '').toUpperCase() === 'US';
  const isExport =
    docType.includes('invoice') ||
    docType.includes('proforma') ||
    docType.includes('freight') ||
    docType.includes('packing');

  if (isIN && isExport) {
    return {
      page_one: [
        'Payment: 100% advance by TT against proforma invoice',
        'Incoterms: FOB Mumbai / CIF as applicable',
        'Validity: 15 days from date of issue',
        'Currency: USD (INR equivalent on date of invoice)',
        'LUT exported under Letter of Undertaking — GST exempt',
      ],
      annexure: [
        'Title and risk pass at point of Incoterm delivery',
        'Disputes subject to Indian arbitration under Arbitration and Conciliation Act 1996',
        'Governing law: Laws of India',
        'Force Majeure: Neither party liable for delays due to events beyond reasonable control',
      ],
    };
  }
  if (isUS) {
    return {
      page_one: [
        'Payment: Net 30 days from invoice date',
        'Incoterms: DDP Buyer destination',
        'Validity: 30 days from date of quote',
        'Currency: USD',
      ],
      annexure: [
        'Title passes upon delivery and acceptance',
        'Disputes resolved by binding arbitration under AAA Commercial Rules',
        'Governing law: Laws of Delaware, USA',
      ],
    };
  }
  return {
    page_one: [
      'Payment: Advance payment required unless credit terms agreed',
      'Validity: 15 days from date of issue',
      'Currency: As stated on invoice',
    ],
    annexure: [
      'Title and risk pass at point of Incoterm delivery',
      'Force Majeure clause applies to events beyond reasonable control',
    ],
  };
}

function ProfileCard({ profile }: { profile: TermsProfile }) {
  const compactCount = profile.page_one_terms?.length ?? 0;
  const defaults = getDefaultTermsByCountry(profile.org_country, profile.document_type);
  const displayCompact = compactCount > 0 ? profile.page_one_terms! : defaults.page_one;

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-blue-600">
            {profile.region_type} · {profile.org_country ?? 'country default'}
          </p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-slate-950">
            {titleCaseDocType(profile.document_type)}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{profile.profile_name}</p>
        </div>
        <StatusBadge
          label={profile.is_active ? 'Active default' : 'Inactive'}
          tone={profile.is_active ? 'success' : 'warning'}
          dot={false}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Current compact terms ({compactCount > 0 ? compactCount : `${defaults.page_one.length} defaults`})
        </p>
        <ul className="space-y-1">
          {displayCompact.slice(0, 4).map((t, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-slate-700">
              <span className="mt-0.5 text-blue-400">•</span>
              {t}
            </li>
          ))}
          {displayCompact.length > 4 && (
            <li className="text-[10px] text-slate-400">+{displayCompact.length - 4} more</li>
          )}
        </ul>
      </div>

      <TermsEditor profileId={profile.id} kind="page_one" terms={profile.page_one_terms} />
      <TermsEditor profileId={profile.id} kind="annexure" terms={profile.annexure_terms} />
      <BankDetailsEditor
        profileId={profile.id}
        bankDetails={profile.bank_details}
        orgCountry={profile.org_country}
      />
      <ExportDeclarationsEditor
        profileId={profile.id}
        declarations={profile.export_declarations}
        orgCountry={profile.org_country}
      />
    </article>
  );
}

export default async function AdminDocumentTemplatesPage() {
  if (!hasSupabaseEnv)
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using the organization workspace."
        tone="warning"
      />
    );

  const { missingEnv, membership, organization } = await requireAdminWorkspace();
  if (missingEnv)
    return (
      <StateMessage
        title="Supabase environment variables are missing"
        description="Configure the application environment before using the organization workspace."
        tone="warning"
      />
    );
  if (!membership || !organization) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('organization_document_terms_profiles')
    .select(
      'id, region_type, document_type, profile_name, org_country, is_default, is_active, page_one_terms, annexure_terms, tax_profile, identity_fields, stamp_settings, bank_details, export_declarations',
    )
    .eq('organization_id', organization.id)
    .order('region_type', { ascending: false })
    .order('document_type', { ascending: true });

  if (error)
    return (
      <StateMessage title="Could not load document terms profiles" description={error.message} tone="danger" />
    );

  const profiles = (data ?? []) as TermsProfile[];
  const regional = profiles.filter((p) => p.region_type === 'regional');
  const exportProfiles = profiles.filter((p) => p.region_type === 'export');
  const missingCount = profiles.length < 8 ? 1 : 0;
  const gapItems: AdminGapItem[] = missingCount
    ? [{ icon: '📄', text: 'Default terms profile coverage incomplete', href: '/admin/document-templates' }]
    : [];

  return (
    <AdminSettingsShell
      active="document-templates"
      organizationName={organization.name}
      missingCount={missingCount}
      sectionTitle="Document governance"
      gapItems={gapItems}
    >
      <AdminPageHero
        title="Document Templates / Terms & Conditions"
        description="Edit compact terms, annexure terms, bank details, and export declarations for each document profile. Changes take effect immediately in order document previews."
        badge={organization.name}
        cta={
          <Link
            href="/orders"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-[#13305a]"
          >
            Open Orders
          </Link>
        }
        stats={[
          { label: 'Profiles', value: profiles.length, tone: profiles.length >= 8 ? 'success' : 'warning' },
          { label: 'Regional', value: regional.length, tone: regional.length >= 4 ? 'success' : 'warning' },
          {
            label: 'Export',
            value: exportProfiles.length,
            tone: exportProfiles.length >= 4 ? 'success' : 'warning',
          },
        ]}
      />

      <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        <strong>How editing works:</strong> Click any section below to expand it and edit. Each profile has four
        editable sections: compact terms (page 1 bullets), annexure terms (legal clauses), bank details (appears on
        invoices), and export declarations (IEC/LUT/GSTIN etc.). Default terms are pre-filled based on your
        organisation country — you can override any of them.
      </div>

      <section className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          eyebrow="Regional defaults"
          title="Regional document profiles"
          description="Used for domestic/regional order confirmations, delivery notes, and tax invoices."
        >
          <div className="grid gap-4">
            {regional.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </SectionCard>
        <SectionCard
          eyebrow="Export defaults"
          title="Export document profiles"
          description="Used for proforma invoices, packing lists, freight requests, and commercial invoices."
        >
          <div className="grid gap-4">
            {exportProfiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </SectionCard>
      </section>
      <KitNextStep icon="🔔" label="Documents ready — configure notification defaults" description="Set workspace-level alert preferences" href="/admin/notifications" />
    </AdminSettingsShell>
  );
}
