(()=>{'use strict';
const SOURCE='/pricing-v5-review-premium.js?v=20260914-1301';
const replacement=`function renderFamilyDetail(key){
  const el=$('#familyDetail');
  if(!el)return;
  if(key==='sup'){
    el.innerHTML='<div class="panel-title"><h3>Family Review Details — Stand Up Pouches</h3><span class="pill amber">Review Now</span></div><div class="panel-body layout-3"><div><h4>Family Overview</h4><div class="driver-list"><div class="driver"><b>Sizes</b><span>20 approved</span></div><div class="driver"><b>Constructions</b><span>44 approved</span></div><div class="driver"><b>Current Pricing</b><span>Pricing v5 formula engine</span></div></div></div><div><h4>Open Items</h4><div class="notice warn">Confirm 160×240 vs 160×230 and any invalid size × construction combinations.</div></div><div><h4>Actions</h4><button class="btn success" onclick="window.PV5.business(\'family_sup\',true)">Approve Baseline</button> <button class="btn warn">Needs Change</button><button class="btn" style="display:block;margin-top:8px" onclick="window.PV5.go(\'matrix\')">Open Family Pricing</button><button class="btn" style="display:block;margin-top:8px" onclick="window.PV5.go(\'sizes\')">View KLD Samples (20/20)</button></div></div>';
    return;
  }
  const f=state.families?.families?.[key];
  if(!f){el.innerHTML='<div class="panel-body">No review data.</div>';return;}
  const t=f.template;
  let baseline='';
  let actions='';
  let rows='';
  if(t){
    baseline='<div class="driver-list"><div class="driver"><b>Template</b><span>'+safe(t.name)+'</span></div><div class="driver"><b>Rows</b><span>'+t.row_count+'</span></div><div class="driver"><b>Engine</b><span>'+safe(t.engine||'matrix')+'</span></div></div>';
    actions='<button class="btn success" onclick="window.PV5.business(\'family_'+key+'\',true)">Approve Current Baseline</button> <button class="btn warn" onclick="window.PV5.business(\'family_'+key+'\',false)">Needs Change</button>';
    const headers=(t.quantities||[]).map(q=>'<th>'+(q?Number(q).toLocaleString():'—')+'</th>').join('');
    const body=(t.rows||[]).slice(0,20).map(r=>'<tr><td>'+r.width_mm+' × '+r.height_mm+'</td><td>'+safe(r.construction_key||'—')+'</td>'+(r.rates||[]).map(x=>'<td>'+money(x)+'</td>').join('')+'</tr>').join('');
    rows='<div class="section"><h4>Current Pricing Rows</h4><div class="table-wrap"><table class="table"><tr><th>Size</th><th>Construction</th>'+headers+'</tr>'+body+'</table></div></div>';
  }else{
    baseline='<div class="notice block">No published Stark pricing template exists for this family.</div>';
    actions='<button class="btn primary" onclick="window.PV5.clarify(\''+key+'\',\''+safe(f.name)+' setup\')">Provide Required Data</button>';
  }
  el.innerHTML='<div class="panel-title"><h3>Family Review Details — '+safe(f.name)+'</h3><span class="pill '+(f.state==='published_baseline'?'blue':'red')+'">'+safe(f.state)+'</span></div><div class="panel-body"><div class="layout-3"><div><h4>Current Baseline</h4>'+baseline+'</div><div><h4>Clarification Needed</h4><div class="notice warn">'+safe(f.clarification||'Confirm family geometry and pricing rules.')+'</div></div><div><h4>Actions</h4>'+actions+'</div></div>'+rows+'</div>';
}`;
async function boot(){
  try{
    const res=await fetch(SOURCE,{cache:'no-store'});
    if(!res.ok)throw new Error('Unable to load premium review script ('+res.status+')');
    let code=await res.text();
    const pattern=/function renderFamilyDetail\(key\)\{[\s\S]*?\nfunction kld\(/;
    if(!pattern.test(code))throw new Error('Premium review patch target not found');
    code=code.replace(pattern,replacement+'\nfunction kld(');
    new Function(code+'\n//# sourceURL=pricing-v5-review-premium-patched.js')();
  }catch(err){
    const p=document.getElementById('page');
    if(p)p.innerHTML='<div class="notice block"><b>Review failed to start.</b><br>'+String(err&&err.message?err.message:err)+'</div>';
    console.error('[pricing-v5-premium-loader]',err);
  }
}
boot();
})();
