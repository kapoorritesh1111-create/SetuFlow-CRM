# PR-QUICKFIXES — visual/quote follow-up patch

Status: **Pending proof — user running locally**

## Environment note

- I did **not** run `npm ci`, `npm run typecheck`, `npm test`, `npm run build`, or any npm/node command.
- Changes are code-only for local proof.

## Files modified

1. `src/features/pipeline/components/PipelineBoardFilters.tsx`
2. `src/features/pipeline/components/pipeline-board.tsx`
3. `src/features/leads/components/leads-workspace.tsx`
4. `public/internal-dcc/index.html`
5. `CHANGES.md`

## Files intentionally not modified

- `public/reference-html/*.html`
- Trade show files: user confirmed trade show changes worked, so no further trade-event changes were made.

## Fix summary

### Pipeline visual fix

- Removed the nested Pipeline topbar from `pipeline-board.tsx` so the page no longer repeats the Buyers/Suppliers switcher under the AppShell header.
- Removed the second collapsible filters panel so filters render once in the compact command-bar style.
- Reworked `PipelineBoardFilters.tsx` to match the intended compact filter-chip layout: search, Follow-up, Owner, Product, Market, then active chips.

### Pipeline drag/drop fix

- Restored drag attributes on Kanban cards in the rendered visual board.
- Added lane-level `onDragOver`, `onDragLeave`, and `onDrop` handlers on the visible columns.
- Kept existing `handleMove` readiness/gating logic intact.

### Quote preview recalculation fix

- Added local editable quote-preview line state.
- Quantity and unit price inputs now update line totals, subtotal, grand total, and review totals immediately on the inline quote preview.
- Missing-price lines now get an editable price input instead of a blocked pill.

### Quote terms editability fix

- Currency, Incoterm, Payment terms, Quote validity days, Port of loading, and Delivery notes are now editable in the inline terms step.
- Currency changes update preview totals' displayed currency immediately.

### DCC update

- `public/internal-dcc/index.html` PR-QUICKFIXES status remains pending proof and now notes the visual/quote follow-up proof is running locally.

## Key diffs

### `src/features/pipeline/components/pipeline-board.tsx`

```diff
--- /mnt/data/orig/SetuFlow-CRM-main/src/features/pipeline/components/pipeline-board.tsx	2026-04-28 23:04:06.000000000 +0000
+++ src/features/pipeline/components/pipeline-board.tsx	2026-04-28 23:32:54.005246123 +0000
@@ -697,27 +697,6 @@
   return (
     <div style={{fontFamily:'-apple-system,BlinkMacSystemFont,system-ui,sans-serif',fontSize:'13px',lineHeight:'1.5',color:'#1e293b',background:'#f0f4f8',minHeight:'100vh'}}>
 
-      {/* TOPBAR */}
-      <header style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',height:'56px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:50}}>
-        <div style={{display:'flex',alignItems:'center',gap:'14px'}}>
-          <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'5px 12px',borderRadius:'6px',background:'rgba(11,46,74,.06)',border:'1px solid rgba(11,46,74,.12)'}}>
-            <div style={{width:'22px',height:'22px',borderRadius:'4px',background:'linear-gradient(135deg,#0b2e4a,#0c7fff)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'9px',fontWeight:800,color:'white'}}>BO</div>
-            <div><div style={{fontSize:'10px',fontWeight:800,color:'#0b2e4a'}}>Blue Orbit Int&apos;l</div><div style={{fontSize:'8px',color:'#94a3b8',letterSpacing:'.1em',textTransform:'uppercase'}}>SETU Flow CRM</div></div>
-          </div>
-          <div style={{width:'1px',height:'24px',background:'#e2e8f0'}}/>
-          <div><div style={{fontSize:'10px',fontWeight:700,letterSpacing:'.16em',textTransform:'uppercase',color:'#0c7fff'}}>Pipeline / Risks</div><div style={{fontSize:'16px',fontWeight:700,color:'#1e293b',letterSpacing:'-.3px'}}>Kanban Board</div></div>
-        </div>
-        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
-          <div style={{display:'flex',background:'#f1f5f9',borderRadius:'6px',padding:'3px',border:'1px solid #e2e8f0',gap:'2px'}}>
-            {([['all','All'],['buyers','Buyers'],['suppliers','Suppliers']] as Array<[string,string]>).map(([mode,label])=>(
-              <button key={mode} type="button" onClick={()=>{setWorkspaceMode(mode as any);setLeadTypeFilter(workspaceModeToLeadJourney(mode as any));}} style={{padding:'4px 12px',borderRadius:'6px',fontSize:'11px',fontWeight:600,cursor:'pointer',border:'none',background:workspaceMode===mode?'#0b2e4a':'transparent',color:workspaceMode===mode?'white':'#64748b',transition:'all .15s'}}>{label}</button>
-            ))}
-          </div>
-          <button type="button" style={{display:'flex',alignItems:'center',gap:'7px',padding:'7px 14px',borderRadius:'6px',background:'linear-gradient(135deg,#0b2e4a,#0c7fff 160%)',color:'white',border:'none',fontSize:'12px',fontWeight:700,cursor:'pointer',boxShadow:'0 2px 8px rgba(12,127,255,.35)'}} onClick={()=>window.location.href=PRODUCT_ROUTES.app.leads+'?contact-exchange=1'}>Share my vCard</button>
-          <a href={PRODUCT_ROUTES.app.leads} style={{display:'flex',alignItems:'center',gap:'5px',padding:'7px 14px',borderRadius:'6px',background:'#0b2e4a',color:'white',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>＋ Quick Lead</a>
-        </div>
-      </header>
-
       {/* PAGE NAV TABS */}
       <div style={{background:'white',borderBottom:'1px solid #e2e8f0',padding:'0 24px',display:'flex',alignItems:'center',gap:0}}>
         <div style={{padding:'12px 16px',fontSize:'12px',fontWeight:700,color:'#0b2e4a',cursor:'pointer',borderBottom:'2px solid #0c7fff',marginBottom:'-1px',display:'flex',alignItems:'center',gap:'6px',whiteSpace:'nowrap'}}>
@@ -791,30 +770,6 @@
         </div>
       )}
 
-      {/* FILTERS PANEL */}
-      {showPipelineBoard&&filtersOpen&&(
-        <div style={{margin:'0 24px',padding:'16px',background:'white',borderRadius:'16px',border:'1px solid #e2e8f0',marginTop:'14px'}}>
-          <PipelineBoardFilters
-            search={search}
-            onSearchChange={setSearch}
-            leadType={leadTypeFilter}
-            onLeadTypeChange={(value) => setLeadTypeFilter(normalizeLeadTypeParam(value))}
-            ownerId={ownerFilter}
-            onOwnerIdChange={setOwnerFilter}
-            owners={profiles.map((profile) => ({ id: profile.id, label: profile.full_name ?? profile.username ?? 'Unassigned' }))}
-            followUpTiming={followUpTiming}
-            onFollowUpTimingChange={setFollowUpTiming}
-            productId={productId}
-            onProductIdChange={setProductId}
-            products={products.map((product) => ({ id: product.id, label: product.name }))}
-            marketId={marketId}
-            onMarketIdChange={setMarketId}
-            markets={markets.map((market) => ({ id: market.id, label: market.name }))}
-          />
-          {activeFilterCount>0&&<button type="button" onClick={resetFilters} style={{marginTop:'12px',padding:'6px 14px',borderRadius:'6px',background:'#f1f5f9',border:'1px solid #e2e8f0',fontSize:'12px',fontWeight:600,color:'#475569',cursor:'pointer'}}>Reset all filters</button>}
-        </div>
-      )}
-
       {/* KANBAN BOARD */}
       {showPipelineBoard&&(
         <>
@@ -823,7 +778,25 @@
           </div>
           <div style={{padding:'14px 24px 24px',overflowX:'auto',display:'flex',gap:'12px',minHeight:0,WebkitOverflowScrolling:'touch'} as React.CSSProperties}>
             {visualStageGroups.map(group=>(
-              <div key={group.stage.id} style={{flexShrink:0,width:'256px',display:'flex',flexDirection:'column',gap:'8px'}}>
+              <div
+                key={group.stage.id}
+                style={{flexShrink:0,width:'256px',display:'flex',flexDirection:'column',gap:'8px'}}
+                onDragOver={(event) => { event.preventDefault(); if (draggedLeadId) setDragOverStageId(group.stage.id); }}
+                onDragLeave={() => { if (dragOverStageId === group.stage.id) setDragOverStageId(null); }}
+                onDrop={(event) => {
+                  event.preventDefault();
+                  if (!draggedLeadId) return;
+                  const draggedLead = localLeads.find((lead) => lead.id === draggedLeadId);
+                  if (!draggedLead || draggedLead.stage_id === group.stage.id) {
+                    setDraggedLeadId(null);
+                    setDragOverStageId(null);
+                    return;
+                  }
+                  handleMove(draggedLeadId, group.stage.id);
+                  setDraggedLeadId(null);
+                  setDragOverStageId(null);
+                }}
+              >
                 {/* Lane header */}
                 <div style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'22px',padding:'12px 14px',boxShadow:'0 1px 3px rgba(15,23,42,.06)'}}>
                   <div style={{height:'3px',borderRadius:'99px',marginBottom:'10px',background:getStageAccent(group.stage.name)}}/>
@@ -851,7 +824,14 @@
                     const cardBorderLeft = isBlocked?'3px solid #f43f5e':followUpState==='overdue'?'3px solid #f59e0b':'3px solid #10b981';
                     const commercialReadiness = getLeadPricingReadiness(lead.id);
                     return (
-                      <div key={lead.id} style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'16px',padding:'12px',boxShadow:'0 1px 3px rgba(15,23,42,.06)',cursor:'pointer',transition:'box-shadow .15s,transform .15s',borderLeft:cardBorderLeft}} onClick={()=>navigateToLeadCommandCenter(router, buildLeadCommandCenterHref(lead.id))}>
+                      <div
+                        key={lead.id}
+                        draggable
+                        onDragStart={(event) => { event.dataTransfer.effectAllowed = 'move'; setDraggedLeadId(lead.id); }}
+                        onDragEnd={() => { setDraggedLeadId(null); setDragOverStageId(null); }}
+                        style={{background:'white',border:'1px solid #e2e8f0',borderRadius:'16px',padding:'12px',boxShadow:draggedLeadId===lead.id?'0 12px 24px rgba(15,23,42,.16)':'0 1px 3px rgba(15,23,42,.06)',cursor:'grab',transition:'box-shadow .15s,transform .15s',borderLeft:cardBorderLeft,opacity:draggedLeadId===lead.id ? .8 : 1}}
+                        onClick={()=>navigateToLeadCommandCenter(router, buildLeadCommandCenterHref(lead.id))}
+                      >
                         <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'6px',marginBottom:'8px'}}>
                           <div style={{width:'28px',height:'28px',borderRadius:'8px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0}}>
                             {lead.country?'🌍':'🏢'}
```

### `src/features/pipeline/components/PipelineBoardFilters.tsx`

```diff
--- /mnt/data/orig/SetuFlow-CRM-main/src/features/pipeline/components/PipelineBoardFilters.tsx	2026-04-28 23:02:33.000000000 +0000
+++ src/features/pipeline/components/PipelineBoardFilters.tsx	2026-04-28 23:33:08.070008698 +0000
@@ -25,7 +25,6 @@
   markets?: PipelineBoardFilterOption[];
 }
 
-const leadTypeLabels: Record<string, string> = { buyer: 'Buyers', supplier: 'Suppliers' };
 const followUpTimingLabels: Record<string, string> = { overdue: 'Overdue', today: 'Today', week: 'This week', none: 'No follow-up' };
 
 function FilterChip({ label, onClear, tone = 'blue' }: { label: string; onClear: () => void; tone?: 'rose' | 'amber' | 'blue' }) {
@@ -36,16 +35,26 @@
       : 'border-sky-200 bg-sky-50 text-sky-800';
 
   return (
-    <button
-      type="button"
-      onClick={onClear}
-      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-bold ${toneClass}`}
-    >
+    <button type="button" onClick={onClear} className={`inline-flex h-7 items-center gap-1 rounded-full border px-3 text-[10px] font-bold ${toneClass}`}>
       {label} <span className="opacity-60">×</span>
     </button>
   );
 }
 
+function FilterSelect({ label, icon, value, onChange, children, minWidth = 132 }: { label: string; icon: string; value: string; onChange: (value: string) => void; children: React.ReactNode; minWidth?: number }) {
+  return (
+    <label className="flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm" style={{ minWidth }}>
+      <span className="text-[13px] leading-none">{icon}</span>
+      <span className="flex flex-col leading-none">
+        <span className="text-[8px] font-extrabold uppercase tracking-[.14em] text-slate-400">{label}</span>
+        <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-0.5 border-none bg-transparent p-0 text-[11px] font-bold text-slate-800 outline-none">
+          {children}
+        </select>
+      </span>
+    </label>
+  );
+}
+
 export default function PipelineBoardFilters({
   search,
   onSearchChange,
@@ -68,48 +77,43 @@
   const marketLabel = markets.find((market) => market.id === marketId)?.label ?? 'Market';
 
   return (
-    <div className="flex flex-wrap items-center gap-2">
-      <div className="flex h-8 min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5">
+    <div className="contents">
+      <div className="flex h-10 min-w-[260px] items-center gap-2 rounded-md border border-slate-200 bg-white px-3 shadow-sm">
         <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="15" y2="15"/></svg>
         <input
           value={search}
           onChange={(event) => onSearchChange(event.target.value)}
-          placeholder="Search company, contact, country…"
-          className="w-full border-none bg-transparent text-[11px] text-slate-800 outline-none"
+          placeholder="Search company, contact, country..."
+          className="w-full border-none bg-transparent text-[11px] text-slate-800 outline-none placeholder:text-slate-400"
         />
       </div>
-      <select value={followUpTiming} onChange={(event) => onFollowUpTimingChange(event.target.value)} className="h-8 min-w-[130px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
+      <FilterSelect label="Follow-up timing" icon="⏰" value={followUpTiming} onChange={onFollowUpTimingChange} minWidth={142}>
         <option value="">All timing</option>
         <option value="overdue">Overdue</option>
         <option value="today">Today</option>
         <option value="week">This week</option>
         <option value="none">No follow-up</option>
-      </select>
+      </FilterSelect>
       {onOwnerIdChange ? (
-        <select value={ownerId} onChange={(event) => onOwnerIdChange(event.target.value)} className="h-8 min-w-[120px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
+        <FilterSelect label="Owner" icon="👤" value={ownerId} onChange={onOwnerIdChange} minWidth={128}>
           <option value="">All owners</option>
           {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.label}</option>)}
-        </select>
+        </FilterSelect>
       ) : null}
-      <select value={productId} onChange={(event) => onProductIdChange(event.target.value)} className="h-8 min-w-[130px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
+      <FilterSelect label="Product" icon="📦" value={productId} onChange={onProductIdChange} minWidth={140}>
         <option value="">All products</option>
         {products.map((product) => <option key={product.id} value={product.id}>{product.label}</option>)}
-      </select>
-      <select value={marketId} onChange={(event) => onMarketIdChange(event.target.value)} className="h-8 min-w-[120px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
+      </FilterSelect>
+      <FilterSelect label="Market" icon="🌍" value={marketId} onChange={onMarketIdChange} minWidth={132}>
         <option value="">All markets</option>
         {markets.map((market) => <option key={market.id} value={market.id}>{market.label}</option>)}
-      </select>
-      <select value={leadType} onChange={(event) => onLeadTypeChange(event.target.value)} className="h-8 min-w-[120px] rounded-md border border-slate-200 bg-slate-50 px-2.5 text-[11px] font-semibold text-slate-800">
-        <option value="">All types</option>
-        <option value="buyer">Buyers</option>
-        <option value="supplier">Suppliers</option>
-      </select>
+      </FilterSelect>
       <div className="flex flex-wrap items-center gap-2">
-        {followUpTiming ? <FilterChip label={`⏰ ${followUpTimingLabels[followUpTiming] ?? followUpTiming}`} tone={followUpTiming === 'overdue' ? 'rose' : followUpTiming === 'today' ? 'amber' : 'blue'} onClear={() => onFollowUpTimingChange('')} /> : null}
-        {ownerId ? <FilterChip label={`👤 ${ownerLabel}`} onClear={() => onOwnerIdChange?.('')} /> : null}
-        {productId ? <FilterChip label={`📦 ${productLabel}`} onClear={() => onProductIdChange('')} /> : null}
-        {marketId ? <FilterChip label={`🌍 ${marketLabel}`} onClear={() => onMarketIdChange('')} /> : null}
-        {leadType ? <FilterChip label={`Type: ${leadTypeLabels[leadType] ?? leadType}`} onClear={() => onLeadTypeChange('')} /> : null}
+        {followUpTiming ? <FilterChip label={`${followUpTimingLabels[followUpTiming] ?? followUpTiming}`} tone={followUpTiming === 'overdue' ? 'rose' : followUpTiming === 'today' ? 'amber' : 'blue'} onClear={() => onFollowUpTimingChange('')} /> : null}
+        {ownerId ? <FilterChip label={ownerLabel} onClear={() => onOwnerIdChange?.('')} /> : null}
+        {productId ? <FilterChip label={productLabel} onClear={() => onProductIdChange('')} /> : null}
+        {marketId ? <FilterChip label={marketLabel} onClear={() => onMarketIdChange('')} /> : null}
+        {leadType ? <input type="hidden" value={leadType} onChange={(event) => onLeadTypeChange(event.target.value)} readOnly /> : null}
       </div>
     </div>
   );
```

### `src/features/leads/components/leads-workspace.tsx`

```diff
--- /mnt/data/orig/SetuFlow-CRM-main/src/features/leads/components/leads-workspace.tsx	2026-04-28 22:28:44.000000000 +0000
+++ src/features/leads/components/leads-workspace.tsx	2026-04-28 23:36:03.235483965 +0000
@@ -2163,11 +2163,11 @@
   const variantNameMap = React.useMemo(() => new Map(variants.map((variant) => [variant.id, variant.name])), [variants]);
   const marketNameMap = React.useMemo(() => new Map(markets.map((market) => [market.id, market.name])), [markets]);
 
-  const quoteItems = latestQuote?.lineItems ?? [];
-  const rfqItems = rfqs.flatMap((rfq) => rfq.lineItems ?? []);
-  const sourceItems = quoteItems.length ? quoteItems : rfqItems;
+  const quoteItems = React.useMemo(() => latestQuote?.lineItems ?? [], [latestQuote?.lineItems]);
+  const rfqItems = React.useMemo(() => rfqs.flatMap((rfq) => rfq.lineItems ?? []), [rfqs]);
+  const sourceItems = React.useMemo(() => quoteItems.length ? quoteItems : rfqItems, [quoteItems, rfqItems]);
 
-  const displayLines = React.useMemo<DisplayLine[]>(() => {
+  const baseDisplayLines = React.useMemo<DisplayLine[]>(() => {
     if (sourceItems.length) {
       return sourceItems.map((item) => {
         const qty = Number(item.quantity ?? 1) || 1;
@@ -2239,8 +2239,32 @@
     });
   }, [lead.deal_currency, latestQuote?.currency, marketNameMap, prices, pricingRules, productNameMap, quoteItems.length, selectedMarketIds, selectedMarketNames, selectedProductIds, selectedProductNames, sourceItems, variantNameMap, variants]);
 
+  const [editableLines, setEditableLines] = React.useState<DisplayLine[]>(baseDisplayLines);
+  const [termsCurrency, setTermsCurrency] = React.useState(latestQuote?.currency ?? baseDisplayLines.find((item) => item.currency)?.currency ?? lead.deal_currency ?? 'USD');
+  const [termsIncoterm, setTermsIncoterm] = React.useState('FOB');
+  const [paymentTerms, setPaymentTerms] = React.useState('30% advance, 70% on BL');
+  const [quoteValidityDays, setQuoteValidityDays] = React.useState('30');
+  const [portOfLoading, setPortOfLoading] = React.useState('');
+  const [deliveryNotes, setDeliveryNotes] = React.useState('');
+
+  React.useEffect(() => {
+    setEditableLines(baseDisplayLines);
+    setTermsCurrency(latestQuote?.currency ?? baseDisplayLines.find((item) => item.currency)?.currency ?? lead.deal_currency ?? 'USD');
+  }, [baseDisplayLines, latestQuote?.currency, lead.deal_currency]);
+
+  const updateEditableLine = (lineId: string, field: 'quantity' | 'unitPrice', value: string) => {
+    const normalized = Number(value.replace(/,/g, ''));
+    setEditableLines((current) => current.map((line) => {
+      if (line.id !== lineId) return line;
+      const nextQuantity = field === 'quantity' ? (Number.isFinite(normalized) && normalized > 0 ? normalized : 0) : line.quantity;
+      const nextUnitPrice = field === 'unitPrice' ? (Number.isFinite(normalized) ? normalized : 0) : line.unitPrice;
+      return { ...line, quantity: nextQuantity, unitPrice: nextUnitPrice, total: nextQuantity * (nextUnitPrice ?? 0), priceStatus: nextUnitPrice && nextUnitPrice > 0 ? 'priced' : 'missing' };
+    }));
+  };
+
+  const displayLines = editableLines;
   const subtotal = displayLines.reduce((sum, item) => sum + item.total, 0);
-  const currency = latestQuote?.currency ?? displayLines.find((item) => item.currency)?.currency ?? lead.deal_currency ?? 'USD';
+  const currency = termsCurrency || displayLines.find((item) => item.currency)?.currency || lead.deal_currency || 'USD';
   const blockerCount = readiness?.blockerCount ?? complianceItems.length;
   const pricingReady = displayLines.length > 0 && displayLines.every((item) => item.priceStatus === 'priced');
   const hasQuoteDraft = Boolean(latestQuote);
@@ -2369,8 +2393,8 @@
                       return (
                         <tr key={item.id} className="border-t border-[#f1f5f9] hover:bg-[#f8fafc]">
                           <td className="px-[10px] py-[10px]"><div className="font-bold text-[#0f172a]">{item.productLabel}</div><div className="mt-1 text-[10px] text-[#64748b]">{item.variantLabel ? `${item.variantLabel} · ` : ''}{item.source === 'coverage' ? 'coverage/catalog fallback' : item.source === 'rfq' ? 'RFQ line' : 'quote draft line'}</div>{item.note ? <div className="mt-1 text-[10px] text-[#94a3b8]">{item.note}</div> : null}</td>
-                          <td className="px-[10px] py-[10px]"><input title="Quantity is editable in the governed saved quote. This preview seeds MOQ/catalog quantity before opening the draft." className="w-[68px] rounded-[6px] border border-[#cbd5e1] bg-white p-[5px] text-center text-[12px] font-semibold text-[#0f172a] outline-none" defaultValue={qty} /></td>
-                          <td className="px-[10px] py-[10px]">{price == null ? <span className="rounded-full bg-[#fff1f2] px-2 py-1 text-[10px] font-bold text-[#be123c]">Price missing</span> : <input title="Price is editable in the governed saved quote. This preview shows the catalog baseline." className="w-[90px] rounded-[6px] border border-[#cbd5e1] bg-white p-[5px_7px] text-right text-[12px] font-bold text-[#0f172a] outline-none" defaultValue={price.toLocaleString()} />}</td>
+                          <td className="px-[10px] py-[10px]"><input title="Quantity updates this quote preview total immediately. Save via the governed quote workflow when ready." className="w-[68px] rounded-[6px] border border-[#cbd5e1] bg-white p-[5px] text-center text-[12px] font-semibold text-[#0f172a] outline-none" value={qty} onChange={(event) => updateEditableLine(item.id, 'quantity', event.target.value)} /></td>
+                          <td className="px-[10px] py-[10px]"><input title="Unit price updates this quote preview total immediately. Save via the governed quote workflow when ready." className="w-[90px] rounded-[6px] border border-[#cbd5e1] bg-white p-[5px_7px] text-right text-[12px] font-bold text-[#0f172a] outline-none" value={price ?? ''} onChange={(event) => updateEditableLine(item.id, 'unitPrice', event.target.value)} placeholder="Price" /></td>
                           <td className="px-[10px] py-[10px] font-bold text-[#0f172a]">{item.currency} {item.total.toLocaleString()}</td>
                         </tr>
                       );
@@ -2393,27 +2417,34 @@
               </div>
             ) : builderStep === 2 ? (
               <div className="grid grid-cols-2 gap-[10px]">
-                {[
-                  { label: 'Currency', val: currency, type: 'select', opts: ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'JPY'] },
-                  { label: 'Incoterm', val: 'FOB', type: 'select', opts: ['FOB', 'CIF', 'EXW', 'DDP', 'CFR'] },
-                  { label: 'Payment terms', val: '30% advance, 70% on BL', type: 'text' },
-                  { label: 'Quote validity (days)', val: '30', type: 'text' },
-                  { label: 'Port of loading', val: '', type: 'text', placeholder: 'e.g. JNPT Mumbai' },
-                  { label: 'Delivery notes', val: '', type: 'textarea', placeholder: 'Packaging, labelling, or shipping notes…' },
-                ].map((field) => (
-                  <div key={field.label} className={`flex flex-col gap-[4px] ${field.type === 'textarea' ? 'col-span-2' : ''}`}>
-                    <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">{field.label}</label>
-                    {field.type === 'select' ? (
-                      <select disabled title="Terms persist through the saved quote workflow. Use Create/open draft preview to edit governed terms." className="w-full rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-[8px_10px] text-[12px] font-semibold text-[#64748b] outline-none" value={field.val}>
-                        {field.opts?.map((o) => <option key={o}>{o}</option>)}
-                      </select>
-                    ) : field.type === 'textarea' ? (
-                      <textarea readOnly title="Terms persist through the saved quote workflow. Use Create/open draft preview to edit governed terms." className="w-full resize-y rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-[8px_10px] text-[12px] text-[#64748b] outline-none" value={field.val} placeholder={field.placeholder} style={{ minHeight: '68px' }} />
-                    ) : (
-                      <input readOnly title="Terms persist through the saved quote workflow. Use Create/open draft preview to edit governed terms." className="w-full rounded-[6px] border border-[#e2e8f0] bg-[#f8fafc] p-[8px_10px] text-[12px] font-semibold text-[#64748b] outline-none" value={field.val} placeholder={field.placeholder ?? ''} />
-                    )}
-                  </div>
-                ))}
+                <div className="flex flex-col gap-[4px]">
+                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Currency</label>
+                  <select className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={termsCurrency} onChange={(event) => setTermsCurrency(event.target.value)}>
+                    {['USD', 'EUR', 'GBP', 'INR', 'CAD', 'JPY'].map((option) => <option key={option}>{option}</option>)}
+                  </select>
+                </div>
+                <div className="flex flex-col gap-[4px]">
+                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Incoterm</label>
+                  <select className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={termsIncoterm} onChange={(event) => setTermsIncoterm(event.target.value)}>
+                    {['FOB', 'CIF', 'EXW', 'DDP', 'CFR'].map((option) => <option key={option}>{option}</option>)}
+                  </select>
+                </div>
+                <div className="flex flex-col gap-[4px]">
+                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Payment terms</label>
+                  <input className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} />
+                </div>
+                <div className="flex flex-col gap-[4px]">
+                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Quote validity (days)</label>
+                  <input className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={quoteValidityDays} onChange={(event) => setQuoteValidityDays(event.target.value)} />
+                </div>
+                <div className="flex flex-col gap-[4px]">
+                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Port of loading</label>
+                  <input className="w-full rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] font-semibold text-[#0f172a] outline-none" value={portOfLoading} onChange={(event) => setPortOfLoading(event.target.value)} placeholder="e.g. JNPT Mumbai" />
+                </div>
+                <div className="col-span-2 flex flex-col gap-[4px]">
+                  <label className="text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]">Delivery notes</label>
+                  <textarea className="w-full resize-y rounded-[6px] border border-[#e2e8f0] bg-white p-[8px_10px] text-[12px] text-[#0f172a] outline-none" value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} placeholder="Packaging, labelling, or shipping notes..." style={{ minHeight: '68px' }} />
+                </div>
               </div>
             ) : builderStep === 3 ? (
               <div className="grid grid-cols-2 gap-[8px]">
```

### `public/internal-dcc/index.html`

```diff
--- /mnt/data/orig/SetuFlow-CRM-main/public/internal-dcc/index.html	2026-04-28 23:04:15.000000000 +0000
+++ public/internal-dcc/index.html	2026-04-28 23:35:11.249453314 +0000
@@ -207,7 +207,7 @@
         <code>pipeline/components/pipeline-board.tsx</code><br/>
         <code>admin/trade-events/page.tsx</code><br/>
         <code>trade-events/server/actions.ts</code>
-      </td><td>Quotes 65&rarr;72, Pipeline 70&rarr;78, Trade 62&rarr;72</td><td><span class="s warn">Pending proof — user running locally</span></td></tr>
+      </td><td>Quotes 65&rarr;72, Pipeline 70&rarr;78, Trade 62&rarr;72</td><td><span class="s warn">Pending proof — visual/quote follow-up fixes running locally</span></td></tr>
       <tr><td>02</td><td><strong>PR-CATALOG-SMOKE</strong><br/>Visual smoke + quote handoff href</td><td>
         <code>products/components/products-spreadsheet-page.tsx</code><br/>
         <code>products/components/products-toolbar.tsx</code>
```

## Proof for user to run locally

```bash
npm ci --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

## Next PR prompt

```text
You are a senior full-stack engineer on SETU Flow CRM — Next.js 14 App Router, Supabase, TypeScript.
Repo zip attached. This PR is Pending proof follow-up for PR-QUICKFIXES visual/quote regressions.

Run local proof only after applying this zip:
1. npm ci --no-audit --no-fund
2. npm run typecheck
3. npm test
4. npm run build

Verify manually:
- Pipeline shows only one Buyers/Suppliers switcher from the AppShell/header area, not a nested duplicate.
- Pipeline filters match compact command-bar visual: search + Follow-up + Owner + Product + Market + chips.
- Kanban cards can drag/drop between visible columns and still respect move blockers.
- Quote preview Step 2 recalculates line total/subtotal/grand total when quantity or unit price changes.
- Quote preview Step 3 terms fields are editable, including currency.
- Trade show changes remain working.

Keep PR status Pending proof until all commands and manual checks are green.
```
