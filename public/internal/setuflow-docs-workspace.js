(function () {
  const TOPBAR_HEIGHT = 68;
  const SHARED_BANNER_HEIGHT = 42;
  const topics = [
    { id: 's-overview', title: 'Product Overview', desc: 'What SETU Flow CRM is and what the platform is built to solve.' },
    { id: 's-architecture', title: 'Architecture', desc: 'Technical boundaries, route groups, deployment and services.' },
    { id: 's-modules', title: 'System Modules', desc: 'Workspace inventory, functional scope and contributor context.' },
    { id: 's-workflows', title: 'Commercial Workflows', desc: 'Lead-to-close operating model and execution gates.' },
    { id: 's-diagrams', title: 'Diagrams', desc: 'Updated visual maps and swimlane views.' },
    { id: 's-guides', title: 'Operator Guides', desc: 'How operators execute the core workflows correctly.' },
    { id: 's-guru', title: 'Setu Guru & AI', desc: 'AI assistance, review controls, card scan and smart vCard flows.' },
    { id: 's-data', title: 'Security & Data', desc: 'RLS, role scope, audit and schema boundaries.' },
    { id: 's-api', title: 'API & Integrations', desc: 'REST APIs, webhooks and integration boundaries.' },
    { id: 's-mobile', title: 'Mobile Workspace', desc: 'Trade-show and field-first additive mobile experiences.' },
    { id: 's-reference', title: 'Quick Reference', desc: 'Short operational reminders for fast internal use.' },
    { id: 's-snapshots', title: 'Live UI Snapshots', desc: 'Reference snapshots with direct workspace upload support.' },
  ];

  const topicMap = new Map(topics.map((topic, index) => [topic.id, { ...topic, index }]));
  const defaultSnapshots = [
    {
      id: 'seed-docs-home',
      title: 'Documentation workspace preview',
      route: '/internal/setuflow-docs.html',
      area: 'Documentation',
      description: 'Seed test screenshot added to verify the snapshot gallery pipeline. Replace this with live CRM screens from the workspace uploader.',
      image_url: 'docs-screenshots/test-live-ui.png',
      created_at: new Date().toISOString(),
      created_by_name: 'Ritesh Kapoor',
      source: 'seed'
    }
  ];

  const state = {
    isShared: false,
    isAuthenticated: false,
    currentTopic: 's-overview',
    metricsLoaded: false,
    snapshots: []
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  function wireGlobalModals() {
    $$('.modal-overlay').forEach((modal) => {
      modal.addEventListener('click', (event) => {
        if (event.target === modal) {
          modal.classList.remove('open');
        }
      });
    });
  }

  function setUserPill(name) {
    const pill = $('#user-pill');
    const avatar = $('#user-avatar');
    const username = $('#user-name');
    if (!pill || !avatar || !username) return;
    username.textContent = name;
    avatar.textContent = (name || 'R').trim().charAt(0).toUpperCase();
    pill.classList.add('visible');
  }

  function applySharedMode(payload) {
    state.isShared = true;
    document.body.classList.add('shared-mode', 'with-shared-banner');
    const banner = $('#shared-banner');
    if (banner) banner.classList.add('visible');
    const expiryEl = $('#shared-expiry');
    const recipientEl = $('#shared-recipient');
    if (recipientEl) recipientEl.textContent = payload?.recipient || 'External reviewer';
    if (expiryEl && payload?.expiry) {
      const hoursLeft = Math.max(1, Math.ceil((payload.expiry - Date.now()) / 36e5));
      expiryEl.textContent = `${hoursLeft} hr${hoursLeft === 1 ? '' : 's'} left`;
    }
  }

  async function runAuthGate() {
    const gate = $('#auth-gate');
    const errorEl = $('#auth-error');
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share_token');

    if (token) {
      try {
        const payload = JSON.parse(atob(token));
        const revoked = JSON.parse(localStorage.getItem('sf_revoked_share_tokens') || '[]');
        if (payload.expiry > Date.now() && !revoked.includes(token)) {
          applySharedMode(payload);
          if (gate) gate.classList.add('hidden');
          state.isAuthenticated = false;
          updateMetricFallbacks();
          renderSnapshots(defaultSnapshots);
          loadSnapshots();
          return;
        }
      } catch (error) {
        console.warn('[docs-share] invalid token', error);
      }

      if (errorEl) errorEl.textContent = 'This shared link is invalid or expired.';
      return;
    }

    try {
      const response = await fetch('/api/internal/auth-check', { credentials: 'include' });
      if (!response.ok) {
        if (response.status === 403 && errorEl) {
          errorEl.textContent = 'SETU Flow organisation membership required.';
        }
        return;
      }

      const auth = await response.json();
      state.isAuthenticated = true;
      setUserPill(auth?.user?.name || 'SETU Flow Member');
      if (gate) gate.classList.add('hidden');
      await Promise.allSettled([loadMetrics(), loadSnapshots()]);
    } catch (error) {
      console.warn('[docs-auth] auth check failed', error);
    }
  }

  function jumpToTopic(topicId, options = {}) {
    const topic = topicMap.get(topicId) || topicMap.get('s-overview');
    state.currentTopic = topic.id;

    $$('.topic-link').forEach((button) => {
      button.classList.toggle('active', button.dataset.topic === topic.id);
    });
    $$('.doc-section').forEach((section) => {
      section.classList.toggle('active', section.id === topic.id);
    });

    const indexLabel = $('#topic-index-label');
    const titleLabel = $('#topic-current-title');
    const descLabel = $('#topic-current-desc');
    const progressFill = $('#topic-progress-fill');
    const heroCurrentTitle = $('#hero-current-topic');
    const heroCurrentDesc = $('#hero-current-desc');

    if (indexLabel) indexLabel.textContent = `Topic ${topic.index + 1} of ${topics.length}`;
    if (titleLabel) titleLabel.textContent = topic.title;
    if (descLabel) descLabel.textContent = topic.desc;
    if (heroCurrentTitle) heroCurrentTitle.textContent = topic.title;
    if (heroCurrentDesc) heroCurrentDesc.textContent = topic.desc;
    if (progressFill) progressFill.style.width = `${((topic.index + 1) / topics.length) * 100}%`;

    const previous = topics[(topic.index - 1 + topics.length) % topics.length];
    const next = topics[(topic.index + 1) % topics.length];
    const prevButtons = ['topic-prev', 'topic-prev-mobile'];
    const nextButtons = ['topic-next', 'topic-next-mobile'];

    prevButtons.forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.dataset.target = previous.id;
      button.innerHTML = `← Previous · <span>${escapeHtml(previous.title)}</span>`;
    });

    nextButtons.forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.dataset.target = next.id;
      button.innerHTML = `<span>${escapeHtml(next.title)}</span> · Next →`;
    });

    if (!options.skipHash) {
      history.replaceState(null, '', `#${topic.id}`);
    }

    if (!options.noScroll) {
      const scrollTarget = document.getElementById(topic.id);
      if (scrollTarget) {
        const topOffset = (document.body.classList.contains('with-shared-banner') ? SHARED_BANNER_HEIGHT : 0) + TOPBAR_HEIGHT + 18;
        const y = scrollTarget.getBoundingClientRect().top + window.scrollY - topOffset;
        window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' });
      }
    }
  }

  function wireTopicNavigation() {
    $$('.topic-link, [data-jump-topic]').forEach((element) => {
      element.addEventListener('click', () => {
        const target = element.dataset.topic || element.dataset.jumpTopic;
        if (target) jumpToTopic(target);
        document.body.classList.remove('sidebar-open');
      });
    });

    ['topic-prev', 'topic-next', 'topic-prev-mobile', 'topic-next-mobile'].forEach((id) => {
      const button = document.getElementById(id);
      if (!button) return;
      button.addEventListener('click', () => {
        if (button.dataset.target) jumpToTopic(button.dataset.target);
      });
    });

    const showAllToggle = $('#toggle-all-topics');
    if (showAllToggle) {
      showAllToggle.addEventListener('click', () => {
        document.body.classList.toggle('show-all');
        showAllToggle.textContent = document.body.classList.contains('show-all') ? 'Return to single-topic view' : 'Show full document';
      });
    }

    const menuButton = $('#menu-button');
    if (menuButton) {
      menuButton.addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
    }

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        $('#docs-search')?.focus();
      }
    });

    const searchInput = $('#docs-search');
    if (searchInput) {
      searchInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') runSearch(searchInput.value);
      });
    }

    const heroSearchButton = $('#hero-search-trigger');
    if (heroSearchButton) heroSearchButton.addEventListener('click', () => $('#docs-search')?.focus());
  }

  function runSearch(query) {
    const normalized = String(query || '').trim().toLowerCase();
    $$('.search-hit').forEach((el) => el.classList.remove('search-hit'));
    if (!normalized) return;

    const foundSection = $$('.doc-section').find((section) => section.textContent.toLowerCase().includes(normalized));
    if (!foundSection) return;

    jumpToTopic(foundSection.id);
    foundSection.classList.add('search-hit');
    setTimeout(() => foundSection.classList.remove('search-hit'), 1800);
  }

  function updateMetricFallbacks() {
    const defaults = {
      modules: '28',
      issues: '23',
      roadmap: '6',
      release: 'v2026.05',
      sidebarIssues: '23',
      sidebarRoadmap: '6',
      sidebarSnapshots: String(state.snapshots.length || 1),
      sidebarContributors: '1'
    };

    Object.entries(defaults).forEach(([key, value]) => {
      const target = document.querySelector(`[data-metric="${key}"]`);
      if (target && !target.textContent.trim()) target.textContent = value;
    });
  }

  async function loadMetrics() {
    if (state.metricsLoaded || state.isShared) return;

    try {
      const response = await fetch('/api/internal/docs-metrics', { credentials: 'include' });
      if (!response.ok) {
        updateMetricFallbacks();
        return;
      }

      const data = await response.json();
      const metricMap = {
        modules: String(data.modules_total ?? 28),
        issues: String(data.open_issues ?? 0),
        roadmap: String(data.active_milestones ?? 0),
        release: String(data.latest_release ?? 'v2026.05'),
        sidebarIssues: `${data.open_issues ?? 0}`,
        sidebarRoadmap: `${data.active_milestones ?? 0}`,
        sidebarSnapshots: `${data.snapshots_total ?? 0}`,
        sidebarContributors: `${data.contributors_total ?? 1}`,
      };
      Object.entries(metricMap).forEach(([key, value]) => {
        const target = document.querySelector(`[data-metric="${key}"]`);
        if (target) target.textContent = value;
      });
      state.metricsLoaded = true;
    } catch (error) {
      console.warn('[docs-metrics] failed', error);
      updateMetricFallbacks();
    }
  }

  function normalizeSnapshotUrl(url) {
    if (!url) return '';
    if (/^https?:\/\//i.test(url) || /^data:/i.test(url) || url.startsWith('/')) return url;
    return `/internal/${url.replace(/^\.?\/?/, '')}`;
  }

  function getLocalSnapshots() {
    try {
      return JSON.parse(localStorage.getItem('sf_docs_workspace_snapshots') || '[]');
    } catch {
      return [];
    }
  }

  function saveLocalSnapshots(snapshots) {
    localStorage.setItem('sf_docs_workspace_snapshots', JSON.stringify(snapshots));
  }

  function renderSnapshots(items) {
    const grid = $('#snapshot-grid');
    const countEl = $('#snapshot-count');
    if (!grid) return;

    state.snapshots = Array.isArray(items) ? items : [];
    if (countEl) countEl.textContent = String(state.snapshots.length);
    const sidebarSnapshots = document.querySelector('[data-metric="sidebarSnapshots"]');
    if (sidebarSnapshots) sidebarSnapshots.textContent = String(state.snapshots.length || 0);

    if (!state.snapshots.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <strong>No workspace screenshots uploaded yet</strong>
          <span>Add the first live screenshot directly from this docs workspace. Shared users will only see approved images.</span>
        </div>
      `;
      return;
    }

    grid.innerHTML = state.snapshots.map((item) => {
      const imageUrl = normalizeSnapshotUrl(item.image_url);
      const routeLabel = item.route || 'Workspace';
      const areaLabel = item.area || 'General';
      const addedBy = item.created_by_name || 'SETU Flow';
      const created = item.created_at ? new Date(item.created_at).toLocaleDateString() : 'Recent';
      return `
        <article class="snapshot-card" id="snapshot-${escapeHtml(item.id)}">
          <img class="snapshot-thumb" src="${escapeHtml(imageUrl)}" alt="${escapeHtml(item.title)}" data-open-snapshot="${escapeHtml(item.id)}">
          <div class="snapshot-body">
            <div class="snapshot-meta">
              <span class="badge blue">${escapeHtml(routeLabel)}</span>
              <span class="badge teal">${escapeHtml(areaLabel)}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.description || 'Workspace screenshot.')}</p>
            <div class="snapshot-foot">
              <small>Added by ${escapeHtml(addedBy)} · ${escapeHtml(created)}</small>
              <div>
                <button class="snapshot-copy" type="button" data-copy-snapshot="${escapeHtml(item.id)}">Copy deep link</button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');

    $$('[data-open-snapshot]').forEach((element) => {
      element.addEventListener('click', () => openSnapshotViewer(element.dataset.openSnapshot));
    });

    $$('[data-copy-snapshot]').forEach((button) => {
      button.addEventListener('click', async () => {
        const snapshotId = button.dataset.copySnapshot;
        const url = `${window.location.origin}${window.location.pathname}#snapshot-${snapshotId}`;
        try {
          await navigator.clipboard.writeText(url);
          button.classList.add('copied');
          button.textContent = 'Copied';
          setTimeout(() => {
            button.classList.remove('copied');
            button.textContent = 'Copy deep link';
          }, 1800);
        } catch (error) {
          console.warn('[docs-snapshots] copy failed', error);
        }
      });
    });
  }

  async function loadSnapshots() {
    try {
      const response = await fetch('/api/internal/docs-screenshots', { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      renderSnapshots(items.length ? items : defaultSnapshots.concat(getLocalSnapshots()));
      return;
    } catch (error) {
      console.warn('[docs-snapshots] API unavailable, using local fallback', error);
      renderSnapshots(defaultSnapshots.concat(getLocalSnapshots()));
    }
  }

  function openSnapshotViewer(snapshotId) {
    const item = state.snapshots.find((entry) => String(entry.id) === String(snapshotId));
    if (!item) return;

    const image = $('#snapshot-viewer-image');
    const title = $('#snapshot-viewer-title');
    const meta = $('#snapshot-viewer-meta');
    if (image) image.src = normalizeSnapshotUrl(item.image_url);
    if (title) title.textContent = item.title || 'Workspace snapshot';
    if (meta) {
      const route = item.route ? `Route: ${item.route}` : 'Route: workspace';
      const desc = item.description || 'Workspace screenshot';
      const who = item.created_by_name || 'SETU Flow';
      meta.textContent = `${desc} • ${route} • Added by ${who}`;
    }

    openModal('snapshot-viewer-modal');
  }

  function wireShareModal() {
    const openButton = $('#open-share');
    const openButtonHero = $('#open-share-hero');
    const generateButton = $('#generate-share-link');
    const copyButton = $('#copy-share-link');

    const openHandler = () => openModal('share-modal');
    if (openButton) openButton.addEventListener('click', openHandler);
    if (openButtonHero) openButtonHero.addEventListener('click', openHandler);
    if (generateButton) {
      generateButton.addEventListener('click', () => {
        const recipient = ($('#share-recipient-input')?.value || '').trim() || 'External reviewer';
        const duration = Number($('#share-duration')?.value || 24);
        const expiry = Date.now() + duration * 36e5;
        const token = btoa(JSON.stringify({ recipient, expiry, issued: Date.now() }));
        const url = `${window.location.origin}${window.location.pathname}?share_token=${encodeURIComponent(token)}`;
        const list = JSON.parse(localStorage.getItem('sf_share_links') || '[]');
        list.push({ token, recipient, expiry });
        localStorage.setItem('sf_share_links', JSON.stringify(list));

        const output = $('#share-link-output');
        const result = $('#share-result');
        const expiryText = $('#share-expiry-text');
        const recipientText = $('#share-recipient-text');

        if (output) output.value = url;
        if (expiryText) expiryText.textContent = new Date(expiry).toLocaleString();
        if (recipientText) recipientText.textContent = recipient;
        if (result) result.classList.add('visible');
        renderShareLinks();
      });
    }

    if (copyButton) {
      copyButton.addEventListener('click', async () => {
        const output = $('#share-link-output');
        if (!output) return;
        try {
          await navigator.clipboard.writeText(output.value);
          copyButton.textContent = 'Copied';
          setTimeout(() => { copyButton.textContent = 'Copy'; }, 1800);
        } catch (error) {
          console.warn('[docs-share] copy failed', error);
        }
      });
    }

    renderShareLinks();
  }

  function revokeShareLink(index) {
    const links = JSON.parse(localStorage.getItem('sf_share_links') || '[]');
    const revoked = JSON.parse(localStorage.getItem('sf_revoked_share_tokens') || '[]');
    if (links[index]) revoked.push(links[index].token);
    links.splice(index, 1);
    localStorage.setItem('sf_share_links', JSON.stringify(links));
    localStorage.setItem('sf_revoked_share_tokens', JSON.stringify(revoked));
    renderShareLinks();
  }

  function renderShareLinks() {
    const container = $('#share-links-list');
    if (!container) return;

    const links = JSON.parse(localStorage.getItem('sf_share_links') || '[]')
      .filter((link) => link.expiry > Date.now());
    if (!links.length) {
      container.innerHTML = '<p style="margin:0;color:rgba(255,255,255,0.48);font-size:12px;">No active shared links yet.</p>';
      return;
    }

    container.innerHTML = links.map((link, index) => `
      <div class="token-row">
        <div>
          <strong>${escapeHtml(link.recipient)}</strong>
          <div style="font-size:12px;color:rgba(255,255,255,0.48);margin-top:2px;">Expires ${escapeHtml(new Date(link.expiry).toLocaleString())}</div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="token-chip">Valid</span>
          <button type="button" class="token-revoke" data-revoke-share="${index}">Revoke</button>
        </div>
      </div>
    `).join('');

    $$('[data-revoke-share]').forEach((button) => {
      button.addEventListener('click', () => revokeShareLink(Number(button.dataset.revokeShare)));
    });
  }

  function wireSnapshotUploader() {
    const openButton = $('#open-snapshot-upload');
    const submitButton = $('#submit-snapshot-upload');
    const openHandler = () => openModal('snapshot-upload-modal');
    if (openButton) openButton.addEventListener('click', openHandler);

    if (submitButton) {
      submitButton.addEventListener('click', async () => {
        const title = ($('#snapshot-title')?.value || '').trim();
        const route = ($('#snapshot-route')?.value || '').trim();
        const area = ($('#snapshot-area')?.value || '').trim();
        const description = ($('#snapshot-description')?.value || '').trim();
        const fileInput = $('#snapshot-file');
        const status = $('#snapshot-upload-status');
        const file = fileInput?.files?.[0];

        if (!title || !file) {
          if (status) status.textContent = 'Title and image file are required.';
          return;
        }

        if (status) status.textContent = 'Uploading screenshot…';

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title);
        formData.append('route', route);
        formData.append('area', area);
        formData.append('description', description);

        try {
          const response = await fetch('/api/internal/docs-screenshots', {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          await loadSnapshots();
          if (status) status.textContent = 'Screenshot uploaded successfully.';
          if (data?.item?.id) {
            setTimeout(() => {
              closeModal('snapshot-upload-modal');
              status.textContent = '';
              $('#snapshot-upload-form')?.reset();
              jumpToTopic('s-snapshots', { noScroll: false });
            }, 600);
          }
          return;
        } catch (error) {
          console.warn('[docs-snapshots] API upload failed, storing locally', error);
        }

        try {
          const dataUrl = await fileToDataUrl(file);
          const localItems = getLocalSnapshots();
          const item = {
            id: `local-${Date.now()}`,
            title,
            route,
            area,
            description,
            image_url: dataUrl,
            created_at: new Date().toISOString(),
            created_by_name: $('#user-name')?.textContent || 'SETU Flow',
            source: 'local'
          };
          localItems.unshift(item);
          saveLocalSnapshots(localItems);
          renderSnapshots(defaultSnapshots.concat(localItems));
          if (status) status.textContent = 'Stored locally in this browser because the upload API is unavailable.';
          setTimeout(() => {
            closeModal('snapshot-upload-modal');
            status.textContent = '';
            $('#snapshot-upload-form')?.reset();
          }, 700);
        } catch (error) {
          console.warn('[docs-snapshots] local fallback failed', error);
          if (status) status.textContent = 'Upload failed. Try again.';
        }
      });
    }
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function wireHeroQuickActions() {
    $('#jump-start-reading')?.addEventListener('click', () => jumpToTopic('s-overview'));
    $('#jump-view-architecture')?.addEventListener('click', () => jumpToTopic('s-architecture'));
  }

  function handleDeepLinks() {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    if (topicMap.has(hash)) {
      jumpToTopic(hash, { noScroll: true, skipHash: true });
      return;
    }
    if (hash.startsWith('snapshot-')) {
      jumpToTopic('s-snapshots', { noScroll: true });
    }
  }

  function initialize() {
    wireGlobalModals();
    wireTopicNavigation();
    wireShareModal();
    wireSnapshotUploader();
    wireHeroQuickActions();
    updateMetricFallbacks();
    jumpToTopic((window.location.hash || '#s-overview').replace('#', ''), { noScroll: true, skipHash: true });
    handleDeepLinks();
    runAuthGate();
  }

  window.openDocsShareModal = () => openModal('share-modal');
  window.closeDocsModal = closeModal;

  initialize();
})();
