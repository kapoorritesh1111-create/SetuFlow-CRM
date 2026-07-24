(() => {
  'use strict';

  const API_URL = '/api/packaging-academy/tests';
  let identityMap = new Map();

  const labelFor = (row) => {
    const name = String(row.tester_name || '').trim();
    const email = String(row.tester_email || '').trim();
    return { name: name || email || `User ${String(row.user_id || '').slice(0, 8)}`, email };
  };

  function applyIdentities() {
    const panel = document.getElementById('academyAdminPanel');
    if (!panel || identityMap.size === 0) return;
    panel.querySelectorAll('tbody tr td:first-child strong').forEach((node) => {
      const text = node.textContent?.trim() || '';
      if (!text.startsWith('User ')) return;
      const shortId = text.slice(5).trim();
      const match = Array.from(identityMap.entries()).find(([userId]) => userId.startsWith(shortId));
      if (!match) return;
      const [, identity] = match;
      node.textContent = identity.name;
      if (identity.email) {
        const email = document.createElement('div');
        email.style.cssText = 'margin-top:3px;color:#64748b;font-size:11px;font-weight:600';
        email.textContent = identity.email;
        node.parentElement?.appendChild(email);
      }
    });
  }

  async function loadIdentities() {
    try {
      const response = await fetch(API_URL, { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      const rows = Array.isArray(payload.organizationProgress) ? payload.organizationProgress : [];
      rows.forEach((row) => {
        if (row?.user_id) identityMap.set(String(row.user_id), labelFor(row));
      });
      applyIdentities();
    } catch (error) {
      console.error('[Packaging Academy] Could not load tester identities', error);
    }
  }

  const observer = new MutationObserver(() => applyIdentities());
  window.addEventListener('DOMContentLoaded', () => {
    const dashboard = document.getElementById('dashboardView');
    if (dashboard) observer.observe(dashboard, { childList: true, subtree: true });
    window.setTimeout(loadIdentities, 250);
  });
})();