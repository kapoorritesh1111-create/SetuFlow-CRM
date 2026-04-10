import type { PricingRuleIngestionService, PricingRuleImportError, PricingRuleImportRequest, PricingRuleImportResult, PricingRuleImportRow } from '../types';
import type { AuditRepository, PricingRuleRepository } from '../repositories';
import { notImplemented } from '../server/errors';

export type PricingRuleIngestionServiceDeps = {
  pricingRuleRepository: PricingRuleRepository;
  auditRepository?: AuditRepository;
};

export class DefaultPricingRuleIngestionService implements PricingRuleIngestionService {
  constructor(private readonly deps: PricingRuleIngestionServiceDeps) {
    void this.deps;
  }

  async importRuleSet(_: PricingRuleImportRequest): Promise<PricingRuleImportResult> {
    return notImplemented('DefaultPricingRuleIngestionService.importRuleSet', 'validate then persist pricing rule imports');
  }

  async validateRows(_: PricingRuleImportRow[]): Promise<PricingRuleImportError[]> {
    return notImplemented('DefaultPricingRuleIngestionService.validateRows', 'enforce duplicate SKU / missing price / category validation rules');
  }

  async activateRuleSet(_: string, __: string, ___: string): Promise<void> {
    return notImplemented('DefaultPricingRuleIngestionService.activateRuleSet', 'promote selected pricing rule set to active default');
  }
}
