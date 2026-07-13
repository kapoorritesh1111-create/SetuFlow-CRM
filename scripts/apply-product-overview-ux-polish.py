from pathlib import Path

path = Path('src/components/marketing/product-overview-experience.tsx')
text = path.read_text()

if 'const chapters = [' in text:
    raise SystemExit('UX chapter polish is already applied.')

insert = """
const chapters = [
  { title: 'Discover', slugs: ['welcome', 'business-journey', 'connected-workspaces', 'discover-opportunities'] },
  { title: 'Build Relationships', slugs: ['capture', 'relationship-workspace', 'research-intelligence', 'communication-hub'] },
  { title: 'Convert', slugs: ['catalog-management', 'price-lists-buyer-sharing', 'digital-business-card', 'commercial-workspace', 'supplier-workspace'] },
  { title: 'Execute & Improve', slugs: ['orders-execution', 'analytics-reports', 'integrations-access-security'] },
] as const;

const pageCallouts: Record<string, string[]> = {
  welcome: ['See the complete trade journey before opening a workspace', 'Use the real dashboard as the operating starting point', 'Carry the same context into every next step'],
  'business-journey': ['Capture with the right context', 'Convert with fewer handoffs', 'Move accepted business into execution'],
  'connected-workspaces': ['Focused tools for each job', 'One shared record layer underneath', 'Setu Guru available across the system'],
  'discover-opportunities': ['Prioritize the right markets', 'Turn research into targets', 'Move promising signals into the CRM'],
  capture: ['Capture quickly on desktop or mobile', 'Preserve event and source context', 'Assign the next action immediately'],
  'relationship-workspace': ['See relationship health and ownership', 'Keep supplier and buyer context together', 'Review activity and audit history without switching tools'],
  'research-intelligence': ['Spot pipeline pressure', 'Prepare with trade-event context', 'Coordinate next steps through tasks'],
  'communication-hub': ['Keep every touchpoint visible', 'Connect documents to the conversation', 'Make follow-up easier to continue'],
  'catalog-management': ['Organize products and categories', 'Keep commercial details ready', 'Reuse accurate information in quotes and sharing'],
  'price-lists-buyer-sharing': ['Create market-ready views', 'Protect internal-only information', 'Share a professional buyer experience'],
  'digital-business-card': ['Share contact details instantly', 'Present company and catalog links together', 'Support trade-show introductions on mobile'],
  'commercial-workspace': ['Build from connected buyer and product data', 'Review before sending', 'Carry approved work into orders'],
  'supplier-workspace': ['Track capability and readiness', 'Compare suppliers consistently', 'Connect sourcing decisions to buyer demand'],
  'orders-execution': ['See responsibilities and milestones', 'Keep documents with the order', 'Track risks through delivery'],
  'analytics-reports': ['Understand conversion and movement', 'Find where attention is needed', 'Share owner-ready reporting'],
  'integrations-access-security': ['Control who can access what', 'Manage supported operational connections', 'Keep administration visible and organized'],
};

function getChapterIndex(slug: string) {
  return Math.max(0, chapters.findIndex((chapter) => chapter.slugs.includes(slug as never)));
}

"""
text = text.replace('const workspaces:', insert + 'const workspaces:', 1)

component = """
function ProductCallouts({ page }: { page: OverviewPage }) {
  const items = pageCallouts[page.slug] ?? page.outcomes;
  return (
    <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#fbfdff_0%,#f5f8fb_100%)] p-4 sm:p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-700">What to notice</p>
          <p className="mt-1 text-sm text-slate-500">Three details that explain the business value of this workspace.</p>
        </div>
        <span className="text-[11px] font-semibold text-slate-400">Page {String(pages.findIndex((item) => item.slug === page.slug) + 1).padStart(2, '0')}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {items.slice(0, 3).map((item, index) => (
          <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,.05)]">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#071b3d] text-[10px] font-black text-cyan-300">{String(index + 1).padStart(2, '0')}</span>
            <p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{item}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

"""
text = text.replace('function Visual({ page, onZoom }: { page: OverviewPage; onZoom: (shot: Screenshot) => void }) {', component + 'function Visual({ page, onZoom }: { page: OverviewPage; onZoom: (shot: Screenshot) => void }) {', 1)
text = text.replace('  const progress = useMemo(() => ((index + 1) / pages.length) * 100, [index]);', "  const progress = useMemo(() => ((index + 1) / pages.length) * 100, [index]);\n  const chapterIndex = getChapterIndex(page.slug);\n  const chapter = chapters[chapterIndex];", 1)
text = text.replace("{String(index + 1).padStart(2, '0')} of 16", "Chapter {chapterIndex + 1} of {chapters.length} · Page {String(index + 1).padStart(2, '0')} of 16", 1)

mobile_old = """                {pages.map((item, itemIndex) => (
                  <button
                    key={item.slug}
                    onClick={() => select(item.slug)}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                      item.slug === page.slug ? 'bg-[#071b3d] text-white' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-black opacity-60">{String(itemIndex + 1).padStart(2, '0')}</span>
                    {item.short}
                  </button>
                ))}"""
mobile_new = """                {chapters.map((chapterItem) => (
                  <div key={chapterItem.title} className="mb-2 last:mb-0">
                    <p className="px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400">{chapterItem.title}</p>
                    {chapterItem.slugs.map((slug) => {
                      const itemIndex = pages.findIndex((candidate) => candidate.slug === slug);
                      const item = pages[itemIndex];
                      return (
                        <button
                          key={item.slug}
                          onClick={() => select(item.slug)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${
                            item.slug === page.slug ? 'bg-[#071b3d] text-white' : 'hover:bg-slate-50'
                          }`}
                        >
                          <span className="text-[10px] font-black opacity-60">{String(itemIndex + 1).padStart(2, '0')}</span>
                          {item.short}
                        </button>
                      );
                    })}
                  </div>
                ))}"""
if mobile_old not in text:
    raise SystemExit('Mobile navigation target not found')
text = text.replace(mobile_old, mobile_new, 1)

desktop_old = """                {pages.map((item, itemIndex) => (
                  <button
                    key={item.slug}
                    onClick={() => select(item.slug)}
                    className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${
                      item.slug === page.slug
                        ? 'bg-[#071b3d] text-white shadow-lg'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                        item.slug === page.slug ? 'bg-cyan-300/10 text-cyan-300' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <small className="block text-[9px] font-black opacity-45">{String(itemIndex + 1).padStart(2, '0')}</small>
                      <b className="block truncate text-[12px] leading-tight">{item.short}</b>
                    </span>
                  </button>
                ))}"""
desktop_new = """                {chapters.map((chapterItem) => (
                  <div key={chapterItem.title} className="mb-2 last:mb-0">
                    <p className="px-3 pb-1 pt-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-400">{chapterItem.title}</p>
                    {chapterItem.slugs.map((slug) => {
                      const itemIndex = pages.findIndex((candidate) => candidate.slug === slug);
                      const item = pages[itemIndex];
                      return (
                        <button
                          key={item.slug}
                          onClick={() => select(item.slug)}
                          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${
                            item.slug === page.slug
                              ? 'bg-[#071b3d] text-white shadow-lg'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
                          }`}
                        >
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${
                            item.slug === page.slug ? 'bg-cyan-300/10 text-cyan-300' : 'bg-slate-100 text-slate-500'
                          }`}>
                            <item.icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <small className="block text-[9px] font-black opacity-45">{String(itemIndex + 1).padStart(2, '0')}</small>
                            <b className="block truncate text-[12px] leading-tight">{item.short}</b>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))}"""
if desktop_old not in text:
    raise SystemExit('Desktop navigation target not found')
text = text.replace(desktop_old, desktop_new, 1)

text = text.replace('<p className="text-[10px] font-black uppercase tracking-[.22em] text-teal-700">{page.eyebrow}</p>', '<p className="text-[10px] font-black uppercase tracking-[.22em] text-teal-700">{page.eyebrow}</p>\n                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-500">{chapter.title}</span>', 1)
text = text.replace('text-[clamp(2.2rem,5vw,4.6rem)]', 'text-[clamp(2rem,4.1vw,3.75rem)]', 1)
text = text.replace('                  <Visual page={page} onZoom={setZoomed} />\n                  {page.guru ?', '                  <Visual page={page} onZoom={setZoomed} />\n                  <ProductCallouts page={page} />\n                  {page.guru ?', 1)
text = text.replace('<small className="block text-[9px] font-black uppercase tracking-[.16em] text-cyan-300">Next</small>', "<small className=\"block text-[9px] font-black uppercase tracking-[.16em] text-cyan-300\">{index === pages.length - 1 ? 'Restart tour' : 'Continue tour'}</small>", 1)

path.write_text(text)
print('Product Overview UX polish applied.')
