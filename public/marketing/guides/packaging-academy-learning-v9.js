(() => {
  'use strict';

  const data = window.PackagingAcademyData;
  if (!data?.steps?.length) return;

  const growthRefresh = data.steps.find((step) => step.id === 'growth-center-2');
  if (growthRefresh) {
    growthRefresh.title = 'Refresh Packaging Operations';
    growthRefresh.summary = 'Inside Growth Work Queue, open Packaging Operations and click Refresh Packaging Operations once. This checks live quote, artwork, production, dispatch, template and repeat-order records. It is not the separate Pricing Intelligence workspace. Confirm the refresh creates or reconciles review actions without changing any business record automatically.';
    growthRefresh.route = '/growth-agent?workspace=packaging';
  }

  const growthOpen = data.steps.find((step) => step.id === 'growth-center-1');
  if (growthOpen) {
    growthOpen.summary = 'Open Growth Center, keep Growth Work Queue selected, then choose Packaging Operations. Do not select Pricing Intelligence. Confirm the page explains what needs attention across quote readiness, artwork, production, dispatch, template health and repeat orders.';
    growthOpen.route = '/growth-agent?workspace=packaging';
  }

  const growthOverrides = {
    'growth-center-1': {
      goal: 'Open the operational review queue for the Packaging vertical.',
      actions: [
        'Open Growth Center from the top navigation.',
        'Keep Growth Work Queue selected. Pricing Intelligence is a separate workspace for price analysis.',
        'Choose Packaging Operations from the second navigation row.',
        'Read the three-step guide before opening any recommendation.'
      ],
      verify: [
        'Packaging Operations is visibly selected.',
        'The page shows operational categories such as quote readiness, artwork, production and dispatch.',
        'The page states that nothing is approved, priced, sent, advanced or dispatched automatically.'
      ],
      why: 'This workspace turns live Packaging records into a human review queue. It does not replace Pricing Intelligence and it does not execute work for the user.',
      avoid: ['Opening Pricing Intelligence instead of Packaging Operations', 'Assuming a recommendation means the underlying work is already completed']
    },
    'growth-center-2': {
      goal: 'Recalculate Packaging operational recommendations from the latest live records.',
      actions: [
        'Confirm Growth Work Queue and Packaging Operations are selected.',
        'Click Refresh Packaging Operations once.',
        'Wait for the page to return and reload the recommendation queue.',
        'Compare the open actions with the related quote, artwork, production, dispatch and template records.'
      ],
      verify: [
        'The action is labeled Refresh Packaging Operations, not Pricing Intelligence.',
        'Duplicate recommendations are not created for the same record and reason.',
        'Each recommendation explains what needs attention, why it appeared and where to fix it.',
        'No quote, price, proof, production stage, dispatch state or customer communication changes automatically.'
      ],
      why: 'Refresh is a review action. It scans the current Packaging workflow and rebuilds the operator queue; it is not a pricing calculation and it does not perform the recommended work.',
      avoid: ['Using the separate Pricing Intelligence tab for this test', 'Clicking refresh repeatedly before the first refresh finishes']
    },
    'growth-center-3': {
      goal: 'Review quote and template blockers before a Packaging quote is sent.',
      actions: ['Open the Quote readiness category.', 'Open one recommendation.', 'Compare its reason with the exact quote or template record.', 'Fix the source record, return to Packaging Operations and refresh.'],
      verify: ['The recommendation routes to the correct quote or template.', 'Missing specifications, MOQ, freight, pre-press or currency issues are explained in plain language.', 'The recommendation disappears or changes only after the source record is corrected and refreshed.'],
      why: 'The queue should help the operator find the record that needs work, not merely display a warning.',
      avoid: ['Changing live pricing without an approved test plan', 'Marking an action complete without correcting the source record']
    },
    'growth-center-4': {
      goal: 'Understand and clear artwork, production and dispatch blockers safely.',
      actions: ['Open Artwork & Proofs, then Production, then Dispatch.', 'Open one action in each available category.', 'Confirm the linked Design Queue, Dispatch Board or Order matches the recommendation.', 'Return to Packaging Operations after correcting the source record.'],
      verify: ['Artwork status matches Design Queue.', 'Production stage and age match Dispatch Board.', 'Dispatch readiness matches the Order and packing evidence.', 'No production or dispatch stage is advanced by the recommendation itself.'],
      why: 'Operational recommendations should reconcile to the same source of truth used by Design Queue, Orders and Dispatch Board.',
      avoid: ['Treating accepted artwork as dispatched work', 'Skipping the design gate before Printing']
    },
    'growth-center-5': {
      goal: 'Review template health and identify legitimate repeat-order opportunities.',
      actions: ['Open Template Health and inspect one incomplete template action.', 'Open Repeat Orders and inspect one evidence-backed customer opportunity when available.', 'Compare every suggestion with the linked source record.', 'Correct or dismiss the recommendation with a clear reason.'],
      verify: ['Template actions identify the exact missing setup.', 'Repeat-order actions use actual order or quote history.', 'No price is changed and no customer is contacted automatically.'],
      why: 'Template health protects quoting quality; repeat-order guidance should be based on real customer history.',
      avoid: ['Activating an incomplete template', 'Treating a repeat-order suggestion as customer intent']
    },
    'growth-center-6': {
      goal: 'Teach the recommendation system whether an action was useful without changing workflow rules.',
      actions: ['Choose one recommendation that you have verified.', 'Click Helpful when the reason and route are correct, or Not relevant when they are not.', 'Wait for the saved state.', 'Review the learning totals.'],
      verify: ['Feedback is saved once.', 'Learning totals update.', 'The feedback does not change prices, stages, approvals or automation rules.'],
      why: 'Feedback measures recommendation quality. It is not an approval and does not train or modify operational rules automatically.',
      avoid: ['Giving feedback before checking the linked record', 'Using Not relevant as a substitute for fixing a real blocker']
    },
    'growth-center-7': {
      goal: 'Find source-backed external Packaging prospects without placing them directly into CRM.',
      actions: ['Open External Discovery from Growth Work Queue.', 'Create one controlled Packaging campaign.', 'Run the configured research provider.', 'Review the source URL and evidence for every returned company before conversion.'],
      verify: ['Every result has a real source URL.', 'Results remain outside CRM until a human saves or converts them.', 'No outreach is sent automatically.', 'Packaging fit evidence is visible and reviewable.'],
      why: 'External Discovery is a research queue, not an automatic lead-generation or outreach action.',
      avoid: ['Converting a company without reviewing its source', 'Confusing CRM Matches with external prospects']
    }
  };

  function canonical(step) {
    const override = growthOverrides[step.id];
    if (override) return override;
    const flowInstructions = data.instructions?.[step.flow] || [];
    const commonMistakes = data.mistakes?.[step.flow] || [];
    return {
      goal: step.summary,
      actions: flowInstructions.length ? flowInstructions : ['Open the linked workspace.', 'Complete the named action once.', 'Refresh or reopen the record to confirm the saved state.'],
      verify: [data.expected?.[step.flow] || 'The intended saved state is visible and matches the current record.'],
      why: `This step proves the ${step.flowName} workflow works from the user interface and persists the expected business result.`,
      avoid: commonMistakes
    };
  }

  data.learningForStep = canonical;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function identifyStep(host) {
    const title = host.querySelector('.lesson-head h1, .test-form h2')?.textContent?.trim();
    return data.steps.find((step) => step.title === title) || null;
  }

  function guidanceMarkup(step, compact = false) {
    const content = canonical(step);
    return `<section class="academy-canonical-guidance ${compact ? 'compact' : ''}" data-canonical-step="${esc(step.id)}">
      <div class="academy-mode-alignment"><strong>Same steps in Learn and Test</strong><span>Learn the action here, then test against the identical pass criteria.</span></div>
      <div class="academy-goal"><span>Goal</span><p>${esc(content.goal)}</p></div>
      <div class="academy-guidance-grid">
        <div><h3>Do this</h3><ol>${content.actions.map((item) => `<li>${esc(item)}</li>`).join('')}</ol></div>
        <div><h3>Pass when</h3><ul>${content.verify.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>
      </div>
      <div class="academy-why"><strong>Why this matters</strong><p>${esc(content.why)}</p></div>
      ${content.avoid?.length ? `<div class="academy-avoid"><strong>Do not confuse this with</strong><ul>${content.avoid.map((item) => `<li>${esc(item)}</li>`).join('')}</ul></div>` : ''}
    </section>`;
  }

  function enhanceLearn(host) {
    const lesson = host.querySelector('.lesson');
    if (!lesson) return;
    const step = identifyStep(lesson);
    if (!step || lesson.querySelector(`[data-canonical-step="${step.id}"]`)) return;
    const body = lesson.querySelector('.lesson-body');
    if (!body) return;
    const oldInstructions = body.querySelector('.instructions');
    if (oldInstructions) oldInstructions.closest('.lesson-grid')?.remove();
    body.insertAdjacentHTML('afterbegin', guidanceMarkup(step));
  }

  function enhanceTest(host) {
    const form = host.querySelector('.test-form');
    if (!form) return;
    const step = identifyStep(form);
    if (!step || form.querySelector(`[data-canonical-step="${step.id}"]`)) return;
    const expected = form.querySelector('.expected');
    if (expected) expected.insertAdjacentHTML('beforebegin', guidanceMarkup(step, true));
  }

  function enhance() {
    const journey = document.getElementById('journeyView');
    const workflows = document.getElementById('workflowsView');
    const test = document.getElementById('testView');
    if (journey) enhanceLearn(journey);
    if (workflows) enhanceLearn(workflows);
    if (test) enhanceTest(test);
  }

  function addStyles() {
    if (document.getElementById('academy-alignment-v9-styles')) return;
    const style = document.createElement('style');
    style.id = 'academy-alignment-v9-styles';
    style.textContent = `
      .academy-canonical-guidance{margin-bottom:22px;border:1px solid #cbd9e8;border-radius:18px;background:#fff;padding:20px;box-shadow:0 8px 24px rgba(15,35,56,.05)}
      .academy-canonical-guidance.compact{margin:18px 0;padding:18px}
      .academy-mode-alignment{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin:-4px -4px 16px;padding:12px 14px;border-radius:12px;background:#eaf7f5;color:#0b5e58;font-size:13px}
      .academy-mode-alignment span{color:#3f6462;font-weight:500}
      .academy-goal{margin-bottom:16px}.academy-goal>span,.academy-guidance-grid h3{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#245d9f}
      .academy-goal p,.academy-why p{margin:6px 0 0;color:#334155;line-height:1.65}
      .academy-guidance-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}.academy-guidance-grid>div{border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;padding:16px}
      .academy-guidance-grid ol,.academy-guidance-grid ul,.academy-avoid ul{margin:10px 0 0;padding-left:20px}.academy-guidance-grid li,.academy-avoid li{margin:7px 0;color:#334155;line-height:1.5}
      .academy-why,.academy-avoid{margin-top:14px;border-radius:12px;padding:14px 16px}.academy-why{background:#eef6ff;color:#173b65}.academy-avoid{background:#fff7ed;color:#7c2d12}.academy-avoid strong,.academy-why strong{font-size:13px}
      .academy-avoid ul{margin-top:6px}.academy-avoid li{color:#7c2d12}
      @media(max-width:820px){.academy-guidance-grid{grid-template-columns:1fr}.academy-canonical-guidance{padding:15px}}
    `;
    document.head.appendChild(style);
  }

  window.addEventListener('DOMContentLoaded', () => {
    addStyles();
    const observer = new MutationObserver(enhance);
    ['journeyView', 'workflowsView', 'testView'].forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node, { childList: true, subtree: true });
    });
    window.setTimeout(enhance, 100);
  });
})();
