"use client";

import { useState } from 'react';
import { LeadDrawer } from '@/features/leads/components/lead-drawer';

/**
 * LeadProfileEditDrawer
 *
 * This client component wraps the existing LeadDrawer in a button‑triggered overlay.  It
 * is used on the lead profile page to open the lead editor as a right‑hand drawer rather
 * than inline within the page body.  When the user clicks the button, the drawer
 * appears; when the user saves or cancels, it hides again.  All props are passed
 * through to the underlying LeadDrawer.  The `mode` prop is set to `full` to ensure
 * the complete form is displayed.
 */
export function LeadProfileEditDrawer({
  lead,
  stages,
  pipelines,
  nextSteps,
  tradeEvents,
  products,
  markets,
  profiles,
  countries,
  selectedMarketIds,
  selectedProductIds,
}: {
  lead: any;
  stages: any[];
  pipelines: any[];
  nextSteps: any[];
  tradeEvents: any[];
  products: any[];
  markets: any[];
  profiles: any[];
  countries: any[];
  selectedMarketIds: string[];
  selectedProductIds: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Edit lead
      </button>
      <LeadDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onSaved={() => setIsOpen(false)}
        mode="full"
        lead={lead}
        stages={stages}
        pipelines={pipelines}
        nextSteps={nextSteps}
        tradeEvents={tradeEvents}
        products={products}
        markets={markets}
        profiles={profiles}
        countries={countries}
        selectedMarketIds={selectedMarketIds}
        selectedProductIds={selectedProductIds}
      />
    </>
  );
}