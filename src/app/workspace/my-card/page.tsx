export const dynamic = 'force-dynamic';

import { WorkspaceShell } from '@/components/previews/workspace-shell';
import { PreviewPanel } from '@/components/previews/ui';

export default function WorkspaceMyCardPage() {
  return (
    <WorkspaceShell
      eyebrow="Product view · my card"
      title="My Card turns offline relationship-building into a digital lead channel"
      description="This is the outbound side of contact exchange: a rep-owned branded card with QR, share link, and vCard download. It is not a gimmick. It is a real trade-show and meeting tool that converts contact exchange into structured follow-up."
    >
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <PreviewPanel title="Rep card" subtitle="Simple, elegant, instantly shareable." badge="Outbound identity">
          <div className="rounded-[2rem] bg-[linear-gradient(180deg,#1F487C_0%,#193769_70%,#359F91_100%)] p-6 text-white shadow-[0_24px_70px_rgba(31,72,124,0.24)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/70">Setu Flow rep card</p>
            <h2 className="mt-4 text-2xl font-semibold">Ritesh Kapoor</h2>
            <p className="mt-1 text-white/80">Founder · Global trade partnerships</p>
            <div className="mt-6 space-y-2 text-sm text-white/90">
              <p>kapoorritesh1111@gmail.com</p>
              <p>+91 00000 00000</p>
              <p>setuflow.com</p>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <button className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[#1F487C]">Download vCard</button>
              <button className="rounded-full border border-white/25 px-4 py-3 text-sm font-semibold text-white">Share link</button>
              <button className="rounded-full border border-white/25 px-4 py-3 text-sm font-semibold text-white">Show QR</button>
            </div>
          </div>
        </PreviewPanel>

        <PreviewPanel title="Why My Card matters" subtitle="This is how Setu Flow bridges real-world trade interactions with the CRM workflow." badge="Sales advantage">
          <ul className="space-y-3 text-sm leading-6 text-slate-700">
            <li>• At trade shows, reps can share contact details instantly without paper-card chaos.</li>
            <li>• Buyers can save the contact and move straight to a request-quote or inquiry action.</li>
            <li>• Shared-card traffic can create structured leads in the system automatically.</li>
            <li>• The card stays brand-aligned and feels like a real SaaS company touchpoint.</li>
          </ul>
          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#359F91]">Public card page CTA</p>
            <p className="mt-3 text-lg font-semibold text-slate-900">Save contact · Request quote · Upload requirement</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">That public entry can feed directly into Capture and create a lead source called “card share” for the right rep.</p>
          </div>
        </PreviewPanel>
      </div>
    </WorkspaceShell>
  );
}
