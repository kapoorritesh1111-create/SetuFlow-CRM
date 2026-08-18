const __v5AfterInit = afterInitPatch;
const __v5CoreReady = fetch('/clients/stark-v4-app-5-core.js',{cache:'no-store'})
  .then(r=>{if(!r.ok)throw new Error('Could not load pricing review core');return r.text()})
  .then(code=>(0,eval)(code));

function v6ReorderTabs(){
  const nav=document.querySelector('.tabs'); if(!nav)return;
  const find=txt=>[...nav.querySelectorAll('.tab')].find(b=>(b.querySelector('b')?.textContent||'').includes(txt));
  const order=[find('Service Families'),find('Product Variations'),find('Cost & Charge Masters'),find('Pricing Templates'),find('Quote Builder'),find('Questions')].filter(Boolean);
  order.forEach((b,i)=>{nav.appendChild(b);const n=b.querySelector('span');if(n)n.textContent=String(i+1)});
}
function v6Styles(){
  if(document.getElementById('recipeV6Style'))return;
  const s=document.createElement('style');s.id='recipeV6Style';s.textContent=`
  .recipeIntroV6{margin:0 0 14px;padding:14px;border:1px solid #b9d8c1;background:#eef9f1;border-radius:14px;font-size:9px;line-height:1.55;color:#315b3b}.recipeIntroV6 b{color:#174d2c}
  .recipeJourneyV6{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:8px;align-items:center;margin-top:10px}.recipeJourneyV6>div{padding:9px 10px;border:1px solid var(--line,#dce6ef);background:#fff;border-radius:10px}.recipeJourneyV6 strong{display:block;color:var(--navy,#0b2948);font-size:9px}.recipeJourneyV6 small{display:block;color:var(--muted,#66778a);font-size:7.5px;margin-top:2px}.recipeJourneyV6 i{font-style:normal;color:#90a5b7;font-weight:900}
  .recipeBuilderV6{margin-top:10px;border:1px solid var(--line,#dce6ef);border-radius:14px;overflow:hidden;background:#fff}.recipeBuilderHeadV6{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:11px 12px;background:#f7fafc;border-bottom:1px solid var(--line,#dce6ef)}.recipeBuilderHeadV6 h4{margin:0;font-size:11px;color:var(--navy,#0b2948)}.recipeBuilderHeadV6 p{margin:2px 0 0;font-size:7.5px;color:var(--muted,#66778a)}
  .recipeRowsV6{padding:0 10px}.recipeRowV6{display:grid;grid-template-columns:72px 1.2fr 1fr 1.25fr 82px 54px;gap:7px;align-items:center;padding:8px 0;border-bottom:1px solid #edf2f6;font-size:8px}.recipeRowV6.header{font-size:6.7px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted,#66778a);font-weight:900}.recipeRowV6 select{width:100%;padding:6px 7px;border:1px solid #cad7e2;border-radius:8px;background:#fff;font-size:8px}.recipeRowV6 .source{font-weight:900;color:#3b5e7a}.recipeRowV6 .rate{font-weight:900;text-align:right;color:var(--navy,#0b2948)}.recipeRowV6 .cost{text-align:right;color:var(--green,#117747);font-weight:900}
  .miniBtnV6{border:1px solid #cbd8e3;background:#fff;color:var(--navy,#0b2948);border-radius:8px;padding:6px 7px;font-size:7.5px;font-weight:900;cursor:pointer}.miniBtnV6.danger{color:#9a3027}.recipeAddV6{display:grid;grid-template-columns:1fr auto;gap:8px;padding:10px 12px;background:#fbfdff}.recipeAddV6 select{padding:7px 8px;border:1px solid #cad7e2;border-radius:8px;background:#fff;font-size:8px}
  .recipeGroupsV6{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}.recipeGroupV6{border:1px solid var(--line,#dce6ef);border-radius:12px;padding:10px;background:#fbfdff}.recipeGroupV6 h5{margin:0 0 6px;font-size:9px;color:var(--navy,#0b2948)}.recipeGroupV6 .line{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px dashed #e2e9ef;font-size:8px}.recipeGroupV6 .line:last-child{border-bottom:0}.recipeGroupV6 .line span{color:var(--muted,#66778a)}.recipeGroupV6 .line b{color:var(--navy,#0b2948);text-align:right}
  .calcV6{margin-top:10px;border:1px solid #bddfc5;background:#f3fbf5;border-radius:14px;padding:11px}.calcV6 h4{margin:0 0 7px;color:#18572f;font-size:10px}.calcGridV6{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.calcCellV6{padding:8px;background:#fff;border:1px solid #d4e8d8;border-radius:9px}.calcCellV6 span{display:block;font-size:7px;color:#667b6d}.calcCellV6 b{display:block;font-size:10px;color:#164c2b;margin-top:2px}.calcFormulaV6{margin-top:8px;padding:8px 10px;border-radius:9px;background:#e7f6eb;color:#225c34;font-size:8px;line-height:1.5}
  .sourceEditV6{display:flex;justify-content:space-between;gap:8px;align-items:center;margin:9px 0 0;padding:8px 10px;border:1px dashed #a9bdce;border-radius:10px;background:#f8fbfd;font-size:8px;color:#526a7e}.sourceEditV6 b{color:var(--navy,#0b2948)}
  @media(max-width:1000px){.recipeRowV6{grid-template-columns:1fr 1fr}.recipeRowV6.header{display:none}.recipeGroupsV6,.calcGridV6{grid-template-columns:1fr 1fr}.recipeJourneyV6{grid-template-columns:1fr}.recipeJourneyV6 i{display:none}}
  @media(max-width:650px){.recipeRowV6,.recipeGroupsV6,.calcGridV6,.recipeAddV6{grid-template-columns:1fr}.recipeBuilderHeadV6{align-items:flex-start;flex-direction:column}}
  `;document.head.appendChild(s);
}
function v6MasterMaterialOptions(selected){
  return ['bopp','met','pet','clear','pe'].map(k=>`<option value="${k}" ${k===selected?'selected':''}>${COGS_NAMES[k]} · ${itemMic(k)}µ</option>`).join('');
}
function v6MaterialDetail(prod,finishKey){
  const r=supBase(prod,+$('supTestQty').value,finishKey,$('supTestPrint').value);if(!r.ok)return[];const lines=[];
  for(const k of FIN[finishKey].layers){
    if(k==='pe'){
      const mic=V('peMic')??75,den=V('peDen')??.925,rate=V('peRate')??0,gsm=mic*den,usage=gsm*r.pw*(prod.w*r.ppf)/1e6,cost=usage*rate/1000;
      lines.push({k,name:COGS_NAMES.pe,spec:`${mic}µ · density ${den}`,rule:'GSM × PE stock web × frame length',rate:`${money(rate)}/kg`,cost});continue;
    }
    const d=mat(k),web=(k==='met'||k==='clear')?r.iw:(V('outerWeb')??760),usage=d.mic*d.den*web*(prod.w*r.ppf)/1e6,cost=usage*(d.rate||0)/1000;
    lines.push({k,name:COGS_NAMES[k],spec:`${d.mic}µ · density ${d.den}`,rule:`GSM × ${web}mm web × frame length`,rate:`${money(d.rate)}/kg`,cost});
  }
  const bonds=Math.max(0,FIN[finishKey].layers.length-1),adhGsm=V('adhGsm')??1.5,adhRate=V('adhRate')??350,adhUsage=bonds*adhGsm*r.pw*(prod.w*r.ppf)/1e6;
  lines.push({k:'adh',name:COGS_NAMES.adh,spec:`${adhGsm} GSM/bond · ${bonds} bond${bonds===1?'':'s'}`,rule:'Bond GSM × PE web × frame length',rate:`${money(adhRate)}/kg`,cost:adhUsage*adhRate/1000,derived:true});
  return lines;
}
function v6GoMasters(){
  const tab=[...document.querySelectorAll('.tab')].find(b=>(b.querySelector('b')?.textContent||'').includes('Cost & Charge Masters'));if(tab)tab.click();const c=document.querySelector('[data-master-patch="cogs"]');if(c)c.click();
}
function v6RenderRecipe(){
  const host=$('recipePatch');if(!host||!$('supTestFinish'))return;
  const finishKey=$('supTestFinish').value,prod=p($('supTestProduct').value),qty=+$('supTestQty').value,print=$('supTestPrint').value,r=supCalc(prod,qty,finishKey,print,new Set(['zipper']));
  if(!r.ok){host.innerHTML=`<div class="notice error">${r.error}</div>`;return}
  const details=v6MaterialDetail(prod,finishKey);
  const materialRows=details.map((d,i)=>d.derived
    ?`<div class="recipeRowV6"><span class="source">COGS Master</span><b>${d.name}</b><span>${d.spec}</span><span>${d.rule}</span><span class="rate">${d.rate}</span><span class="cost">${money(d.cost)}</span></div>`
    :`<div class="recipeRowV6"><span class="source">COGS Master</span><select data-v6-layer="${i}">${v6MasterMaterialOptions(d.k)}</select><span>${d.spec}</span><span>${d.rule}</span><span class="rate">${d.rate}</span><button class="miniBtnV6 danger" data-v6-remove="${i}">Remove</button></div>`).join('');
  const zipper=extras.find(e=>e.id==='zipper'),pre=r.rmc+r.process+r.productionFrame,sellFrame=r.baseSell*r.ppf;
  host.innerHTML=`<div class="recipeBuilderV6"><div class="recipeBuilderHeadV6"><div><h4>${FIN[finishKey].label} · SUP Recipe</h4><p>The recipe references Master items. Rates stay in the Masters; the recipe defines which items are used and how they are consumed.</p></div><button class="miniBtnV6" id="v6EditMaster">Edit source Masters</button></div><div class="recipeRowsV6"><div class="recipeRowV6 header"><span>Source</span><span>Master item</span><span>Master spec</span><span>Recipe usage rule</span><span>Master rate</span><span>Action / cost</span></div>${materialRows}</div><div class="recipeAddV6"><select id="v6AddMaterial">${v6MasterMaterialOptions('pet')}</select><button class="miniBtnV6" id="v6AddMaterialBtn">+ Add material from COGS Master</button></div></div>
  <div class="recipeGroupsV6"><div class="recipeGroupV6"><h5>Process recipe · from COGS Master</h5><div class="line"><span>${print}</span><b>${money(r.printRate)} / frame</b></div><div class="line"><span>Lamination</span><b>${money(V('lam')??5)} / running m → ${money(r.lam)}/frame</b></div><div class="line"><span>Slitting</span><b>${money(V('slit')??2)} / running m → ${money(r.slit)}/frame</b></div><div class="line"><span>Pouching</span><b>${money(V('pouching')??8)} / running m → ${money(r.pouching)}/frame</b></div></div><div class="recipeGroupV6"><h5>Commercial + linked charge rules</h5><div class="line"><span>Production extra · Zipper</span><b>${zipper?.rate!=null?money(zipper.rate)+' / running m':'Rate needed'} → ${money(r.productionFrame)}/frame</b></div><div class="line"><span>Run-length wastage</span><b>${r.b.w}% → ${money(r.waste)}/frame</b></div><div class="line"><span>Margin rule</span><b>${money(r.b.m)} / frame</b></div><div class="line"><span>Pre-production / Post-production</span><b>Linked to quote · separate by default</b></div></div></div>
  <div class="calcV6"><h4>Live calculation from this recipe</h4><div class="calcGridV6"><div class="calcCellV6"><span>Geometry</span><b>${r.across} × ${r.along} = ${r.ppf} / frame</b></div><div class="calcCellV6"><span>Material COGS</span><b>${money(r.rmc)} / frame</b></div><div class="calcCellV6"><span>Process COGS</span><b>${money(r.process)} / frame</b></div><div class="calcCellV6"><span>Production extras</span><b>${money(r.productionFrame)} / frame</b></div><div class="calcCellV6"><span>Before commercial</span><b>${money(pre)} / frame</b></div><div class="calcCellV6"><span>Waste + margin</span><b>${money(r.waste)} + ${money(r.b.m)}</b></div><div class="calcCellV6"><span>Sell / frame</span><b>${money(sellFrame)}</b></div><div class="calcCellV6"><span>Final price / pouch</span><b>${money(r.baseSell)}</b></div></div><div class="calcFormulaV6"><b>Calculation:</b> (${money(r.rmc)} materials + ${money(r.process)} processes + ${money(r.productionFrame)} production extras) + ${r.b.w}% wastage (${money(r.waste)}) + ${money(r.b.m)} margin = ${money(sellFrame)}/frame ÷ ${r.ppf} pouches/frame = <b>${money(r.baseSell)}/pouch</b>. Order ${qty.toLocaleString('en-IN')} pcs = <b>${money(r.baseSell*qty)}</b> before separate pre/post charges and GST.</div></div>
  <div class="sourceEditV6"><span><b>Where do I change a value?</b> Micron, density, material/process rate, extra rate, pre-production and post-production names/rates are changed in Step 3. This Pricing Template only chooses the Master item and its consumption/calculation rule.</span><button class="miniBtnV6" id="v6EditMaster2">Open Cost & Charge Masters</button></div>`;
  document.querySelectorAll('[data-v6-layer]').forEach((sel,idx)=>sel.onchange=()=>{FIN[finishKey].layers[idx]=sel.value;refresh()});
  document.querySelectorAll('[data-v6-remove]').forEach(btn=>btn.onclick=()=>{const idx=+btn.dataset.v6Remove;if(FIN[finishKey].layers.length<=1)return;FIN[finishKey].layers.splice(idx,1);refresh()});
  if($('v6AddMaterialBtn'))$('v6AddMaterialBtn').onclick=()=>{const k=$('v6AddMaterial').value;if(!FIN[finishKey].layers.includes(k))FIN[finishKey].layers.push(k);refresh()};
  if($('v6EditMaster'))$('v6EditMaster').onclick=v6GoMasters;if($('v6EditMaster2'))$('v6EditMaster2').onclick=v6GoMasters;
}
function v6EnhanceTemplateIntro(){
  const view=$('view-templates');if(!view||$('recipeIntroV6'))return;const body=view.querySelector('.cardBody');if(!body)return;
  body.insertAdjacentHTML('afterbegin',`<div class="recipeIntroV6" id="recipeIntroV6"><b>Pricing Template = Recipe, not another rate master.</b> First create COGS, Extras, Pre-production and Post-production items in Step 3. Then the Pricing Template references those Master items and defines the consumption/calculation sequence for the selected Service Family.<div class="recipeJourneyV6"><div><strong>Step 3 · Masters</strong><small>Create names, micron/GSM, density, rate and charging basis.</small></div><i>→</i><div><strong>Step 4 · Recipe</strong><small>Select which Master items apply and define how each is consumed.</small></div><i>→</i><div><strong>Step 5 · Quote</strong><small>Sales chooses approved options; SETU Flow executes the recipe and shows selling price.</small></div></div></div>`);
}
function v6AfterCore(){
  __v5AfterInit();v6Styles();v6ReorderTabs();v6EnhanceTemplateIntro();
  const oldRender=renderSupTemplate;renderSupTemplate=function(){oldRender();v6RenderRecipe()};
  v6RenderRecipe();
}
afterInitPatch=function(){
  __v5CoreReady.then(v6AfterCore).catch(e=>{document.body.innerHTML='<div style="max-width:760px;margin:60px auto;padding:24px;border:1px solid #efbfbb;border-radius:16px;font:14px system-ui;color:#8a2b23"><b>Pricing review could not load.</b><br>'+String(e.message||e)+'</div>'});
};
