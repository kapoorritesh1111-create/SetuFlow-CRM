(() => {
  'use strict';

  const STORAGE = 'setu_pricing_v5_premium_review_v3';
  const FEEDBACK = '/api/public/pricing-v5-feedback';
  const FAMILY_KEYS = ['sup','flat_bottom','center_seal_roll','center_seal_pouch','three_side_seal_roll','three_side_seal_pouch'];
  const FAMILY_NAMES = ['Stand Up Pouches','Flat Bottom Pouches','Center Seal — Roll Form','Center Seal — Pouch Form','3 Side Seal — Roll Form','3 Side Seal — Pouch Form'];
  const BUSINESS = [
    ['sup_sizes','20 approved SUP sizes','Approve the 20 Stand-Up pouch sizes and their PG01–PG05 bucket assignments from the Sizes worksheet.'],
    ['constructions','44 constructions','Approve the 44 configured constructions and material sets.'],
    ['buckets','Commercial bucket tables','Approve the new run-length wastage and margin tables.'],
    ['kld','KLD workflow','Approve the review-sample / production-KLD workflow.'],
    ['dashboard','Owner dashboard','Approve the owner pricing review dashboard and protected internal-cost behavior.'],
    ['sales','Sales Quote behavior','Approve live repricing, valid-option filtering, quantity alternatives and quote behavior.'],
    ['family','Family migration / v5 baselines','Approve the family migration approach and v4-vs-v5 comparison method.'],
    ['competitor','Competitor evaluator logic','Approve exact-vs-directional competitor evidence rules.'],
  ];
  const CLARIFICATIONS = [
    ['invalid-combinations','Are any size × construction combinations not manufacturable?','This is the only remaining SUP construction-scope question. Quantity N/A rules are managed separately on Sizes & KLDs.',['All 44 apply to all 20 SUP sizes','Restrictions exist — see comment']],
  ];

  const safe = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  function read() {
    try {
      const x = JSON.parse(localStorage.getItem(STORAGE) || '{}');
      return { kldApprovals:x.kldApprovals || {}, businessApprovals:x.businessApprovals || {}, clarifications:x.clarifications || {} };
    } catch (_) { return { kldApprovals:{}, businessApprovals:{}, clarifications:{} }; }
  }
  function write(s) { try { localStorage.setItem(STORAGE, JSON.stringify(s)); } catch (_) {} }
  async function post(step, feedback, status='Approved', priority='normal') {
    try {
      await fetch(FEEDBACK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewer_name:'Stark Packmate Owner',review_mode:'admin',step_key:step,rating:status==='Approved'?5:status==='Clarified'?4:2,priority,feedback,page_path:location.pathname})});
    } catch (_) {}
  }
  function rerender(page='approval') {
    try { if (window.PV5 && typeof window.PV5.go === 'function') window.PV5.go(page); } catch (_) {}
    setTimeout(apply, 120);
  }

  function parseClarification(value) {
    const raw = String(value || '');
    const sep = raw.indexOf('|||');
    return sep < 0 ? {answer:raw, comment:''} : {answer:raw.slice(0,sep),comment:raw.slice(sep+3)};
  }

  async function saveClarification(index) {
    const item = CLARIFICATIONS[index];
    const answer = document.getElementById('ownerClarifyAnswer'+index)?.value || '';
    const comment = document.getElementById('ownerClarifyComment'+index)?.value?.trim() || '';
    if (!answer) return alert('Please select an answer first.');
    const s = read();
    s.clarifications[item[0]] = answer + '|||' + comment;
    write(s);
    await post('clarification-'+item[0], item[1]+' Answer: '+answer+(comment ? ' Comment: '+comment : ''), 'Clarified');
    rerender('approval');
  }

  async function setBusiness(key, approved) {
    const s = read();
    s.businessApprovals[key] = approved;
    write(s);
    const row = BUSINESS.find(x => x[0] === key);
    await post('business-approval-'+key,(approved?'Approved: ':'Needs change: ')+(row?.[1] || key),approved?'Approved':'Needs Change',approved?'normal':'important');
    rerender('approval');
  }

  async function approveAllKld() {
    if (!confirm('Approve all 20 Pricing v5 KLD review samples? This approves the review samples only; production KLDs can still replace them later.')) return;
    const s = read();
    const sizeRows = (window.__PV5_CATALOG__?.sizes || []);
    if (sizeRows.length) sizeRows.forEach(x => { s.kldApprovals[x.id] = 'approved'; });
    else for (let i=0;i<20;i++) s.kldApprovals['sample-'+(i+1)]='approved';
    write(s);
    await post('kld-all-20','Owner approved all 20 Pricing v5 KLD review samples.','Approved');
    rerender('approval');
  }

  function resetKld() {
    if (!confirm('Reset all KLD owner decisions back to pending?')) return;
    const s=read(); s.kldApprovals={}; write(s); rerender('approval');
  }

  async function setFamily(index, approved) {
    const key=FAMILY_KEYS[index];
    const s=read();
    s.businessApprovals['family_'+key]=approved;
    write(s);
    const comment=document.getElementById('ownerFamilyComment'+index)?.value?.trim() || '';
    await post('family-'+key,(approved?'Owner approved ':'Owner requested changes to ')+FAMILY_NAMES[index]+(comment?': '+comment:''),approved?'Approved':'Needs Change',approved?'normal':'important');
    rerender('families');
  }

  function decisionPill(value) {
    if (value === true) return '<span class="status"><span class="dot green"></span>Owner Approved</span>';
    if (value === false) return '<span class="status"><span class="dot red"></span>Needs Change</span>';
    return '<span class="status"><span class="dot amber"></span>Pending Owner Review</span>';
  }

  function ownerControlPanel() {
    const s=read();
    const clarifications = CLARIFICATIONS.map((q,i)=>{
      const saved=parseClarification(s.clarifications[q[0]]);
      return '<div class="owner-question"><div class="owner-qcopy"><b>C'+(i+1)+'. '+safe(q[1])+'</b><small>'+safe(q[2])+'</small></div><div class="owner-qgrid"><select id="ownerClarifyAnswer'+i+'"><option value="">Select answer…</option>'+q[3].map(o=>'<option '+(saved.answer===o?'selected':'')+'>'+safe(o)+'</option>').join('')+'</select><input id="ownerClarifyComment'+i+'" value="'+safe(saved.comment)+'" placeholder="Optional comment / detail"></div><div class="owner-actions"><button class="btn primary" data-owner-save-clarify="'+i+'">Save answer</button>'+(saved.answer?'<span class="status"><span class="dot green"></span>Answered — editable</span>':'<span class="status"><span class="dot amber"></span>Awaiting owner answer</span>')+'</div></div>';
    }).join('');

    const approvals=BUSINESS.map(([key,title,desc])=>{
      const value=Object.prototype.hasOwnProperty.call(s.businessApprovals,key)?s.businessApprovals[key]:undefined;
      return '<tr><td><b>'+safe(title)+'</b><small class="owner-row-note">'+safe(desc)+'</small></td><td>'+decisionPill(value)+'</td><td><div class="owner-inline-actions"><button class="btn tiny" data-owner-business="'+key+'" data-value="true">✓ Approve</button><button class="btn tiny danger" data-owner-business="'+key+'" data-value="false">○ Needs Change</button></div></td></tr>';
    }).join('');

    return '<section class="card owner-review-controls"><div class="panel-title"><div><h3>Owner Review & Decisions</h3><p>Resolved Akshay questions have been removed. Only genuine open items remain.</p></div><span class="mini-tag amber">Client controlled</span></div><div class="notice info" style="margin:12px 18px"><b>Confirmed:</b> the 20 Sizes-sheet SUP sizes and their PG01–PG05 bucket assignments are authoritative; use sales-facing construction names with the technical stack; MetPET is Silver Film; MOQ sample prices are ignored; N/A quantities are blocked where explicitly configured; custom constructions remain owner-only until promoted.<br><b>Spot UV:</b> owner deferred the automatic rate and charging basis. Keep the engine rate unconfigured at ₹0; Sales may add Spot UV only as a manual quote-level price until management supplies a formal rate rule.</div><div class="owner-review-tabs"><b>Open clarification</b></div>'+clarifications+'<div class="owner-review-tabs"><b>Business approvals</b></div><div class="table-wrap"><table class="table"><thead><tr><th>Item</th><th>Owner status</th><th>Decision</th></tr></thead><tbody>'+approvals+'</tbody></table></div><div class="owner-kld-box"><div><b>KLD review samples</b><small>Approve KLD review samples only when the owner has actually reviewed them. You can reset the decisions at any time.</small></div><div class="owner-inline-actions"><button class="btn success" id="ownerApproveAllKld">Approve All 20 KLD Samples</button><button class="btn outline" id="ownerResetKld">Reset KLD Decisions</button><button class="btn outline" data-go-page="sizes">Review Individually</button></div></div></section>';
  }

  function patchApprovalPage() {
    const page=document.getElementById('page');
    if (!page || !page.textContent.includes('Impact & Approval')) return;
    page.querySelector('.owner-review-controls')?.remove();
    const banner=page.querySelector('.owner-review-baseline-banner');
    (banner || page.querySelector('.page-head'))?.insertAdjacentHTML('afterend',ownerControlPanel());

    // Old wireframe rows were visual placeholders. Neutralize their hard-coded statuses
    // so they cannot contradict the real owner decision controls above.
    page.querySelectorAll('table tbody tr').forEach(row=>{
      const txt=row.textContent || '';
      if (/20 approved SUP sizes|44 constructions|commercial bucket|KLD workflow|Owner dashboard|Sales Quote behavior|Family migration|Competitor evaluator/i.test(txt)) {
        const item=BUSINESS.find(x=>txt.includes(x[1])) || BUSINESS.find(x=>txt.toLowerCase().includes(x[0].replaceAll('_',' ')));
        if (item) {
          const s=read(); const v=Object.prototype.hasOwnProperty.call(s.businessApprovals,item[0])?s.businessApprovals[item[0]]:undefined;
          row.querySelectorAll('.status').forEach(el=>{el.outerHTML=decisionPill(v);});
        }
      }
      if (/Invalid size|size × construction/i.test(txt)) {
        row.querySelectorAll('.status').forEach(el=>{el.outerHTML='<span class="status"><span class="dot amber"></span>Use Owner Review above</span>';});
      }
    });

    page.querySelectorAll('[data-owner-save-clarify]').forEach(b=>b.onclick=()=>saveClarification(Number(b.dataset.ownerSaveClarify)));
    page.querySelectorAll('[data-owner-business]').forEach(b=>b.onclick=()=>setBusiness(b.dataset.ownerBusiness,b.dataset.value==='true'));
    document.getElementById('ownerApproveAllKld')?.addEventListener('click',approveAllKld);
    document.getElementById('ownerResetKld')?.addEventListener('click',resetKld);
    page.querySelectorAll('[data-go-page]').forEach(b=>b.onclick=()=>window.PV5?.go?.(b.dataset.goPage));
  }

  function patchFamilyPage() {
    const page=document.getElementById('page');
    if (!page || !page.textContent.includes('All Packaging Families')) return;
    const s=read();
    const cards=[...page.querySelectorAll('.family-card')];
    cards.forEach((card,index)=>{
      if(index>=FAMILY_KEYS.length) return;
      card.querySelector('.owner-family-actions')?.remove();
      const key='family_'+FAMILY_KEYS[index];
      const v=Object.prototype.hasOwnProperty.call(s.businessApprovals,key)?s.businessApprovals[key]:undefined;
      const box=document.createElement('div');
      box.className='owner-family-actions';
      box.innerHTML='<div class="owner-family-status">'+decisionPill(v)+'</div><textarea id="ownerFamilyComment'+index+'" rows="2" placeholder="Optional owner comment / required change"></textarea><div class="owner-inline-actions"><button class="btn tiny" data-family-index="'+index+'" data-family-value="true">✓ Approve</button><button class="btn tiny danger" data-family-index="'+index+'" data-family-value="false">○ Needs Change</button></div>';
      card.appendChild(box);
    });
    page.querySelectorAll('[data-family-index]').forEach(b=>b.onclick=(e)=>{e.stopPropagation();setFamily(Number(b.dataset.familyIndex),b.dataset.familyValue==='true');});
  }

  function injectStyle() {
    if(document.getElementById('owner-review-actions-style')) return;
    const style=document.createElement('style');style.id='owner-review-actions-style';style.textContent=`
      .owner-review-controls{margin:0 0 18px;border:1px solid #b9d7ff;background:#fff}.owner-review-controls>.panel-title{padding:16px 18px;border-bottom:1px solid #dfeaf6}.owner-review-controls>.panel-title p{margin:4px 0 0;color:#607995;font-size:12px}.owner-review-tabs{padding:12px 18px;background:#f3f8ff;border-top:1px solid #e1ecf7;border-bottom:1px solid #e1ecf7;color:#123a6a}.owner-question{padding:14px 18px;border-bottom:1px solid #edf2f7}.owner-qcopy b{display:block;font-size:14px;color:#102d55}.owner-qcopy small,.owner-row-note,.owner-kld-box small{display:block;margin-top:3px;color:#657a91;font-size:11px}.owner-qgrid{display:grid;grid-template-columns:minmax(240px,1fr) minmax(240px,1fr);gap:10px;margin-top:10px}.owner-qgrid select,.owner-qgrid input,.owner-family-actions textarea{width:100%;border:1px solid #c8d8e8;border-radius:8px;padding:9px 10px;background:#fff}.owner-actions,.owner-inline-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:9px}.owner-kld-box{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:16px 18px;background:#f8fbff;border-top:1px solid #e1ecf7}.btn.danger{border-color:#f2b9b9;color:#b42318;background:#fff6f6}.owner-family-actions{margin-top:12px;padding-top:12px;border-top:1px solid #e4edf6}.owner-family-actions textarea{margin-top:8px;font-size:11px}.owner-family-status{margin-bottom:4px}.owner-review-controls .table td{vertical-align:middle}@media(max-width:900px){.owner-qgrid{grid-template-columns:1fr}.owner-kld-box{align-items:flex-start;flex-direction:column}}
    `;document.head.appendChild(style);
  }

  let timer=0;
  function apply(){injectStyle();patchApprovalPage();patchFamilyPage();}
  function schedule(){clearTimeout(timer);timer=setTimeout(apply,80);}
  const observer=new MutationObserver(schedule);
  function start(){apply();const page=document.getElementById('page');if(page)observer.observe(page,{childList:true,subtree:true});document.addEventListener('pv5:review-state-changed',schedule);document.addEventListener('pv5:review-state-loaded',schedule);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
