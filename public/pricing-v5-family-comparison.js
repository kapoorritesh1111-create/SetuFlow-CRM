(()=>{
'use strict';
const API='/api/public/pricing-v5-frame-family-review';
const FEEDBACK='/api/public/pricing-v5-feedback';
const STORAGE='setu_pricing_v5_family_comparison_v1';
let metadata=null;
let inserted=false;
const $=(s,r=document)=>r.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toFixed(2):'—';
function saved(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(_){return{}}}
function save(v){try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch(_){}}
function pageIsFamilies(){const h=$('#page h2');return !!h&&/Packaging Families/i.test(h.textContent||'')}
function style(){if($('#pv5FamilyCompareStyle'))return;const s=document.createElement('style');s.id='pv5FamilyCompareStyle';s.textContent=`
#pv5FamilyCompare{margin-top:18px}.pv5fc-grid{display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:12px}.pv5fc-results{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-top:14px}.pv5fc-card{border:1px solid #dbe7f5;border-radius:14px;padding:16px;background:#fff}.pv5fc-card h4{margin:0 0 8px;font-size:14px}.pv5fc-card strong{font-size:24px;color:#0b2f63}.pv5fc-delta.up strong{color:#c0392b}.pv5fc-delta.down strong{color:#07895c}.pv5fc-breakdown{margin-top:14px;border-top:1px solid #e7eef7;padding-top:12px;display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.pv5fc-breakdown div{background:#f8fbff;border:1px solid #e1ebf7;border-radius:10px;padding:10px}.pv5fc-breakdown small{display:block;color:#55708f}.pv5fc-breakdown b{display:block;margin-top:4px}.pv5fc-warning{margin-top:12px;padding:11px 13px;border-radius:10px;background:#fff8e8;border:1px solid #f4d68d;color:#7b5500}.pv5fc-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.pv5fc-note{margin-top:10px;width:100%;min-height:70px;border:1px solid #cddced;border-radius:10px;padding:10px}.pv5fc-status{font-weight:700;margin-left:8px}.pv5fc-table{width:100%;border-collapse:collapse;margin-top:12px}.pv5fc-table th,.pv5fc-table td{padding:9px 10px;border-bottom:1px solid #e5edf7;text-align:left}.pv5fc-table th{background:#f6f9fd;font-size:12px}.pv5fc-loading{padding:18px;color:#55708f}.pv5fc-error{padding:12px;background:#fff0f0;border:1px solid #efb1b1;border-radius:10px;color:#a52828;margin-top:12px}@media(max-width:1100px){.pv5fc-grid{grid-template-columns:1fr 1fr}.pv5fc-results{grid-template-columns:1fr}.pv5fc-breakdown{grid-template-columns:1fr 1fr}}
`;document.head.appendChild(s)}
async function feedback(step,text,status){try{await fetch(FEEDBACK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewer_name:'Stark Packmate Owner',review_mode:'admin',step_key:step,rating:status==='Approved'?5:2,priority:status==='Approved'?'normal':'important',feedback:text,page_path:location.pathname})})}catch(_){}}
function familyOptions(){return (metadata?.families||[]).filter(f=>f.available).map(f=>'<option value="'+esc(f.template_slug)+'">'+esc(f.label)+'</option>').join('')}
function currentFamily(){const slug=$('#pv5fcFamily')?.value;return (metadata?.families||[]).find(f=>f.template_slug===slug)||null}
function constructionOptions(f){return (f?.constructions||[]).map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('')}
function sizeOptions(f){return (f?.sizes||[]).map(s=>'<option value="'+s.width_mm+'x'+s.height_mm+'">'+s.width_mm+' × '+s.height_mm+' mm</option>').join('')}
function renderShell(){const page=$('#page');if(!page||$('#pv5FamilyCompare'))return;style();const wrap=document.createElement('section');wrap.id='pv5FamilyCompare';wrap.className='card section';wrap.innerHTML=`
<div class="panel-title"><div><h3>v4 Baseline vs Pricing v5 — Family Migration Review</h3><span>Compare the current workbook baseline with the new RMC + process + run-length Pricing v5 calculation before approving migration.</span></div><span class="pill amber">Review Only</span></div>
<div class="notice warn"><b>No migration is approved by default.</b> The v4 matrix remains the production baseline. Use this workspace to review each family, construction and size, then approve or request changes.</div>
<div class="pv5fc-grid" style="margin-top:14px">
<label class="field"><span>Service Family</span><select id="pv5fcFamily">${familyOptions()}</select></label>
<label class="field"><span>Construction</span><select id="pv5fcConstruction"></select></label>
<label class="field"><span>Size</span><select id="pv5fcSize"></select></label>
<label class="field"><span>Quantity (pcs)</span><input id="pv5fcQty" type="number" min="1" value="5000"></label>
<label class="field"><span>Commercial Bucket</span><select id="pv5fcBucket"><option value="">Select — owner confirmation required</option><option value="1">Bucket 1</option><option value="2">Bucket 2</option><option value="3">Bucket 3</option><option value="4">Bucket 4</option><option value="5">Bucket 5</option></select></label>
</div>
<div class="pv5fc-actions"><button class="btn primary" id="pv5fcCompare">Run v4 vs v5 Comparison</button><button class="btn outline" id="pv5fcQuestion">Need Clarification on Bucket / Geometry</button><span id="pv5fcStatus" class="pv5fc-status"></span></div>
<div id="pv5fcResult"></div>`;
page.appendChild(wrap);bind();refreshFamilyFields();restoreDecision();inserted=true}
function refreshFamilyFields(){const f=currentFamily();const c=$('#pv5fcConstruction'),s=$('#pv5fcSize');if(c)c.innerHTML=constructionOptions(f);if(s)s.innerHTML=sizeOptions(f)}
function restoreDecision(){const f=currentFamily();const x=saved()[f?.template_slug||''];const st=$('#pv5fcStatus');if(st&&x)st.textContent=x.status==='Approved'?'✓ Family comparison approved':'● Needs Change saved'}
function bind(){
 $('#pv5fcFamily').onchange=()=>{refreshFamilyFields();$('#pv5fcResult').innerHTML='';restoreDecision()};
 $('#pv5fcCompare').onclick=run;
 $('#pv5fcQuestion').onclick=()=>{window.PV5PremiumInteractions?.goClarification?.(5);};
}
async function run(){const f=currentFamily();const size=String($('#pv5fcSize')?.value||'').split('x').map(Number);const construction=$('#pv5fcConstruction')?.value;const qty=Number($('#pv5fcQty')?.value||0);const bucket=$('#pv5fcBucket')?.value;const out=$('#pv5fcResult');if(!f||!construction||!size[0]||!size[1]||!qty){out.innerHTML='<div class="pv5fc-error">Select family, construction, size and quantity.</div>';return}if(!bucket){out.innerHTML='<div class="pv5fc-error">Commercial bucket is intentionally not assumed. Select the proposed bucket for this review, or use the clarification button so Akshay can confirm the mapping.</div>';return}out.innerHTML='<div class="pv5fc-loading">Calculating v5 and matching the v4 workbook baseline…</div>';
 try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_slug:f.template_slug,width_mm:size[0],height_mm:size[1],construction_id:construction,quantity:qty,commercial_bucket:Number(bucket),print:'CMYK'})});const b=await r.json();if(!r.ok||b.ok===false)throw new Error(b.error||'Comparison unavailable');renderResult(b)}catch(e){out.innerHTML='<div class="pv5fc-error">'+esc(e.message||e)+'</div>'}}
function renderResult(b){const c=b.comparison||{},r=b.result||{},cb=r.cost_breakdown||{};const delta=Number(c.difference_per_unit),pct=Number(c.difference_pct);const dir=Number.isFinite(delta)&&delta<0?'down':'up';const warnings=(r.validation_errors||[]).concat(r.warnings||[]);$('#pv5fcResult').innerHTML=`
<div class="pv5fc-results">
<div class="pv5fc-card"><h4>v4 Workbook Baseline</h4><strong>${money(c.v4_unit_price)}</strong><p>per piece</p><small>${c.baseline_frames||'—'} frame tier · ${c.baseline_piece_quantity?Number(c.baseline_piece_quantity).toLocaleString():'—'} pcs equivalent</small></div>
<div class="pv5fc-card"><h4>Pricing v5 Calculated</h4><strong>${money(c.v5_unit_price)}</strong><p>per piece</p><small>RMC + process + run length + waste + margin</small></div>
<div class="pv5fc-card pv5fc-delta ${dir}"><h4>Difference</h4><strong>${Number.isFinite(delta)?(delta>=0?'+':'')+money(delta).replace('₹','₹'):'—'}</strong><p>${Number.isFinite(pct)?(pct>=0?'+':'')+pct.toFixed(2)+'%':'—'}</p><small>v5 compared with nearest approved v4 frame tier</small></div>
</div>
<div class="pv5fc-breakdown">
<div><small>Material / frame</small><b>${money(cb.material_per_frame)}</b></div><div><small>Adhesive / frame</small><b>${money(cb.adhesive_per_frame)}</b></div><div><small>Process / frame</small><b>${money(cb.process_per_frame)}</b></div><div><small>Waste / frame</small><b>${money(cb.wastage_per_frame)}</b></div><div><small>Margin / frame</small><b>${money(cb.margin_per_frame)}</b></div>
</div>
<table class="pv5fc-table"><thead><tr><th>Family</th><th>Construction</th><th>Size</th><th>Qty</th><th>Units / Frame</th><th>Run Length</th><th>Bucket</th><th>Waste</th><th>Margin / Frame</th></tr></thead><tbody><tr><td>${esc(c.family_label)}</td><td>${esc(c.construction?.name||'—')}</td><td>${c.size?.width_mm||'—'} × ${c.size?.height_mm||'—'}</td><td>${Number(c.quantity||0).toLocaleString()}</td><td>${r.geometry?.units_per_frame||'—'}</td><td>${Number(r.run_length_m||0).toFixed(2)} m</td><td>${r.commercial_bucket||'—'}</td><td>${r.wastage_pct==null?'—':r.wastage_pct+'%'}</td><td>${money(r.margin_per_frame)}</td></tr></tbody></table>
${warnings.length?'<div class="pv5fc-warning"><b>Review notes:</b><br>'+warnings.map(esc).join('<br>')+'</div>':''}
<textarea id="pv5fcOwnerNote" class="pv5fc-note" placeholder="Owner comment — explain approval or what needs to change"></textarea>
<div class="pv5fc-actions"><button class="btn success" id="pv5fcApprove">Approve This Family Comparison</button><button class="btn danger" id="pv5fcChange">Needs Change</button><button class="btn outline" id="pv5fcClarify">Ask / Review Clarification</button></div>`;
 $('#pv5fcApprove').onclick=()=>decision('Approved',c);$('#pv5fcChange').onclick=()=>decision('Needs Change',c);$('#pv5fcClarify').onclick=()=>window.PV5PremiumInteractions?.goClarification?.(5)}
async function decision(status,c){const note=String($('#pv5fcOwnerNote')?.value||'').trim();if(status==='Needs Change'&&!note){alert('Please explain what needs to change.');return}const f=currentFamily();const all=saved();all[f.template_slug]={status,note,at:new Date().toISOString(),comparison:c};save(all);await feedback('family-migration-'+f.template_slug,`${f.label}: ${status}. ${note||'Owner reviewed v4 baseline against Pricing v5 calculation.'}`,status);$('#pv5fcStatus').textContent=status==='Approved'?'✓ Family comparison approved':'● Needs Change saved'}
async function init(){try{const r=await fetch(API,{cache:'no-store'});const b=await r.json();if(!r.ok||b.ok===false)throw new Error(b.error||'Unable to load family comparison data');metadata=b}catch(e){metadata={families:[]};console.error('[family-comparison]',e)}observe()}
function observe(){const tick=()=>{if(pageIsFamilies()){if(!$('#pv5FamilyCompare')&&metadata?.families?.length)renderShell()}else inserted=false};new MutationObserver(tick).observe(document.documentElement,{subtree:true,childList:true});setInterval(tick,800);tick()}
init();
})();