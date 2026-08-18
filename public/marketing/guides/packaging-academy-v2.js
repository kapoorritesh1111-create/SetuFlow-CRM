(() => {
  'use strict';

  const D = window.PackagingAcademyData;
  if (!D) throw new Error('Packaging Academy data failed to load.');
  const PACKAGING_ORIGIN = D.origin;
  const API_URL = D.api;
  const STORAGE_KEY = 'setuPackagingAcademyV5';
  const LEGACY_STORAGE_KEY = 'setuPackagingAcademyV4';
  const { roles, flows, steps, instructions, expected, mistakes, files, evidenceForStep } = D;
  if (steps.length !== 52) throw new Error('Packaging Academy must contain 52 steps');

  const roleIcons = {
    sales: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    design: '<svg viewBox="0 0 24 24"><path d="m4 20 4-1 11-11-3-3L5 16l-1 4Zm10-13 3 3"/></svg>',
    operations: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1L14.5 3h-5L9 6a8 8 0 0 0-1.7 1L5 6 3 9.5 5.1 11A7 7 0 0 0 5 12c0 .4 0 .7.1 1L3 14.5 5 18l2.3-1a8 8 0 0 0 1.7 1l.5 3h5l.5-3a8 8 0 0 0 1.7-1l2.3 1 2-3.5-2.1-1.5c.1-.3.1-.7.1-1Z"/></svg>',
    ordering: '<svg viewBox="0 0 24 24"><path d="M3 5h2l2 11h11l2-7H7M9 21h.01M17 21h.01"/></svg>',
    admin: '<svg viewBox="0 0 24 24"><path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7l-8-4Z"/><path d="m9 12 2 2 4-4"/></svg>',
    viewer: '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
  };

  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const liveUrl = (route) => `${PACKAGING_ORIGIN}${route.startsWith('/') ? route : `/${route}`}`;

  function loadState() {
    let loaded = {};
    try {
      loaded = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
    } catch {
      loaded = {};
    }
    const normalizedResults = {};
    Object.entries(loaded.results || {}).forEach(([key, value]) => {
      const record = value || {};
      const resultMap = { pass: 'Pass', fail: 'Fail', blocked: 'Blocked', na: 'N/A' };
      normalizedResults[key] = { ...record, result: resultMap[record.result] || record.result };
    });
    return {
      view: loaded.view || 'dashboard',
      mode: loaded.mode || 'learn',
      role: loaded.role || 'sales',
      step: loaded.step || 'capture-1',
      done: Array.isArray(loaded.done) ? loaded.done : [],
      results: normalizedResults,
      runId: loaded.runId || null,
    };
  }

  const state = loadState();
  const saveState = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const byId = (id) => steps.find((step) => step.id === id) || steps[0];
  const roleSteps = () => steps.filter((step) => roles[state.role].flows.includes(step.flow));
  const progress = (items) => {
    const done = items.filter((step) => state.done.includes(step.id)).length;
    return { done, total: items.length, percent: items.length ? Math.round((done / items.length) * 100) : 0 };
  };
  const showToast = (message) => {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2600);
  };
  const setSyncStatus = (text, className = '') => {
    const element = $('syncStatus');
    element.textContent = text;
    element.className = `sync-status ${className}`.trim();
  };

  function shell() {
    $('roleSelect').innerHTML = Object.entries(roles).map(([key, role]) => `<option value="${key}" ${key === state.role ? 'selected' : ''}>Role: ${escapeHtml(role.name)}</option>`).join('');
    document.querySelectorAll('.mode-btn').forEach((button) => button.classList.toggle('active', button.dataset.mode === state.mode));
    document.querySelectorAll('[data-view]').forEach((button) => button.classList.toggle('active', button.dataset.view === state.view));
    document.querySelectorAll('.view').forEach((view) => { view.hidden = true; });
    const activeView = $(`${state.view.replace('-', '')}View`);
    if (activeView) activeView.hidden = false;
  }

  function screenshotMarkup(evidence) {
    if (!evidence) {
      return `<div class="placeholder"><img src="/logos/setu-flow-logo.svg" alt="Setu Flow"><b>Use the live packaging workspace</b><span>No dedicated screenshot has been captured for this step yet.</span></div>`;
    }
    return `<div class="shot-shell">
      <button class="shot-button" type="button" data-zoom-src="${escapeHtml(evidence.src)}" data-zoom-title="${escapeHtml(evidence.title)}">
        <img src="${escapeHtml(evidence.src)}" alt="${escapeHtml(evidence.title)}" loading="eager">
      </button>
      ${evidence.markers.map((marker, index) => `<button type="button" class="hotspot" style="left:${marker.x}%;top:${marker.y}%" data-label="${escapeHtml(marker.label)}" data-live-route="${escapeHtml(marker.route)}" aria-label="${escapeHtml(marker.label)}">${index + 1}</button>`).join('')}
      <div class="shot-caption">Full-resolution 2048 px evidence. Click the image to zoom; numbered markers identify the relevant controls.</div>
    </div>`;
  }

  function dashboard() {
    const p = progress(roleSteps());
    const role = roles[state.role];
    const preview = { src: files.dashboard, title: 'Packaging workspace dashboard', markers: [{ x: 85.5, y: 2.5, label: 'Quick Lead', route: '/leads' }, { x: 4.2, y: 15, label: 'Capture', route: '/contact-exchange/scan' }] };
    $('dashboardView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Packaging workspace training</span><h1>Welcome to Setu Flow Packaging Academy</h1><p>Learn the workflow, practice every action and record structured client testing results.</p></div><button class="btn primary" data-open="${state.step}">Continue journey</button></header>
      <div class="metrics">
        <article class="card hero"><img class="hero-logo" src="/logos/setu-flow-logo.svg" alt="Setu Flow logo"><div><h2>${escapeHtml(role.name)} learning journey</h2><p>${escapeHtml(role.description)}</p></div></article>
        <article class="card metric"><span>Overall progress</span><strong>${p.percent}%</strong><div class="bar"><i style="width:${p.percent}%"></i></div></article>
        <article class="card metric"><span>Tests recorded</span><strong>${Object.keys(state.results).length} / 52</strong></article>
      </div>
      <section class="card panel"><div class="section-head"><div><h2>Choose your role</h2><p>See only the workflows and permissions relevant to that role.</p></div></div><div class="role-grid">${Object.entries(roles).map(([key, item]) => `<button class="role-card ${key === state.role ? 'active' : ''}" data-role="${key}"><span class="role-icon">${roleIcons[key]}</span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description)}</small></button>`).join('')}</div></section>
      <section class="card panel"><div class="section-head"><div><h2>Recommended journey</h2><p>${p.done} of ${p.total} steps complete</p></div></div><div class="journey-strip">${role.flows.map((id, index) => { const flow = flows.find((item) => item.id === id); const q = progress(flow.steps); return `<button class="journey-node ${q.percent === 100 ? 'done' : ''}" data-open="${flow.steps[0].id}"><b>${index + 1}</b><span>${escapeHtml(flow.name)}</span><small>${q.done}/${q.total}</small></button>`; }).join('')}</div></section>
      <section class="card panel"><div class="section-head"><div><h2>Packaging workspace preview</h2><p>The uploaded production screenshot is shown at its original resolution in the zoom viewer.</p></div></div>${screenshotMarkup(preview)}</section>`;
  }

  function nav(items) {
    const flowIds = new Set(items.map((step) => step.flow));
    return `<aside class="lesson-nav">${flows.filter((flow) => flowIds.has(flow.id)).map((flow, flowIndex) => `<div class="flow-nav"><h3><span>${flowIndex + 1}</span>${escapeHtml(flow.name)}</h3>${flow.steps.map((step, stepIndex) => `<button class="lesson-link ${step.id === state.step ? 'active' : ''} ${state.done.includes(step.id) ? 'done' : ''}" data-open="${step.id}">${flowIndex + 1}.${stepIndex + 1} ${escapeHtml(step.title)}</button>`).join('')}</div>`).join('')}</aside>`;
  }

  function lesson(all = false) {
    const list = all ? steps : roleSteps();
    if (!list.some((step) => step.id === state.step)) state.step = list[0].id;
    const step = byId(state.step);
    const flow = flows.find((item) => item.id === step.flow);
    const position = list.findIndex((item) => item.id === step.id);
    const evidence = evidenceForStep(step);
    const body = `<div class="lesson-head"><div class="crumb">${escapeHtml(step.flowName)} / Step ${step.index + 1} of ${flow.steps.length}</div><div class="title-row"><div><h1>${escapeHtml(step.title)}</h1><p>${escapeHtml(step.summary)}</p></div><a class="btn" target="_blank" rel="noopener" href="${liveUrl(step.route)}">Open in Setu Flow ↗</a></div></div>
      <div class="lesson-body"><div class="lesson-grid"><ol class="instructions">${instructions[step.flow].map((instruction) => `<li><b>${escapeHtml(instruction)}</b><p>Confirm the visible saved state before moving to the next action.</p></li>`).join('')}</ol><div>${screenshotMarkup(evidence)}</div></div><div class="callouts"><div class="callout success"><h3>Expected result</h3><p>${escapeHtml(expected[step.flow])}</p></div><div class="callout"><h3>Common mistakes</h3><ul>${mistakes[step.flow].map((mistake) => `<li>${escapeHtml(mistake)}</li>`).join('')}</ul></div></div></div>
      <footer class="lesson-foot"><button class="btn" data-open="${position ? list[position - 1].id : step.id}" ${position ? '' : 'disabled'}>← Previous</button><label><input type="checkbox" data-complete="${step.id}" ${state.done.includes(step.id) ? 'checked' : ''}> Mark step complete</label><button class="btn primary" data-open="${position < list.length - 1 ? list[position + 1].id : step.id}" ${position < list.length - 1 ? '' : 'disabled'}>Next →</button></footer>`;
    $(`${all ? 'workflows' : 'journey'}View`).innerHTML = `<div class="learning-layout">${nav(list)}<article class="lesson">${body}</article></div>`;
  }

  function test() {
    const step = byId(state.step);
    const record = state.results[step.id] || {};
    const requiresScreenshot = record.result === 'Fail' || record.result === 'Blocked';
    const issueAction = (record.result === 'Fail' || record.result === 'Blocked') && record.serverId && !record.linkedIssueRef
      ? `<button class="btn danger" data-create-issue="${record.serverId}">Create Sprint 49 Issue</button>`
      : '';
    const issueBadge = record.linkedIssueRef ? `<span class="issue-badge">Issue ${escapeHtml(record.linkedIssueRef)}</span>` : '';
    $('testView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Structured client testing</span><h1>Test Center</h1><p>Results save to the Packaging workspace database. Failed or blocked tests require screenshot evidence.</p></div><button class="btn" data-nav="reports">View report</button></header>
      <div class="test-layout">${nav(steps)}<section class="card test-form"><div class="crumb">${escapeHtml(step.flowName)} / Test ${step.index + 1}</div><h2>${escapeHtml(step.title)}</h2><p>${escapeHtml(step.summary)}</p><div class="expected"><b>Expected result</b><p>${escapeHtml(expected[step.flow])}</p></div>
        <h3>Result</h3><div class="results">${['Pass', 'Fail', 'Blocked', 'N/A'].map((result) => `<label class="${record.result === result ? 'selected' : ''}"><input type="radio" name="result" value="${result}" ${record.result === result ? 'checked' : ''}>${result}</label>`).join('')}</div>
        <label class="field">Actual result<textarea id="actual">${escapeHtml(record.actual || '')}</textarea></label>
        <label class="field">Notes / issue details<textarea id="notes">${escapeHtml(record.notes || '')}</textarea></label>
        <div class="form-grid"><label class="field">Tester<input id="tester" value="${escapeHtml(record.tester || '')}" placeholder="Your name"></label><label class="field">Browser / device<input id="device" value="${escapeHtml(record.device || navigator.userAgent)}"></label></div>
        <label id="evidenceField" class="field evidence-field ${requiresScreenshot ? 'required' : ''}">${requiresScreenshot ? 'Screenshot evidence (required)' : 'Screenshot evidence (optional)'}<input id="evidenceFile" type="file" accept="image/png,image/jpeg,image/webp"><span id="evidenceName">${escapeHtml(record.evidenceFilename || 'PNG, JPG, or WebP · maximum 10 MB')}</span><img id="evidencePreview" class="evidence-preview" hidden alt="Selected screenshot preview"></label>
        <div class="test-actions"><button class="btn primary" data-save-test="${step.id}">Save test result</button>${issueAction}${issueBadge}<span id="testMessage" class="test-message">${record.serverId ? 'Saved in workspace database.' : 'Not yet saved to database.'}</span></div>
      </section></div>`;
  }

  function reports() {
    const counts = { Pass: 0, Fail: 0, Blocked: 0, 'N/A': 0 };
    steps.forEach((step) => { const result = state.results[step.id]?.result; if (result && Object.prototype.hasOwnProperty.call(counts, result)) counts[result] += 1; });
    const recorded = Object.values(counts).reduce((sum, value) => sum + value, 0);
    const detailRows = steps.filter((step) => state.results[step.id]).map((step) => {
      const record = state.results[step.id];
      const css = record.result === 'N/A' ? 'na' : record.result.toLowerCase();
      const action = (record.result === 'Fail' || record.result === 'Blocked') && record.serverId && !record.linkedIssueRef
        ? `<button class="btn danger" data-create-issue="${record.serverId}">Create Sprint 49 Issue</button>`
        : record.linkedIssueRef ? `<span class="issue-badge">${escapeHtml(record.linkedIssueRef)}</span>` : '';
      return `<tr><td>${escapeHtml(step.flowName)}</td><td>${escapeHtml(step.title)}</td><td><span class="result-pill ${css}">${escapeHtml(record.result)}</span></td><td>${escapeHtml(record.actual || '')}</td><td>${record.evidenceFilename ? escapeHtml(record.evidenceFilename) : '—'}</td><td>${action}</td></tr>`;
    }).join('');
    $('reportsView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Acceptance test evidence</span><h1>Test Summary</h1><p>Database-backed results for the current test run, with local cache for continuity.</p></div><div><button class="btn" data-print>Print / PDF</button><button class="btn primary" data-csv>Export CSV</button></div></header>
      <div class="summary-grid">${[['Total', 52], ['Passed', counts.Pass], ['Failed', counts.Fail], ['Blocked', counts.Blocked], ['N/A', counts['N/A']], ['Untested', 52 - recorded]].map(([label, value]) => `<article class="card summary"><span>${label}</span><strong>${value}</strong></article>`).join('')}</div>
      <section class="card panel"><h2>Recorded results</h2><div style="overflow:auto"><table><thead><tr><th>Workflow</th><th>Step</th><th>Result</th><th>Actual result</th><th>Screenshot</th><th>Issue</th></tr></thead><tbody>${detailRows || '<tr><td colspan="6">No tests recorded yet.</td></tr>'}</tbody></table></div></section>`;
  }

  function simpleViews() {
    const issues = [['P0', 'Approval lock can block the correct next action'], ['P1', 'Quote can show a ghost generic product or mixed currencies'], ['P1', 'Pricing step may show the wrong line name'], ['P1', 'Design Queue can show stale artwork status'], ['P2', 'MOQ feedback needs clearer alternatives'], ['P2', 'Copy approval link needs visible success feedback']];
    $('issuesView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Current retest advisory</span><h1>Known Issues</h1><p>Use these during testing; the live issue tracker remains the source of truth.</p></div></header><div class="issue-list">${issues.map(([severity, title]) => `<article class="card issue"><b class="severity">${severity}</b><div><h2>${escapeHtml(title)}</h2><p>Capture the exact reproduction path and screenshot evidence in Test Center.</p></div></article>`).join('')}</div>`;
    const terms = [['Service family', 'Buyer-facing packaging category.'], ['Pricing template', 'Validated dimensions, materials, finishes, MOQ and setup rules.'], ['Reference library', 'Controlled materials, finishes and services.'], ['Proof', 'Versioned artwork shared for buyer approval.'], ['Pre-press', 'Production preparation after approval.'], ['Order handoff', 'Controlled transition from accepted quote to execution.']];
    $('glossaryView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Packaging terminology</span><h1>Glossary</h1></div></header><div class="glossary-grid">${terms.map(([term, description]) => `<article class="card panel"><h2>${term}</h2><p>${description}</p></article>`).join('')}</div>`;
    $('gettingstartedView').innerHTML = `<header class="page-head"><div><span class="eyebrow">Getting started</span><h1>How to use the Academy</h1></div></header><div class="quick-grid">${[['Choose a role', 'Filter the relevant journey and permissions.'], ['Learn with marked screenshots', 'Follow each step, use the markers, and zoom the full-resolution evidence.'], ['Test and capture evidence', 'Record Pass, Fail, Blocked, or N/A. Failed and blocked results require a screenshot.'], ['Create Sprint 49 issues', 'Turn saved failures into linked sprint issues without retyping the details.']].map(([title, description], index) => `<article class="card panel"><h2>${index + 1}. ${title}</h2><p>${description}</p></article>`).join('')}</div>`;
  }

  function render() {
    shell();
    dashboard();
    lesson(false);
    lesson(true);
    test();
    reports();
    simpleViews();
    saveState();
  }

  function navigate(view) {
    state.view = view;
    render();
    $('sidebar').classList.remove('open');
    window.scrollTo(0, 0);
  }

  async function hydrateServerResults() {
    setSyncStatus('Connecting…');
    try {
      const response = await fetch(API_URL, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (response.status === 401) {
        setSyncStatus('Sign in to save', 'error');
        return;
      }
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const payload = await response.json();
      const runs = Array.isArray(payload.runs) ? payload.runs : [];
      const run = runs.find((item) => item.id === state.runId) || runs[0];
      if (run) {
        state.runId = run.id;
        (run.packaging_test_results || []).forEach((record) => {
          state.results[record.step_id] = {
            ...(state.results[record.step_id] || {}),
            result: record.result,
            actual: record.actual_result || '',
            notes: record.notes || '',
            evidenceFilename: record.evidence_filename || '',
            serverId: record.id,
            linkedIssueRef: record.linked_issue_ref || '',
            time: record.tested_at,
          };
        });
      }
      setSyncStatus('Database connected', 'ok');
      render();
    } catch (error) {
      console.error('[Packaging Academy] Could not load server results', error);
      setSyncStatus('Database unavailable', 'error');
    }
  }

  async function saveTestResult(stepId) {
    const step = byId(stepId);
    const result = document.querySelector('input[name="result"]:checked')?.value;
    const message = $('testMessage');
    if (!result) {
      message.textContent = 'Choose Pass, Fail, Blocked, or N/A.';
      message.className = 'test-message error';
      return;
    }
    const file = $('evidenceFile').files?.[0];
    const existing = state.results[stepId] || {};
    if ((result === 'Fail' || result === 'Blocked') && !file && !existing.evidenceFilename) {
      message.textContent = 'A screenshot is required for failed or blocked tests.';
      message.className = 'test-message error';
      return;
    }

    const localRecord = {
      ...existing,
      result,
      actual: $('actual').value,
      notes: $('notes').value,
      tester: $('tester').value,
      device: $('device').value,
      evidenceFilename: file?.name || existing.evidenceFilename || '',
      time: new Date().toISOString(),
    };
    state.results[stepId] = localRecord;
    saveState();
    message.textContent = 'Saving to workspace database…';
    message.className = 'test-message';

    const form = new FormData();
    form.set('action', 'save_result');
    if (state.runId) form.set('runId', state.runId);
    form.set('stepId', step.id);
    form.set('workflow', step.flowName);
    form.set('stepTitle', step.title);
    form.set('result', result);
    form.set('expectedResult', expected[step.flow]);
    form.set('actualResult', localRecord.actual);
    form.set('notes', localRecord.notes);
    form.set('testerName', localRecord.tester);
    form.set('testedRole', state.role);
    form.set('device', localRecord.device);
    if (file) form.set('evidence', file);

    try {
      const response = await fetch(API_URL, { method: 'POST', body: form, credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Save failed (${response.status})`);
      state.runId = payload.result.run_id;
      state.results[stepId] = {
        ...localRecord,
        serverId: payload.result.id,
        evidenceFilename: payload.result.evidence_filename || localRecord.evidenceFilename,
        linkedIssueRef: payload.result.linked_issue_ref || localRecord.linkedIssueRef || '',
      };
      saveState();
      setSyncStatus('Database connected', 'ok');
      render();
      showToast('Test result saved to the workspace database.');
    } catch (error) {
      console.error('[Packaging Academy] Save failed', error);
      message.textContent = `${error.message}. The result remains in this browser.`;
      message.className = 'test-message error';
      setSyncStatus('Database save failed', 'error');
    }
  }

  async function createIssue(resultId) {
    const message = $('testMessage');
    if (message) {
      message.textContent = 'Creating Sprint 49 issue…';
      message.className = 'test-message';
    }
    const form = new FormData();
    form.set('action', 'create_issue');
    form.set('resultId', resultId);
    form.set('device', $('device')?.value || navigator.userAgent);
    try {
      const response = await fetch(API_URL, { method: 'POST', body: form, credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || `Issue creation failed (${response.status})`);
      Object.values(state.results).forEach((record) => {
        if (record.serverId === resultId) record.linkedIssueRef = payload.issueRef;
      });
      saveState();
      render();
      showToast(`Created Sprint 49 issue ${payload.issueRef}.`);
    } catch (error) {
      console.error('[Packaging Academy] Issue creation failed', error);
      if (message) {
        message.textContent = error.message;
        message.className = 'test-message error';
      } else {
        window.alert(error.message);
      }
    }
  }

  function exportCsv() {
    const rows = [['Workflow', 'Step', 'Result', 'Actual', 'Notes', 'Screenshot', 'Tester', 'Device', 'Time', 'Sprint issue'], ...steps.map((step) => {
      const record = state.results[step.id] || {};
      return [step.flowName, step.title, record.result || 'Untested', record.actual || '', record.notes || '', record.evidenceFilename || '', record.tester || '', record.device || '', record.time || '', record.linkedIssueRef || ''];
    })];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'setu-flow-packaging-test-results.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  let lightboxScale = 1;
  let naturalWidth = 2048;
  function setLightboxScale(nextScale) {
    lightboxScale = Math.min(4, Math.max(.2, nextScale));
    const image = $('lightboxCanvas').querySelector('img');
    if (!image) return;
    const width = Math.round(naturalWidth * lightboxScale);
    image.style.width = `${width}px`;
    $('lightboxCanvas').style.width = `${width}px`;
    $('zoomReset').textContent = `${Math.round(lightboxScale * 100)}%`;
  }
  function fitLightbox() {
    const available = Math.max(320, $('lightboxViewport').clientWidth - 48);
    setLightboxScale(Math.min(1, available / naturalWidth));
  }
  function openLightbox(src, title) {
    const step = byId(state.step);
    const evidence = evidenceForStep(step) || { src, title, markers: [] };
    $('lightboxTitle').textContent = title;
    $('openOriginal').href = src;
    $('lightboxCanvas').innerHTML = `<img id="lightboxImage" src="${escapeHtml(src)}" alt="${escapeHtml(title)}">${evidence.markers.map((marker, index) => `<button type="button" class="hotspot" style="left:${marker.x}%;top:${marker.y}%" data-label="${escapeHtml(marker.label)}" data-live-route="${escapeHtml(marker.route)}" aria-label="${escapeHtml(marker.label)}">${index + 1}</button>`).join('')}`;
    $('lightbox').hidden = false;
    document.body.style.overflow = 'hidden';
    const image = $('lightboxImage');
    image.addEventListener('load', () => {
      naturalWidth = image.naturalWidth || 2048;
      fitLightbox();
    }, { once: true });
    $('closeLightbox').focus();
  }
  function closeLightbox() {
    $('lightbox').hidden = true;
    document.body.style.overflow = '';
  }

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-view],[data-nav],[data-open],[data-role],[data-save-test],[data-create-issue],[data-print],[data-csv],[data-zoom-src],[data-live-route]');
    if (!target) return;
    if (target.dataset.view || target.dataset.nav) return navigate(target.dataset.view || target.dataset.nav);
    if (target.dataset.open) {
      state.step = target.dataset.open;
      state.view = state.mode === 'test' ? 'test' : state.view === 'workflows' ? 'workflows' : 'journey';
      return render();
    }
    if (target.dataset.role) {
      state.role = target.dataset.role;
      state.step = roleSteps()[0].id;
      return render();
    }
    if (target.dataset.saveTest) return saveTestResult(target.dataset.saveTest);
    if (target.dataset.createIssue) return createIssue(target.dataset.createIssue);
    if (target.dataset.print !== undefined) return window.print();
    if (target.dataset.csv !== undefined) return exportCsv();
    if (target.dataset.zoomSrc) return openLightbox(target.dataset.zoomSrc, target.dataset.zoomTitle || 'Screenshot');
    if (target.dataset.liveRoute) return window.open(liveUrl(target.dataset.liveRoute), '_blank', 'noopener');
  });

  document.addEventListener('change', (event) => {
    if (event.target.id === 'roleSelect') {
      state.role = event.target.value;
      state.step = roleSteps()[0].id;
      render();
    }
    if (event.target.dataset.complete) {
      state.done = event.target.checked ? [...new Set([...state.done, event.target.dataset.complete])] : state.done.filter((id) => id !== event.target.dataset.complete);
      render();
    }
    if (event.target.name === 'result') {
      const selected = event.target.value;
      const field = $('evidenceField');
      const required = selected === 'Fail' || selected === 'Blocked';
      field.classList.toggle('required', required);
      document.querySelectorAll('.results label').forEach((label) => label.classList.toggle('selected', label.contains(event.target)));
    }
    if (event.target.id === 'evidenceFile') {
      const file = event.target.files?.[0];
      $('evidenceName').textContent = file ? file.name : 'PNG, JPG, or WebP · maximum 10 MB';
      const preview = $('evidencePreview');
      if (file) {
        preview.src = URL.createObjectURL(file);
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }
    }
  });

  document.querySelectorAll('.mode-btn').forEach((button) => button.addEventListener('click', () => {
    state.mode = button.dataset.mode;
    state.view = state.mode === 'test' ? 'test' : 'journey';
    render();
  }));
  $('mobileMenu').addEventListener('click', () => $('sidebar').classList.toggle('open'));
  $('resetProgress').addEventListener('click', () => {
    if (window.confirm('Reset local learning progress and the current local test cache? Database records will not be deleted.')) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      window.location.reload();
    }
  });
  $('globalSearch').addEventListener('input', (event) => {
    const query = event.target.value.trim().toLowerCase();
    const box = $('searchResults');
    if (query.length < 2) {
      box.hidden = true;
      return;
    }
    const matches = steps.filter((step) => `${step.title} ${step.summary} ${step.flowName}`.toLowerCase().includes(query)).slice(0, 8);
    box.innerHTML = matches.map((step) => `<button data-open="${step.id}"><b>${escapeHtml(step.title)}</b><span>${escapeHtml(step.flowName)}</span></button>`).join('') || '<p>No matching steps.</p>';
    box.hidden = false;
  });

  $('closeLightbox').addEventListener('click', closeLightbox);
  $('zoomIn').addEventListener('click', () => setLightboxScale(lightboxScale + .2));
  $('zoomOut').addEventListener('click', () => setLightboxScale(lightboxScale - .2));
  $('zoomReset').addEventListener('click', fitLightbox);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !$('lightbox').hidden) closeLightbox();
    if (!$('lightbox').hidden && (event.key === '+' || event.key === '=')) setLightboxScale(lightboxScale + .2);
    if (!$('lightbox').hidden && event.key === '-') setLightboxScale(lightboxScale - .2);
  });

  render();
  hydrateServerResults();
})();