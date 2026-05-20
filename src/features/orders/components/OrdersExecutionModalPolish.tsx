'use client';

import { useEffect } from 'react';
import { OrderCatalogProductTypeahead } from '@/features/orders/components/OrderCatalogProductTypeahead';

function makeButton(label: string, tone: 'primary' | 'ghost' = 'ghost') {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `actual-modal-trigger ${tone}`;
  button.textContent = label;
  return button;
}

function buildModal(title: string, description: string) {
  const overlay = document.createElement('div');
  overlay.className = 'orders-modal-overlay';
  overlay.hidden = true;

  const dialog = document.createElement('section');
  dialog.className = 'orders-modal-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const header = document.createElement('header');
  header.className = 'orders-modal-header';

  const copy = document.createElement('div');
  const kicker = document.createElement('span');
  kicker.textContent = 'Actual Lines';
  const heading = document.createElement('h2');
  heading.textContent = title;
  const body = document.createElement('p');
  body.textContent = description;
  copy.append(kicker, heading, body);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'orders-modal-close';
  close.setAttribute('aria-label', 'Close dialog');
  close.textContent = '×';

  const content = document.createElement('div');
  content.className = 'orders-modal-content';

  header.append(copy, close);
  dialog.append(header, content);
  overlay.appendChild(dialog);

  const closeModal = () => {
    overlay.hidden = true;
    document.body.classList.remove('orders-modal-open');
  };
  const openModal = () => {
    overlay.hidden = false;
    document.body.classList.add('orders-modal-open');
    const first = content.querySelector<HTMLElement>('input, select, textarea, button');
    window.setTimeout(() => first?.focus(), 30);
  };

  close.addEventListener('click', closeModal);
  overlay.addEventListener('mousedown', (event) => {
    if (event.target === overlay) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) closeModal();
  });

  return { overlay, content, openModal };
}

function enhanceActualLines() {
  document.querySelectorAll<HTMLElement>('.stage-card.actual-stage').forEach((stage) => {
    if (stage.dataset.modalPolished === 'ready') return;
    const splitPanel = stage.querySelector<HTMLElement>('.split-panel');
    const addForm = stage.querySelector<HTMLFormElement>('form.add-line-card');
    const discountForm = splitPanel?.querySelector<HTMLFormElement>('form:not(.add-line-card)');
    if (!splitPanel || !addForm || !discountForm) return;

    stage.dataset.modalPolished = 'ready';

    const card = document.createElement('section');
    card.className = 'actual-lines-clean-card';
    card.innerHTML = `
      <div>
        <span>Actual Lines</span>
        <h3>Edit order lines cleanly</h3>
        <p>Add catalog-linked lines, record manual line context, and save total discount in focused review dialogs. Accepted quote lines remain immutable.</p>
      </div>
      <div class="actual-lines-clean-actions"></div>
    `;

    const actions = card.querySelector<HTMLElement>('.actual-lines-clean-actions')!;
    const addButton = makeButton('Add line', 'primary');
    const discountButton = makeButton('Add discount', 'ghost');
    actions.append(addButton, discountButton);

    const addModal = buildModal('Add line to order', 'Search live Catalog products by name, SKU, HSN/HS code, pack label, or pricing type. Manual lines stay separate and require reason/context.');
    const discountModal = buildModal('Add order discount', 'Save the order-level discount with a clear reason before human approval.');

    addModal.content.appendChild(addForm);
    discountModal.content.appendChild(discountForm);
    document.body.append(addModal.overlay, discountModal.overlay);

    addButton.addEventListener('click', addModal.openModal);
    discountButton.addEventListener('click', discountModal.openModal);

    splitPanel.parentElement?.insertBefore(card, splitPanel);
    splitPanel.style.display = 'none';
  });
}

export function OrdersExecutionModalPolish() {
  useEffect(() => {
    enhanceActualLines();
    const observer = new MutationObserver(enhanceActualLines);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <OrderCatalogProductTypeahead />
      <style jsx global>{`
        .orders-modal-open{overflow:hidden}
        .actual-lines-clean-card{display:flex;justify-content:space-between;gap:18px;align-items:center;margin:16px 0;padding:20px;border:1px solid #dbeafe;border-radius:28px;background:linear-gradient(135deg,#fff,#f8fbff);box-shadow:0 22px 60px rgba(15,23,42,.08)}
        .actual-lines-clean-card span{display:inline-flex;margin-bottom:8px;padding:6px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
        .actual-lines-clean-card h3{margin:0 0 6px;color:#05243d;font-size:24px;letter-spacing:-.03em}
        .actual-lines-clean-card p{margin:0;max-width:760px;color:#465f73;line-height:1.55;font-size:14px}
        .actual-lines-clean-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
        .actual-modal-trigger{border:1px solid #cfe0ef;border-radius:999px;padding:12px 18px;background:#fff;color:#06314c;font-weight:900;box-shadow:0 12px 30px rgba(15,23,42,.07);cursor:pointer;white-space:nowrap}
        .actual-modal-trigger.primary{background:#06405f;color:#fff;border-color:#06405f}
        .actual-modal-trigger:hover{transform:translateY(-1px);box-shadow:0 18px 36px rgba(15,23,42,.12)}
        .orders-modal-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:24px;background:rgba(5,24,38,.45);backdrop-filter:blur(8px)}
        .orders-modal-overlay[hidden]{display:none!important}
        .orders-modal-dialog{width:min(860px,100%);max-height:min(86vh,920px);overflow:auto;border:1px solid rgba(219,234,254,.95);border-radius:32px;background:#fff;box-shadow:0 40px 120px rgba(3,18,33,.32)}
        .orders-modal-header{position:sticky;top:0;z-index:2;display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:24px 26px 18px;border-bottom:1px solid #e6eef7;background:linear-gradient(135deg,#fff,#f8fbff)}
        .orders-modal-header span{display:inline-flex;margin-bottom:8px;padding:6px 10px;border-radius:999px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
        .orders-modal-header h2{margin:0;color:#05243d;font-size:28px;letter-spacing:-.04em}
        .orders-modal-header p{margin:8px 0 0;color:#526c82;line-height:1.5}
        .orders-modal-close{width:42px;height:42px;border-radius:999px;border:1px solid #d8e6f2;background:#fff;color:#05243d;font-size:28px;line-height:1;cursor:pointer}
        .orders-modal-content{padding:22px 26px 28px}
        .orders-modal-content .control-grid{border:0!important;background:transparent!important;padding:0!important;box-shadow:none!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important}
        .orders-modal-content .control-grid label{font-size:11px!important;font-weight:900!important;letter-spacing:.08em!important;color:#4f6578!important}
        .orders-modal-content input,.orders-modal-content select,.orders-modal-content textarea{border-radius:18px!important;border:1px solid #d6e3ef!important;padding:14px 16px!important;background:#fff!important;color:#08283f!important;box-shadow:0 10px 26px rgba(15,23,42,.04)!important}
        .orders-modal-content textarea{min-height:96px!important}
        .orders-modal-content .oc-btn{border-radius:18px!important;min-height:52px!important;font-size:14px!important;background:#06405f!important;border-color:#06405f!important;color:#fff!important;box-shadow:0 18px 36px rgba(6,64,95,.18)!important}
        .orders-modal-content .catalog-combobox-list{z-index:1002}
        .actual-stage .split-panel{margin-top:0}
        @media (max-width: 780px){.actual-lines-clean-card{display:grid;border-radius:24px}.actual-lines-clean-actions{justify-content:stretch}.actual-modal-trigger{width:100%}.orders-modal-overlay{padding:12px;align-items:end}.orders-modal-dialog{border-radius:28px 28px 0 0;max-height:90vh}.orders-modal-header{padding:20px}.orders-modal-header h2{font-size:24px}.orders-modal-content{padding:18px 20px 24px}.orders-modal-content .control-grid{grid-template-columns:1fr!important}.orders-modal-content .span-2{grid-column:auto!important}}
      `}</style>
    </>
  );
}
