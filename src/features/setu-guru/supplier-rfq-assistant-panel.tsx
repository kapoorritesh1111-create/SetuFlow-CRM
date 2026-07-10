'use client';

import { useState } from 'react';
import { AlertTriangle, ClipboardList, Copy, Loader2, X } from 'lucide-react';

import { GuruAvatar } from '@/components/ui/guru-avatar';
import { workspaceInsetClass, workspacePrimaryButtonClass, workspaceSecondaryButtonClass } from '@/components/ui/workspace-surfaces';
import { cn } from '@/lib/utils';

type SupplierRfqBrief = {
  leadId: string;
  supplierLabel: string;
  briefText: string;
  missingItems: string[];
};

export function SupplierRfqAssistantLauncher({ leadId }: { leadId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<SupplierRfqBrief | null>(null);
  const [copied, setCopied] = useState(false);

  async function loadBrief() {
    if (brief || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/setu-guru/supplier-rfq-brief?leadId=${encodeURIComponent(leadId)}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error || 'Setu Guru could not draft an RFQ brief.');
      setBrief(body.brief as SupplierRfqBrief);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Setu Guru could not draft an RFQ brief.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          void loadBrief();
        }}
        className={cn(workspaceSecondaryButtonClass, 'inline-flex min-h-9 items-center justify-center gap-2 rounded-ctl px-3.5 text-sm font-semibold')}
      >
        <ClipboardList className="h-4 w-4" aria-hidden="true" />
        RFQ brief
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/30" role="dialog" aria-modal="true" aria-label="Setu Guru supplier RFQ assistant">
          <button type="button" aria-label="Close RFQ assistant" onClick={() => setOpen(false)} className="absolute inset-0 cursor-default" />
          <div className="relative flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-line bg-surface-1 shadow-hero">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div className="flex items-center gap-2">
                <GuruAvatar size="md" />
                <div>
                  <p className="text-sm font-semibold text-content-primary">Supplier RFQ Assistant</p>
                  <p className="text-xs text-content-muted">Brief only — you send the RFQ yourself</p>
                </div>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-ctl p-1.5 text-content-muted transition hover:bg-surface-2" aria-label="Close">
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 space-y-4 p-5">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-content-muted">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Drafting the RFQ brief…
                </div>
              ) : error ? (
                <div className="rounded-card border border-danger-border bg-danger-bg px-4 py-3 text-sm text-danger-fg">{error}</div>
              ) : brief ? (
                <>
                  <div className={cn(workspaceInsetClass, 'p-4')}>
                    <p className="whitespace-pre-wrap text-sm leading-6 text-content-primary">{brief.briefText}</p>
                  </div>

                  {brief.missingItems.length ? (
                    <div className="rounded-card border border-warning-border bg-warning-bg px-4 py-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 text-warning-fg" aria-hidden="true" />
                        <div>
                          <p className="text-sm font-semibold text-warning-fg">Confirm before sending</p>
                          <ul className="mt-1 list-inside list-disc text-sm text-warning-fg">
                            {brief.missingItems.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(brief.briefText);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className={cn(workspacePrimaryButtonClass, 'inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-ctl text-sm font-semibold')}
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    {copied ? 'Copied' : 'Copy brief'}
                  </button>
                  <p className="text-xs text-content-muted">
                    Use this brief in your existing supplier RFQ or cost-request flow. Setu Guru does not create or send the RFQ automatically.
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
