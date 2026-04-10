import type { FreightProfileAggregate, FreightProfileRepository, PricingSupabaseClient } from './types';
import type { CurrencyCode } from '../types';

type FreightProfileRow = {
  id: string;
  organization_id: string;
  destination_port: string;
};

type FreightProfileItemRow = {
  id: string;
  freight_profile_id: string;
  line_no: number;
  particular: string;
  input_currency: string;
  amount: number;
  applies_to_container_type: string | null;
  is_active: boolean;
};

type FreightCalcAssumptionRow = {
  id: string;
  freight_profile_id: string;
  chips_mode: string | null;
  chips_ship_qty: number | null;
  powders_mode: string | null;
  powders_ship_qty: number | null;
  pallets_per_40ft: number | null;
  pallets_per_20ft: number | null;
  cases_per_pallet: number | null;
  bags_per_case: number | null;
  kg_per_pallet: number | null;
  twenty_ft_factor: number | null;
};

export class SupabaseFreightProfileRepository implements FreightProfileRepository {
  constructor(private readonly db: PricingSupabaseClient) {}

  async getActiveProfile(args: { organizationId: string; freightProfileId: string }): Promise<FreightProfileAggregate | null> {
    const profileResponse = await this.db
      .from('freight_profiles')
      .select('id, organization_id, destination_port')
      .eq('organization_id', args.organizationId)
      .eq('id', args.freightProfileId)
      .eq('status', 'active')
      .maybeSingle<FreightProfileRow>();

    if (profileResponse.error) {
      throw new Error(`Failed to load freight profile ${args.freightProfileId}: ${profileResponse.error.message}`);
    }

    if (!profileResponse.data) {
      return null;
    }

    const itemsResponse = await this.db
      .from('freight_profile_items')
      .select('id, freight_profile_id, line_no, particular, input_currency, amount, applies_to_container_type, is_active')
      .eq('freight_profile_id', args.freightProfileId)
      .order('line_no', { ascending: true })
      .returns<FreightProfileItemRow[]>();

    if (itemsResponse.error) {
      throw new Error(`Failed to load freight profile items for ${args.freightProfileId}: ${itemsResponse.error.message}`);
    }

    const assumptionsResponse = await this.db
      .from('freight_calc_assumptions')
      .select([
        'id',
        'freight_profile_id',
        'chips_mode',
        'chips_ship_qty',
        'powders_mode',
        'powders_ship_qty',
        'pallets_per_40ft',
        'pallets_per_20ft',
        'cases_per_pallet',
        'bags_per_case',
        'kg_per_pallet',
        'twenty_ft_factor',
      ].join(', '))
      .eq('freight_profile_id', args.freightProfileId)
      .maybeSingle<FreightCalcAssumptionRow>();

    if (assumptionsResponse.error) {
      throw new Error(`Failed to load freight assumptions for ${args.freightProfileId}: ${assumptionsResponse.error.message}`);
    }

    return {
      freightProfileId: profileResponse.data.id,
      organizationId: profileResponse.data.organization_id,
      destinationPort: profileResponse.data.destination_port,
      items: (itemsResponse.data ?? []).map((item) => ({
        id: item.id,
        lineNo: item.line_no,
        particular: item.particular,
        inputCurrency: item.input_currency as CurrencyCode,
        amount: item.amount,
        appliesToContainerType: item.applies_to_container_type,
        isActive: item.is_active,
      })),
      assumptions: assumptionsResponse.data
        ? {
            id: assumptionsResponse.data.id,
            chipsMode: assumptionsResponse.data.chips_mode,
            chipsShipQty: assumptionsResponse.data.chips_ship_qty,
            powdersMode: assumptionsResponse.data.powders_mode,
            powdersShipQty: assumptionsResponse.data.powders_ship_qty,
            palletsPer40Ft: assumptionsResponse.data.pallets_per_40ft,
            palletsPer20Ft: assumptionsResponse.data.pallets_per_20ft,
            casesPerPallet: assumptionsResponse.data.cases_per_pallet,
            bagsPerCase: assumptionsResponse.data.bags_per_case,
            kgPerPallet: assumptionsResponse.data.kg_per_pallet,
            twentyFtFactor: assumptionsResponse.data.twenty_ft_factor,
          }
        : null,
    };
  }
}
