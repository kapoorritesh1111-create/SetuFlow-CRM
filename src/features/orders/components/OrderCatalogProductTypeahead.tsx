'use client';

import { useEffect } from 'react';

function optionText(option: HTMLOptionElement) {
  return String(option.textContent ?? option.label ?? '').trim();
}

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function priceHint(label: string) {
  const match = label.match(/\b(FOB|EXW|BULK|Pricing review)\b.*$/i);
  return match ? match[0] : 'Catalog pricing';
}

function enhanceSelect(select: HTMLSelectElement) {
  if (select.dataset.catalogTypeahead === 'ready') return;
  select.dataset.catalogTypeahead = 'ready';

  const form = select.closest('form');
  const wrapperLabel = select.closest('label');
  if (!form || !wrapperLabel) return;

  const options = Array.from(select.options).filter((option) => option.value);
  const selected = options.find((option) => option.value === select.value) ?? null;
  const selectedLabel = selected ? optionText(selected) : '';

  select.classList.add('catalog-native-select');
  select.tabIndex = -1;
  select.setAttribute('aria-hidden', 'true');

  const existing = wrapperLabel.querySelector<HTMLElement>('.catalog-combobox');
  if (existing) existing.remove();

  const combobox = document.createElement('div');
  combobox.className = 'catalog-combobox';
  combobox.setAttribute('data-empty', options.length ? 'false' : 'true');

  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.className = 'catalog-combobox-input';
  input.placeholder = options.length ? 'Search live catalog by product, SKU, HSN, pack, or pricing type' : 'No active catalog products available';
  input.value = selectedLabel;
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-autocomplete', 'list');
  input.disabled = !options.length;

  const list = document.createElement('div');
  list.className = 'catalog-combobox-list';
  list.setAttribute('role', 'listbox');
  list.hidden = true;

  const helper = document.createElement('p');
  helper.className = 'field-note catalog-combobox-help';
  helper.textContent = options.length
    ? 'Catalog-linked line: selecting a product submits catalog_pricing_rule_id and lets the server preserve catalog/pricing lineage.'
    : 'No active catalog products found for this organization. Check Catalog setup.';

  let activeIndex = -1;
  let visibleOptions: HTMLOptionElement[] = [];

  function syncSelected(option: HTMLOptionElement | null) {
    select.value = option?.value ?? '';
    input.value = option ? optionText(option) : '';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function closeList() {
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
  }

  function render(query = input.value) {
    const needle = normalize(query);
    visibleOptions = options
      .filter((option) => normalize(optionText(option)).includes(needle))
      .slice(0, 12);

    list.innerHTML = '';
    if (!visibleOptions.length) {
      const empty = document.createElement('div');
      empty.className = 'catalog-combobox-empty';
      empty.textContent = 'No matching catalog product found for this search.';
      list.appendChild(empty);
      return;
    }

    visibleOptions.forEach((option, index) => {
      const label = optionText(option);
      const [primary, ...secondaryParts] = label.split(' · ');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-combobox-option';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', option.value === select.value ? 'true' : 'false');
      button.innerHTML = `<strong></strong><small></small><em></em>`;
      button.querySelector('strong')!.textContent = primary || 'Catalog product';
      button.querySelector('small')!.textContent = secondaryParts.join(' · ') || 'SKU / pack / HSN pending';
      button.querySelector('em')!.textContent = priceHint(label);
      button.addEventListener('mousedown', (event) => event.preventDefault());
      button.addEventListener('click', () => {
        syncSelected(option);
        closeList();
      });
      if (index === activeIndex) button.classList.add('active');
      list.appendChild(button);
    });
  }

  input.addEventListener('input', () => {
    select.value = '';
    activeIndex = -1;
    render(input.value);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  });

  input.addEventListener('focus', () => {
    render(input.value);
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeList();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      render(input.value);
      list.hidden = false;
      const next = event.key === 'ArrowDown' ? activeIndex + 1 : activeIndex - 1;
      activeIndex = Math.max(0, Math.min(visibleOptions.length - 1, next));
      render(input.value);
      input.setAttribute('aria-expanded', 'true');
      return;
    }
    if (event.key === 'Enter' && !list.hidden && activeIndex >= 0 && visibleOptions[activeIndex]) {
      event.preventDefault();
      syncSelected(visibleOptions[activeIndex]);
      closeList();
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (!combobox.contains(event.target as Node)) closeList();
  });

  combobox.append(input, list, helper);
  wrapperLabel.appendChild(combobox);

  const oldEmpty = form.querySelector<HTMLElement>('.field-note.span-2');
  if (!options.length && oldEmpty) oldEmpty.textContent = 'No active catalog products found for this organization. Check Catalog setup.';
}

export function OrderCatalogProductTypeahead() {
  useEffect(() => {
    const enhanceAll = () => {
      document
        .querySelectorAll<HTMLSelectElement>('form.add-line-card select[name="catalog_pricing_rule_id"]')
        .forEach(enhanceSelect);
    };

    enhanceAll();
    const observer = new MutationObserver(enhanceAll);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <style jsx global>{`
      .catalog-native-select{
        position:absolute!important;
        width:1px!important;
        height:1px!important;
        padding:0!important;
        margin:-1px!important;
        overflow:hidden!important;
        clip:rect(0,0,0,0)!important;
        white-space:nowrap!important;
        border:0!important;
      }
      .catalog-combobox{position:relative;display:grid;gap:8px}
      .catalog-combobox-input{width:100%;border:1px solid #bfdbfe!important;background:#fff!important;border-radius:14px!important;padding:12px 14px!important;color:#102033!important;box-shadow:0 12px 28px rgba(37,99,235,.08)}
      .catalog-combobox-input:focus{outline:2px solid rgba(37,99,235,.25);border-color:#2563eb!important}
      .catalog-combobox-list{position:absolute;z-index:50;top:48px;left:0;right:0;max-height:320px;overflow:auto;border:1px solid #bfdbfe;background:#fff;border-radius:16px;box-shadow:0 22px 60px rgba(15,23,42,.18);padding:8px}
      .catalog-combobox-option{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 10px;text-align:left;border:0;background:transparent;border-radius:12px;padding:10px;cursor:pointer;color:#102033}
      .catalog-combobox-option:hover,.catalog-combobox-option.active{background:#eff6ff}
      .catalog-combobox-option[aria-selected="true"]{background:#ecfdf5}
      .catalog-combobox-option strong{font-size:13px;grid-column:1/-1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .catalog-combobox-option small{color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
      .catalog-combobox-option em{font-style:normal;color:#1d4ed8;font-weight:800;font-size:11px;white-space:nowrap}
      .catalog-combobox-empty{padding:14px;color:#64748b;font-weight:800}
      .catalog-combobox-help{margin:0!important;text-transform:none!important;font-size:12px!important;letter-spacing:0!important;color:#47616c!important}
      @media (max-width: 720px){.catalog-combobox-list{position:static;max-height:260px}.catalog-combobox-option{grid-template-columns:1fr}}
    `}</style>
  );
}
