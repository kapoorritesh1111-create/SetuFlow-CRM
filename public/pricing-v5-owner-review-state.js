(() => {
  'use strict';

  const BASE_STORAGE = 'setu_pricing_v5_premium_review_v3';
  const RESET_FLAG = 'setu_pricing_v5_owner_review_reset_20260914_1';
  const FAMILY_KEYS = ['sup','center_seal_roll','center_seal_pouch','three_side_seal_roll','three_side_seal_pouch'];
  const BUSINESS_KEYS = ['sup_sizes','constructions','buckets','kld','dashboard','sales','family','competitor'];
  const EXPECTED_CLARIFICATIONS = 6;
  let applying = false;

  // One-time cleanup of the earlier prototype state. The client had not reviewed or
  // approved anything when the owner-review workspace was handed over.
  try {
    if (!localStorage.getItem(RESET_FLAG)) {
      localStorage.removeItem(BASE_STORAGE);
      localStorage.removeItem('setu_pricing_v5_premium_review_v2');
      localStorage.removeItem('setu_pricing_v5_premium_review_v1');
      localStorage.setItem(RESET_FLAG, '1');
    }
  } catch (_) {}

  function readState() {
    try {
      const raw = JSON.parse(localStorage.getItem(BASE_STORAGE) || '{}');
      return {
        kldApprovals: raw.kldApprovals || {},
        businessApprovals: raw.businessApprovals || {},
        clarifications: raw.clarifications || {},
      };
    } catch (_) {
      return { kldApprovals: {}, businessApprovals: {}, clarifications: {} };
    }
  }

  function counts() {
    const review = readState();
    const businessApprovals = review.businessApprovals || {};
    const kldApprovals = review.kldApprovals || {};
    const clarifications = review.clarifications || {};

    const kldApproved = Object.values(kldApprovals).filter(v => v === 'approved').length;
    const businessApproved = BUSINESS_KEYS.filter(k => businessApprovals[k] === true).length;
    const familyDecisions = FAMILY_KEYS.filter(k => Object.prototype.hasOwnProperty.call(businessApprovals, 'family_' + k)).length;
    const familyApproved = FAMILY_KEYS.filter(k => businessApprovals['family_' + k] === true).length;
    const clarificationsAnswered = Object.values(clarifications).filter(v => String(v || '').trim().length > 0).length;

    const totalDecisionUnits = 20 + BUSINESS_KEYS.length + FAMILY_KEYS.length + EXPECTED_CLARIFICATIONS;
    const completedDecisionUnits = Math.min(20, kldApproved) + businessApproved + familyDecisions + Math.min(EXPECTED_CLARIFICATIONS, clarificationsAnswered);
    const reviewPercent = Math.round((completedDecisionUnits / totalDecisionUnits) * 100);

    const ready = kldApproved >= 20 && businessApproved >= BUSINESS_KEYS.length && familyApproved >= FAMILY_KEYS.length && clarificationsAnswered >= EXPECTED_CLARIFICATIONS;
    return { review, kldApproved, businessApproved, familyDecisions, familyApproved, clarificationsAnswered, reviewPercent, ready };
  }

  function setText(el, text) {
    if (el && el.textContent !== text) el.textContent = text;
  }

  function setStatusClass(el, kind) {
    if (!el) return;
    el.classList.remove('green','amber','red','blue','gray');
    if (kind) el.classList.add(kind);
    const dot = el.querySelector('.dot');
    if (dot) {
      dot.classList.remove('green','amber','red','blue','gray');
      if (kind) dot.classList.add(kind);
    }
  }

  function progressPatch(c) {
    document.querySelectorAll('.review-progress').forEach(box => {
      const copy = box.querySelector('.rp-copy span');
      const bar = box.querySelector('.rp-bar i');
      const strong = box.querySelector(':scope > strong');
      const pageText = document.getElementById('page')?.textContent || '';
      const familyPage = pageText.includes('All Packaging Families');
      const familyPct = Math.round((c.familyDecisions / FAMILY_KEYS.length) * 100);
      if (familyPage) {
        setText(copy, `${c.familyDecisions} of 6 families reviewed`);
        if (bar) bar.style.width = familyPct + '%';
        setText(strong, familyPct + '%');
      } else {
        setText(copy, c.reviewPercent === 0 ? 'Owner review not started' : 'Owner review in progress');
        if (bar) bar.style.width = c.reviewPercent + '%';
        setText(strong, c.reviewPercent + '%');
      }
    });
  }

  function ensureBanner() {
    const page = document.getElementById('page');
    if (!page || page.querySelector('.owner-review-baseline-banner')) return;
    const head = page.querySelector('.page-head');
    if (!head) return;
    const banner = document.createElement('div');
    banner.className = 'notice warn owner-review-baseline-banner';
    banner.style.marginBottom = '14px';
    banner.innerHTML = '<b>Client review required.</b> The Pricing v5 workspace has been built and loaded with the new pricing rules implemented from the latest workbook and team review. Stark Packmate has not approved these changes yet. Every service family and approval item remains pending until the owner explicitly reviews it.';
    head.insertAdjacentElement('afterend', banner);
  }

  function patchDashboard(c) {
    const page = document.getElementById('page');
    if (!page || !page.textContent.includes('Pricing Dashboard')) return;

    page.querySelectorAll('.metric-card').forEach(card => {
      const label = card.querySelector('.metric-copy small')?.textContent?.trim();
      const value = card.querySelector('.metric-copy strong');
      const sub = card.querySelector('.metric-copy span');
      const tag = card.querySelector('.mini-tag');
      if (label === 'Approved Sizes') {
        setText(card.querySelector('.metric-copy small'), 'Configured Sizes');
        setText(sub, 'available for owner review');
        if (tag) { setText(tag, 'Review'); tag.className = 'mini-tag amber'; }
      } else if (label === 'Constructions') {
        setText(card.querySelector('.metric-copy small'), 'Configured Constructions');
        setText(sub, 'available for owner review');
        if (tag) { setText(tag, 'Review'); tag.className = 'mini-tag amber'; }
      } else if (label === 'Quantity Bands') {
        setText(sub, 'configured — owner review pending');
        if (tag) { setText(tag, 'Review'); tag.className = 'mini-tag amber'; }
      } else if (label === 'Review KLD Samples') {
        setText(value, `${c.kldApproved}/20`);
        setText(sub, 'owner approved');
        if (tag) { setText(tag, Math.round(c.kldApproved / 20 * 100) + '%'); tag.className = 'mini-tag ' + (c.kldApproved === 20 ? 'green' : 'amber'); }
      } else if (label === 'Overall Status') {
        setText(card.querySelector('.metric-copy small'), 'Owner Review');
        setText(value, c.reviewPercent === 0 ? 'Not Started' : c.ready ? 'Complete' : 'In Progress');
        setText(sub, c.ready ? 'All owner decisions recorded' : 'Workspace ready; client decision pending');
        card.classList.remove('green'); card.classList.add(c.ready ? 'green' : 'amber');
      }
    });

    page.querySelectorAll('.matrix-card .status').forEach(el => {
      const t = el.textContent.trim();
      if (t === 'Approved') { setText(el, 'Review Required'); setStatusClass(el, 'amber'); }
    });

    page.querySelectorAll('.kld-mini span').forEach(el => setText(el, c.kldApproved >= 20 ? '● Owner Approved' : '● Pending Owner Review'));
    const kldApprove = page.querySelector('.kld-approve');
    if (kldApprove) {
      const b = kldApprove.querySelector('b');
      const small = kldApprove.querySelector('small');
      setText(b, `${c.kldApproved} of 20 owner approved`);
      setText(small, c.kldApproved >= 20 ? 'All KLD review samples were explicitly approved by the owner.' : 'No KLD sample is assumed approved. The owner must review and approve them.');
    }
  }

  function patchSizes(c) {
    const page = document.getElementById('page');
    if (!page || !page.textContent.includes('Sizes & KLDs')) return;
    page.querySelectorAll('.metric-card').forEach(card => {
      const label = card.querySelector('.metric-copy small')?.textContent?.trim();
      const value = card.querySelector('.metric-copy strong');
      const sub = card.querySelector('.metric-copy span');
      const tag = card.querySelector('.mini-tag');
      if (label === 'Approved Sizes') {
        setText(card.querySelector('.metric-copy small'), 'Configured Sizes');
        setText(value, '20');
        setText(sub, 'all require owner review');
        if (tag) { setText(tag, 'Review'); tag.className = 'mini-tag amber'; }
      }
      if (label === 'Review KLD Samples') {
        setText(value, `${c.kldApproved}/20`);
        setText(sub, 'owner approved');
        if (tag) { setText(tag, Math.round(c.kldApproved / 20 * 100) + '%'); tag.className = 'mini-tag ' + (c.kldApproved === 20 ? 'green' : 'amber'); }
      }
    });

    page.querySelectorAll('tbody tr').forEach(row => {
      const action = Array.from(row.querySelectorAll('button')).find(b => /kld\(/i.test(b.getAttribute('onclick') || '') || /approve/i.test(b.textContent || ''));
      const onclick = action?.getAttribute('onclick') || '';
      const match = onclick.match(/kld\(['"]([^'"]+)/i);
      const id = match?.[1];
      const decision = id ? c.review.kldApprovals[id] : undefined;
      row.querySelectorAll('.status').forEach(status => {
        if (decision === 'approved') { setText(status, 'Owner Approved'); setStatusClass(status, 'green'); }
        else if (decision === 'change') { setText(status, 'Needs Change'); setStatusClass(status, 'amber'); }
        else { setText(status, 'Review Required'); setStatusClass(status, 'amber'); }
      });
    });
  }

  function patchConstructions(c) {
    const page = document.getElementById('page');
    if (!page || !/^Constructions/m.test(page.textContent || '')) return;
    const approved = c.review.businessApprovals.constructions === true;
    page.querySelectorAll('.status').forEach(status => {
      const t = status.textContent.trim();
      if (/Approved|Active/i.test(t)) {
        setText(status, approved ? 'Owner Approved' : 'Review Required');
        setStatusClass(status, approved ? 'green' : 'amber');
      }
    });
    page.querySelectorAll('.metric-card').forEach(card => {
      const label = card.querySelector('.metric-copy small')?.textContent?.trim();
      if (label === 'Approved Constructions') {
        setText(card.querySelector('.metric-copy small'), 'Owner-Approved Constructions');
        setText(card.querySelector('.metric-copy strong'), approved ? '44' : '0');
        setText(card.querySelector('.metric-copy span'), approved ? 'explicitly approved' : '44 configured; client review pending');
      }
    });
  }

  function patchFamilies(c) {
    const page = document.getElementById('page');
    if (!page || !page.textContent.includes('All Packaging Families')) return;
    page.querySelectorAll('.family-card').forEach((card, i) => {
      const key = FAMILY_KEYS[i];
      const storageKey = 'family_' + key;
      const hasDecision = Object.prototype.hasOwnProperty.call(c.review.businessApprovals, storageKey);
      const approved = c.review.businessApprovals[storageKey] === true;
      let pill = card.querySelector('.pill');
      if (!pill) {
        pill = document.createElement('span');
        pill.className = 'pill amber';
        card.appendChild(pill);
      }
      const readinessText=(pill.textContent||'').trim();
      const preserveReadiness=/V5 Engine Ready|V5 Engine Missing|Deferred/i.test(readinessText);
      if(!preserveReadiness){
        setText(pill, !hasDecision ? 'Owner Review Required' : approved ? 'Owner Approved' : 'Needs Change');
        pill.className = 'pill ' + (!hasDecision ? 'amber' : approved ? 'green' : 'red');
      }
      card.setAttribute('data-owner-review', !hasDecision ? 'pending' : approved ? 'approved' : 'change');
    });

    const detail = page.querySelector('#familyDetail');
    if (detail) {
      let note = detail.querySelector('.family-owner-note');
      if (!note) {
        note = document.createElement('div');
        note.className = 'notice warn family-owner-note';
        note.style.margin = '0 16px 16px';
        detail.appendChild(note);
      }
      const key = FAMILY_KEYS.find(k => detail.textContent.toLowerCase().includes(k.replaceAll('_',' '))) || null;
      note.innerHTML = '<b>Owner decision is required for this family.</b> Existing formulas or v4 matrices shown below are reference baselines only. They do not mean Stark Packmate has approved the new Pricing v5 rules.';
    }
  }

  function patchApproval(c) {
    const page = document.getElementById('page');
    if (!page || !page.textContent.includes('Impact & Approval')) return;
    page.querySelectorAll('.metric-card').forEach(card => {
      const label = card.querySelector('.metric-copy small')?.textContent?.trim();
      const value = card.querySelector('.metric-copy strong');
      const sub = card.querySelector('.metric-copy span');
      if (label === 'Clarifications Open') {
        setText(value, `${Math.max(0, EXPECTED_CLARIFICATIONS - c.clarificationsAnswered)} / ${EXPECTED_CLARIFICATIONS}`);
        setText(sub, `${c.clarificationsAnswered} answered by owner`);
      } else if (label === 'Business Approvals') {
        setText(value, `${c.businessApproved} / ${BUSINESS_KEYS.length}`);
        setText(sub, `${BUSINESS_KEYS.length - c.businessApproved} pending owner approval`);
      } else if (label === 'KLD Samples Approved') {
        setText(value, `${c.kldApproved} / 20`);
        setText(sub, `${20 - c.kldApproved} pending owner approval`);
      } else if (label === 'Pricing Families Reviewed') {
        setText(value, `${c.familyDecisions} / ${FAMILY_KEYS.length}`);
        setText(sub, `${FAMILY_KEYS.length - c.familyDecisions} families still require a decision`);
      } else if (label === 'Activation Readiness') {
        setText(value, c.ready ? 'Ready' : 'Not Ready');
        setText(sub, c.ready ? 'All explicit owner approvals recorded' : 'Client review and answers still required');
        card.classList.remove('green'); card.classList.add(c.ready ? 'green' : 'amber');
      }
    });

    page.querySelectorAll('button').forEach(button => {
      if (/Activate Pricing Structure/i.test(button.textContent || '') || /Activation Locked/i.test(button.textContent || '')) {
        if (c.ready) {
          button.disabled = false;
          button.textContent = '▷ Activate Pricing Structure';
          button.style.opacity = '';
          button.title = 'All explicit owner-review requirements are complete.';
        } else {
          button.disabled = true;
          button.textContent = 'Activation Locked — Complete Owner Review';
          button.style.opacity = '.55';
          button.title = 'Stark Packmate owner review is incomplete.';
        }
      }
    });

    page.querySelectorAll('.right-stack, .activation-card, aside').forEach(box => {
      if (!/Activation Readiness/i.test(box.textContent || '')) return;
      box.querySelectorAll('h2,h3,.ready-title,strong').forEach(el => {
        if (/Ready for Activation/i.test(el.textContent || '')) setText(el, c.ready ? 'Ready for Activation' : 'Not Ready — Owner Review Required');
      });
    });
  }

  function patchGenericReviewLanguage(c) {
    const page = document.getElementById('page');
    if (!page) return;
    // Avoid presenting configured/active system data as a client approval decision.
    page.querySelectorAll('.status').forEach(el => {
      const t = el.textContent.trim();
      if (t === 'Approved' && !page.textContent.includes('Sizes & KLDs') && !page.textContent.includes('Constructions')) {
        setText(el, 'Review Required');
        setStatusClass(el, 'amber');
      }
    });
  }

  function apply() {
    if (applying) return;
    applying = true;
    try {
      const c = counts();
      ensureBanner();
      progressPatch(c);
      patchDashboard(c);
      patchSizes(c);
      patchConstructions(c);
      patchFamilies(c);
      patchApproval(c);
      patchGenericReviewLanguage(c);
      document.documentElement.setAttribute('data-owner-review-ready', c.ready ? 'true' : 'false');
    } finally {
      applying = false;
    }
  }

  function start() {
    const page = document.getElementById('page');
    if (!page) return setTimeout(start, 50);
    const observer = new MutationObserver(() => requestAnimationFrame(apply));
    observer.observe(page, { childList: true, subtree: true, characterData: true });
    const tabs = document.getElementById('tabs');
    if (tabs) observer.observe(tabs, { childList: true, subtree: true });
    window.addEventListener('storage', apply);
    document.addEventListener('click', () => setTimeout(apply, 120));
    apply();
  }

  start();
})();
