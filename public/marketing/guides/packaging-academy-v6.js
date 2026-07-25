(() => {
  'use strict';

  const data = window.PackagingAcademyData;
  if (!data?.steps?.length) return;

  const routeByWorkflow = {
    Capture: '/contact-exchange/scan',
    Qualification: '/leads',
    'Quote Builder': '/quotes',
    'Approvals & Sending': '/approval-send',
    'Quote Management & Outcomes': '/quotes',
    'Orders / Execution': '/orders',
    'Design & Proofs': '/design-queue',
    'Production & Dispatch': '/dispatch-board',
    'Catalog & Packaging Pricing': '/products',
    Tasks: '/tasks',
    'Trade Events': '/trade-events',
    'Admin & Settings': '/admin/organization',
  };

  const statusLabel = {
    untested: 'Not tested',
    'needs-retest': 'Retest required',
    'passed-before-retest': 'Passed before · retest',
  };

  const statusClass = {
    untested: 'academy-status-untested',
    'needs-retest': 'academy-status-retest',
    'passed-before-retest': 'academy-status-prior',
  };

  function installStyles() {
    if (document.getElementById('packaging-academy-v6-styles')) return;
    const style = document.createElement('style');
    style.id = 'packaging-academy-v6-styles';
    style.textContent = `
      .academy-coverage{margin-top:16px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
      .academy-coverage article{border:1px solid #dbe5ef;border-radius:14px;background:#fff;padding:14px}
      .academy-coverage span{display:block;color:#64748b;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
      .academy-coverage strong{display:block;margin-top:4px;color:#0f2338;font-size:24px}
      .academy-step-status{display:inline-flex;align-items:center;margin-left:8px;padding:3px 7px;border-radius:999px;font-size:9px;font-weight:900;letter-spacing:.05em;text-transform:uppercase;vertical-align:middle}
      .academy-status-untested{background:#f1f5f9;color:#475569}
      .academy-status-retest{background:#fff7ed;color:#9a3412}
      .academy-status-prior{background:#eff6ff;color:#1d4ed8}
      .academy-route-note{margin-top:8px;color:#64748b;font-size:12px;font-weight:700}
      .academy-route-note code{border-radius:6px;background:#f1f5f9;padding:2px 6px;color:#0f2338}
      @media(max-width:720px){.academy-coverage{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function countStatus(status) {
    return data.steps.filter((step) => step.status === status).length;
  }

  function renderCoverage() {
    const dashboard = document.getElementById('dashboardView');
    if (!dashboard || document.getElementById('academyCoverage')) return;
    const section = document.createElement('section');
    section.id = 'academyCoverage';
    section.className = 'card panel';
    section.innerHTML = `
      <div class="section-head"><div><h2>Production testing coverage</h2><p>The Academy now covers quote sending, quote management, Orders, Design, Dispatch, Catalog, Tasks, Trade Events and Admin.</p></div><strong>${data.steps.length} steps</strong></div>
      <div class="academy-coverage">
        <article><span>Not tested yet</span><strong>${countStatus('untested')}</strong></article>
        <article><span>Production retest required</span><strong>${countStatus('needs-retest')}</strong></article>
        <article><span>Passed previously · retest</span><strong>${countStatus('passed-before-retest')}</strong></article>
      </div>`;
    dashboard.appendChild(section);
  }

  function decorateCurrentStep() {
    document.querySelectorAll('[data-open]').forEach((node) => {
      const step = data.steps.find((item) => item.id === node.dataset.open);
      if (!step || node.querySelector('.academy-step-status')) return;
      const badge = document.createElement('span');
      badge.className = `academy-step-status ${statusClass[step.status] || 'academy-status-untested'}`;
      badge.textContent = statusLabel[step.status] || step.status || 'Review';
      node.appendChild(badge);
    });

    const heading = document.querySelector('.lesson-head h1, .test-form h2');
    if (!heading || heading.parentElement?.querySelector('.academy-route-note')) return;
    const state = (() => {
      try { return JSON.parse(localStorage.getItem('setuPackagingAcademyV5') || localStorage.getItem('setuPackagingAcademyV4') || '{}'); } catch { return {}; }
    })();
    const step = data.steps.find((item) => item.id === state.step);
    if (!step) return;
    const note = document.createElement('p');
    note.className = 'academy-route-note';
    note.innerHTML = `Test route: <code>${step.route || routeByWorkflow[step.flowName] || '/'}</code> · Academy ${data.version || 'current'}`;
    heading.parentElement?.appendChild(note);
  }

  // Enrich every future saved result without changing the legacy form engine.
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    const body = init?.body;
    if (body instanceof FormData && body.get('action') === 'save_result') {
      const stepId = String(body.get('stepId') || '');
      const step = data.steps.find((item) => item.id === stepId);
      if (step) {
        body.set('testedRoute', step.route || routeByWorkflow[step.flowName] || '/academy');
        body.set('academyVersion', data.version || '2026.07.25-v6');
      }
    }
    return nativeFetch(input, init);
  };

  installStyles();
  const observer = new MutationObserver(() => {
    renderCoverage();
    decorateCurrentStep();
  });

  window.addEventListener('DOMContentLoaded', () => {
    const app = document.querySelector('.app');
    if (app) observer.observe(app, { childList: true, subtree: true });
    renderCoverage();
    decorateCurrentStep();
  });
})();