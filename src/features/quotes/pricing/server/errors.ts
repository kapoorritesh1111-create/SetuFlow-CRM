export class PricingEngineNotImplementedError extends Error {
  constructor(feature: string, detail?: string) {
    super(`Pricing / Quote Engine not implemented: ${feature}${detail ? ` - ${detail}` : ''}`);
    this.name = 'PricingEngineNotImplementedError';
  }
}

export function notImplemented(feature: string, detail?: string): never {
  throw new PricingEngineNotImplementedError(feature, detail);
}
