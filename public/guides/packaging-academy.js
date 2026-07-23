(() => {
  'use strict';

  const ICONS = {
    home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3z"/></svg>',
    journey:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    workflows:'<svg viewBox="0 0 24 24"><path d="M7 3v6M17 15v6M3 7h8M13 17h8M12 7h5a4 4 0 0 1 4 4v0M12 17H7a4 4 0 0 1-4-4v0"/></svg>',
    test:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>',
    report:'<svg viewBox="0 0 24 24"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    issue:'<svg viewBox="0 0 24 24"><path d="M12 3 2 21h20L12 3Zm0 6v5m0 3v1"/></svg>',
    book:'<svg viewBox="0 0 24 24"><path d="M4 4h7a3 3 0 0 1 3 3v13a3 3 0 0 0-3-3H4zM20 4h-7a3 3 0 0 0-3 3v13a3 3 0 0 1 3-3h7z"/></svg>',
    help:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.4 2.4 0 1 1 3.2 2.3c-.7.3-1 1-1 1.7v.5M12 17h.01"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
    user:'<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    design:'<svg viewBox="0 0 24 24"><path d="m4 20 4-1 11-11-3-3L5 16l-1 4Zm10-13 3 3M14 4l2-2 4 4-2 2"/></svg>',
    ops:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 6a8 8 0 0 0-1.7 1L5 6 3 9.5 5.1 11A7 7 0 0 0 5 12c0 .4 0 .7.1 1L3 14.5 5 18l2.3-1a8 8 0 0 0 1.7 1l.5 3h5l.5-3a8 8 0 0 0 1.7-1l2.3 1 2-3.5-2.1-1.5c.1-.3.1-.7.1-1Z"/></svg>',
    order:'<svg viewBox="0 0 24 24"><path d="M3 5h2l2 11h11l2-7H7M9 21h.01M17 21h.01"/></svg>',
    admin:'<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
    viewer:'<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>'
  };

  const roleMeta = {
    sales:{name:'Sales',icon:'user',description:'Capture leads, qualify needs, build quotes, send and follow up.',flows:['capture','qualification','quote','approval','followup']},
    design:{name:'Design',icon:'design',description:'Manage artwork, proofs, approvals and pre-press readiness.',flows:['design','dispatch']},
    operations:{name:'Operations',icon:'ops',description:'Manage production stages, job tickets and dispatch.',flows:['dispatch']},
    ordering:{name:'Ordering',icon:'order',description:'Process accepted quotes and coordinate order execution.',flows:['approval','dispatch']},
    admin:{name:'Owner / Admin',icon:'admin',description:'Manage catalog, pricing, access, reporting and workspace settings.',flows:['capture','qualification','quote','approval','followup','design','dispatch','admin']},
    viewer:{name:'Viewer',icon:'viewer',description:'View information and track status without changing records.',flows:['capture','qualification','quote','approval','followup','design','dispatch']}
  };

  const flowData = [
    ['capture','Capture','/contact-exchange/scan',[
      ['Capture overview','Understand when to use Quick Lead versus the full capture workspace.'],['Open Quick Lead','Launch the global Quick Lead drawer from the header.'],['Choose buyer or supplier','Classify the contact correctly at capture time.'],['Enter required details','Add the minimum information needed to create the lead.'],['Record source and trade note','Preserve how the lead arrived and what was discussed.'],['Save the lead','Create the lead and confirm the success state.'],['Find the new lead','Confirm the record is visible and owned correctly.']]],
    ['qualification','Qualification','/leads',[
      ['Open Lead Detail','Open the buyer record from the Leads workspace.'],['Review lifecycle and readiness','Understand the lead status before making changes.'],['Add contact and company context','Complete the information needed for follow-up.'],['Map packaging interest','Record the packaging categories the buyer is evaluating.'],['Capture requirements','Document size, material, finish, quantity and delivery expectations.'],['Schedule next touchpoint','Create a dated follow-up action.'],['Confirm quote readiness','Verify that the lead can move into Quote Builder.']]],
    ['quote','Quote Builder','/quotes',[
      ['Start a quote','Create a new draft from the qualified lead.'],['Choose service family','Select the buyer-facing packaging family.'],['Choose pricing template','Select the correct production method and pricing rules.'],['Enter dimensions','Capture the exact width, height and other required dimensions.'],['Enter repeat and web width','Provide press-specific values for flexographic work.'],['Select material','Choose a material from the controlled reference list.'],['Select finish and colors','Add print colors, finish and optional services.'],['Enter quantity','Add the requested order quantity.'],['Review calculated pricing','Inspect unit price, setup, cylinder and additional charges.'],['Add another line','Create separate lines for separate packaging specifications.'],['Save draft','Persist the quote before moving to review.'],['Review customer-facing quote','Preview the document the buyer will receive.']]],
    ['approval','Approvals & Sending','/quotes',[
      ['Review internal approval requirements','Confirm whether the quote needs internal approval.'],['Submit for approval','Send the draft to the designated approver.'],['Approve or return','Record an approval decision with useful context.'],['Resolve approval changes','Update only the requested items and resubmit.'],['Generate approval link','Create the external link used by the buyer.'],['Send to buyer','Deliver the quote using the approved channel.'],['Record buyer response','Mark accepted, rejected or revision requested.'],['Create order handoff','Move an accepted quote into execution.']]],
    ['followup','Follow-up','/quote-lifecycle',[
      ['Open Quote Lifecycle','Use the lifecycle workspace as the quote follow-up queue.'],['Review recommended action','Understand why a quote is being surfaced.'],['Send follow-up','Contact the buyer with relevant context.'],['Handle revision request','Create a controlled new version.'],['Manage expiring quotes','Address quotes nearing their validity date.'],['Close or hand off','Finish the lifecycle cleanly.']]],
    ['design','Design & Proofs','/design-queue',[
      ['Open Design Queue','Review every packaging line requiring artwork attention.'],['Review production specification','Confirm the artwork is being prepared for the right line.'],['Upload proof version','Add the latest proof to the correct quote line.'],['Share and record approval','Send the external proof approval link and record the decision.'],['Release to pre-press','Confirm artwork is print-ready.']]],
    ['dispatch','Production & Dispatch','/dispatch-board',[
      ['Open Dispatch Board','See active jobs and the stage funnel.'],['Advance production stage','Record work completion as the job moves forward.'],['Correct stage and print ticket','Fix an incorrect stage and use the shop-floor ticket.'],['Mark dispatched','Complete the job with shipment details.']]],
    ['admin','Catalog & Admin','/admin',[
      ['Manage service families','Maintain the buyer-facing packaging catalog.'],['Manage pricing templates','Maintain validated pricing rules and previews.'],['Maintain reference library','Keep materials, finishes and services consistent.']]]
  ];

  const flowDetails = {
    capture:['Click the global + Quick Lead action.','Choose Buyer or Supplier and enter company and country.','Add source, trade note and contact details, then save.'],
    qualification:['Open a lead from the Leads workspace.','Complete company context and packaging interests.','Save requirements and schedule the next touchpoint.'],
    quote:['Start from a qualified lead.','Configure family, template, dimensions, material, finish and quantity.','Review pricing, save the draft and preview the customer document.'],
    approval:['Review policy and submit when approval is required.','Record the decision or requested changes.','Generate the buyer link, send it and capture the response.'],
    followup:['Open Quote Lifecycle and read the recommended action.','Send a relevant follow-up or create a controlled revision.','Close, expire or hand off the quote cleanly.'],
    design:['Open Design Queue and confirm the production specification.','Upload the correct proof version and share approval.','Release only approved artwork to pre-press.'],
    dispatch:['Open Dispatch Board and review the stage funnel.','Advance or correct the job stage with notes.','Print the job ticket and record dispatch details.'],
    admin:['Open the appropriate Packaging Admin page.','Review active status, linked data and validation warnings.','Save the change and confirm it appears in the client workflow.']
  };

  const expected = {
    capture:'The lead saves once, receives the correct type and owner, and appears in Leads without duplicate records.',
    qualification:'Packaging interests and requirements persist, readiness updates, and Quote Builder is available when required data is complete.',
    quote:'The quote uses the selected packaging template, shows consistent line names and currency, and persists all calculations after save.',
    approval:'Approval status is accurate, buyer links open correctly, and accepted quotes can move to order handoff without an incorrect lock.',
    followup:'The lifecycle queue reflects the latest quote state and records every follow-up or revision in the activity history.',
    design:'The latest proof, buyer decision and artwork status remain synchronized between the quote and Design Queue.',
    dispatch:'Production stage changes are event-tracked, permissions are respected, and dispatch completes the job correctly.',
    admin:'Catalog configuration is active, internally consistent and immediately usable by the intended client role.'
  };

  const mistakes = {
    capture:['Creating a duplicate lead','Leaving source or notes blank'],qualification:['Not saving category mapping','Scheduling no next action'],quote:['Mixing specs on one line','Ignoring MOQ or currency warnings'],approval:['Sending before approval','Editing a locked accepted version'],followup:['Following up without context','Overwriting instead of revising'],design:['Uploading to the wrong line','Releasing unapproved artwork'],dispatch:['Skipping stages without notes','Editing with a read-only role'],admin:['Activating incomplete templates','Deleting references already in use']
  };

  const workflows = flowData.map(([id,name,route,items]) => ({id,name,route,steps:items.map(([title,overview],i)=>({id:`${id}-${i+1}`,title,overview}))}));
  const allSteps = workflows.flatMap(w => w.steps.map((s,i)=>({...s,flowId:w.id,flowName:w.name,route:w.route,index:i})));
  const state = JSON.parse(localStorage.getItem('setuPackagingAcademyV3') || '{}');
  Object.assign(state,{view:state.view||'dashboard',mode:state.mode||'learn',role:state.role||'sales',step:state.step||'capture-1',completed:state.completed||[],results:state.results||{}});

  const $ = id => document.getElementById(id);
  const esc = v => String(v ?? '').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const save = () => localStorage.setItem('setuPackagingAcademyV3',JSON.stringify(state));
  const icon = name => `<span class="svg-icon">${ICONS[name]||ICONS.help}</span>`;
  const roleSteps = () => allSteps.filter(s=>roleMeta[state.role].flows.includes(s.flowId));
  const stepById = id => allSteps.find(s=>s.id===id)||allSteps[0];
  const progress = steps => {const done=steps.filter(s=>state.completed.includes(s.id)).length;return {done,total:steps.length,pct:steps.length?Math.round(done/steps.length*100):0};};

  function renderShell(){
    $('roleSelect').innerHTML=Object.entries(roleMeta).map(([k,v])=>`<option value="${k}" ${k===state.role?'selected':''}>Role: ${esc(v.name)}</option>`).join('');
    document.querySelectorAll('.mode-btn').forEach(b=>b.classList.toggle('active',b.dataset.mode===state.mode));
    document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
    document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
    const target=$(`${state.view.replace('-','')}View`); if(target) target.classList.remove('hidden');
  }

  function dashboard(){
    const p=progress(roleSteps());
    $('dashboardView').innerHTML=`<div class="page-head"><div><div class="eyebrow">Packaging workspace training</div><h1>Welcome to Setu Flow Packaging Academy</h1><p>Learn the workflow, practice each action and record structured client testing results.</p></div><button class="btn primary" onclick="Academy.openStep('${state.step}')">Continue journey</button></div>
    <div class="metrics"><div class="card hero-card"><div class="hero-icon">${icon('book')}</div><div><h2>${esc(roleMeta[state.role].name)} learning journey</h2><p>${esc(roleMeta[state.role].description)}</p></div></div><div class="card metric"><span>Overall progress</span><strong>${p.pct}%</strong><div class="progress"><i style="width:${p.pct}%"></i></div></div><div class="card metric"><span>Tests completed</span><strong>${Object.keys(state.results).length} / 52</strong></div></div>
    <section class="card panel"><div class="section-head"><div><h2>Choose your role</h2><p>The guide filters the workflows and permissions relevant to that role.</p></div></div><div class="role-grid">${Object.entries(roleMeta).map(([k,v])=>`<button class="role-card ${k===state.role?'active':''}" onclick="Academy.role('${k}')"><span class="role-icon">${icon(v.icon)}</span><strong>${esc(v.name)}</strong><small>${esc(v.description)}</small></button>`).join('')}</div></section>
    <section class="card panel"><div class="section-head"><div><h2>Recommended journey</h2><p>${p.done} of ${p.total} steps completed</p></div></div><div class="journey-strip">${roleMeta[state.role].flows.map((id,i)=>{const w=workflows.find(x=>x.id===id);const wp=progress(w.steps);return `<button onclick="Academy.openStep('${w.steps[0].id}')" class="journey-node ${wp.pct===100?'done':''}"><b>${i+1}</b><span>${esc(w.name)}</span><small>${wp.done}/${wp.total}</small></button>`}).join('')}</div></section>`;
  }

  function lessonNav(steps){
    const ids=new Set(steps.map(s=>s.flowId));
    return `<aside class="lesson-nav">${workflows.filter(w=>ids.has(w.id)).map((w,wi)=>`<div class="flow-nav"><h3><span>${wi+1}</span>${esc(w.name)}</h3>${w.steps.map((s,si)=>`<button class="lesson-link ${s.id===state.step?'active':''} ${state.completed.includes(s.id)?'done':''}" onclick="Academy.openStep('${s.id}')">${wi+1}.${si+1} ${esc(s.title)}</button>`).join('')}</div>`).join('')}</aside>`;
  }

  function lesson(all=false){
    const steps=all?allSteps:roleSteps(); if(!steps.some(s=>s.id===state.step)) state.step=steps[0].id;
    const s=stepById(state.step), w=workflows.find(x=>x.id===s.flowId), seq=steps, idx=seq.findIndex(x=>x.id===s.id), done=state.completed.includes(s.id);
    const shot=s.flowId==='capture'?'evidence/00-reference-04-quick-add-lead.png':s.flowId==='qualification'?'evidence/00-reference-07-lead-detail.png':s.flowId==='followup'?'evidence/00-reference-09-quote-lifecycle.png':'';
    const content=`<div class="lesson-head"><div class="breadcrumbs">${esc(s.flowName)} / Step ${s.index+1} of ${w.steps.length}</div><div class="title-row"><div><h1>${esc(s.title)}</h1><p>${esc(s.overview)}</p></div><a class="btn" target="_blank" rel="noopener" href="${esc(s.route)}">Open in Setu Flow ↗</a></div></div><div class="lesson-body"><div class="lesson-grid"><div><ol class="instructions">${flowDetails[s.flowId].map(x=>`<li><strong>${esc(x)}</strong><p>Complete this action using normal clicks and confirm the saved state before continuing.</p></li>`).join('')}</ol></div><div><div class="shot">${shot?`<img src="${shot}" alt="${esc(s.title)} screenshot" onerror="this.parentElement.innerHTML='<div class=&quot;placeholder&quot;>Screenshot unavailable in this deployment.<br>Use the live workspace button for this step.</div>'">`:`<div class="placeholder">${icon(w.id==='design'?'design':w.id==='dispatch'?'ops':'workflows')}<strong>${esc(w.name)}</strong><span>Use the live workspace while following the numbered instructions.</span></div>`}<i class="hotspot h1">1</i><i class="hotspot h2">2</i><i class="hotspot h3">3</i></div></div></div><div class="callouts"><div class="callout success"><h3>Expected result</h3><p>${esc(expected[s.flowId])}</p></div><div class="callout"><h3>Common mistakes</h3><ul>${mistakes[s.flowId].map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div></div><div class="lesson-foot"><button class="btn" ${idx<1?'disabled':''} onclick="Academy.openStep('${idx>0?seq[idx-1].id:s.id}')">← Previous</button><label><input type="checkbox" ${done?'checked':''} onchange="Academy.complete('${s.id}',this.checked)"> Mark step complete</label><button class="btn primary" ${idx===seq.length-1?'disabled':''} onclick="Academy.openStep('${idx<seq.length-1?seq[idx+1].id:s.id}')">Next →</button></div>`;
    $(`${all?'workflows':'journey'}View`).innerHTML=`<div class="learning-layout">${lessonNav(steps)}<article class="lesson">${content}</article></div>`;
  }

  function testCenter(){
    const s=stepById(state.step), r=state.results[s.id]||{};
    $('testView').innerHTML=`<div class="page-head"><div><div class="eyebrow">Structured client testing</div><h1>Test Center</h1><p>Execute each workflow step, record evidence and capture gaps consistently.</p></div><button class="btn" onclick="Academy.navigate('reports')">View report</button></div><div class="test-layout">${lessonNav(allSteps)}<div class="card test-form"><div class="breadcrumbs">${esc(s.flowName)} / Test ${s.index+1}</div><h2>${esc(s.title)}</h2><p>${esc(s.overview)}</p><div class="expected-box"><b>Expected result</b><p>${esc(expected[s.flowId])}</p></div><h3>Result</h3><div class="result-options">${[['pass','Pass'],['fail','Fail'],['blocked','Blocked'],['na','N/A']].map(([v,l])=>`<label class="${r.result===v?'selected':''}"><input type="radio" name="result" value="${v}" ${r.result===v?'checked':''}>${l}</label>`).join('')}</div><label class="field">Actual result<textarea id="actual" placeholder="What happened when you executed this step?">${esc(r.actual||'')}</textarea></label><div class="form-grid"><label class="field">Notes / issue<textarea id="notes" placeholder="Add errors, observations or reproduction detail">${esc(r.notes||'')}</textarea></label><label class="field">Evidence filename<input id="evidence" value="${esc(r.evidence||'')}" placeholder="screenshot-name.png"></label></div><div class="form-grid"><label class="field">Tester<input id="tester" value="${esc(r.tester||'')}"></label><label class="field">Browser / device<input id="device" value="${esc(r.device||navigator.userAgent.split(')').shift()+')')}"></label></div><div class="form-actions"><button class="btn primary" onclick="Academy.saveTest('${s.id}')">Save test result</button><button class="btn" onclick="Academy.openStep('${s.id}')">View Learn Mode</button></div></div></div>`;
  }

  function reports(){
    const counts={pass:0,fail:0,blocked:0,na:0,untested:0}; allSteps.forEach(s=>{const v=state.results[s.id]?.result;v?counts[v]++:counts.untested++});
    $('reportsView').innerHTML=`<div class="page-head"><div><div class="eyebrow">Acceptance test evidence</div><h1>Test Summary</h1><p>Results stored in this browser for the current training session.</p></div><div><button class="btn" onclick="window.print()">Print / PDF</button><button class="btn primary" onclick="Academy.csv()">Export CSV</button></div></div><div class="summary-grid">${[['Total',52],['Passed',counts.pass],['Failed',counts.fail],['Blocked',counts.blocked],['N/A',counts.na],['Untested',counts.untested]].map(([k,v])=>`<div class="card summary"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div><div class="card panel"><table><thead><tr><th>Workflow</th><th>Total</th><th>Passed</th><th>Failed</th><th>Blocked</th><th>Progress</th></tr></thead><tbody>${workflows.map(w=>{const rs=w.steps.map(s=>state.results[s.id]?.result);const tested=rs.filter(Boolean).length;return `<tr><td>${esc(w.name)}</td><td>${w.steps.length}</td><td>${rs.filter(x=>x==='pass').length}</td><td>${rs.filter(x=>x==='fail').length}</td><td>${rs.filter(x=>x==='blocked').length}</td><td><div class="progress"><i style="width:${Math.round(tested/w.steps.length*100)}%"></i></div></td></tr>`}).join('')}</tbody></table></div>`;
  }

  function issues(){
    const data=[['P0','Approval lock can block the correct next action','Re-test acceptance and order handoff before client sign-off.'],['P1','Quote can show a ghost generic product or mixed currencies','Validate every customer-facing quote line and total.'],['P1','Pricing step may show the wrong line name','Confirm template switching updates all labels.'],['P1','Design Queue can show stale artwork status','Refresh and verify the latest proof decision.'],['P2','MOQ feedback needs clearer alternatives','Record the exact quantity and suggested valid tier.'],['P2','Copy approval link needs visible success feedback','Confirm the clipboard contains the generated link.']];
    $('issuesView').innerHTML=`<div class="page-head"><div><div class="eyebrow">Current retest advisory</div><h1>Known Issues</h1><p>These items are testing guidance, not a substitute for the live issue tracker.</p></div></div><div class="issue-list">${data.map(([p,t,d])=>`<div class="card issue"><b class="severity ${p.toLowerCase()}">${p}</b><div><h2>${esc(t)}</h2><p>${esc(d)}</p></div></div>`).join('')}</div>`;
  }

  function glossary(){
    const terms=[['Service family','Buyer-facing packaging category such as Stand Up Pouches or Digital Labels.'],['Pricing template','Validated dimensional, material, finish, MOQ and setup rules used by Quote Builder.'],['Reference library','Controlled list of materials, finishes and service items.'],['Proof','A versioned artwork file shared for buyer approval.'],['Pre-press','Production preparation after artwork is approved.'],['Quote lifecycle','Workspace for sent, expiring, revised, accepted and rejected quotes.'],['Order handoff','Controlled transition from an accepted quote into execution.'],['Job ticket','Production-only specification document without commercial pricing.']];
    $('glossaryView').innerHTML=`<div class="page-head"><div><div class="eyebrow">Packaging terminology</div><h1>Glossary</h1></div></div><div class="glossary-grid">${terms.map(([t,d])=>`<div class="card panel"><h2>${esc(t)}</h2><p>${esc(d)}</p></div>`).join('')}</div>`;
  }

  function getting(){
    $('gettingstartedView').innerHTML=`<div class="page-head"><div><div class="eyebrow">Getting started</div><h1>How to use this Academy</h1><p>Use the guide for onboarding and the Test Center for client acceptance testing.</p></div></div><div class="quick-grid"><div class="card panel"><h2>1. Choose a role</h2><p>The dashboard filters the recommended journey and permissions.</p></div><div class="card panel"><h2>2. Learn with clicks</h2><p>Follow each step and open the matching live Setu Flow workspace in a new tab.</p></div><div class="card panel"><h2>3. Test and capture evidence</h2><p>Record Pass, Fail, Blocked or N/A with notes and screenshot filenames.</p></div><div class="card panel"><h2>4. Export results</h2><p>Use Reports to export CSV or print a shareable PDF summary.</p></div></div>`;
  }

  function render(){
    renderShell(); dashboard(); lesson(false); lesson(true); testCenter(); reports(); issues(); glossary(); getting(); save();
  }

  window.Academy={
    navigate(view){state.view=view;render();document.getElementById('sidebar').classList.remove('open');window.scrollTo(0,0);},
    role(role){state.role=role;const first=roleSteps()[0];if(first)state.step=first.id;render();},
    mode(mode){state.mode=mode;state.view=mode==='test'?'test':'journey';render();},
    openStep(id){state.step=id;state.view=state.mode==='test'?'test':(state.view==='workflows'?'workflows':'journey');render();window.scrollTo(0,0);},
    complete(id,value){state.completed=value?[...new Set([...state.completed,id])]:state.completed.filter(x=>x!==id);render();},
    saveTest(id){const result=document.querySelector('input[name=result]:checked')?.value;if(!result){alert('Choose Pass, Fail, Blocked or N/A.');return;}state.results[id]={result,actual:$('actual').value,notes:$('notes').value,evidence:$('evidence').value,tester:$('tester').value,device:$('device').value,time:new Date().toISOString()};save();render();},
    search(value){const q=value.trim().toLowerCase(),box=$('searchResults');if(q.length<2){box.classList.add('hidden');return;}const hits=allSteps.filter(s=>`${s.title} ${s.overview} ${s.flowName}`.toLowerCase().includes(q)).slice(0,8);box.innerHTML=hits.length?hits.map(s=>`<button onclick="Academy.searchPick('${s.id}')"><b>${esc(s.title)}</b><span>${esc(s.flowName)} · ${esc(s.overview)}</span></button>`).join(''):'<p>No matching guide steps.</p>';box.classList.remove('hidden');},
    searchPick(id){$('searchResults').classList.add('hidden');$('globalSearch').value='';state.mode='learn';state.step=id;state.view='workflows';render();},
    csv(){const rows=[['Workflow','Step','Result','Actual result','Notes','Evidence','Tester','Device','Time']];allSteps.forEach(s=>{const r=state.results[s.id]||{};rows.push([s.flowName,s.title,r.result||'Untested',r.actual||'',r.notes||'',r.evidence||'',r.tester||'',r.device||'',r.time||''])});const csv=rows.map(row=>row.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='setu-flow-packaging-test-results.csv';a.click();URL.revokeObjectURL(a.href);},
    reset(){if(confirm('Reset all local learning and test progress?')){localStorage.removeItem('setuPackagingAcademyV3');location.reload();}},
    menu(){document.getElementById('sidebar').classList.toggle('open');}
  };

  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>Academy.navigate(b.dataset.view)));
  document.querySelectorAll('.mode-btn').forEach(b=>b.addEventListener('click',()=>Academy.mode(b.dataset.mode)));
  $('roleSelect').addEventListener('change',e=>Academy.role(e.target.value));
  $('globalSearch').addEventListener('input',e=>Academy.search(e.target.value));
  $('mobileMenu').addEventListener('click',Academy.menu);
  $('resetProgress').addEventListener('click',Academy.reset);
  render();
})();