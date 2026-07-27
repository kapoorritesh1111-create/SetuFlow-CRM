(() => {
  'use strict';

  const D = window.PackagingAcademyData;
  if (!D?.steps?.length) {
    console.error('[Packaging Academy] Data failed to load.');
    return;
  }

  const { roles, flows, steps, instructions, expected, mistakes, files, evidenceForStep } = D;
  const API_URL = D.api;
  const ORIGIN = D.origin;
  const STORAGE_KEY = 'setuPackagingAcademyV5';
  const LEGACY_KEY = 'setuPackagingAcademyV4';
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const url = (route) => `${ORIGIN}${String(route || '/').startsWith('/') ? route : `/${route}`}`;

  function readState() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_KEY) || '{}'); } catch {}
    const results = {};
    Object.entries(saved.results || {}).forEach(([key, value]) => {
      const row = value || {};
      const aliases = { pass: 'Pass', fail: 'Fail', blocked: 'Blocked', na: 'N/A' };
      results[key] = { ...row, result: aliases[row.result] || row.result };
    });
    return {
      view: saved.view || 'dashboard',
      mode: saved.mode || 'learn',
      role: roles[saved.role] ? saved.role : 'sales',
      step: steps.some((item) => item.id === saved.step) ? saved.step : steps[0].id,
      done: Array.isArray(saved.done) ? saved.done.filter((id) => steps.some((item) => item.id === id)) : [],
      results,
      runId: saved.runId || null,
    };
  }

  const state = readState();
  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const stepById = (id) => steps.find((item) => item.id === id) || steps[0];
  const roleSteps = () => steps.filter((item) => roles[state.role]?.flows?.includes(item.flow));
  const progress = (items) => {
    const done = items.filter((item) => state.done.includes(item.id)).length;
    return { done, total: items.length, percent: items.length ? Math.round(done / items.length * 100) : 0 };
  };
  const toast = (message) => {
    const node = $('toast');
    if (!node) return;
    node.textContent = message;
    node.classList.add('show');
    setTimeout(() => node.classList.remove('show'), 2500);
  };
  const syncStatus = (text, type = '') => {
    const node = $('syncStatus');
    if (!node) return;
    node.textContent = text;
    node.className = `sync-status ${type}`.trim();
  };

  function shell() {
    $('roleSelect').innerHTML = Object.entries(roles).map(([key, role]) => `<option value="${key}" ${state.role === key ? 'selected' : ''}>Role: ${esc(role.name)}</option>`).join('');
    document.querySelectorAll('.mode-btn').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
    document.querySelectorAll('.nav-item[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === state.view));
    document.querySelectorAll('.view').forEach((view) => { view.hidden = true; });
    const active = $(`${state.view.replace('-', '')}View`);
    if (active) active.hidden = false;
  }

  function screenshot(evidence) {
    if (!evidence) return '<div class="placeholder"><img src="/logos/setu-flow-logo.svg" alt="Setu Flow"><b>Use the live Packaging workspace</b><span>No dedicated screenshot is available for this step yet.</span></div>';
    return `<div class="shot-shell"><button type="button" class="shot-button" data-zoom-src="${esc(evidence.src)}" data-zoom-title="${esc(evidence.title)}"><img src="${esc(evidence.src)}" alt="${esc(evidence.title)}"></button>${(evidence.markers || []).map((marker, index) => `<button type="button" class="hotspot" style="left:${marker.x}%;top:${marker.y}%" data-live-route="${esc(marker.route)}" aria-label="${esc(marker.label)}">${index + 1}</button>`).join('')}<div class="shot-caption">Click the image to zoom. Numbered markers open the matching live workspace.</div></div>`;
  }

  function dashboard() {
    const list = roleSteps();
    const p = progress(list);
    const role = roles[state.role];
    const preview = { src: files.dashboard, title: 'Packaging workspace dashboard', markers: [{ x: 85.5, y: 2.5, label: 'Quick Lead', route: '/leads' }, { x: 4.2, y: 15, label: 'Capture', route: '/contact-exchange/scan' }] };
    $('dashboardView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Packaging workspace training</span><h1>Welcome to Setu Flow Packaging Academy</h1><p>Learn, practice and record structured client testing results.</p></div><button class="btn primary" data-open="${esc(state.step)}">Continue journey</button></header><div class="metrics"><article class="card hero"><img class="hero-logo" src="/logos/setu-flow-logo.svg" alt="Setu Flow"><div><h2>${esc(role.name)} journey</h2><p>${esc(role.description)}</p></div></article><article class="card metric"><span>Overall progress</span><strong>${p.percent}%</strong><div class="bar"><i style="width:${p.percent}%"></i></div></article><article class="card metric"><span>Tests recorded</span><strong>${Object.keys(state.results).length} / ${steps.length}</strong></article></div><section class="card panel"><div class="section-head"><div><h2>Choose your role</h2><p>See the workflows relevant to each role.</p></div></div><div class="role-grid">${Object.entries(roles).map(([key, item]) => `<button class="role-card ${key === state.role ? 'active' : ''}" data-role="${key}"><b>${esc(item.name)}</b><small>${esc(item.description)}</small></button>`).join('')}</div></section><section class="card panel"><div class="section-head"><div><h2>Recommended journey</h2><p>${p.done} of ${p.total} steps complete</p></div></div><div class="journey-strip">${role.flows.map((id, index) => { const flow = flows.find((item) => item.id === id); if (!flow) return ''; const q = progress(flow.steps); return `<button class="journey-node ${q.percent === 100 ? 'done' : ''}" data-open="${flow.steps[0].id}"><b>${index + 1}</b><span>${esc(flow.name)}</span><small>${q.done}/${q.total}</small></button>`; }).join('')}</div></section><section class="card panel"><div class="section-head"><div><h2>Packaging workspace preview</h2></div></div>${screenshot(preview)}</section>`;
  }

  function sideNav(items) {
    const ids = new Set(items.map((item) => item.flow));
    return `<aside class="lesson-nav">${flows.filter((flow) => ids.has(flow.id)).map((flow, flowIndex) => `<div class="flow-nav"><h3><span>${flowIndex + 1}</span>${esc(flow.name)}</h3>${flow.steps.map((step, stepIndex) => `<button class="lesson-link ${step.id === state.step ? 'active' : ''} ${state.done.includes(step.id) ? 'done' : ''}" data-open="${step.id}">${flowIndex + 1}.${stepIndex + 1} ${esc(step.title)}</button>`).join('')}</div>`).join('')}</aside>`;
  }

  function lesson(all = false) {
    const list = all ? steps : roleSteps();
    if (!list.some((item) => item.id === state.step)) state.step = list[0]?.id || steps[0].id;
    const step = stepById(state.step);
    const flow = flows.find((item) => item.id === step.flow);
    const index = list.findIndex((item) => item.id === step.id);
    const body = `<div class="lesson-head"><div class="crumb">${esc(step.flowName)} / Step ${step.index + 1} of ${flow.steps.length}</div><div class="title-row"><div><h1>${esc(step.title)}</h1><p>${esc(step.summary)}</p></div><a class="btn" target="_blank" rel="noopener" href="${url(step.route)}">Open in Setu Flow ↗</a></div></div><div class="lesson-body"><div class="lesson-grid"><ol class="instructions">${(instructions[step.flow] || []).map((item) => `<li><b>${esc(item)}</b><p>Confirm the visible saved state before continuing.</p></li>`).join('')}</ol><div>${screenshot(evidenceForStep(step))}</div></div><div class="callouts"><div class="callout success"><h3>Expected result</h3><p>${esc(expected[step.flow] || '')}</p></div><div class="callout"><h3>Common mistakes</h3><ul>${(mistakes[step.flow] || []).map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div></div></div><footer class="lesson-foot"><button class="btn" data-open="${index > 0 ? list[index - 1].id : step.id}" ${index > 0 ? '' : 'disabled'}>← Previous</button><label><input type="checkbox" data-complete="${step.id}" ${state.done.includes(step.id) ? 'checked' : ''}> Mark step complete</label><button class="btn primary" data-open="${index < list.length - 1 ? list[index + 1].id : step.id}" ${index < list.length - 1 ? '' : 'disabled'}>Next →</button></footer>`;
    $(`${all ? 'workflows' : 'journey'}View`).innerHTML = `<div class="learning-layout">${sideNav(list)}<article class="lesson">${body}</article></div>`;
  }

  function testView() {
    const step = stepById(state.step);
    const record = state.results[step.id] || {};
    const needsEvidence = record.result === 'Fail' || record.result === 'Blocked';
    $('testView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Structured client testing</span><h1>Test Center</h1><p>Save Pass, Fail, Blocked or N/A results to the Packaging workspace.</p></div><button class="btn" data-nav="reports">View report</button></header><div class="test-layout">${sideNav(steps)}<section class="card test-form"><div class="crumb">${esc(step.flowName)} / Test ${step.index + 1}</div><h2>${esc(step.title)}</h2><p>${esc(step.summary)}</p><div class="expected"><b>Expected result</b><p>${esc(expected[step.flow] || '')}</p></div><h3>Result</h3><div class="results">${['Pass','Fail','Blocked','N/A'].map((value) => `<label class="${record.result === value ? 'selected' : ''}"><input type="radio" name="result" value="${value}" ${record.result === value ? 'checked' : ''}>${value}</label>`).join('')}</div><label class="field">Actual result<textarea id="actual">${esc(record.actual || '')}</textarea></label><label class="field">Notes / issue details<textarea id="notes">${esc(record.notes || '')}</textarea></label><div class="form-grid"><label class="field">Tester<input id="tester" value="${esc(record.tester || '')}" placeholder="Your name"></label><label class="field">Browser / device<input id="device" value="${esc(record.device || navigator.userAgent)}"></label></div><label id="evidenceField" class="field evidence-field ${needsEvidence ? 'required' : ''}">${needsEvidence ? 'Screenshot evidence (required)' : 'Screenshot evidence (optional)'}<input id="evidenceFile" type="file" accept="image/png,image/jpeg,image/webp"><span id="evidenceName">${esc(record.evidenceFilename || 'PNG, JPG, or WebP · maximum 10 MB')}</span></label><div class="test-actions"><button class="btn primary" data-save-test="${step.id}">Save test result</button>${record.linkedIssueRef ? `<span class="issue-badge">${esc(record.linkedIssueRef)}</span>` : ''}<span id="testMessage" class="test-message">${record.serverId ? 'Saved in workspace database.' : 'Not yet saved to database.'}</span></div></section></div>`;
  }

  function reports() {
    const counts = { Pass: 0, Fail: 0, Blocked: 0, 'N/A': 0 };
    steps.forEach((step) => { const value = state.results[step.id]?.result; if (value in counts) counts[value] += 1; });
    const rows = steps.filter((step) => state.results[step.id]).map((step) => { const record = state.results[step.id]; return `<tr><td>${esc(step.flowName)}</td><td>${esc(step.title)}</td><td>${esc(record.result)}</td><td>${esc(record.actual || '')}</td><td>${esc(record.evidenceFilename || '—')}</td></tr>`; }).join('');
    $('reportsView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Acceptance test evidence</span><h1>Test Summary</h1></div><div><button class="btn" data-print>Print / PDF</button><button class="btn primary" data-csv>Export CSV</button></div></header><div class="summary-grid">${[['Total',steps.length],['Passed',counts.Pass],['Failed',counts.Fail],['Blocked',counts.Blocked],['N/A',counts['N/A']],['Untested',steps.length - Object.values(counts).reduce((a,b) => a+b,0)]].map(([label,value]) => `<article class="card summary"><span>${label}</span><strong>${value}</strong></article>`).join('')}</div><section class="card panel"><h2>Recorded results</h2><div style="overflow:auto"><table><thead><tr><th>Workflow</th><th>Step</th><th>Result</th><th>Actual result</th><th>Screenshot</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No tests recorded yet.</td></tr>'}</tbody></table></div></section>`;
  }

  function simpleViews() {
    $('issuesView').innerHTML = '<header class="page-head"><div><span class="eyebrow">Current retest advisory</span><h1>Current Issues</h1><p>Use Test Center to record exact reproduction steps and evidence. The live issue tracker remains the source of truth.</p></div></header>';
    $('glossaryView').innerHTML = '<header class="page-head"><div><span class="eyebrow">Packaging terminology</span><h1>Glossary</h1></div></header><div class="glossary-grid"><article class="card panel"><h2>Service family</h2><p>Buyer-facing Packaging category.</p></article><article class="card panel"><h2>Pricing template</h2><p>Validated dimensions, materials, finishes, MOQ and setup rules.</p></article><article class="card panel"><h2>Proof</h2><p>Versioned artwork shared for buyer approval.</p></article><article class="card panel"><h2>Pre-Press</h2><p>Production preparation before Printing.</p></article></div>';
    $('gettingstartedView').innerHTML = '<header class="page-head"><div><span class="eyebrow">Getting started</span><h1>How to use the Academy</h1></div></header><div class="quick-grid"><article class="card panel"><h2>1. Choose a role</h2><p>Filter the relevant journey.</p></article><article class="card panel"><h2>2. Learn</h2><p>Follow each step and open the live workspace.</p></article><article class="card panel"><h2>3. Test</h2><p>Record Pass, Fail, Blocked or N/A with evidence.</p></article></div>';
  }

  function render() {
    shell(); dashboard(); lesson(false); lesson(true); testView(); reports(); simpleViews(); save();
  }

  function navigate(view) {
    state.view = view;
    render();
    $('sidebar')?.classList.remove('open');
    window.scrollTo(0, 0);
  }

  async function hydrate() {
    syncStatus('Connecting…');
    try {
      const response = await fetch(API_URL, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (response.status === 401) { syncStatus('Sign in to save', 'error'); return; }
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const payload = await response.json();
      const runs = Array.isArray(payload.runs) ? payload.runs : [];
      const run = runs.find((item) => item.id === state.runId) || runs[0];
      if (run) {
        state.runId = run.id;
        (run.packaging_test_results || []).forEach((record) => {
          state.results[record.step_id] = { ...(state.results[record.step_id] || {}), result: record.result, actual: record.actual_result || '', notes: record.notes || '', evidenceFilename: record.evidence_filename || '', serverId: record.id, linkedIssueRef: record.linked_issue_ref || '', time: record.tested_at };
        });
      }
      syncStatus('Database connected', 'ok');
      render();
    } catch (error) {
      console.error('[Packaging Academy] Server hydration failed', error);
      syncStatus('Database unavailable', 'error');
    }
  }

  async function saveResult(stepId) {
    const step = stepById(stepId);
    const result = document.querySelector('input[name="result"]:checked')?.value;
    const message = $('testMessage');
    if (!result) { message.textContent = 'Choose Pass, Fail, Blocked, or N/A.'; message.className = 'test-message error'; return; }
    const file = $('evidenceFile')?.files?.[0];
    const existing = state.results[stepId] || {};
    if ((result === 'Fail' || result === 'Blocked') && !file && !existing.evidenceFilename) { message.textContent = 'A screenshot is required for failed or blocked tests.'; message.className = 'test-message error'; return; }
    const record = { ...existing, result, actual: $('actual').value, notes: $('notes').value, tester: $('tester').value, device: $('device').value, evidenceFilename: file?.name || existing.evidenceFilename || '', time: new Date().toISOString() };
    state.results[stepId] = record; save(); message.textContent = 'Saving to workspace database…'; message.className = 'test-message';
    const form = new FormData();
    form.set('action','save_result'); if (state.runId) form.set('runId',state.runId); form.set('stepId',step.id); form.set('workflow',step.flowName); form.set('stepTitle',step.title); form.set('result',result); form.set('expectedResult',expected[step.flow] || ''); form.set('actualResult',record.actual); form.set('notes',record.notes); form.set('testerName',record.tester); form.set('testedRole',state.role); form.set('device',record.device); form.set('testedRoute',step.route || '/academy'); form.set('academyVersion',D.version || 'current'); if (file) form.set('evidence',file);
    try {
      const response = await fetch(API_URL,{ method:'POST', body:form, credentials:'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Save failed (${response.status})`);
      state.runId = payload.result.run_id;
      state.results[stepId] = { ...record, serverId: payload.result.id, evidenceFilename: payload.result.evidence_filename || record.evidenceFilename, linkedIssueRef: payload.result.linked_issue_ref || '' };
      syncStatus('Database connected','ok'); render(); toast('Test result saved.');
    } catch (error) {
      console.error('[Packaging Academy] Save failed', error);
      message.textContent = `${error.message}. The local result is preserved.`; message.className = 'test-message error'; syncStatus('Database save failed','error');
    }
  }

  function exportCsv() {
    const rows = [['Workflow','Step','Result','Actual','Notes','Screenshot','Tester','Device','Time'], ...steps.map((step) => { const r = state.results[step.id] || {}; return [step.flowName,step.title,r.result || 'Untested',r.actual || '',r.notes || '',r.evidenceFilename || '',r.tester || '',r.device || '',r.time || '']; })];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g,'""')}"`).join(',')).join('\n');
    const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'})); link.download='setu-flow-packaging-test-results.csv'; link.click(); URL.revokeObjectURL(link.href);
  }

  function openLightbox(src,title) {
    $('lightboxTitle').textContent = title || 'Screenshot'; $('openOriginal').href = src; $('lightboxCanvas').innerHTML = `<img id="lightboxImage" src="${esc(src)}" alt="${esc(title || 'Screenshot')}">`; $('lightbox').hidden = false; document.body.style.overflow='hidden';
  }
  const closeLightbox = () => { $('lightbox').hidden = true; document.body.style.overflow=''; };

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-view],[data-nav],[data-open],[data-role],[data-save-test],[data-print],[data-csv],[data-zoom-src],[data-live-route],.mode-btn,#mobileMenu,#resetProgress,#closeLightbox,#zoomIn,#zoomOut,#zoomReset');
    if (!target) return;
    if (target.matches('.mode-btn')) { state.mode = target.dataset.mode; state.view = state.mode === 'test' ? 'test' : state.view === 'test' ? 'journey' : state.view; return render(); }
    if (target.id === 'mobileMenu') { $('sidebar')?.classList.toggle('open'); return; }
    if (target.id === 'resetProgress') { if (window.confirm('Reset local Academy progress and test cache on this device?')) { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_KEY); location.reload(); } return; }
    if (target.id === 'closeLightbox') return closeLightbox();
    if (target.id === 'zoomIn' || target.id === 'zoomOut' || target.id === 'zoomReset') { const image=$('lightboxCanvas')?.querySelector('img'); if (!image) return; const current=Number(image.dataset.scale || 1); const next=target.id==='zoomReset'?1:target.id==='zoomIn'?Math.min(4,current+.25):Math.max(.25,current-.25); image.dataset.scale=String(next); image.style.transform=`scale(${next})`; image.style.transformOrigin='top left'; $('zoomReset').textContent=`${Math.round(next*100)}%`; return; }
    if (target.dataset.view || target.dataset.nav) return navigate(target.dataset.view || target.dataset.nav);
    if (target.dataset.open) { state.step=target.dataset.open; state.view=state.mode==='test'?'test':state.view==='workflows'?'workflows':'journey'; return render(); }
    if (target.dataset.role) { state.role=target.dataset.role; state.step=roleSteps()[0]?.id || steps[0].id; return render(); }
    if (target.dataset.saveTest) return saveResult(target.dataset.saveTest);
    if (target.dataset.print !== undefined) return window.print();
    if (target.dataset.csv !== undefined) return exportCsv();
    if (target.dataset.zoomSrc) return openLightbox(target.dataset.zoomSrc,target.dataset.zoomTitle);
    if (target.dataset.liveRoute) return window.open(url(target.dataset.liveRoute),'_blank','noopener');
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'roleSelect') { state.role=event.target.value; state.step=roleSteps()[0]?.id || steps[0].id; render(); }
    if (event.target.dataset?.complete) { state.done=event.target.checked?[...new Set([...state.done,event.target.dataset.complete])]:state.done.filter((id)=>id!==event.target.dataset.complete); render(); }
    if (event.target.name === 'result') { document.querySelectorAll('.results label').forEach((label)=>label.classList.toggle('selected',label.contains(event.target))); }
    if (event.target.id === 'evidenceFile') { $('evidenceName').textContent=event.target.files?.[0]?.name || 'PNG, JPG, or WebP · maximum 10 MB'; }
  });

  $('globalSearch')?.addEventListener('input', (event) => {
    const query=event.target.value.trim().toLowerCase(); const host=$('searchResults');
    if (!query) { host.hidden=true; host.innerHTML=''; return; }
    const matches=steps.filter((step)=>`${step.flowName} ${step.title} ${step.summary}`.toLowerCase().includes(query)).slice(0,12);
    host.innerHTML=matches.map((step)=>`<button type="button" data-open="${step.id}"><b>${esc(step.title)}</b><small>${esc(step.flowName)}</small></button>`).join('') || '<div>No matching steps.</div>'; host.hidden=false;
  });

  window.addEventListener('DOMContentLoaded', () => { render(); hydrate(); });
})();
