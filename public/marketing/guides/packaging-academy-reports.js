(() => {
  'use strict';

  const API_URL = '/api/packaging-academy/tests';
  let payload = null;
  let refreshTimer = null;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character]));

  function summarize() {
    const progress = Array.isArray(payload?.organizationProgress) ? payload.organizationProgress : [];
    const runs = Array.isArray(payload?.organizationRuns) ? payload.organizationRuns : [];
    const people = new Map();

    progress.forEach((row) => {
      const key = String(row.user_id || '');
      if (!key) return;
      const current = people.get(key) || {
        id: key,
        name: row.tester_name || row.tester_email || `User ${key.slice(0, 8)}`,
        email: row.tester_email || '',
        role: row.role_name || 'Member',
        completed: new Set(),
        tests: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        issues: 0,
        last: null,
      };
      current.name = row.tester_name || current.name;
      current.email = row.tester_email || current.email;
      current.role = row.role_name || current.role;
      if (row.is_complete) current.completed.add(row.step_id);
      if (!current.last || String(row.updated_at) > String(current.last)) current.last = row.updated_at;
      people.set(key, current);
    });

    runs.forEach((run) => {
      const key = String(run.tester_user_id || run.id || '');
      if (!key) return;
      const current = people.get(key) || {
        id: key,
        name: run.tester_name || `User ${key.slice(0, 8)}`,
        email: '',
        role: run.tested_role || 'Member',
        completed: new Set(),
        tests: 0,
        passed: 0,
        failed: 0,
        blocked: 0,
        issues: 0,
        last: null,
      };
      current.name = run.tester_name || current.name;
      current.role = run.tested_role || current.role;
      (run.packaging_test_results || []).forEach((result) => {
        current.tests += 1;
        if (result.result === 'Pass') current.passed += 1;
        if (result.result === 'Fail') current.failed += 1;
        if (result.result === 'Blocked') current.blocked += 1;
        if (result.linked_issue_ref) current.issues += 1;
        if (!current.last || String(result.tested_at) > String(current.last)) current.last = result.tested_at;
      });
      people.set(key, current);
    });

    return Array.from(people.values())
      .filter((item) => item.completed.size > 0 || item.tests > 0)
      .sort((a, b) => String(b.last || '').localeCompare(String(a.last || '')));
  }

  function render() {
    if (!payload?.viewer?.canAccessAdmin) return;
    const host = document.getElementById('reportsView');
    if (!host) return;
    document.getElementById('academyOrganizationReport')?.remove();

    const rows = summarize();
    const section = document.createElement('section');
    section.id = 'academyOrganizationReport';
    section.className = 'card panel academy-admin-panel';
    section.innerHTML = `
      <div class="section-head">
        <div>
          <h2>Organization testing activity</h2>
          <p>Owner and Admin can track learning progress, submitted tests, failures, blockers and linked Sprint 49 issues across the Packaging workspace.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <span class="pill">${rows.length} active tester${rows.length === 1 ? '' : 's'}</span>
          <button type="button" class="btn" id="refreshOrganizationTesting">Refresh</button>
        </div>
      </div>
      <div style="overflow:auto">
        <table>
          <thead><tr><th>Tester</th><th>Role</th><th>Learning</th><th>Tests</th><th>Passed</th><th>Failed</th><th>Blocked</th><th>Issues</th><th>Last activity</th></tr></thead>
          <tbody>${rows.length ? rows.map((item) => `
            <tr>
              <td><strong>${escapeHtml(item.name)}</strong>${item.email ? `<div style="margin-top:3px;color:#64748b;font-size:11px;font-weight:600">${escapeHtml(item.email)}</div>` : ''}</td>
              <td>${escapeHtml(item.role || '—')}</td>
              <td><strong>${item.completed.size}/52</strong></td>
              <td>${item.tests}</td>
              <td>${item.passed}</td>
              <td>${item.failed ? `<span class="pill danger">${item.failed}</span>` : '0'}</td>
              <td>${item.blocked ? `<span class="pill danger">${item.blocked}</span>` : '0'}</td>
              <td>${item.issues}</td>
              <td>${item.last ? new Date(item.last).toLocaleString() : '—'}</td>
            </tr>`).join('') : '<tr><td colspan="9">No organization testing activity has been saved yet.</td></tr>'}</tbody>
        </table>
      </div>`;

    host.appendChild(section);
    document.getElementById('refreshOrganizationTesting')?.addEventListener('click', load);
  }

  async function load() {
    try {
      const response = await fetch(API_URL, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      payload = await response.json();
      render();
    } catch (error) {
      console.error('[Packaging Academy] Could not load organization report', error);
    }
  }

  function schedule() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => {
      if (payload) render();
    }, 60);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const reports = document.getElementById('reportsView');
    if (reports) new MutationObserver(schedule).observe(reports, { childList: true, subtree: true });
    window.setTimeout(load, 250);
  });
})();