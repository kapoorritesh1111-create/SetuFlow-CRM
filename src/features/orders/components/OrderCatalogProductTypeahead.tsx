'use client';

import { useEffect } from 'react';

type CatalogComboboxOption = {
  id: string;
  productName: string;
  secondary: string;
  priceLabel: string;
  searchText: string;
  label: string;
  defaultPrice: number | null;
  currency: string | null;
};

type CatalogApiOption = {
  id?: string | null;
  productName?: string | null;
  packLabel?: string | null;
  skuCode?: string | null;
  hsnCode?: string | null;
  pricingType?: string | null;
  basisLabel?: string | null;
  price?: number | null;
  currency?: string | null;
  searchText?: string | null;
};

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function optionText(option: HTMLOptionElement) {
  return String(option.textContent ?? option.label ?? '').trim();
}

function fallbackFromSelect(option: HTMLOptionElement): CatalogComboboxOption {
  const label = optionText(option);
  const [productName, ...secondaryParts] = label.split(' · ');
  const priceMatch = label.match(/\b(FOB|EXW|BULK|Pricing review)\b.*$/i);
  const numericPrice = priceMatch?.[0]?.match(/(\d+(?:\.\d+)?)/)?.[1];
  return {
    id: option.value,
    productName: productName || 'Catalog product',
    secondary: secondaryParts.join(' · ') || 'SKU / pack / HSN pending',
    priceLabel: priceMatch ? priceMatch[0] : 'Catalog pricing',
    searchText: label,
    label,
    defaultPrice: numericPrice ? Number(numericPrice) : null,
    currency: 'USD',
  };
}

function fromApiOption(option: CatalogApiOption): CatalogComboboxOption | null {
  const id = String(option.id ?? '').trim();
  if (!id) return null;
  const productName = String(option.productName ?? 'Catalog product').trim() || 'Catalog product';
  const defaultPrice = option.price != null && Number.isFinite(Number(option.price)) ? Number(option.price) : null;
  const currency = option.currency ?? 'USD';
  const priceLabel = defaultPrice != null
    ? `${option.basisLabel ?? 'Catalog'} ${currency} ${defaultPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
    : option.basisLabel ?? 'Pricing review';
  const secondaryParts = [
    option.skuCode ? `SKU ${option.skuCode}` : null,
    option.packLabel ?? null,
    option.hsnCode ? `HSN ${option.hsnCode}` : null,
    option.pricingType ? `Pricing ${option.pricingType}` : null,
  ].filter(Boolean) as string[];
  const secondary = secondaryParts.join(' · ') || 'SKU / pack / HSN pending';
  const label = [productName, ...secondaryParts, priceLabel].filter(Boolean).join(' · ');
  const searchText = [option.searchText, productName, secondary, priceLabel].filter(Boolean).join(' ');
  return { id, productName, secondary, priceLabel, searchText, label, defaultPrice, currency };
}

function syncNativeSelect(select: HTMLSelectElement, options: CatalogComboboxOption[], selectedId: string) {
  select.innerHTML = '';
  const blank = document.createElement('option');
  blank.value = '';
  blank.textContent = 'Manual / choose catalog product';
  select.appendChild(blank);

  options.forEach((option) => {
    const item = document.createElement('option');
    item.value = option.id;
    item.textContent = option.label;
    item.dataset.searchText = option.searchText;
    select.appendChild(item);
  });

  if (selectedId && options.some((option) => option.id === selectedId)) {
    select.value = selectedId;
  }
}

function enhanceSelect(select: HTMLSelectElement) {
  if (select.dataset.catalogTypeahead === 'ready') return;
  select.dataset.catalogTypeahead = 'ready';

  const maybeForm = select.closest('form');
  const maybeWrapperLabel = select.closest('label');
  if (!(maybeForm instanceof HTMLFormElement) || !(maybeWrapperLabel instanceof HTMLElement)) return;
  const form: HTMLFormElement = maybeForm;
  const wrapperLabel: HTMLElement = maybeWrapperLabel;

  let options: CatalogComboboxOption[] = Array.from(select.options)
    .filter((option) => option.value)
    .map(fallbackFromSelect);
  const selectedId = select.value;
  let selected = options.find((option) => option.id === selectedId) ?? null;
  let catalogSource: string | undefined;

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
  input.value = selected?.label ?? '';
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

  let activeIndex = -1;
  let visibleOptions: CatalogComboboxOption[] = [];

  function setHelper(source?: string) {
    helper.textContent = options.length
      ? source === 'active'
        ? 'Showing active catalog products because no quoteable catalog rows were returned for this organization.'
        : 'Catalog-linked line: selecting a product submits catalog_pricing_rule_id and lets the server preserve catalog/pricing lineage.'
      : 'No active catalog products found for this organization. Check Catalog setup.';
  }

  function refreshEmptyState() {
    combobox.setAttribute('data-empty', options.length ? 'false' : 'true');
    input.disabled = !options.length;
    input.placeholder = options.length ? 'Search live catalog by product, SKU, HSN, pack, or pricing type' : 'No active catalog products available';
    setHelper(catalogSource);
    const oldEmpty = form.querySelector<HTMLElement>('.field-note.span-2');
    if (!options.length && oldEmpty) oldEmpty.textContent = 'No active catalog products found for this organization. Check Catalog setup.';
  }

  function clarifyManualLineBoundary() {
    const manualProductInput = form.querySelector<HTMLInputElement>('input[name="product_name"]');
    const manualProductLabel = manualProductInput?.closest('label')?.querySelector('span');
    if (manualProductLabel) manualProductLabel.textContent = 'Manual line product';
    const manualPriceInput = form.querySelector<HTMLInputElement>('input[name="unit_price"]');
    const manualPriceLabel = manualPriceInput?.closest('label')?.querySelector('span');
    if (manualPriceLabel) manualPriceLabel.textContent = 'Unit price / override';
    if (!form.querySelector('.manual-line-boundary-note')) {
      const note = document.createElement('p');
      note.className = 'field-note span-2 manual-line-boundary-note';
      note.textContent = 'Manual line only: not catalog-linked. Add product details and reason/context when no live Catalog product applies.';
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton?.parentElement === form) form.insertBefore(note, submitButton);
      else form.appendChild(note);
    }
  }

  function applySelectedDefaults(option: CatalogComboboxOption | null) {
    if (!option) return;
    const unitPriceInput = form.querySelector<HTMLInputElement>('input[name="unit_price"]');
    if (unitPriceInput && option.defaultPrice != null && !unitPriceInput.value.trim()) {
      unitPriceInput.value = String(option.defaultPrice);
    }
    const currencyInput = form.querySelector<HTMLInputElement>('input[name="currency"]');
    if (currencyInput && option.currency && (!currencyInput.value.trim() || currencyInput.value === 'USD')) {
      currencyInput.value = option.currency;
    }
  }

  function syncSelected(option: CatalogComboboxOption | null) {
    selected = option;
    select.value = option?.id ?? '';
    input.value = option ? option.label : '';
    applySelectedDefaults(option);
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
      .filter((option) => normalize(option.searchText || option.label).includes(needle))
      .slice(0, 12);

    list.innerHTML = '';
    if (!visibleOptions.length) {
      const empty = document.createElement('div');
      empty.className = 'catalog-combobox-empty';
      empty.textContent = options.length ? 'No matching catalog product found for this search.' : 'No active catalog products found for this organization. Check Catalog setup.';
      list.appendChild(empty);
      return;
    }

    visibleOptions.forEach((option, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'catalog-combobox-option';
      button.setAttribute('role', 'option');
      button.setAttribute('aria-selected', option.id === select.value ? 'true' : 'false');
      button.innerHTML = `<strong></strong><small></small><em></em>`;
      button.querySelector('strong')!.textContent = option.productName;
      button.querySelector('small')!.textContent = option.secondary;
      button.querySelector('em')!.textContent = option.priceLabel;
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
    selected = null;
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
      syncSelected(null);
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
  clarifyManualLineBoundary();
  refreshEmptyState();
  syncNativeSelect(select, options, selectedId);

  fetch('/api/orders/catalog-options', { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : null)
    .then((payload: { options?: CatalogApiOption[]; source?: string } | null) => {
      const liveOptions = Array.isArray(payload?.options) ? payload.options.map(fromApiOption).filter(Boolean) as CatalogComboboxOption[] : [];
      if (!liveOptions.length) {
        if (!options.length) refreshEmptyState();
        return;
      }
      const currentId = select.value;
      options = liveOptions;
      catalogSource = payload?.source;
      selected = options.find((option) => option.id === currentId) ?? selected;
      syncNativeSelect(select, options, currentId);
      if (selected && select.value) input.value = selected.label;
      refreshEmptyState();
      render(input.value);
    })
    .catch(() => {
      refreshEmptyState();
    });
}

export function OrderCatalogProductTypeahead() {
  useEffect(() => {
    const enhanceAll = () => {
      document
        .querySelectorAll<HTMLSelectElement>('select[name="catalog_pricing_rule_id"]')
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
      .manual-line-boundary-note{margin:0!important;text-transform:none!important;font-size:12px!important;letter-spacing:0!important;color:#92400e!important;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:10px!important}
      @media (max-width: 720px){.catalog-combobox-list{position:static;max-height:260px}.catalog-combobox-option{grid-template-columns:1fr}}
    `}</style>
  );
}
