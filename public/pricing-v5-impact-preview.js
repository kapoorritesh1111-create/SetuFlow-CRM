(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const STORAGE='setu_pricing_v5_impact_preview_v1';
const FEEDBACK='/api/public/pricing-v5-feedback';
function pageName(){return q('#page .page-head h2')?.textContent?.trim()||''}
function num(v){const n=Number(String(v??'').replace(/[^0-9.-]/g,''));return Number.isFinite(n)?n:null}
function money(v){return '₹'+Number(v).toFixed(2)}
function pct(v){return (v>=0?'+':'')+Number(v).toFixed(1)+'%'}
function findPanel(){return qa('#page .card').find(x=>/Impact Preview/i.test(x.querySelector('h3')?.textContent||''))||null}
function controls(panel){
 const sels=qa('select',panel),inputs=qa('input',panel),btn=qa('button',panel).find(b=>/Preview Impact/i.test(b.textContent||''));
 return {change:sels[0],current:inputs[0],next:inputs[1],btn};
}
function ensureOptions(panel){const c=controls(panel);if(!c.change)return;c.change.innerHTML=['Margin %','Waste %','Frame Charge (₹)','Global Adjustment %'].map(x=>'<option>'+x+'</option>').join('');c.change.addEventListener('change',()=>{const defaults={'Margin %':[8,10],'Waste %':[3,2],'Frame Charge (₹)':[0,250],'Global Adjustment %':[0,-2]};const d=defaults[c.change.value]||[0,0];if(c.current)c.current.value=d[0];if(c.next)c.next.value=d[1]})}
function calcFactor(type,current,next){if(type==='Margin %'||type==='Waste %')return (1+next/100)/(1+current/100);if(type==='Global Adjustment %')return (1+next/100)/(1+current/100);return 1}
function run(panel){const c=controls(panel),current=num(c.current?.value),next=num(c.next?.value);if(current==null||next==null)return alert('Enter valid current and new values.');const rows=qa('tbody tr',panel);if(!rows.length)return alert('No preview rows are available.');const type=c.change?.value||'Margin %';rows.forEach(tr=>{const td=qa('td',tr);if(td.length<5)return;const base=num(td[1].textContent);if(base==null)return;let newPrice;if(type==='Frame Charge (₹)'){const sizeText=td[0].textContent||'';const approxQty=/110|200|260/.test(sizeText)?5000:5000;newPrice=base+(next-current)/approxQty}else newPrice=base*calcFactor(type,current,next);const delta=newPrice-base,changePct=base?delta/base*100:0;td[2].textContent=money(newPrice);td[3].textContent=(delta>=0?'+':'')+money(delta).replace('₹','₹');td[4].textContent=pct(changePct);td[3].className=delta>0?'red-t':delta<0?'green-t':'';td[4].className=td[3].className});try{localStorage.setItem(STORAGE,JSON.stringify({type,current,next,at:new Date().toISOString()}))}catch(_){}fetch(FEEDBACK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewer_name:'Stark Packmate Owner',review_mode:'admin',step_key:'impact-preview',rating:3,priority:'normal',feedback:'Impact preview: '+type+' '+current+' → '+next,page_path:location.pathname})}).catch(()=>{});let msg=q('.impact-preview-saved',panel);if(!msg){msg=document.createElement('div');msg.className='notice info impact-preview-saved';panel.appendChild(msg)}msg.innerHTML='<b>Preview updated.</b> This is a review-only estimate and does not change live production pricing.'}
function wire(){if(!/Waste\s*&\s*Margins/i.test(pageName()))return;const panel=findPanel();if(!panel||panel.dataset.impactWired)return;panel.dataset.impactWired='1';ensureOptions(panel);const c=controls(panel);if(c.btn)c.btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();run(panel)},true)}
new MutationObserver(wire).observe(document.documentElement,{subtree:true,childList:true});setTimeout(wire,250);
window.PV5ImpactPreview={wire};
})();