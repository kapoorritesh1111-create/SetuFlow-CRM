import type { Json } from '@/types/database';
import type { PricingSupabaseClient, QuoteTemplateRepository } from './types';
import type { TemplateType } from '../types';

export type QuoteTemplateRecord = {
  id: string;
  templateType: TemplateType;
  name: string;
  headerConfig: Json;
  footerConfig: Json;
  layoutSchema: Json;
};

type QuoteTemplateRow = {
  id: string;
  organization_id: string;
  template_type: TemplateType;
  name: string;
  header_config: Json | null;
  footer_config: Json | null;
  layout_schema: Json | null;
  is_default: boolean | null;
  is_active: boolean | null;
};

export class SupabaseQuoteTemplateRepository implements QuoteTemplateRepository {
  constructor(private readonly db: PricingSupabaseClient) {}

  async resolveTemplate(args: {
    organizationId: string;
    templateType: TemplateType;
    templateId?: string | null;
  }): Promise<QuoteTemplateRecord | null> {
    if (args.templateId) {
      const { data, error } = await this.db
        .from('quote_templates')
        .select('id, organization_id, template_type, name, header_config, footer_config, layout_schema, is_default, is_active')
        .eq('organization_id', args.organizationId)
        .eq('id', args.templateId)
        .maybeSingle<QuoteTemplateRow>();

      if (error) {
        throw new Error(`Failed to load explicit quote template ${args.templateId}: ${error.message}`);
      }

      if (!data || data.is_active === false) {
        return null;
      }

      return {
        id: data.id,
        templateType: data.template_type,
        name: data.name,
        headerConfig: data.header_config ?? {},
        footerConfig: data.footer_config ?? {},
        layoutSchema: data.layout_schema ?? {},
      };
    }

    const { data, error } = await this.db
      .from('quote_templates')
      .select('id, organization_id, template_type, name, header_config, footer_config, layout_schema, is_default, is_active')
      .eq('organization_id', args.organizationId)
      .eq('template_type', args.templateType)
      .eq('is_active', true)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1);

    if (error) {
      throw new Error(`Failed to resolve quote template for ${args.templateType}: ${error.message}`);
    }

    const row = (data as QuoteTemplateRow[] | null)?.[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      templateType: row.template_type,
      name: row.name,
      headerConfig: row.header_config ?? {},
      footerConfig: row.footer_config ?? {},
      layoutSchema: row.layout_schema ?? {},
    };
  }
}
