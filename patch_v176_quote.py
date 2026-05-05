from pathlib import Path
p = Path('/mnt/data/v176/src/features/leads/components/leads-workspace.tsx')
s = p.read_text()
s = s.replace("type Variant = { id: string; name: string; product_id: string };", "type Variant = { id: string; name: string; product_id: string; sku_code?: string | null; pack_label?: string | null; pack_size_value?: number | null; pack_size_unit?: string | null; units_per_case?: number | null; moq_cases?: number | null; moq_kg?: number | null; pricing_mode_default?: string | null };")
anchor = "type SignalTone = 'slate' | 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';"
if "function countryCurrency" not in s:
    insert = '''
const COUNTRY_CURRENCY: Record<string, string> = {
  unitedstates: 'USD', usa: 'USD', us: 'USD', canada: 'CAD', mexico: 'MXN',
  india: 'INR', unitedkingdom: 'GBP', uk: 'GBP', britain: 'GBP', england: 'GBP',
  germany: 'EUR', france: 'EUR', italy: 'EUR', spain: 'EUR', netherlands: 'EUR', belgium: 'EUR',
  japan: 'JPY', china: 'CNY', singapore: 'SGD', australia: 'AUD', newzealand: 'NZD',
  ua: 'UAH', ukraine: 'UAH', uae: 'AED', unitedarabemirates: 'AED', saudiarabia: 'SAR',
  qatar: 'QAR', kuwait: 'KWD', oman: 'OMR', bahrain: 'BHD', southafrica: 'ZAR',
};

function countryCurrency(country?: string | null) {
  const key = String(country ?? '').toLowerCase().replace(/[^a-z]/g, '');
  return COUNTRY_CURRENCY[key] ?? null;
}

function uniqueCurrencyOptions(...values: Array<string | null | undefined>) {
  const defaults = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'JPY'];
  const seen = new Set<string>();
  return [...values, ...defaults]
    .map((value) => String(value ?? '').trim().toUpperCase())
    .filter((value) => value && !seen.has(value) && seen.add(value));
}

function variantPricingUnit(variant?: Variant | null) {
  const mode = String(variant?.pricing_mode_default ?? '').trim().toLowerCase();
  if (mode === 'kg' || mode === 'bulk') return 'kg';
  if (mode === 'unit') return 'unit';
  return 'case';
}

function variantPackSummary(variant?: Variant | null) {
  if (!variant) return 'Catalog basis';
  const packSize = variant.pack_size_value ? `${variant.pack_size_value} ${variant.pack_size_unit ?? ''}`.trim() : null;
  const units = variant.units_per_case ? `${variant.units_per_case} units/case` : null;
  return [packSize, units, variant.pack_label].filter(Boolean).join(' · ') || variant.name;
}

function defaultQuoteQuantity(variant?: Variant | null) {
  const basis = variantPricingUnit(variant);
  if (basis === 'kg') return Number(variant?.moq_kg ?? 0) > 0 ? Number(variant?.moq_kg) : 1;
  if (basis === 'case') return Number(variant?.moq_cases ?? 0) > 0 ? Number(variant?.moq_cases) : 1;
  return 1;
}
'''
    s = s.replace(anchor, insert + "\n" + anchor)
s = s.replace("  const [directOrderNote, setDirectOrderNote] = React.useState('');\n  const steps = ['Product', 'Pricing', 'Terms', 'Review', 'Send gate'];", "  const [directOrderNote, setDirectOrderNote] = React.useState('');\n  const steps = ['Product', 'Terms', 'Pricing', 'Review', 'Send gate'];")
s = s.replace("    note?: string | null;\n  };", "    note?: string | null;\n    pricingBasis?: string | null;\n    uomLabel?: string | null;\n    moqLabel?: string | null;\n    packSummary?: string | null;\n  };")
s = s.replace("  const variantNameMap = React.useMemo(() => new Map(variants.map((variant) => [variant.id, variant.name])), [variants]);", "  const variantNameMap = React.useMemo(() => new Map(variants.map((variant) => [variant.id, variant.name])), [variants]);\n  const variantDetailMap = React.useMemo(() => new Map(variants.map((variant) => [variant.id, variant])), [variants]);")
s = s.replace("        const qty = Number(item.quantity ?? 1) || 1;\n        const variantIds = new Set(variants.filter((variant) => variant.product_id === item.product_id).map((variant) => variant.id));", "        const variantIds = new Set(variants.filter((variant) => variant.product_id === item.product_id).map((variant) => variant.id));\n        const lineVariant = (item.product_variant_id ? variantDetailMap.get(item.product_variant_id) : null) ?? variants.find((variant) => variant.product_id === item.product_id) ?? null;\n        const qty = Number(item.quantity ?? defaultQuoteQuantity(lineVariant)) || 1;")
s = s.replace("          note: item.notes ?? null,\n        };", "          note: item.notes ?? null,\n          pricingBasis: variantPricingUnit(lineVariant),\n          uomLabel: variantPricingUnit(lineVariant),\n          moqLabel: variantPricingUnit(lineVariant) === 'kg' ? `${lineVariant?.moq_kg ?? 1} kg MOQ` : variantPricingUnit(lineVariant) === 'case' ? `${lineVariant?.moq_cases ?? 1} cases MOQ` : '1 unit MOQ',\n          packSummary: variantPackSummary(lineVariant),\n        };")
s = s.replace("      const variantLabel = selectedPrice ? variantNameMap.get(selectedPrice.product_variant_id) ?? productVariants[0]?.name ?? null : productVariants[0]?.name ?? null;\n      const marketLabel = selectedPrice?.market_id ? marketNameMap.get(selectedPrice.market_id) : selectedMarketNames[0];", "      const selectedVariant = (selectedPrice ? variantDetailMap.get(selectedPrice.product_variant_id) : null) ?? productVariants[0] ?? null;\n      const variantLabel = selectedVariant ? variantNameMap.get(selectedVariant.id) ?? selectedVariant.name ?? null : null;\n      const marketLabel = selectedPrice?.market_id ? marketNameMap.get(selectedPrice.market_id) : selectedMarketNames[0];\n      const quantity = defaultQuoteQuantity(selectedVariant);")
s = s.replace("        productVariantId: selectedPrice?.product_variant_id ?? productVariants[0]?.id ?? null,", "        productVariantId: selectedVariant?.id ?? null,")
s = s.replace("        quantity: 1,\n        unitPrice,\n        currency: String(lineCurrency ?? 'USD'),\n        total: unitPrice == null ? 0 : unitPrice,", "        quantity,\n        unitPrice,\n        currency: String(lineCurrency ?? 'USD'),\n        total: unitPrice == null ? 0 : quantity * unitPrice,")
old = """        note: unitPrice == null ? `No catalog price found${marketLabel ? ` for ${marketLabel}` : ''}. Create/open draft preview creates the quote shell; fill price in saved quote workflow.` : `Catalog/reference price${marketLabel ? ` for ${marketLabel}` : ''}.`,"""
new = old + """
        pricingBasis: variantPricingUnit(selectedVariant),
        uomLabel: variantPricingUnit(selectedVariant),
        moqLabel: variantPricingUnit(selectedVariant) === 'kg' ? `${selectedVariant?.moq_kg ?? 1} kg MOQ` : variantPricingUnit(selectedVariant) === 'case' ? `${selectedVariant?.moq_cases ?? 1} cases MOQ` : '1 unit MOQ',
        packSummary: variantPackSummary(selectedVariant),"""
s = s.replace(old, new)
s = s.replace("  }, [lead.deal_currency, latestQuote?.currency, marketNameMap, prices, pricingRules, productNameMap, quoteItems.length, selectedMarketIds, selectedMarketNames, selectedProductIds, selectedProductNames, sourceItems, variantNameMap, variants]);", "  }, [lead.deal_currency, latestQuote?.currency, marketNameMap, prices, pricingRules, productNameMap, quoteItems.length, selectedMarketIds, selectedMarketNames, selectedProductIds, selectedProductNames, sourceItems, variantDetailMap, variantNameMap, variants]);")
s = s.replace("  const [deliveryNotes, setDeliveryNotes] = React.useState('');", "  const [deliveryNotes, setDeliveryNotes] = React.useState('');\n  const localCurrency = countryCurrency(lead.country);\n  const currencyOptions = React.useMemo(() => uniqueCurrencyOptions(termsCurrency, localCurrency, lead.deal_currency, baseDisplayLines.find((item) => item.currency)?.currency), [baseDisplayLines, lead.deal_currency, localCurrency, termsCurrency]);")
oldval = """    if (builderStep === 1) {
      if (!displayLines.length) return 'Add at least one priced line before continuing to terms.';
      if (displayLines.some((line) => !line.productId)) return 'Every quote line needs a mapped product before continuing.';
      if (displayLines.some((line) => !line.quantity || line.quantity <= 0)) return 'Every quote line needs a quantity above zero.';
      if (displayLines.some((line) => line.unitPrice == null || line.unitPrice <= 0)) return 'Every quote line needs a unit price above zero.';
    }
    if (builderStep === 2) {
      if (!termsCurrency.trim()) return 'Select a quote currency before review.';
      if (!termsIncoterm.trim()) return 'Select an incoterm before review.';
      if (!paymentTerms.trim()) return 'Add payment terms before review.';
      if (!quoteValidityDays.trim()) return 'Add quote validity before review.';
    }"""
newval = """    if (builderStep === 1) {
      if (!termsCurrency.trim()) return 'Select a quote currency before pricing.';
      if (!termsIncoterm.trim()) return 'Select an incoterm before pricing.';
      if (!paymentTerms.trim()) return 'Add payment terms before pricing.';
      if (!quoteValidityDays.trim()) return 'Add quote validity before pricing.';
    }
    if (builderStep === 2) {
      if (!displayLines.length) return 'Add at least one priced line before continuing to review.';
      if (displayLines.some((line) => !line.productId)) return 'Every quote line needs a mapped product before continuing.';
      if (displayLines.some((line) => !line.quantity || line.quantity <= 0)) return 'Every quote line needs a quantity above zero.';
      if (displayLines.some((line) => line.unitPrice == null || line.unitPrice <= 0)) return 'Every quote line needs a unit price above zero.';
    }"""
s = s.replace(oldval, newval)
s = s.replace("builderStep === 1 ? 'Build the quote line by line. Catalog baseline prices pre-fill from your reference pricing. Overrides above 10% require manager approval before send.' :\n           builderStep === 2 ? 'Lock currency, incoterm, payment terms, port context, and quote validity.'", "builderStep === 1 ? 'Lock the quote basis first: currency, incoterm, payment terms, port context, validity, and FX reference.' :\n           builderStep === 2 ? 'Build pricing lines after the commercial basis is known. Quantities follow the product UOM, pack size, and MOQ.'")
s = s.replace("{builderStep === 0 ? 'Product & buyer lock' : builderStep === 1 ? 'Build pricing lines' : builderStep === 2 ? 'Set commercial terms' : builderStep === 3 ? 'Review quote package' : 'Approve and send safely'}", "{builderStep === 0 ? 'Product & buyer lock' : builderStep === 1 ? 'Set commercial terms' : builderStep === 2 ? 'Build pricing lines' : builderStep === 3 ? 'Review quote package' : 'Approve and send safely'}")
s = s.replace(") : builderStep === 1 ? (\n              <div className=\"space-y-3\">", ") : builderStep === __PRICING_STEP__ ? (\n              <div className=\"space-y-3\">")
s = s.replace(") : builderStep === 2 ? (\n              <div className=\"grid grid-cols-2 gap-[10px]\">", ") : builderStep === 1 ? (\n              <div className=\"grid grid-cols-2 gap-[10px]\">")
s = s.replace("__PRICING_STEP__", "2")
s = s.replace("<th className=\"border-b border-[#e2e8f0] px-[10px] py-[6px]\">Qty</th>\n                      <th className=\"border-b border-[#e2e8f0] px-[10px] py-[6px]\">Unit price</th>", "<th className=\"border-b border-[#e2e8f0] px-[10px] py-[6px]\">Price basis</th>\n                      <th className=\"border-b border-[#e2e8f0] px-[10px] py-[6px]\">Qty</th>\n                      <th className=\"border-b border-[#e2e8f0] px-[10px] py-[6px]\">Unit price</th>")
s = s.replace("<td className=\"px-[10px] py-[10px]\"><div className=\"font-bold text-[#0f172a]\">{item.productLabel}</div><div className=\"mt-1 text-[10px] text-[#64748b]\">{item.variantLabel ? `${item.variantLabel} · ` : ''}{item.source === 'coverage' ? 'coverage/catalog fallback' : item.source === 'rfq' ? 'RFQ line' : 'quote draft line'}</div>{item.note ? <div className=\"mt-1 text-[10px] text-[#94a3b8]\">{item.note}</div> : null}</td>\n                          <td className=\"px-[10px] py-[10px]\"><input", "<td className=\"px-[10px] py-[10px]\"><div className=\"font-bold text-[#0f172a]\">{item.productLabel}</div><div className=\"mt-1 text-[10px] text-[#64748b]\">{item.variantLabel ? `${item.variantLabel} · ` : ''}{item.source === 'coverage' ? 'coverage/catalog fallback' : item.source === 'rfq' ? 'RFQ line' : 'quote draft line'}</div>{item.note ? <div className=\"mt-1 text-[10px] text-[#94a3b8]\">{item.note}</div> : null}</td>\n                          <td className=\"px-[10px] py-[10px] text-[10px] text-[#475569]\"><div className=\"font-extrabold uppercase tracking-[.08em] text-[#0f172a]\">{item.pricingBasis ?? 'case'}</div><div>{item.packSummary ?? 'Pack not set'}</div><div>{item.moqLabel ?? 'MOQ not set'}</div></td>\n                          <td className=\"px-[10px] py-[10px]\"><input")
s = s.replace("<tr><td colSpan={4}", "<tr><td colSpan={5}")
s = s.replace("{['USD', 'EUR', 'GBP', 'INR', 'CAD', 'JPY'].map((option) => <option key={option}>{option}</option>)}", "{currencyOptions.map((option) => <option key={option}>{option}</option>)}")
s = s.replace("                  </select>\n                </div>\n                <div className=\"flex flex-col gap-[4px]\">\n                  <label className=\"text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]\">Incoterm</label>", "                  </select>\n                  <p className=\"text-[10px] leading-[1.45] text-[#64748b]\">Lead country currency {localCurrency ?? 'not mapped'} is included when available. Use quote validity days to lock the weekly average FX reference for this quote.</p>\n                </div>\n                <div className=\"flex flex-col gap-[4px]\">\n                  <label className=\"text-[9px] font-bold uppercase tracking-[.14em] text-[#94a3b8]\">Incoterm</label>")
p.write_text(s)
