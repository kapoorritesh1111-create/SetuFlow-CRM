export const dynamic = 'force-dynamic';
import type { ReactNode } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';
import { DevelopmentNav } from '@/components/planning/development-nav';
import { PRODUCT_ROUTES } from '@/lib/product-contract';

const statusTokens = [
  { name: 'New', color: 'bg-[#1F487C]', note: 'Freshly created or imported record' },
  { name: 'In Progress', color: 'bg-[#359F91]', note: 'Active owner work is happening' },
  { name: 'Waiting', color: 'bg-[#F59E0B]', note: 'Blocked on customer or supplier input' },
  { name: 'At Risk', color: 'bg-[#DC2626]', note: 'Needs immediate attention' },
  { name: 'Won', color: 'bg-[#16A34A]', note: 'Commercial success state' },
  { name: 'Lost', color: 'bg-slate-500', note: 'Closed without conversion' }
];

const leadQuickActions = ['Call', 'WhatsApp', 'Email', 'Note', 'Create Quote'];
const intakeModes = ['Upload vCard', 'Scan business card', 'Upload buyer document', 'Paste text or message'];

function Frame({ title, children, note }: { title: string; children: ReactNode; note?: string }) {
  return (
    <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-6 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-8">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4">
        <h2 className="text-xl font-semibold text-slate-950">{title}</h2>
        {note ? <p className="text-sm leading-6 text-slate-600">{note}</p> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function SpecChip({ label }: { label: string }) {
  return <span className="rounded-full border border-[#1F487C]/10 bg-[#1F487C]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#1F487C]">{label}</span>;
}

export default function LeadsCaptureSpecsPage() {
  return (
    <SiteShell>
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <section className="rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Locked Leads + Capture screen specs</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Exact Leads + Capture blueprint for desktop, tablet, and mobile.</h1>
          <p className="mt-4 max-w-5xl text-base leading-8 text-slate-600">This page is the visual contract for the Leads + Capture operating area. Use it to stop design drift, implementation drift, and chat drift. Sprint 3 work must still respect this completed Sprint 2 foundation unless the product contract is explicitly changed.</p>
          <div className="mt-8">
            <DevelopmentNav />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <SpecChip label="Mobile-first" />
            <SpecChip label="One screen = one decision" />
            <SpecChip label="No command-center rails" />
            <SpecChip label="Global status colors" />
            <SpecChip label="Capture is inbound only" />
          </div>
        </section>

        <section className="mt-10 grid gap-5 lg:grid-cols-3">
          <Frame title="Locked layout rules" note="These rules are not optional during the active planning cycle.">
            <ul className="space-y-3 text-sm leading-6 text-slate-700">
              <li>• No multi-panel command center patterns.</li>
              <li>• No hover-only actions. Everything must work on touch.</li>
              <li>• No new top-level modules introduced by screen design.</li>
              <li>• Primary CTA stays obvious at all times.</li>
            </ul>
          </Frame>
          <Frame title="Global status tokens" note="The same color must mean the same state across Leads, Quotes, and Orders.">
            <div className="space-y-3">
              {statusTokens.map((token) => (
                <div key={token.name} className="flex items-center gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className={`h-3 w-3 rounded-full ${token.color}`} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{token.name}</p>
                    <p className="text-xs text-slate-600">{token.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </Frame>
          <Frame title="Reusable components that remain locked" note="These stay the baseline so the UI system does not drift across screens.">
            <div className="flex flex-wrap gap-2">
              {['StatusBadge', 'CountryPill', 'LeadCard', 'QuickActionButton', 'QuickActionMenu', 'PageHeader', 'SearchField', 'SegmentedToggle', 'IntakeModeCard', 'ConfidenceBadge', 'DuplicateAlert', 'StickyActionBar'].map((item) => (
                <span key={item} className="rounded-full border border-[#359F91]/15 bg-[#359F91]/10 px-3 py-2 text-xs font-semibold text-[#1F487C]">{item}</span>
              ))}
            </div>
          </Frame>
        </section>

        <section className="mt-12 grid gap-6 xl:grid-cols-2">
          <Frame title="Leads · Desktop blueprint" note="Target content width 1440 px. Two-column grid: 420 px list + flexible detail panel. 24 px outer gutters and 24 px inter-column gap.">
            <div className="rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#f8fcfe_0%,#f3f9fd_100%)] p-5">
              <div className="rounded-[1.5rem] border border-white bg-white/90 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">Leads</p>
                    <p className="text-sm text-slate-500">Search + filters + view toggle + + New</p>
                  </div>
                  <button className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-4 py-2 text-sm font-semibold text-white">+ New</button>
                </div>
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
                <div className="space-y-3 rounded-[1.75rem] border border-white bg-white/85 p-4 shadow-sm">
                  {[1, 2, 3].map((card) => (
                    <div key={card} className="rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-semibold text-slate-900">Al Noor Foods</span>
                            <span className="rounded-full bg-[#1F487C]/10 px-2 py-1 text-[11px] font-semibold text-[#1F487C]">🇦🇪 UAE</span>
                          </div>
                          <p className="mt-1 text-sm text-slate-600">Sara Khan · Trial inquiry · Owner: Ritesh</p>
                        </div>
                        <span className="rounded-full bg-[#359F91]/10 px-2.5 py-1 text-[11px] font-semibold text-[#359F91]">In Progress</span>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">Next action: Create quote</p>
                        <div className="flex gap-2">
                          {leadQuickActions.slice(0, 4).map((action) => (
                            <span key={action} className="flex h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 bg-white px-3 text-[11px] font-semibold text-slate-600">{action[0]}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-[28px] border border-white bg-white/85 p-5 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">Selected lead detail</p>
                      <p className="text-sm text-slate-500">24 px internal padding. Summary, requirement, timeline, next action.</p>
                    </div>
                    <button className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Create Quote</button>
                  </div>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    {['Summary', 'Requirement snapshot', 'Timeline', 'Commercial context'].map((section) => (
                      <div key={section} className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#359F91]">{section}</p>
                        <div className="mt-3 h-24 rounded-[16px] bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">List card minimum height: <strong>116 px</strong>. Quick actions must be minimum <strong>40 x 40 px</strong>.</div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">Detail panel radius: <strong>28 px</strong>. Section cards: <strong>20 px</strong> radius with <strong>16 px</strong> internal padding.</div>
            </div>
          </Frame>

          <Frame title="Leads · Mobile / tablet blueprint" note="Design for 390 px mobile and 768 px tablet first. Single-column only. Selected lead opens full-screen detail route or sheet.">
            <div className="mx-auto max-w-[420px] rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#f8fcfe_0%,#f3f9fd_100%)] p-4">
              <div className="rounded-[28px] border border-white bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-950">Leads</p>
                    <p className="text-xs text-slate-500">Tap-first layout</p>
                  </div>
                  <button className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-4 py-2 text-xs font-semibold text-white">+ New</button>
                </div>
                <div className="mt-4 h-11 rounded-full border border-slate-200 bg-slate-50 px-4 flex items-center text-sm text-slate-400">Search leads</div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {['All', 'New', 'At Risk', 'Qualified', 'This week'].map((item) => (
                    <span key={item} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">{item}</span>
                  ))}
                </div>
                <div className="mt-4 space-y-3">
                  {[1,2].map((card) => (
                    <div key={card} className="min-h-[132px] rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-[#1F487C]/10 px-2 py-1 text-[10px] font-semibold text-[#1F487C]">🇩🇪 Germany</span>
                            <span className="rounded-full bg-[#DC2626]/10 px-2 py-1 text-[10px] font-semibold text-[#DC2626]">At Risk</span>
                          </div>
                          <p className="mt-3 text-base font-semibold text-slate-950">Bremen Ingredients</p>
                          <p className="mt-1 text-sm text-slate-600">Lena Fischer · Last reply 6 days ago</p>
                        </div>
                        <div className="flex gap-2">
                          {['C','W','Q'].map((icon) => <span key={icon} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600">{icon}</span>)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-[20px] border border-[#1F487C]/10 bg-[#1F487C]/5 p-3 text-xs text-slate-600">When a lead is selected, show a sticky bottom bar with Create Quote and Add Note.</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">Visible quick actions on mobile: max <strong>3</strong>. No action should depend on hover.</div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">Touch targets everywhere: minimum <strong>44 x 44 px</strong>. Filter pills scroll horizontally.</div>
            </div>
          </Frame>
        </section>

        <section className="mt-12 grid gap-6 xl:grid-cols-2">
          <Frame title="Capture · Desktop blueprint" note="Main grid: 360 px source-selector column + flexible review area. Capture is inbound intake only.">
            <div className="rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#f8fcfe_0%,#f3f9fd_100%)] p-5">
              <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
                <div className="rounded-[28px] border border-white bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-950">Capture modes</p>
                  <div className="mt-4 space-y-3">
                    {intakeModes.map((mode) => (
                      <div key={mode} className="min-h-[88px] rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="text-sm font-semibold text-slate-900">{mode}</p>
                        <p className="mt-1 text-xs text-slate-500">One tap entry into the same intake review step.</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-[#1F487C]/10 bg-[#1F487C]/5 p-4 text-xs leading-6 text-slate-600">Outbound rep sharing belongs to My Card. Capture only handles inbound lead intake.</div>
                </div>
                <div className="rounded-[28px] border border-white bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">Intake review</p>
                      <p className="text-sm text-slate-500">Preview, extracted fields, duplicate warning, commit actions.</p>
                    </div>
                    <span className="rounded-full bg-[#359F91]/10 px-3 py-1 text-xs font-semibold text-[#359F91]">Confidence 87%</span>
                  </div>
                  <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                    <div className="h-[360px] rounded-[28px] border border-dashed border-[#1F487C]/20 bg-[linear-gradient(180deg,#f8fcfe_0%,#eef7fb_100%)] p-4 text-sm text-slate-500">Original source preview frame · 360 px height</div>
                    <div>
                      <div className="space-y-3">
                        {['Company', 'Contact', 'Country', 'Requested products', 'Volume', 'Deadline'].map((field) => (
                          <div key={field} className="min-h-[52px] rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-center justify-between gap-3"><span>{field}</span><span className="text-slate-400">Value</span></div>
                        ))}
                      </div>
                      <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Possible duplicate: Nairobi Retail Ltd already exists with one prior inquiry.</div>
                      <div className="mt-4 flex flex-wrap gap-3">
                        <button className="rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Create Lead</button>
                        <button className="rounded-full border border-[#1F487C]/15 px-5 py-3 text-sm font-semibold text-[#1F487C]">Merge</button>
                        <button className="rounded-full border border-[#1F487C]/15 px-5 py-3 text-sm font-semibold text-[#1F487C]">Lead + Draft Quote</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">Source mode cards minimum height: <strong>88 px</strong>. Preview frame height: <strong>360 px</strong>.</div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">Extracted field rows minimum height: <strong>52 px</strong>. Low-confidence fields show inline warnings.</div>
            </div>
          </Frame>

          <Frame title="Capture · Mobile / tablet blueprint" note="Vertical stack only on narrow screens. Preview and field review never sit side-by-side on mobile.">
            <div className="mx-auto max-w-[420px] rounded-[2rem] border border-[#1F487C]/10 bg-[linear-gradient(180deg,#f8fcfe_0%,#f3f9fd_100%)] p-4">
              <div className="rounded-[28px] border border-white bg-white p-4 shadow-sm">
                <p className="text-lg font-semibold text-slate-950">Capture</p>
                <div className="mt-4 space-y-3">
                  {intakeModes.map((mode) => (
                    <div key={mode} className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">{mode}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-[220px] rounded-[24px] border border-dashed border-[#1F487C]/20 bg-[linear-gradient(180deg,#f8fcfe_0%,#eef7fb_100%)] p-4 text-sm text-slate-500">Source preview</div>
                <div className="mt-4 space-y-3">
                  {['Company', 'Contact', 'Country', 'Requested products'].map((field) => (
                    <div key={field} className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">{field}: Value</div>
                  ))}
                </div>
                <div className="mt-4 rounded-[18px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Duplicate alert stays visible before commit.</div>
                <div className="mt-4 rounded-[22px] border border-[#1F487C]/10 bg-white/90 p-3 shadow-[0_-10px_30px_rgba(31,72,124,0.08)]">
                  <button className="w-full rounded-full bg-[linear-gradient(135deg,#1F487C_0%,#359F91_100%)] px-5 py-3 text-sm font-semibold text-white">Create Lead</button>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2 text-sm leading-6 text-slate-700">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">Camera and upload actions must be reachable in <strong>one tap</strong> from the mode card.</div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">The primary CTA remains sticky at the bottom once extracted data is ready.</div>
            </div>
          </Frame>
        </section>

        <section className="mt-12 rounded-[2rem] border border-[#1F487C]/10 bg-white p-8 shadow-[0_20px_60px_rgba(31,72,124,0.08)] lg:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#359F91]">Use this in future chats</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">Locked reference block</h2>
          <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5 text-sm leading-7 text-slate-700">
            <p>We are building Setu Flow as a Trade Execution System for import-export sales teams.</p>
            <p className="mt-3">Locked flow: Capture -&gt; Lead -&gt; Quote -&gt; Order</p>
            <p className="mt-3">Locked Leads + Capture screen specs exist in:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>docs/leads-capture-spec.md</li>
              <li>{PRODUCT_ROUTES.development.screens}</li>
            </ul>
            <p className="mt-3">Follow the locked rules:</p>
            <ul className="mt-2 list-disc pl-5">
              <li>mobile-first</li>
              <li>one screen = one decision</li>
              <li>no command-center multi-rail UI</li>
              <li>status colors are global</li>
              <li>Capture is inbound only</li>
              <li>My Card handles outbound rep sharing</li>
            </ul>
            <p className="mt-3">Please continue from the locked screen specs and do not redesign the product structure.</p>
          </div>
        </section>
      </main>
    </SiteShell>
  );
}
