import type { WizardStepDefinition } from "@/components/ui/wizard-shell";

declare global {
  const LEAD_WIZARD_STEPS: WizardStepDefinition[];
  const LEAD_QUOTE_STEP: WizardStepDefinition;
}

export {};
