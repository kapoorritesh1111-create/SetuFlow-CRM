(() => {
  'use strict';

  const REQUIRED_TOPICS = [
    'overview',
    'architecture',
    'diagrams',
    'pipeline',
    'supplier-sourcing-2026',
    'packaging-overview-2026',
    'growth-acquisition-2026',
    'inbound-integrations-2026',
    'academy-2026',
    'api-reference'
  ];

  let navReadyHandled = false;
  let refreshQueued = false;

  function currentTopic() {
    return (location.hash || '#overview').replace('#', '').split('=')[0] || 'overview';
  }

  function navHasCompleteTopicSet(nav) {
    return REQUIRED_TOPICS.every(id => nav.querySelector(`.nav-link[data-topic="${CSS.escape(id)}"]`));
  }

  function removeDuplicateTopicButtons(nav) {
    const seen = new Set();
    nav.querySelectorAll('.nav-link[data-topic]').forEach(button => {
      const id = button.dataset.topic;
      if (!id) return;
      if (seen.has(id)) button.remove();
      else seen.add(id);
    });
  }

  function preservePremiumInjectionGuard(nav) {
    if (nav.querySelector('[data-premium-current="1"]')) return;
    const sentinel = document.createElement('span');
    sentinel.dataset.premiumCurrent = '1';
    sentinel.dataset.docsV2Sentinel = '1';
    sentinel.hidden = true;
    nav.appendChild(sentinel);
  }

  function queueV2Refresh() {
    if (refreshQueued) return;
    refreshQueued = true;
    requestAnimationFrame(() => {
      refreshQueued = false;
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
  }

  function reconcileNavigation() {
    const nav = document.getElementById('topicNav');
    if (!nav || !navHasCompleteTopicSet(nav)) return false;

    removeDuplicateTopicButtons(nav);
    preservePremiumInjectionGuard(nav);

    if (!navReadyHandled) {
      navReadyHandled = true;
      queueV2Refresh();
    }
    return true;
  }

  function consolidateArchitecture() {
    if (currentTopic() !== 'architecture') return;
    const navigator = document.getElementById('docsV2ArchNavigator');
    const legacyCurrent = document.getElementById('currentArchitecture2026');
    if (!navigator || !legacyCurrent || legacyCurrent.dataset.docsV2Consolidated === '1') return;

    legacyCurrent.dataset.docsV2Consolidated = '1';
    const duplicateOverviewDiagram = legacyCurrent.querySelector('.mermaid-wrap');
    if (duplicateOverviewDiagram) duplicateOverviewDiagram.remove();

    const heading = legacyCurrent.querySelector('.section-block h2');
    const intro = legacyCurrent.querySelector('.section-block p');
    if (heading) heading.textContent = 'Current architecture rules & implementation notes';
    if (intro) intro.textContent = 'The Architecture Map above is the canonical current-state visual. The rules and implementation detail below are retained because they add engineering depth without duplicating the same platform diagram.';
  }

  function installObservers() {
    const nav = document.getElementById('topicNav');
    if (nav) {
      const navObserver = new MutationObserver(() => reconcileNavigation());
      navObserver.observe(nav, { childList: true, subtree: true });
    }

    const topicView = document.getElementById('topicView');
    if (topicView) {
      const topicObserver = new MutationObserver(() => {
        reconcileNavigation();
        consolidateArchitecture();
      });
      topicObserver.observe(topicView, { childList: true, subtree: true });
    }
  }

  function boot() {
    installObservers();
    reconcileNavigation();
    consolidateArchitecture();

    // Auth-protected initialization is asynchronous. These retries cover slow
    // sessions without requiring the user to click another documentation topic.
    [120, 350, 700, 1200, 2000].forEach(ms => {
      setTimeout(() => {
        if (reconcileNavigation()) consolidateArchitecture();
      }, ms);
    });
  }

  window.addEventListener('hashchange', () => {
    setTimeout(() => {
      reconcileNavigation();
      consolidateArchitecture();
    }, 0);
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
