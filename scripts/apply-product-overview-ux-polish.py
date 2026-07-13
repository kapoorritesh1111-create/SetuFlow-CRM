from pathlib import Path

path = Path('src/components/marketing/product-overview-experience.tsx')
text = path.read_text()

if 'const chapters = [' in text:
    print('Product Overview UX polish already present.')
    raise SystemExit(0)

chapters = """
const chapters = [
  { title:'Discover', slugs:['welcome','business-journey','connected-workspaces','discover-opportunities'] },
  { title:'Build Relationships', slugs:['capture','relationship-workspace','research-intelligence','communication-hub'] },
  { title:'Convert', slugs:['catalog-management','price-lists-buyer-sharing','digital-business-card','commercial-workspace','supplier-workspace'] },
  { title:'Execute & Improve', slugs:['orders-execution','analytics-reports','integrations-access-security'] },
] as const;

const pageCallouts:Record<string,string[]> = {
  welcome:['See the complete trade journey before opening a workspace','Use the real dashboard as the operating starting point','Carry the same context into every next step'],
  'business-journey':['Capture with the right context','Convert with fewer handoffs','Move accepted business into execution'],
  'connected-workspaces':['Focused tools for each job','One shared record layer underneath','Setu Guru available across the system'],
  'discover-opportunities':['Prioritize the right markets','Turn research into targets','Move promising signals into the CRM'],
  capture:['Capture quickly on desktop or mobile','Preserve event and source context','Assign the next action immediately'],
  'relationship-workspace':['See relationship health and ownership','Keep supplier and buyer context together','Review activity and audit history without switching tools'],
  'research-intelligence':['Spot pipeline pressure','Prepare with trade-event context','Coordinate next steps through tasks'],
  'communication-hub':['Keep every touchpoint visible','Connect documents to the conversation','Make follow-up easier to continue'],
  'catalog-management':['Organize products and categories','Keep commercial details ready','Reuse accurate information in quotes and sharing'],
  'price-lists-buyer-sharing':['Create market-ready views','Protect internal-only information','Share a professional buyer experience'],
  'digital-business-card':['Share contact details instantly','Present company and catalog links together','Support trade-show introductions on mobile'],
  'commercial-workspace':['Build from connected buyer and product data','Review before sending','Carry approved work into orders'],
  'supplier-workspace':['Track capability and readiness','Compare suppliers consistently','Connect sourcing decisions to buyer demand'],
  'orders-execution':['See responsibilities and milestones','Keep documents with the order','Track risks through delivery'],
  'analytics-reports':['Understand conversion and movement','Find where attention is needed','Share owner-ready reporting'],
  'integrations-access-security':['Control who can access what','Manage supported operational connections','Keep administration visible and organized'],
};

function getChapterIndex(slug:string){return Math.max(0,chapters.findIndex(chapter=>chapter.slugs.includes(slug as never)))}

"""
text = text.replace('const journey = [', chapters + 'const journey = [', 1)

callouts = """
function ProductCallouts({page}:{page:OverviewPage}){const items=pageCallouts[page.slug]||page.outcomes;return <section className="mt-4 rounded-[1.5rem] border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[.2em] text-teal-700">What to notice</p><p className="mt-1 text-sm text-slate-500">Three details that explain the business value of this workspace.</p></div><span className="hidden text-[11px] font-semibold text-slate-400 sm:block">Guided product story</span></div><div className="mt-4 grid gap-3 md:grid-cols-3">{items.slice(0,3).map((item,i)=><div key={item} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_10px_25px_rgba(15,23,42,.05)]"><span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#071b3d] text-[10px] font-black text-cyan-300">{String(i+1).padStart(2,'0')}</span><p className="mt-3 text-sm font-semibold leading-6 text-slate-700">{item}</p></div>)}</div></section>}

"""
text = text.replace('function Visual({page,onZoom}', callouts + 'function Visual({page,onZoom}', 1)

text = text.replace(
  "const index=Math.max(0,pages.findIndex(p=>p.slug===activeSlug)),page=pages[index],previous=pages[(index-1+pages.length)%pages.length],next=pages[(index+1)%pages.length],progress=useMemo(()=>((index+1)/pages.length)*100,[index]);",
  "const index=Math.max(0,pages.findIndex(p=>p.slug===activeSlug)),page=pages[index],previous=pages[(index-1+pages.length)%pages.length],next=pages[(index+1)%pages.length],progress=useMemo(()=>((index+1)/pages.length)*100,[index]),chapterIndex=getChapterIndex(page.slug),chapter=chapters[chapterIndex];",
  1,
)

text = text.replace("{String(index+1).padStart(2,'0')} of 16", "Chapter {chapterIndex+1} of {chapters.length} · Page {String(index+1).padStart(2,'0')} of 16", 1)

mobile_old = "{pages.map((p,i)=><button key={p.slug} onClick={()=>select(p.slug)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${p.slug===page.slug?'bg-[#071b3d] text-white':'hover:bg-slate-50'}`}><span className=\"text-[10px] font-black opacity-60\">{String(i+1).padStart(2,'0')}</span>{p.short}</button>)}"
mobile_new = "{chapters.map(group=><div key={group.title} className=\"mb-2 last:mb-0\"><p className=\"px-3 py-2 text-[10px] font-black uppercase tracking-[.18em] text-slate-400\">{group.title}</p>{group.slugs.map(slug=>{const i=pages.findIndex(p=>p.slug===slug),p=pages[i];return <button key={p.slug} onClick={()=>select(p.slug)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm ${p.slug===page.slug?'bg-[#071b3d] text-white':'hover:bg-slate-50'}`}><span className=\"text-[10px] font-black opacity-60\">{String(i+1).padStart(2,'0')}</span>{p.short}</button>})}</div>)}"
text = text.replace(mobile_old, mobile_new, 1)

desktop_old = "{pages.map((p,i)=><button key={p.slug} onClick={()=>select(p.slug)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition ${p.slug===page.slug?'bg-[#071b3d] text-white shadow-lg':'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${p.slug===page.slug?'bg-cyan-300/10 text-cyan-300':'bg-slate-100 text-slate-500'}`}><p.icon className=\"h-4 w-4\"/></span><span className=\"min-w-0\"><small className=\"block text-[9px] font-black opacity-45\">{String(i+1).padStart(2,'0')}</small><b className=\"block truncate text-[12px] leading-tight\">{p.short}</b></span></button>)}"
desktop_new = "{chapters.map(group=><div key={group.title} className=\"mb-2 last:mb-0\"><p className=\"px-3 pb-1 pt-2 text-[9px] font-black uppercase tracking-[.18em] text-slate-400\">{group.title}</p>{group.slugs.map(slug=>{const i=pages.findIndex(p=>p.slug===slug),p=pages[i];return <button key={p.slug} onClick={()=>select(p.slug)} className={`flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition ${p.slug===page.slug?'bg-[#071b3d] text-white shadow-lg':'text-slate-600 hover:bg-slate-50 hover:text-slate-950'}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${p.slug===page.slug?'bg-cyan-300/10 text-cyan-300':'bg-slate-100 text-slate-500'}`}><p.icon className=\"h-4 w-4\"/></span><span className=\"min-w-0\"><small className=\"block text-[9px] font-black opacity-45\">{String(i+1).padStart(2,'0')}</small><b className=\"block truncate text-[12px] leading-tight\">{p.short}</b></span></button>})}</div>)}"
text = text.replace(desktop_old, desktop_new, 1)

text = text.replace('<p className="text-[10px] font-black uppercase tracking-[.22em] text-teal-700">{page.eyebrow}</p>', '<p className="text-[10px] font-black uppercase tracking-[.22em] text-teal-700">{page.eyebrow}</p><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-bold text-slate-500">{chapter.title}</span>', 1)
text = text.replace('text-[clamp(2.1rem,4.4vw,4.25rem)]', 'text-[clamp(2rem,4vw,3.75rem)]', 1)
text = text.replace('<Visual page={page} onZoom={setZoomed}/>{page.guru?', '<Visual page={page} onZoom={setZoomed}/><ProductCallouts page={page}/>{page.guru?', 1)
text = text.replace('>Next</small>', ">{index===pages.length-1?'Restart tour':'Continue tour'}</small>", 1)

required = ['const chapters = [','function ProductCallouts','chapterIndex=getChapterIndex','<ProductCallouts page={page}/>']
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit('Product Overview polish failed: ' + ', '.join(missing))

path.write_text(text)
print('Product Overview UX polish applied.')
