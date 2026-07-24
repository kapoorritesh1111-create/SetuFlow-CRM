(() => {
  'use strict';

  const API_URL = '/api/packaging-academy/tests';
  const STORAGE_KEY = 'setuPackagingAcademyV5';
  const LEGACY_STORAGE_KEY = 'setuPackagingAcademyV4';
  let syncing = false;

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) || '{}');
    } catch {
      return {};
    }
  }

  function setStatus(message, type = '') {
    const status = document.getElementById('syncStatus');
    if (!status) return;
    status.textContent = message;
    status.className = `sync-status ${type}`.trim();
  }

  function addResponsiveStyles() {
    if (document.getElementById('academy-experience-styles')) return;
    const style = document.createElement('style');
    style.id = 'academy-experience-styles';
    style.textContent = `
      .academy-sync-button{min-height:34px;border:1px solid #b9cbe0;border-radius:10px;background:#fff;color:#245d9f;padding:0 12px;font-weight:800;font-size:12px;white-space:nowrap}
      .academy-sync-button:hover{background:#edf4fb;border-color:#7fa2c9}
      .academy-sync-button:disabled{opacity:.6;cursor:wait}
      .main{padding:20px clamp(14px,2vw,28px)}
      .view{max-width:none;width:100%;margin:0}
      .learning-layout,.test-layout{width:100%;grid-template-columns:minmax(230px,280px) minmax(0,1fr)}
      .lesson-grid{grid-template-columns:minmax(250px,.62fr) minmax(460px,1.38fr)}
      .lesson{min-width:0}
      .lesson-body{min-width:0}
      .shot-button{min-height:0;aspect-ratio:16/9}
      .shot-button img{width:100%;height:100%;object-fit:contain;background:#f8fafc}
      @media(min-width:1500px){
        .learning-layout,.test-layout{grid-template-columns:300px minmax(0,1fr)}
        .lesson-grid{grid-template-columns:minmax(320px,.7fr) minmax(620px,1.3fr);gap:22px}
        .lesson-head{padding-left:24px;padding-right:24px}
        .lesson-body{padding:24px}
      }
      @media(max-width:1100px){
        .learning-layout,.test-layout{grid-template-columns:230px minmax(0,1fr)}
        .lesson-grid{grid-template-columns:1fr}
      }
      @media(max-width:760px){
        .academy-sync-button{width:100%}
        .top-tools{flex-wrap:wrap}
        .learning-layout,.test-layout{display:block}
        .lesson-nav{max-height:260px;border-right:0;border-bottom:1px solid var(--line)}
      }
    `;
    document.head.appendChild(style);
  }

  function buildProgressPayload() {
    const state = readState();
    const data = window.PackagingAcademyData;
    if (!data?.steps) return [];
    const completed = new Set(Array.isArray(state.done) ? state.done : []);
    const roleName = state.role || 'sales';
    return data.steps.map((step) => ({
      stepId: step.id,
      workflow: step.flowName,
      stepTitle: step.title,
      roleName,
      isComplete: completed.has(step.id),
    }));
  }

  async function syncProgress(button) {
    if (syncing) return;
    syncing = true;
    if (button) button.disabled = true;
    setStatus('Syncing…');
    try {
      const form = new FormData();
      form.set('action', 'sync_progress');
      form.set('progress', JSON.stringify(buildProgressPayload()));
      const response = await fetch(API_URL, { method: 'POST', body: form, credentials: 'same-origin' });
      const payload = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setStatus('Sign in to save', 'error');
        window.location.href = '/client-login?next=%2Facademy';
        return;
      }
      if (!response.ok) throw new Error(payload.error || `Sync failed (${response.status})`);
      setStatus('Progress synced', 'ok');
      if (button) {
        const original = button.textContent;
        button.textContent = `Synced ${payload.saved ?? 0} steps`;
        window.setTimeout(() => { button.textContent = original; }, 1800);
      }
    } catch (error) {
      console.error('[Packaging Academy] Manual sync failed', error);
      setStatus('Sync failed', 'error');
    } finally {
      syncing = false;
      if (button) button.disabled = false;
    }
  }

  function ensureSyncButton() {
    const tools = document.querySelector('.top-tools');
    if (!tools || document.getElementById('academySyncButton')) return;
    const button = document.createElement('button');
    button.id = 'academySyncButton';
    button.type = 'button';
    button.className = 'academy-sync-button';
    button.textContent = 'Sync Progress';
    button.addEventListener('click', () => syncProgress(button));
    const status = document.getElementById('syncStatus');
    tools.insertBefore(button, status || tools.firstChild);
  }

  function autoAdvance(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || !target.matches('input[data-complete]') || !target.checked) return;
    window.setTimeout(() => {
      const visibleView = Array.from(document.querySelectorAll('.view')).find((view) => !view.hidden);
      const next = visibleView?.querySelector('.lesson-foot .btn.primary:not([disabled])');
      if (next instanceof HTMLButtonElement) next.click();
    }, 180);
  }

  window.addEventListener('DOMContentLoaded', () => {
    addResponsiveStyles();
    ensureSyncButton();
    document.addEventListener('change', autoAdvance);
    window.setTimeout(ensureSyncButton, 500);
  });
})();