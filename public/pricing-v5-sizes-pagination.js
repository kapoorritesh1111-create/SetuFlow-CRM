(()=>{
'use strict';
const API='/api/public/pricing-v5-review-preview';
let catalog=null;
let pageNo=1;
const PAGE_SIZE=10;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function isSizes(){return /Sizes\s*&\s*KLDs/i.test(q('#page .page-head h2')?.textContent||'')}
function findTable(){return qa('#page table').find(t=>/Size \(mm\)/i.test(t.querySelector('thead')?.textContent||'')&&/Review Sample KLD/i.test(t.querySelector('thead')?.textContent||''))||null}
function sizeLabel(s){return `${Number(s.width_mm||0)} × ${Number(s.height_mm||0)}`}
function gusset(s){const g=Number(s.bottom_gusset_each_mm??s.bottom_gusset_mm??0);return g>0?`${g} mm`:'—'}
function pricingGroup(s){return s.pricing_group||s.pricing_group_name||s.price_group||'Review Required'}
function route(s){return s.route||s.production_route||'Standard'}
function bottomRule(s){const g=Number(s.bottom_gusset_each_mm??s.bottom_gusset_mm??0);return g>0?'Gusset = 40% W':'—'}
function kldReview(s){const w=Number(s.width_mm||0),h=Number(s.height_mm||0);return `<a href="/kld/pricing-v5/sup/${w}x${h}-bg-${Number(s.bottom_gusset_each_mm||0)}-${Number(s.bottom_gusset_each_mm||0)}.svg" target="_blank">▧ SUP-${w}x${h}-R1.svg</a>`}
function productionKld(s){return s.production_kld_url?`<a href="${esc(s.production_kld_url)}" target="_blank">▧ Production KLD</a>`:'—'}
function reviewKey(s){return `size:${s.id||sizeLabel(s)}`}
function decisionFor(s){try{const state=window.PV5DbReview?.state?.();const item=state?.items?.find?.(x=>x.item_key===reviewKey(s));return item?.decision||''}catch(_){return''}}
function statusFor(s){const d=decisionFor(s);if(d==='approved')return['Owner Approved','green'];if(d==='needs_change')return['Needs Change','amber'];return['Review Required','gray']}
function rowHtml(s){const st=statusFor(s);const w=Number(s.width_mm||0),h=Number(s.height_mm||0);return `<tr data-size-id="${esc(s.id||'')}"><td><input type="checkbox"></td><td><b>${w} × ${h}</b></td><td>${gusset(s)}</td><td>${esc(pricingGroup(s))}</td><td>${esc(route(s))}</td><td>${esc(bottomRule(s))}</td><td>${kldReview(s)}</td><td>${productionKld(s)}</td><td><span class="status"><span class="dot ${st[1]}"></span>${st[0]}</span></td><td><div class="row wrap" style="gap:6px"><button class="btn tiny pv5-page-preview">◉ Preview</button><button class="btn tiny pv5-page-edit">✎ Edit</button>${st[0]==='Owner Approved'?'<button class="btn tiny" disabled>Approved</button>':'<button class="btn tiny primary pv5-page-approve">✓ Approve</button>'}</div></td></tr>`}
async function saveDecision(s,decision){if(!window.PV5DbReview)return alert('Review state is still loading. Please try again.');await window.PV5DbReview.save(reviewKey(s),decision,{name:sizeLabel(s),size_id:s.id||null});render()}
function bindRows(list){const table=findTable();if(!table)return;qa('tbody tr',table).forEach((tr,i)=>{const s=list[i];if(!s)return;q('.pv5-page-preview',tr)?.addEventListener('click',()=>window.PV5PremiumInteractions?.reviewRequest?.('Size / KLD Preview',`${sizeLabel(s)} — review configured size, pricing group, route, bottom rule and KLD state.`,2));q('.pv5-page-edit',tr)?.addEventListener('click',()=>window.PV5PremiumInteractions?.reviewRequest?.('Size / KLD Change Request',`${sizeLabel(s)} — describe the required size, pricing group, route, bottom-rule or KLD change.`,0));q('.pv5-page-approve',tr)?.addEventListener('click',()=>saveDecision(s,'approved'))})}
function pagerHtml(total){const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));return `<div id="pv5SizesPager" style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:12px"><span>Showing ${(pageNo-1)*PAGE_SIZE+1}–${Math.min(pageNo*PAGE_SIZE,total)} of ${total} sizes</span><div class="pager"><button ${pageNo<=1?'disabled':''} data-pv5-page="prev">‹</button>${Array.from({length:pages},(_,i)=>`<button class="${pageNo===i+1?'on':''}" data-pv5-page="${i+1}">${i+1}</button>`).join('')}<button ${pageNo>=pages?'disabled':''} data-pv5-page="next">›</button></div></div>`}
function render(){if(!isSizes()||!catalog)return;const table=findTable();if(!table)return;const sizes=catalog.sizes||[];const start=(pageNo-1)*PAGE_SIZE;const list=sizes.slice(start,start+PAGE_SIZE);const tbody=table.querySelector('tbody');if(!tbody)return;tbody.innerHTML=list.map(rowHtml).join('');bindRows(list);const old=q('#pv5SizesPager');if(old)old.remove();table.parentElement?.insertAdjacentHTML('afterend',pagerHtml(sizes.length));qa('[data-pv5-page]').forEach(b=>b.addEventListener('click',()=>{const v=b.dataset.pv5Page;if(v==='prev')pageNo=Math.max(1,pageNo-1);else if(v==='next')pageNo=Math.min(Math.ceil(sizes.length/PAGE_SIZE),pageNo+1);else pageNo=Number(v)||1;render();q('#page')?.scrollIntoView({behavior:'smooth',block:'start'})}))}
async function load(){try{const r=await fetch(API,{cache:'no-store'});const b=await r.json();if(!r.ok||b.ok===false)throw new Error(b.error||'Unable to load sizes');catalog=b.catalog||b}catch(e){console.error('[sizes-pagination]',e);catalog=null}}
function tick(){if(isSizes()&&catalog){const table=findTable();if(table&&!q('#pv5SizesPager'))render()}else if(!isSizes())pageNo=1}
(async()=>{await load();new MutationObserver(()=>setTimeout(tick,40)).observe(document.documentElement,{childList:true,subtree:true});setInterval(tick,700);tick()})();
})();