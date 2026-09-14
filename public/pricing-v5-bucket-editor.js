(()=>{
'use strict';
const STORAGE='setu_pricing_v5_bucket_review_v1';
const FEEDBACK='/api/public/pricing-v5-feedback';
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

function read(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(_){return{}}}
function write(v){try{localStorage.setItem(STORAGE,JSON.stringify(v))}catch(_){}}
function pageName(){return q('#page .page-head h2')?.textContent?.trim()||''}
function modal(title,html){const m=q('#modal'),b=q('#modalBody');if(!m||!b)return;b.innerHTML='<div class="modal-head"><h3>'+esc(title)+'</h3><button class="btn outline" id="bucketClose">✕ Close</button></div>'+html;m.classList.add('open');m.style.display='flex';q('#bucketClose')?.addEventListener('click',close)}
function close(){const m=q('#modal');if(m){m.classList.remove('open');m.style.display='none'}}
function num(v){const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null}
function money(v){const n=num(v);return n==null?'₹0':'₹'+n.toLocaleString('en-IN',{maximumFractionDigits:2})}
function pct(v){const n=num(v);return n==null?'0.0%':n.toFixed(1)+'%'}
async function feedback(step,text,status='Review note'){
 try{await fetch(FEEDBACK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewer_name:'Stark Packmate Owner',review_mode:'admin',step_key:step,rating:status==='Needs Change'?2:3,priority:status==='Needs Change'?'important':'normal',feedback:text,page_path:location.pathname})})}catch(_){ }
}
function rowData(btn){
 const tr=btn.closest('tr');if(!tr)return null;
 const tds=qa('td',tr);if(tds.length<5)return null;
 return {tr,tds,key:tds[0].textContent.trim(),waste:num(tds[1].textContent),margin:num(tds[2].textContent),frame:num(tds[3].textContent),notes:tds[4].textContent.trim()};
}
function currentFor(row){const all=read();return all[row.key]||{waste:row.waste,margin:row.margin,frame:row.frame,notes:row.notes}}
function applyRow(row,vals){
 row.tds[1].innerHTML='<b>'+pct(vals.waste)+'</b><small class="bucket-proposed">Proposed</small>';
 row.tds[2].innerHTML='<b>'+pct(vals.margin)+'</b><small class="bucket-proposed">Proposed</small>';
 row.tds[3].innerHTML='<b>'+money(vals.frame)+'</b><small class="bucket-proposed">Proposed</small>';
 row.tds[4].innerHTML=esc(vals.notes||'')+'<small class="bucket-proposed">Owner edit pending approval</small>';
 row.tr.dataset.bucketProposed='1';
}
function clearRow(row){location.reload()}
function editBucket(btn){
 const row=rowData(btn);if(!row)return;
 const v=currentFor(row);
 modal('Edit Quantity Bucket — '+row.key,
 '<div class="notice info"><b>Owner review edit.</b> Changes saved here are proposed Pricing v5 values only. They do not change live production pricing until the owner review is completed and the approved configuration is promoted.</div>'+ 
 '<div class="card" style="padding:16px;margin-top:12px"><div class="owner-qgrid">'+
 '<label class="field"><span>Waste %</span><input id="bucketWaste" type="number" min="0" max="100" step="0.1" value="'+esc(v.waste)+'"></label>'+ 
 '<label class="field"><span>Margin %</span><input id="bucketMargin" type="number" min="0" max="100" step="0.1" value="'+esc(v.margin)+'"></label>'+ 
 '<label class="field"><span>Frame Charge (₹)</span><input id="bucketFrame" type="number" min="0" step="1" value="'+esc(v.frame)+'"></label>'+ 
 '<label class="field"><span>Notes</span><input id="bucketNotes" value="'+esc(v.notes||'')+'" placeholder="Commercial rule note"></label>'+ 
 '</div><div class="row wrap" style="margin-top:14px;gap:8px"><button class="btn primary" id="bucketSave">Save Proposed Change</button><button class="btn outline" id="bucketReset">Reset to Current</button></div><div id="bucketMsg" style="margin-top:10px"></div></div>');
 q('#bucketSave')?.addEventListener('click',async()=>{
   const waste=num(q('#bucketWaste')?.value),margin=num(q('#bucketMargin')?.value),frame=num(q('#bucketFrame')?.value),notes=q('#bucketNotes')?.value?.trim()||'';
   if(waste==null||margin==null||frame==null||waste<0||margin<0||frame<0||waste>100||margin>100){q('#bucketMsg').innerHTML='<span class="pill red">Enter valid Waste %, Margin %, and Frame Charge values.</span>';return}
   const all=read();all[row.key]={waste,margin,frame,notes,updatedAt:new Date().toISOString()};write(all);applyRow(row,all[row.key]);
   await feedback('commercial-bucket-'+row.key.replace(/[^0-9a-z]+/gi,'-').toLowerCase(),'Owner proposed '+row.key+': waste '+waste+'%, margin '+margin+'%, frame charge ₹'+frame+(notes?' — '+notes:''),'Needs Change');
   q('#bucketMsg').innerHTML='<span class="pill green">Proposed change saved for owner review</span>';
 });
 q('#bucketReset')?.addEventListener('click',async()=>{
   const all=read();delete all[row.key];write(all);await feedback('commercial-bucket-'+row.key.replace(/[^0-9a-z]+/gi,'-').toLowerCase(),'Owner reset proposed changes for '+row.key+'.','Review note');close();clearRow(row);
 });
}
function editAllBuckets(){
 const rows=qa('#page table tbody tr').map(tr=>{const b=qa('button',tr).find(x=>/^Edit$/i.test((x.textContent||'').trim()));return b?rowData(b):null}).filter(Boolean);
 if(!rows.length)return;
 const saved=read();
 modal('Edit Quantity Buckets','<div class="notice info"><b>Commercial bucket review.</b> Select a bucket below to edit its Waste %, Margin %, Frame Charge and Notes. Saved values remain proposed until approval.</div><div class="card" style="padding:0;margin-top:12px"><div class="table-wrap"><table class="table"><thead><tr><th>Quantity Range</th><th>Waste</th><th>Margin</th><th>Frame Charge</th><th>Review State</th><th></th></tr></thead><tbody>'+rows.map((r,i)=>{const v=saved[r.key]||r;return '<tr><td><b>'+esc(r.key)+'</b></td><td>'+pct(v.waste)+'</td><td>'+pct(v.margin)+'</td><td>'+money(v.frame)+'</td><td>'+(saved[r.key]?'<span class="status"><span class="dot amber"></span>Proposed Change</span>':'<span class="status"><span class="dot gray"></span>Current</span>')+'</td><td><button class="btn tiny" data-bucket-index="'+i+'">Edit</button></td></tr>'}).join('')+'</tbody></table></div></div>');
 qa('[data-bucket-index]').forEach(b=>b.addEventListener('click',()=>editBucket(qa('#page table tbody tr').map(tr=>qa('button',tr).find(x=>/^Edit$/i.test((x.textContent||'').trim()))).filter(Boolean)[Number(b.dataset.bucketIndex)])));
}
function applySaved(){
 if(!/Waste\s*&\s*Margins/i.test(pageName()))return;
 const all=read();
 qa('#page table tbody tr').forEach(tr=>{const b=qa('button',tr).find(x=>/^Edit$/i.test((x.textContent||'').trim()));if(!b)return;const row=rowData(b);if(row&&all[row.key]&&!tr.dataset.bucketProposed)applyRow(row,all[row.key])});
}
function handle(e){
 if(!/Waste\s*&\s*Margins/i.test(pageName()))return;
 const b=e.target.closest('button');if(!b||b.closest('#modal'))return;
 const t=(b.textContent||'').trim();
 if(/^Edit$/i.test(t)&&b.closest('tr')){e.preventDefault();e.stopImmediatePropagation();editBucket(b);return}
 if(/^Edit Buckets$/i.test(t)){e.preventDefault();e.stopImmediatePropagation();editAllBuckets();return}
}
function style(){if(q('#bucket-editor-style'))return;const s=document.createElement('style');s.id='bucket-editor-style';s.textContent='.bucket-proposed{display:block;color:#b26b00;font-size:10px;margin-top:2px;font-weight:700}.owner-qgrid{display:grid;grid-template-columns:1fr 1fr;gap:12px}.owner-qgrid .field input{width:100%;box-sizing:border-box;border:1px solid #c8d8e8;border-radius:8px;padding:10px;background:#fff}@media(max-width:800px){.owner-qgrid{grid-template-columns:1fr}}';document.head.appendChild(s)}
document.addEventListener('click',handle,true);
new MutationObserver(()=>{style();applySaved()}).observe(document.documentElement,{subtree:true,childList:true});
setTimeout(()=>{style();applySaved()},250);
window.PV5BucketEditor={editBucket,editAllBuckets,applySaved};
})();