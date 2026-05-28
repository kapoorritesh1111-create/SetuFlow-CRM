import type { CompiledQuoteLine, CompiledQuoteResult, QuoteParentSummary, QuoteVersionRecord, QuoteVersionStatus } from '../types';
import type { CurrencyCode, PricingBasis } from '../types';
import type { PricingSupabaseClient, QuotePricingRepository, QuoteVersionAggregate } from './types';
import { mapCompiledLineToVersionInsert } from '../mappers';
import type { Json } from '@/types/database';


type LeadContextRow = {
  id: string;
  organization_id: string;
  owner_user_id: string | null;
  company_name: string;
  market_id: string | null;
  country_id: string | null;
};

type RfqContextRow = {
  id: string;
  organization_id: string;
  lead_id: string;
  currency: string | null;
  validity_date: string | null;
  notes: string | null;
};

type PricingEngineSettingsRow = {
  default_display_currency: CurrencyCode | null;
  default_validity_days: number | null;
  allow_manual_fx: boolean | null;
  require_approval_for_override: boolean | null;
  approval_threshold_percent: number | null;
};

type QuoteThreadInsertRow = {
  organization_id: string;
  lead_id: string;
  rfq_id: string | null;
  created_by: string;
  status: QuoteParentSummary['status'];
  currency: string;
  display_currency: CurrencyCode;
  pricing_basis: PricingBasis;
  quote_number: string;
  version_no: number;
  market_id: string | null;
  country_id: string | null;
  destination_port: string | null;
  valid_until: string | null;
  freight_profile_id: string | null;
  source_type: string;
  approval_required: boolean;
  notes: string | null;
  notes_internal: string | null;
  notes_customer: string | null;
};

type QuoteParentRow = {
  id: string;
  organization_id: string;
  lead_id: string;
  rfq_id: string | null;
  status: QuoteParentSummary['status'];
  quote_number: string | null;
  version_no: number | null;
  pricing_basis: QuoteParentSummary['pricingBasis'] | null;
  display_currency: QuoteParentSummary['displayCurrency'] | null;
  destination_port: string | null;
  valid_until: string | null;
  current_version_id: string | null;
  accepted_version_id: string | null;
};

type QuoteVersionInsertRow = {
  quote_id: string;
  version_no: number;
  status: QuoteVersionStatus;
  pricing_basis: CompiledQuoteResult['pricingBasis'];
  display_currency: CompiledQuoteResult['displayCurrency'];
  valid_until: string | null;
  customer_message: string | null;
  internal_notes: string | null;
  total_line_count: number;
  created_by: string;
};

type QuoteVersionRow = {
  id: string;
  quote_id: string;
  version_no: number;
  status: QuoteVersionStatus;
  pricing_basis: CompiledQuoteResult['pricingBasis'];
  display_currency: CompiledQuoteResult['displayCurrency'];
  valid_until: string | null;
  customer_message: string | null;
  internal_notes: string | null;
  total_line_count: number | null;
};

type QuotePricingSnapshotInsertRow = {
  quote_version_id: string;
  pricing_rule_set_id: string;
  freight_profile_id: string | null;
  fx_base_currency: 'USD';
  fx_display_currency: CompiledQuoteResult['displayCurrency'];
  fx_rate: number;
  fx_provider: string;
  fx_effective_at: string;
  quote_context: Json;
  freight_context: Json;
  calculation_payload: Json;
  source_hash: string;
};

type QuotePricingSnapshotRow = {
  quote_version_id: string;
  pricing_rule_set_id: string | null;
  freight_profile_id: string | null;
  fx_base_currency: 'USD' | null;
  fx_display_currency: CompiledQuoteResult['displayCurrency'] | null;
  fx_rate: number | null;
  fx_provider: string | null;
  fx_effective_at: string | null;
  quote_context: Json | null;
  freight_context: Json | null;
  calculation_payload: Json | null;
  source_hash: string | null;
};

type QuoteVersionLineItemRow = {
  id: string;
  quote_version_id: string;
  product_id: string | null;
  product_variant_id: string | null;
  sku_code: string;
  hsn_code: string | null;
  product_name: string;
  category_type: CompiledQuoteLine['categoryType'];
  pack_label: string | null;
  basis_applied: CompiledQuoteLine['basisApplied'];
  pricing_mode: CompiledQuoteLine['pricingMode'];
  units_per_case: number | null;
  moq: number | null;
  source_ex_factory_usd: number | null;
  source_fob_usd: number | null;
  source_bulk_usd_per_kg: number | null;
  source_ex_factory_inr: number | null;
  source_fob_inr: number | null;
  source_bulk_inr_per_kg: number | null;
  freight_add_on_usd: number | null;
  fx_rate: number;
  final_unit_price: number | null;
  final_case_price: number | null;
  final_kg_price: number | null;
  display_currency: CompiledQuoteLine['displayCurrency'];
  is_overridden: boolean | null;
  override_reason: string | null;
  line_notes: string | null;
  sort_order: number | null;
  calculation_meta: Json | null;
};

function assertSingle<T>(data: T[] | null, entityName: string): T {
  if (!data || data.length === 0) {
    throw new Error(`${entityName} insert returned no rows.`);
  }

  return data[0]!;
}

function asRecord(value: Json | null | undefined): Record<string, Json> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, Json>) : {};
}

function mapLineItemRowToCompiledLine(row: QuoteVersionLineItemRow): CompiledQuoteLine {
  return {
    productId: row.product_id,
    productVariantId: row.product_variant_id,
    skuCode: row.sku_code,
    hsnCode: row.hsn_code,
    productName: row.product_name,
    categoryType: row.category_type,
    packLabel: row.pack_label,
    basisApplied: row.basis_applied,
    pricingMode: row.pricing_mode,
    unitsPerCase: row.units_per_case,
    moq: row.moq,
    sourceExFactoryUsd: row.source_ex_factory_usd,
    sourceFobUsd: row.source_fob_usd,
    sourceBulkUsdPerKg: row.source_bulk_usd_per_kg,
    sourceExFactoryInr: row.source_ex_factory_inr,
    sourceFobInr: row.source_fob_inr,
    sourceBulkInrPerKg: row.source_bulk_inr_per_kg,
    freightAddOnUsd: row.freight_add_on_usd,
    fxRate: row.fx_rate,
    displayCurrency: row.display_currency,
    finalUnitPrice: row.final_unit_price,
    finalCasePrice: row.final_case_price,
    finalKgPrice: row.final_kg_price,
    isOverridden: row.is_overridden ?? false,
    overrideReason: row.override_reason,
    lineNotes: row.line_notes,
    calculationMeta: asRecord(row.calculation_meta),
    sortOrder: row.sort_order ?? 0,
  };
}

export class SupabaseQuotePricingRepository implements QuotePricingRepository {
  constructor(private readonly db: PricingSupabaseClient) {}


  async getLeadContext(args: { organizationId: string; leadId: string }) {
    const { data, error } = await this.db
      .from('leads')
      .select('id, organization_id, owner_user_id, company_name, market_id, country_id')
      .eq('organization_id', args.organizationId)
      .eq('id', args.leadId)
      .maybeSingle<LeadContextRow>();

    if (error) {
      throw new Error(`Failed to load lead context ${args.leadId}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      ownerUserId: data.owner_user_id,
      companyName: data.company_name,
      marketId: data.market_id,
      countryId: data.country_id,
    };
  }

  async getRfqContext(args: { organizationId: string; rfqId: string }) {
    const { data, error } = await this.db
      .from('rfqs')
      .select('id, organization_id, lead_id, currency, validity_date, notes')
      .eq('organization_id', args.organizationId)
      .eq('id', args.rfqId)
      .maybeSingle<RfqContextRow>();

    if (error) {
      throw new Error(`Failed to load RFQ context ${args.rfqId}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      leadId: data.lead_id,
      currency: (data.currency as CurrencyCode | null) ?? null,
      validityDate: data.validity_date,
      notes: data.notes,
    };
  }

  async createQuoteThread(args: {
    organizationId: string;
    leadId: string;
    rfqId?: string | null;
    actorUserId: string;
    sourceEntity: 'lead' | 'rfq';
    pricingBasis: PricingBasis;
    displayCurrency: CurrencyCode;
    marketId?: string | null;
    countryId?: string | null;
    destinationPort?: string | null;
    validUntil?: string | null;
    freightProfileId?: string | null;
    customerMessage?: string | null;
    internalNotes?: string | null;
  }): Promise<QuoteParentSummary> {
    const settings = await this.getPricingEngineSettings({ organizationId: args.organizationId });
    const displayCurrency = args.displayCurrency ?? settings?.defaultDisplayCurrency ?? 'USD';
    const validUntil = args.validUntil ?? this.computeValidUntil(settings?.defaultValidityDays ?? null);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const quoteNumber = await this.generateQuoteNumber(args.organizationId);
      const insertRow: QuoteThreadInsertRow = {
        organization_id: args.organizationId,
        lead_id: args.leadId,
        rfq_id: args.rfqId ?? null,
        created_by: args.actorUserId,
        status: 'draft',
        currency: displayCurrency,
        display_currency: displayCurrency,
        pricing_basis: args.pricingBasis,
        quote_number: quoteNumber,
        version_no: 0,
        market_id: args.marketId ?? null,
        country_id: args.countryId ?? null,
        destination_port: args.destinationPort ?? null,
        valid_until: validUntil,
        freight_profile_id: args.freightProfileId ?? null,
        source_type: args.sourceEntity === 'rfq' ? 'rfq' : 'lead',
        approval_required: false,
        notes: null,
        notes_internal: args.internalNotes ?? null,
        notes_customer: args.customerMessage ?? null,
      };

      const { data, error } = await this.db
        .from('quotes')
        .insert(insertRow)
        .select('id, organization_id, lead_id, rfq_id, status, quote_number, version_no, pricing_basis, display_currency, destination_port, valid_until, current_version_id, accepted_version_id')
        .single<QuoteParentRow>();

      if (!error && data) {
        return {
          id: data.id,
          organizationId: data.organization_id,
          leadId: data.lead_id,
          rfqId: data.rfq_id,
          status: data.status,
          quoteNumber: data.quote_number,
          versionNo: data.version_no ?? 0,
          pricingBasis: data.pricing_basis,
          displayCurrency: data.display_currency,
          destinationPort: data.destination_port,
          validUntil: data.valid_until,
          currentVersionId: data.current_version_id,
          acceptedVersionId: data.accepted_version_id,
        };
      }

      const message = error?.message ?? 'Unknown quote thread insert failure.';
      const isQuoteNumberCollision = error?.code === '23505' && (message.includes('quote_number') || message.includes('uq_quotes_quote_number_org'));
      lastError = new Error(`Failed to create CRM quote thread for lead ${args.leadId}: ${message}`);
      if (!isQuoteNumberCollision) {
        throw lastError;
      }
    }

    throw lastError ?? new Error(`Failed to create CRM quote thread for lead ${args.leadId}.`);
  }

  async getQuoteParent(args: { organizationId: string; quoteId: string }): Promise<QuoteParentSummary | null> {
    const { data, error } = await this.db
      .from('quotes')
      .select([
        'id',
        'organization_id',
        'lead_id',
        'rfq_id',
        'status',
        'quote_number',
        'version_no',
        'pricing_basis',
        'display_currency',
        'destination_port',
        'valid_until',
        'current_version_id',
        'accepted_version_id',
      ].join(', '))
      .eq('organization_id', args.organizationId)
      .eq('id', args.quoteId)
      .maybeSingle<QuoteParentRow>();

    if (error) {
      throw new Error(`Failed to load quote parent ${args.quoteId}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      leadId: data.lead_id,
      rfqId: data.rfq_id,
      status: data.status,
      quoteNumber: data.quote_number,
      versionNo: data.version_no ?? 0,
      pricingBasis: data.pricing_basis,
      displayCurrency: data.display_currency,
      destinationPort: data.destination_port,
      validUntil: data.valid_until,
      currentVersionId: data.current_version_id,
      acceptedVersionId: data.accepted_version_id,
    };
  }

  async getQuoteParentById(args: { quoteId: string }): Promise<QuoteParentSummary | null> {
    const { data, error } = await this.db
      .from('quotes')
      .select([
        'id',
        'organization_id',
        'lead_id',
        'rfq_id',
        'status',
        'quote_number',
        'version_no',
        'pricing_basis',
        'display_currency',
        'destination_port',
        'valid_until',
        'current_version_id',
        'accepted_version_id',
      ].join(', '))
      .eq('id', args.quoteId)
      .maybeSingle<QuoteParentRow>();

    if (error) {
      throw new Error(`Failed to load quote parent ${args.quoteId}: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      leadId: data.lead_id,
      rfqId: data.rfq_id,
      status: data.status,
      quoteNumber: data.quote_number,
      versionNo: data.version_no ?? 0,
      pricingBasis: data.pricing_basis,
      displayCurrency: data.display_currency,
      destinationPort: data.destination_port,
      validUntil: data.valid_until,
      currentVersionId: data.current_version_id,
      acceptedVersionId: data.accepted_version_id,
    };
  }

  async createDraftVersionFromCompile(args: {
    organizationId: string;
    compiled: CompiledQuoteResult;
    actorUserId: string;
    customerMessage?: string | null;
    internalNotes?: string | null;
    validUntil?: string | null;
  }): Promise<QuoteVersionRecord> {
    const quoteParent = await this.getQuoteParent({
      organizationId: args.organizationId,
      quoteId: args.compiled.quoteId,
    });

    if (!quoteParent) {
      throw new Error(`Quote parent not found for version freeze: ${args.compiled.quoteId}.`);
    }

    const payload = {
      organizationId: args.organizationId,
      compiled: {
        quoteId: args.compiled.quoteId,
        pricingRuleSetId: args.compiled.pricingRuleSetId,
        freightProfileId: args.compiled.freightProfileId ?? null,
        pricingBasis: args.compiled.pricingBasis,
        displayCurrency: args.compiled.displayCurrency,
        totalLineCount: args.compiled.totalLineCount,
        sourceHash: args.compiled.sourceHash,
        quoteContext: args.compiled.quoteContext,
        calculationPayload: args.compiled.calculationPayload,
        fx: args.compiled.fx,
        freight: args.compiled.freight ?? null,
        lines: args.compiled.lines,
      },
      actorUserId: args.actorUserId,
      customerMessage: args.customerMessage ?? null,
      internalNotes: args.internalNotes ?? null,
      validUntil: args.validUntil ?? (args.compiled.quoteContext.validUntil as string | null | undefined) ?? quoteParent.validUntil ?? null,
    };

    const { data, error } = await this.db.rpc('app_create_draft_quote_version_from_compile_tx', {
      p_payload: payload,
    } as never);

    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.id || !row?.quote_id) {
        throw new Error(`Transactional draft quote version RPC returned no rows for quote ${args.compiled.quoteId}.`);
      }

      return {
        id: row.id,
        quoteId: row.quote_id,
        versionNo: Number(row.version_no ?? 0),
        status: row.status as QuoteVersionStatus,
      };
    }

    const missingRpc = /schema cache|function|app_create_draft_quote_version_from_compile_tx/i.test(error.message ?? '');
    if (!missingRpc) {
      throw new Error(`Failed to create transactional draft quote version for quote ${args.compiled.quoteId}: ${error.message}`);
    }

    const { data: latestRows, error: latestError } = await this.db
      .from('quote_versions')
      .select('version_no')
      .eq('quote_id', args.compiled.quoteId)
      .order('version_no', { ascending: false })
      .limit(1);
    if (latestError) {
      throw new Error(`Failed to inspect quote versions for fallback version freeze: ${latestError.message}`);
    }
    const nextVersionNo = Number(latestRows?.[0]?.version_no ?? 0) + 1;
    const { data: versionRow, error: versionError } = await this.db
      .from('quote_versions')
      .insert({
        quote_id: args.compiled.quoteId,
        version_no: nextVersionNo,
        status: 'draft',
        pricing_basis: args.compiled.pricingBasis,
        display_currency: args.compiled.displayCurrency,
        valid_until: payload.validUntil,
        customer_message: args.customerMessage ?? null,
        internal_notes: args.internalNotes ?? 'Created by direct table fallback because app_create_draft_quote_version_from_compile_tx RPC is unavailable.',
        total_line_count: args.compiled.totalLineCount,
        created_by: args.actorUserId,
        source_hash: args.compiled.sourceHash,
      })
      .select('id, quote_id, version_no, status')
      .single();
    if (versionError || !versionRow?.id) {
      throw new Error(`Failed to create fallback quote version for quote ${args.compiled.quoteId}: ${versionError?.message ?? 'No row returned.'}`);
    }

    const lineRows = args.compiled.lines.map((line) => ({
      quote_version_id: versionRow.id,
      product_id: line.productId ?? null,
      product_variant_id: line.productVariantId ?? null,
      sku_code: line.skuCode || 'UNMAPPED',
      hsn_code: line.hsnCode ?? null,
      product_name: line.productName || 'Quote line',
      category_type: line.categoryType,
      pack_label: line.packLabel ?? null,
      basis_applied: line.basisApplied,
      pricing_mode: line.pricingMode,
      units_per_case: line.unitsPerCase ?? null,
      moq: line.moq ?? null,
      source_ex_factory_usd: line.sourceExFactoryUsd ?? null,
      source_fob_usd: line.sourceFobUsd ?? null,
      source_bulk_usd_per_kg: line.sourceBulkUsdPerKg ?? null,
      source_ex_factory_inr: line.sourceExFactoryInr ?? null,
      source_fob_inr: line.sourceFobInr ?? null,
      source_bulk_inr_per_kg: line.sourceBulkInrPerKg ?? null,
      freight_add_on_usd: line.freightAddOnUsd ?? null,
      fx_rate: line.fxRate,
      final_unit_price: line.finalUnitPrice ?? null,
      final_case_price: line.finalCasePrice ?? null,
      final_kg_price: line.finalKgPrice ?? null,
      display_currency: line.displayCurrency,
      is_overridden: Boolean(line.isOverridden),
      override_reason: line.overrideReason ?? null,
      line_notes: line.lineNotes ?? null,
      sort_order: line.sortOrder,
      calculation_meta: line.calculationMeta ?? {},
    }));
    if (lineRows.length) {
      const { error: lineError } = await this.db.from('quote_version_line_items').insert(lineRows);
      if (lineError) {
        throw new Error(`Failed to create fallback quote version lines: ${lineError.message}`);
      }
    }

    await this.db.from('quote_pricing_snapshots').insert({
      quote_version_id: versionRow.id,
      pricing_rule_set_id: args.compiled.pricingRuleSetId,
      freight_profile_id: args.compiled.freightProfileId ?? null,
      fx_base_currency: args.compiled.fx.baseCurrency,
      fx_display_currency: args.compiled.displayCurrency,
      fx_rate: args.compiled.fx.rate,
      fx_provider: args.compiled.fx.provider,
      fx_effective_at: args.compiled.fx.effectiveAt,
      quote_context: args.compiled.quoteContext,
      freight_context: args.compiled.freight ?? {},
      calculation_payload: args.compiled.calculationPayload,
      source_hash: args.compiled.sourceHash,
    });

    await this.db
      .from('quotes')
      .update({ current_version_id: versionRow.id, version_no: nextVersionNo, updated_at: new Date().toISOString() })
      .eq('id', args.compiled.quoteId)
      .eq('organization_id', args.organizationId);

    return {
      id: versionRow.id,
      quoteId: versionRow.quote_id,
      versionNo: Number(versionRow.version_no ?? nextVersionNo),
      status: versionRow.status as QuoteVersionStatus,
    };
  }

  async getVersionAggregate(args: { quoteVersionId: string }): Promise<QuoteVersionAggregate | null> {
    const { data: versionData, error: versionError } = await this.db
      .from('quote_versions')
      .select('id, quote_id, version_no, status, pricing_basis, display_currency, valid_until, customer_message, internal_notes, total_line_count')
      .eq('id', args.quoteVersionId)
      .maybeSingle<QuoteVersionRow>();

    if (versionError) {
      throw new Error(`Failed to load quote version ${args.quoteVersionId}: ${versionError.message}`);
    }

    if (!versionData) {
      return null;
    }

    const parentQuote = await this.db
      .from('quotes')
      .select([
        'id',
        'organization_id',
        'lead_id',
        'rfq_id',
        'status',
        'quote_number',
        'version_no',
        'pricing_basis',
        'display_currency',
        'destination_port',
        'valid_until',
        'current_version_id',
        'accepted_version_id',
      ].join(', '))
      .eq('id', versionData.quote_id)
      .maybeSingle<QuoteParentRow>();

    if (parentQuote.error) {
      throw new Error(`Failed to load parent quote ${versionData.quote_id}: ${parentQuote.error.message}`);
    }

    if (!parentQuote.data) {
      throw new Error(`Parent quote not found for quote version ${args.quoteVersionId}.`);
    }

    const snapshotResult = await this.db
      .from('quote_pricing_snapshots')
      .select('quote_version_id, pricing_rule_set_id, freight_profile_id, fx_base_currency, fx_display_currency, fx_rate, fx_provider, fx_effective_at, quote_context, freight_context, calculation_payload, source_hash')
      .eq('quote_version_id', args.quoteVersionId)
      .maybeSingle<QuotePricingSnapshotRow>();

    if (snapshotResult.error) {
      throw new Error(`Failed to load pricing snapshot for quote version ${args.quoteVersionId}: ${snapshotResult.error.message}`);
    }

    const lineResult = await this.db
      .from('quote_version_line_items')
      .select([
        'id',
        'quote_version_id',
        'product_id',
        'product_variant_id',
        'sku_code',
        'hsn_code',
        'product_name',
        'category_type',
        'pack_label',
        'basis_applied',
        'pricing_mode',
        'units_per_case',
        'moq',
        'source_ex_factory_usd',
        'source_fob_usd',
        'source_bulk_usd_per_kg',
        'source_ex_factory_inr',
        'source_fob_inr',
        'source_bulk_inr_per_kg',
        'freight_add_on_usd',
        'fx_rate',
        'final_unit_price',
        'final_case_price',
        'final_kg_price',
        'display_currency',
        'is_overridden',
        'override_reason',
        'line_notes',
        'sort_order',
        'calculation_meta',
      ].join(', '))
      .eq('quote_version_id', args.quoteVersionId)
      .order('sort_order', { ascending: true });

    if (lineResult.error) {
      throw new Error(`Failed to load quote version line items for ${args.quoteVersionId}: ${lineResult.error.message}`);
    }

    const snapshot = snapshotResult.data
      ? {
          fx: snapshotResult.data.fx_rate != null && snapshotResult.data.fx_display_currency
            ? {
                baseCurrency: snapshotResult.data.fx_base_currency ?? 'USD',
                displayCurrency: snapshotResult.data.fx_display_currency,
                rate: snapshotResult.data.fx_rate,
                provider: snapshotResult.data.fx_provider ?? 'unknown',
                effectiveAt: snapshotResult.data.fx_effective_at ?? new Date(0).toISOString(),
              }
            : null,
          freight: snapshotResult.data.freight_profile_id
            ? {
                freightProfileId: snapshotResult.data.freight_profile_id,
                chipsAddOnUsdPerUnit: Number(asRecord(snapshotResult.data.freight_context).chipsAddOnUsdPerUnit ?? 0),
                powdersAddOnUsdPerKg: Number(asRecord(snapshotResult.data.freight_context).powdersAddOnUsdPerKg ?? 0),
                freightContext: asRecord(snapshotResult.data.freight_context),
              }
            : null,
          quoteContext: asRecord(snapshotResult.data.quote_context),
          calculationPayload: asRecord(snapshotResult.data.calculation_payload),
          sourceHash: snapshotResult.data.source_hash,
        }
      : null;

    return {
      version: {
        id: versionData.id,
        quoteId: versionData.quote_id,
        versionNo: versionData.version_no,
        status: versionData.status,
      },
      parentQuote: {
        id: parentQuote.data.id,
        organizationId: parentQuote.data.organization_id,
        leadId: parentQuote.data.lead_id,
        rfqId: parentQuote.data.rfq_id,
        status: parentQuote.data.status,
        quoteNumber: parentQuote.data.quote_number,
        versionNo: parentQuote.data.version_no ?? 0,
        pricingBasis: parentQuote.data.pricing_basis,
        displayCurrency: parentQuote.data.display_currency,
        destinationPort: parentQuote.data.destination_port,
        validUntil: parentQuote.data.valid_until,
        currentVersionId: parentQuote.data.current_version_id,
        acceptedVersionId: parentQuote.data.accepted_version_id,
      },
      snapshot,
      lines: ((lineResult.data as unknown as QuoteVersionLineItemRow[] | null) ?? []).map(mapLineItemRowToCompiledLine),
    };
  }


  async getPricingEngineSettings(args: { organizationId: string }): Promise<import('./types').PricingEngineDefaultsRecord | null> {
    const organizationId = args.organizationId;
    const { data, error } = await this.db
      .from('pricing_engine_settings')
      .select('default_display_currency, default_validity_days, allow_manual_fx, require_approval_for_override, approval_threshold_percent')
      .eq('organization_id', organizationId)
      .maybeSingle<PricingEngineSettingsRow>();

    if (error) {
      return null;
    }

    if (!data) return null;

    return {
      defaultDisplayCurrency: data.default_display_currency,
      defaultValidityDays: data.default_validity_days,
      allowManualFx: data.allow_manual_fx,
      requireApprovalForOverride: data.require_approval_for_override,
      approvalThresholdPercent: data.approval_threshold_percent,
    };
  }

  private async generateQuoteNumber(organizationId: string): Promise<string> {
    const { data, error } = await this.db.rpc('generate_quote_number', { p_organization_id: organizationId });

    if (!error && typeof data === 'string' && data.trim().length > 0) {
      return data.trim();
    }

    return `Q-${Date.now()}`;
  }

  private computeValidUntil(defaultValidityDays: number | null): string | null {
    if (!defaultValidityDays || !Number.isFinite(defaultValidityDays) || defaultValidityDays <= 0) {
      return null;
    }

    const target = new Date();
    target.setUTCDate(target.getUTCDate() + Math.trunc(defaultValidityDays));
    return target.toISOString().slice(0, 10);
  }


  async getVersionLineItem(args: { quoteVersionLineItemId: string }): Promise<import('./types').QuoteVersionLineItemRecord | null> {
    const { data, error } = await this.db
      .from('quote_version_line_items')
      .select('id, quote_version_id, product_id, product_variant_id, sku_code, product_name, pricing_mode, display_currency, final_unit_price, final_case_price, final_kg_price, is_overridden, override_reason, line_notes, calculation_meta')
      .eq('id', args.quoteVersionLineItemId)
      .maybeSingle<QuoteVersionLineItemRow>();

    if (error) {
      throw new Error(`Failed to load quote version line item ${args.quoteVersionLineItemId}: ${error.message}`);
    }

    if (!data) return null;

    return {
      id: data.id,
      quoteVersionId: data.quote_version_id,
      productId: data.product_id,
      productVariantId: data.product_variant_id,
      skuCode: data.sku_code,
      productName: data.product_name,
      pricingMode: data.pricing_mode,
      displayCurrency: data.display_currency,
      finalUnitPrice: data.final_unit_price,
      finalCasePrice: data.final_case_price,
      finalKgPrice: data.final_kg_price,
      isOverridden: data.is_overridden ?? false,
      overrideReason: data.override_reason,
      lineNotes: data.line_notes,
      calculationMeta: asRecord(data.calculation_meta),
    };
  }

  async updateVersionLineItemOverride(args: { quoteVersionLineItemId: string; actorUserId: string; reason: string; finalUnitPrice?: number | null; finalCasePrice?: number | null; finalKgPrice?: number | null; calculationMeta?: Record<string, Json> | null }): Promise<void> {
    const updateRow = {
      final_unit_price: args.finalUnitPrice ?? null,
      final_case_price: args.finalCasePrice ?? null,
      final_kg_price: args.finalKgPrice ?? null,
      is_overridden: true,
      override_reason: args.reason,
      overridden_by: args.actorUserId,
      overridden_at: new Date().toISOString(),
      calculation_meta: (args.calculationMeta ?? {}) as Json,
    };

    const { error } = await this.db
      .from('quote_version_line_items')
      .update(updateRow)
      .eq('id', args.quoteVersionLineItemId);

    if (error) {
      throw new Error(`Failed to update override for quote version line item ${args.quoteVersionLineItemId}: ${error.message}`);
    }
  }

  async markVersionStatus(args: { quoteVersionId: string; status: QuoteVersionStatus; actorUserId: string; reason?: string | null }): Promise<void> {
    const patch: Record<string, unknown> = { status: args.status };
    const now = new Date().toISOString();

    if (args.status === 'approved') {
      patch.approved_at = now;
      patch.approved_by = args.actorUserId;
    }
    if (args.status === 'sent') {
      patch.sent_at = now;
      patch.sent_by = args.actorUserId;
    }
    if (args.status === 'rejected') {
      patch.internal_notes = args.reason ?? null;
    }

    const { error } = await this.db
      .from('quote_versions')
      .update(patch)
      .eq('id', args.quoteVersionId);

    if (error) {
      throw new Error(`Failed to mark quote version ${args.quoteVersionId} as ${args.status}: ${error.message}`);
    }
  }

  async sendVersion(args: { quoteVersionId: string; actorUserId: string }): Promise<void> {
    const { error } = await this.db.rpc('app_send_quote_version_tx', {
      p_quote_version_id: args.quoteVersionId,
      p_actor_user_id: args.actorUserId,
    } as never);

    if (!error) return;

    const missingRpc = /schema cache|function|app_send_quote_version_tx/i.test(error.message ?? '');
    if (!missingRpc) {
      throw new Error(`Failed to send quote version ${args.quoteVersionId}: ${error.message}`);
    }

    const now = new Date().toISOString();
    const { data: version, error: versionReadError } = await this.db
      .from('quote_versions')
      .select('id, quote_id')
      .eq('id', args.quoteVersionId)
      .single();
    if (versionReadError || !version?.quote_id) {
      throw new Error(`Failed to load quote version ${args.quoteVersionId} for send fallback: ${versionReadError?.message ?? 'No row returned.'}`);
    }

    const { error: versionError } = await this.db
      .from('quote_versions')
      .update({ status: 'sent', sent_at: now, sent_by: args.actorUserId, updated_at: now })
      .eq('id', args.quoteVersionId);
    if (versionError) {
      throw new Error(`Failed to mark quote version ${args.quoteVersionId} as sent: ${versionError.message}`);
    }

    const { error: quoteError } = await this.db
      .from('quotes')
      .update({ status: 'sent', updated_at: now })
      .eq('id', version.quote_id);
    if (quoteError) {
      throw new Error(`Failed to mark quote ${version.quote_id} as sent: ${quoteError.message}`);
    }
  }

  async createRevisionFromVersion(args: { quoteVersionId: string; actorUserId: string }): Promise<QuoteVersionRecord> {
    const aggregate = await this.getVersionAggregate({ quoteVersionId: args.quoteVersionId });

    if (!aggregate) {
      throw new Error(`Quote version ${args.quoteVersionId} not found for revision.`);
    }

    const { data: latestVersionRows, error: latestVersionError } = await this.db
      .from('quote_versions')
      .select('version_no')
      .eq('quote_id', aggregate.version.quoteId)
      .order('version_no', { ascending: false })
      .limit(1);

    if (latestVersionError) {
      throw new Error(`Failed to resolve next revision number for quote ${aggregate.version.quoteId}: ${latestVersionError.message}`);
    }

    const nextVersionNo = Number(latestVersionRows?.[0]?.version_no ?? aggregate.version.versionNo) + 1;

    const { data: createdRows, error: createError } = await this.db
      .from('quote_versions')
      .insert({
        quote_id: aggregate.version.quoteId,
        version_no: nextVersionNo,
        parent_version_id: aggregate.version.id,
        status: 'draft',
        pricing_basis: aggregate.parentQuote.pricingBasis ?? aggregate.lines[0]?.basisApplied ?? 'ex_factory',
        display_currency: aggregate.parentQuote.displayCurrency ?? aggregate.lines[0]?.displayCurrency ?? 'USD',
        valid_until: aggregate.parentQuote.validUntil ?? null,
        total_line_count: aggregate.lines.length,
        created_by: args.actorUserId,
      })
      .select('id, quote_id, version_no, status') as never;

    if (createError) {
      throw new Error(`Failed to create revision from quote version ${args.quoteVersionId}: ${createError.message}`);
    }

    const created = assertSingle(createdRows as QuoteVersionRow[] | null, 'Revision quote version');

    if (aggregate.snapshot) {
      const { error: snapshotError } = await this.db.from('quote_pricing_snapshots').insert({
        quote_version_id: created.id,
        pricing_rule_set_id: null,
        freight_profile_id: aggregate.snapshot.freight?.freightProfileId ?? null,
        fx_base_currency: aggregate.snapshot.fx?.baseCurrency ?? 'USD',
        fx_display_currency: aggregate.snapshot.fx?.displayCurrency ?? aggregate.parentQuote.displayCurrency ?? 'USD',
        fx_rate: aggregate.snapshot.fx?.rate ?? 1,
        fx_provider: aggregate.snapshot.fx?.provider ?? 'unknown',
        fx_effective_at: aggregate.snapshot.fx?.effectiveAt ?? new Date().toISOString(),
        quote_context: (aggregate.snapshot.quoteContext ?? {}) as Json,
        freight_context: (aggregate.snapshot.freight?.freightContext ?? {}) as Json,
        calculation_payload: (aggregate.snapshot.calculationPayload ?? {}) as Json,
        source_hash: aggregate.snapshot.sourceHash ?? `${aggregate.version.id}:revision`,
      });
      if (snapshotError) {
        throw new Error(`Failed to clone pricing snapshot for quote version ${created.id}: ${snapshotError.message}`);
      }
    }

    if (aggregate.lines.length > 0) {
      const lineInserts = aggregate.lines.map((line) => mapCompiledLineToVersionInsert(created.id, line));
      const { error: lineError } = await this.db.from('quote_version_line_items').insert(lineInserts);
      if (lineError) {
        throw new Error(`Failed to clone line items for quote version ${created.id}: ${lineError.message}`);
      }
    }

    return {
      id: created.id,
      quoteId: created.quote_id,
      versionNo: created.version_no,
      status: created.status,
    };
  }

  async saveRenderedPdfReference(args: { quoteVersionId: string; documentId: string }): Promise<void> {
    const { error } = await this.db
      .from('quote_versions')
      .update({ pdf_document_id: args.documentId })
      .eq('id', args.quoteVersionId);

    if (error) {
      throw new Error(`Failed to link rendered document ${args.documentId} to quote version ${args.quoteVersionId}: ${error.message}`);
    }
  }
}
