import { notFound } from 'next/navigation';
import { WorkspaceState } from '@/components/ui/workspace-state';
import { StateMessage } from '@/components/ui/state-message';
import { getWorkspaceAccess } from '@/lib/workspace/auth';
import { createClient } from '@/lib/supabase/server';
import { getOrganizationVerticals } from '@/lib/verticals/capability';
import { getPackagingJobTicketData } from '@/lib/packaging/queries';
import PrintButton from './print-button';

/**
 * S27-STARK-D2 — Production job ticket. Deliberately a different document
 * from the customer PDF quote: production specs only (dimensions, material,
 * finishes, artwork status, cylinder/repeat length for flexo, lead time),
 * no selling price. Meant to be printed and travel with the job on the
 * shop floor. Uses the browser's native print/Save-as-PDF — no new PDF
 * dependency needed for an internal document like this.
 */

export const dynamic = 'force-dynamic';

function artworkLabel(status: string | null) {
  if (status === 'print_ready') return 'Print-ready';
  if (status === 'needs_prepress') return 'Needs pre-press';
  if (status === 'not_provided') return 'Not provided yet';
  return 'Not specified';
}

export default async function PackagingJobTicketPage({ params }: { params: { quoteId: string } }) {
  const workspace = await getWorkspaceAccess();
  if (!workspace.membership || !workspace.organization) {
    return <WorkspaceState eyebrow="Job Ticket" title="Workspace membership needed" description="Your account is signed in, but no active organization membership could be loaded." primaryActionHref="/dashboard" primaryActionLabel="Go to Overview" />;
  }

  const supabase = await createClient();
  const verticals = await getOrganizationVerticals(workspace.organization.id, supabase);
  if (!verticals.packagingEnabled) {
    return <StateMessage title="Packaging vertical is not enabled" description="Production job tickets are available for packaging-vertical workspaces." tone="info" />;
  }

  const ticket = await getPackagingJobTicketData(workspace.organization.id, params.quoteId, supabase);
  if (!ticket) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-16 print:max-w-full">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">Production Job Ticket</h1>
          <p className="mt-1 text-sm text-content-secondary">Shop-floor spec sheet — no pricing. Print or save as PDF to travel with the job.</p>
        </div>
        <PrintButton />
      </div>

      <div className="rounded-panel border border-line bg-surface-1 p-6 print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Job Ticket</p>
            <h2 className="text-xl font-bold text-content-primary">Quote {ticket.quoteNumber}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-content-muted">Client</p>
            <p className="text-sm font-semibold text-content-primary">{ticket.companyName ?? 'Unknown'}</p>
          </div>
        </div>

        {ticket.lines.length ? (
          <div className="mt-4 space-y-4">
            {ticket.lines.map((line, index) => (
              <div key={line.lineId} className="rounded-ctl border border-line p-4 print:break-inside-avoid">
                <div className="flex items-center justify-between">
                  <p className="font-bold text-content-primary">Line {index + 1} — {line.familyName}</p>
                  <p className="text-xs font-semibold text-content-muted">{line.templateName}</p>
                </div>
                <p className="mt-1 text-sm text-content-secondary">{line.specSummary ?? 'Custom packaging line'}</p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Field label="Quantity" value={line.quantity.toLocaleString() + ' pcs'} />
                  <Field label="Dimensions" value={line.dimensions ?? '—'} />
                  <Field label="Material" value={line.materialLabel ?? '—'} />
                  {line.adhesiveLabel ? <Field label="Adhesive" value={line.adhesiveLabel} /> : null}
                  <Field label="Print colors" value={line.printColors != null ? String(line.printColors) : '—'} />
                  <Field label="Finishes" value={line.finishLabels.length ? line.finishLabels.join(', ') : '—'} />
                  {line.repeatLengthMm ? <Field label="Repeat length (cylinder)" value={`${line.repeatLengthMm} mm`} /> : null}
                  <Field label="Designs" value={String(line.designs)} />
                  <Field label="Artwork status" value={artworkLabel(line.artworkStatus)} />
                  {line.rushLabel ? <Field label="Timeline" value={line.rushLabel} /> : null}
                  <Field label="Lead time" value={line.leadTime ?? '—'} />
                </div>
                {line.notes ? <p className="mt-3 text-sm text-content-secondary"><span className="font-semibold text-content-primary">Notes: </span>{line.notes}</p> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-ctl bg-surface-2 px-3 py-2 text-sm text-content-secondary">No packaging lines on this quote.</p>
        )}

        <p className="mt-6 text-xs text-content-muted print:mt-10">Internal production document — not for customer distribution. No pricing shown.</p>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-content-muted">{label}</p>
      <p className="text-sm font-semibold text-content-primary">{value}</p>
    </div>
  );
}
