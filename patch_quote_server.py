from pathlib import Path
# data query selects
p=Path('/mnt/data/v1762/src/lib/queries/data.ts')
s=p.read_text()
s=s.replace(".select('id, lead_id, rfq_id, status, currency, created_at, updated_at, notes, quote_number, current_version_id')", ".select('id, lead_id, rfq_id, status, currency, created_at, updated_at, notes, notes_internal, quote_number, current_version_id, approval_required, approved_at, approved_by')")
s=s.replace(".select('id, lead_id, rfq_id, status, currency, pricing_basis, created_at, updated_at, notes, quote_number, current_version_id')", ".select('id, lead_id, rfq_id, status, currency, pricing_basis, created_at, updated_at, notes, notes_internal, quote_number, current_version_id, approval_required, approved_at, approved_by')")
p.write_text(s)
# server action
p=Path('/mnt/data/v1762/src/features/leads/server/actions.ts')
s=p.read_text()
s=s.replace("    source?: string | null;\n  }>;", "    source?: string | null;\n    quoteAdjustmentType?: string | null;\n    quoteAdjustmentValue?: number | null;\n    quoteAdjustmentReason?: string | null;\n    approvalRequired?: boolean | null;\n  }>;")
# insert approval helper after previewLines map
needle="""  const { data: quote, error: quoteError } = await db
    .from('quotes')
"""
insert="""  const quoteAdjustmentApprovalRequired = previewLines.some((line) => Boolean((line as any).approvalRequired));
  const previewOverrideCount = previewLines.filter((line) => Boolean(line.is_price_overridden)).length;
  const approvalNote = quoteAdjustmentApprovalRequired
    ? `Approval pending: ${previewOverrideCount || 1} quote-only pricing adjustment${previewOverrideCount === 1 ? '' : 's'} exceeded the 15% threshold.`
    : previewOverrideCount
      ? `${previewOverrideCount} quote-only pricing adjustment${previewOverrideCount === 1 ? '' : 's'} saved inside this quote.`
      : null;

"""+needle
s=s.replace(needle,insert)
# Need carry approvalRequired from line into previewLines map; insert before notes
s=s.replace("        notes: line.notes ?? null,\n      };", "        notes: [line.notes, line.quoteAdjustmentType && line.quoteAdjustmentType !== 'none' ? `Quote-only adjustment: ${line.quoteAdjustmentType} ${line.quoteAdjustmentValue ?? 0}. ${line.quoteAdjustmentReason ?? ''}` : null].filter(Boolean).join(' | ') || null,\n        approvalRequired: Boolean(line.approvalRequired),\n      };")
# update quotes update payload
s=s.replace(".update({ currency, display_currency: currency, updated_at: nowIso })", ".update({ currency, display_currency: currency, approval_required: quoteAdjustmentApprovalRequired, notes_internal: approvalNote, updated_at: nowIso })")
# versionLines calculation_meta include adjustment note
s=s.replace("calculation_meta: { source: 'leads_quote_preview' },", "calculation_meta: { source: 'leads_quote_preview', quote_only_adjustment: Boolean((line as any).is_price_overridden), approval_required: Boolean((line as any).approvalRequired) },")
# communication body include approval
s=s.replace("body: `Quote preview saved with ${previewLines.length} line${previewLines.length === 1 ? '' : 's'} and ${currency} currency.`,", "body: `Quote preview saved with ${previewLines.length} line${previewLines.length === 1 ? '' : 's'} and ${currency} currency.${quoteAdjustmentApprovalRequired ? ' Approval is required before send.' : ''}`, ")
s=s.replace("summary: 'Quote preview saved',", "summary: quoteAdjustmentApprovalRequired ? 'Quote preview saved · approval required' : 'Quote preview saved',")
# return message
s=s.replace("return { success: 'Quote preview saved to the active draft.', quoteId: quote.id };", "return { success: quoteAdjustmentApprovalRequired ? 'Quote preview saved. Approval is pending before send.' : 'Quote preview saved to the active draft.', quoteId: quote.id };")
p.write_text(s)
