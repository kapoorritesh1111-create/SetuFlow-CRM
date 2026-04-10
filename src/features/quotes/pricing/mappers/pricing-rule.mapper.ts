import type { PricingRuleRecord } from '../repositories';
import type { PricingRuleImportRow } from '../types';
import { notImplemented } from '../server/errors';

export function mapImportRowToPricingRuleRecord(_: PricingRuleImportRow): PricingRuleRecord {
  return notImplemented('mapImportRowToPricingRuleRecord', 'normalize spreadsheet import rows into repository records');
}
