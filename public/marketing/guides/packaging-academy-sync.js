(() => {
  'use strict';

  const API_URL = '/api/packaging-academy/tests';
  const STORAGE_KEY = 'setuPackagingAcademyV5';
  const LEGACY_STORAGE_KEY = 'setuPackagingAcademyV4';
  let serverPayload = null;
  let syncing = false;
  let observerTimer = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function setStatus(text, className = '') {
    const status = document.getElementById('syncStatus');
    if (!status) return;
    status.textContent = text;
    status.className = `sync-status ${className}`.trim();
  }

  function addStyles() {
    if (document.getElementById('academy-sync-styles')) return;
    const style = document.createElement('style');
    style.id = 'academy-sync-styles';
    style.textContent = `
      .academy-auth-banner{margin:16px 24px 0;padding:14px 16px;border:1px solid #f0c36d;background:#fff8e8;border-radius:16px;display:flex;gap:14px;align-items:center;justify-content:space-between;color:#6d4b00;font:600 14px/1.4 system-ui,sans-serif}
      .academy-auth-banner a{background:#245d9f;color:#fff;text-decoration:none;padding:10px 16px;border-radius:12px;font-weight:800;white-space:nowrap}
      .academy-identity{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#e8f7ef;color:#11613a;font:700 12px system-ui,sans-serif}
      .academy-admin-panel{margin-top:20px}
      .academy-admin-panel table{width:100%;border-collapse:collapse;min-width:760px}
      .academy-admin-panel th,.academy-admin-panel td{padding:12px;border-bottom:1px solid #e5eaf1;text-align:left;font-size:13px}
      .academy-admin-panel th{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#64748b}
      .academy-admin-panel .pill{display:inline-flex;padding:4px 8px;border-radius:999px;background:#eaf2ff;color:#245d9f;font-weight:800}
      .academy-admin-panel .danger{background:#fff0f0;color:#b42318}
      @media(max-width:720px){.academy-auth-banner{margin:12px;align-items:flex-start;flex-direction:column}.academy-auth-banner a{width:100%;text-align:center}.academy-identity{display:none}}
    `;
    document.head.appendChild(style);
  }

  function showSignIn() {
    setStatus('Sign in to save', 'error');
    if (document.getElementById('academyAuthBanner')) return;
    const main = document.querySelector('.main');
    if (!main) return;
    const banner = document.createElement('div');
    banner.id = 'academyAuthBanner';
    banner.className = 'academy-auth-banner';
    banner.innerHTML = `<div><strong>Sign in to save Academy progress</strong><br>Learning progress and test results are currently stored only on this device. Any active Packaging workspace user can sign in and sync their work.</div><a href="/client-login?next=%2Facademy">Sign in to Packaging</a>`;
    main.prepend(banner);
  }

  function removeSignIn() {
    document.getElementById('academyAuthBanner')?.remove();
  }

  function showIdentity(viewer) {
    const tools = document.querySelector('.top-tools');
    if (!tools || document.getElementById('academyIdentity')) return;
    const badge = document.createElement('span');
    badge.id = 'academyIdentity';
    badge.className = 'academy-identity';
    badge.textContent = `${viewer.name || viewer.email || 'Signed in'} · ${(viewer.roles || []).join(', ') || 'Member'}`;
    tools.prepend(badge);
  }

  function mergeServerProgress(progressRows) {
    const state = readState();
    const currentRole = state.role || 'sales';
    const completed = (progressRows || [])
      .filter((row) => row.role_name === currentRole && row.is_complete)
      .map((row) => row.step_id);
    const merged = Array.from(new Set([...(Array.isArray(state.done) ? state.done : []), ...completed]));
    if (merged.length !== (state.done || []).length) {
      state.done = merged;
      writeState(state);
      if (!sessionStorage.getItem('academy-progress-reloaded')) {
        sessionStorage.setItem('academy-progress-reloaded', '1');
        location.reload();
      }
    }
  }

  function buildProgressPayload() {
    const data = window.PackagingAcademyData;
    if (!data?.steps) return [];
    const state = readState();
    const done = new Set(Array.isArray(state.done) ? state.done : []);
    const roleName = state.role || 'sales';
    return data.steps.map((step) => ({
      stepId: step.id,
      workflow: step.flowName,
      stepTitle: step.title,
      roleName,
      isComplete: done.has(step.id),
    }));
  }

  async function syncProgress() {
    if (syncing || !serverPayload?.viewer) return;
    syncing = true;
    try {
      const form = new FormData();
      form.set('action', 'sync_progress');
      form.set('progress', JSON.stringify(buildProgressPayload()));
      const response = await fetch(API_URL, { method: 'POST', body: form, credentials: 'same-origin' });
      if (response.status === 401) {
        showSignIn();
        return;
      }
      if (!response.ok) throw new Error(`Progress sync failed (${response.status})`);
      setStatus('Progress synced', 'ok');
    } catch (error) {
      console.error('[Packaging Academy] Progress sync failed', error);
      setStatus('Progress sync failed', 'error');
    } finally {
      syncing = false;
    }
  }

  function summarizeAdminData() {
    const runs = Array.isArray(serverPayload?.organizationRuns) ? serverPayload.organizationRuns : [];
    const progress = Array.isArray(serverPayload?.organizationProgress) ? serverPayload.organizationProgress : [];
    const people = new Map();

    progress.forEach((row) => {
      const key = row.user_id;
      const item = people.get(key) || { id: key, name: `User ${String(key).slice(0, 8)}`, role: row.role_name, completed: new Set(), tests: 0, failed: 0, blocked: 0, issues: 0, last: null };
      if (row.is_complete) item.completed.add(row.step_id);
      item.role = row.role_name || item.role;
      item.last = !item.last || row.updated_at > item.last ? row.updated_at : item.last;
      people.set(key, item);
    });

    runs.forEach((run) => {
      const key = run.tester_user_id || run.id;
      const item = people.get(key) || { id: key, name: run.tester_name || `User ${String(key).slice(0, 8)}`, role: run.tested_role, completed: new Set(), tests: 0, failed: 0, blocked: 0, issues: 0, last: null };
      item.name = run.tester_name || item.name;
      item.role = run.tested_role || item.role;
      (run.packaging_test_results || []).forEach((result) => {
        item.tests += 1;
        if (result.result === 'Fail') item.failed += 1;
        if (result.result === 'Blocked') item.blocked += 1;
        if (result.linked_issue_ref) item.issues += 1;
        item.last = !item.last || result.tested_at > item.last ? result.tested_at : item.last;
      });
      people.set(key, item);
    });

    return Array.from(people.values()).sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')));
  }

  function renderAdminPanel() {
    if (!serverPayload?.viewer?.canAccessAdmin) return;
    const host = document.getElementById('dashboardView');
    if (!host || document.getElementById('academyAdminPanel')) return;
    const rows = summarizeAdminData();
    const panel = document.createElement('section');
    panel.id = 'academyAdminPanel';
    panel.className = 'card panel academy-admin-panel';
    panel.innerHTML = `<div class="section-head"><div><h2>Organization testing activity</h2><p>Only Owner and Admin can see progress and results across all Packaging users.</p></div><span class="pill">${rows.length} tester${rows.length === 1 ? '' : 's'}</span></div>
      <div style="overflow:auto"><table><thead><tr><th>Tester</th><th>Role</th><th>Learning</th><th>Tests</th><th>Failed</th><th>Blocked</th><th>Issues</th><th>Last activity</th></tr></thead><tbody>${rows.length ? rows.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong></td><td>${escapeHtml(item.role || '—')}</td><td>${item.completed.size}/52</td><td>${item.tests}</td><td>${item.failed ? `<span class="pill danger">${item.failed}</span>` : '0'}</td><td>${item.blocked ? `<span class="pill danger">${item.blocked}</span>` : '0'}</td><td>${item.issues}</td><td>${item.last ? new Date(item.last).toLocaleString() : '—'}</td></tr>`).join('') : '<tr><td colspan="8">No organization testing activity has been saved yet.</td></tr>'}</tbody></table></div>`;
    host.appendChild(panel);
  }

  function scheduleAdminPanel() {
    clearTimeout(observerTimer);
    observerTimer = setTimeout(renderAdminPanel, 80);
  }

  async function initialize() {
    addStyles();
    setStatus('Connecting…');
    try {
      const response = await fetch(API_URL, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (response.status === 401) {
        showSignIn();
        return;
      }
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      serverPayload = await response.json();
      removeSignIn();
      showIdentity(serverPayload.viewer || {});
      mergeServerProgress(serverPayload.progress || []);
      setStatus('Database connected', 'ok');
      await syncProgress();
      renderAdminPanel();
    } catch (error) {
      console.error('[Packaging Academy] Sync initialization failed', error);
      setStatus('Database unavailable', 'error');
    }
  }

  document.addEventListener('change', (event) => {
    if (event.target?.matches?.('input[data-complete]') || event.target?.id === 'roleSelect') {
      window.setTimeout(syncProgress, 180);
    }
  });

  const observer = new MutationObserver(scheduleAdminPanel);
  window.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('dashboardView');
    if (dashboard) observer.observe(dashboard, { childList: true });
    window.setTimeout(initialize, 50);
  });
})();