import type { WizardStepDefinition } from "@/components/ui/wizard-shell";
import type {
  ProductOption as QuoteWizardProductOption,
  PricingBasis as QuoteWizardPricingBasis,
  RfqOption as QuoteWizardRfqOption,
  QuoteRecord as QuoteWizardQuoteRecord,
  QuoteVersionRecord as QuoteWizardQuoteVersionRecord,
  DraftQuoteLine as QuoteWizardDraftQuoteLine,
  StepId as QuoteWizardStepId,
  ProgressionGuardSummary as QuoteWizardProgressionGuardSummary,
  QuoteRiskTone as QuoteWizardQuoteRiskTone,
  QuoteRiskFlag as QuoteWizardQuoteRiskFlag,
  PricingLineIssue as QuoteWizardPricingLineIssue,
  StepFieldId as QuoteWizardStepFieldId,
  RecommendationKey as QuoteWizardRecommendationKey,
  RemediationSourceStep as QuoteWizardRemediationSourceStep,
  StepRecommendation as QuoteWizardStepRecommendation,
  RemediationTarget as QuoteWizardRemediationTarget,
  CheckpointDecisionState as QuoteWizardCheckpointDecisionState,
  CheckpointDecision as QuoteWizardCheckpointDecision,
} from "./quote-wizard-types";

declare global {
  var QUOTE_EDIT_STEPS: WizardStepDefinition[];
  type ProductOption = QuoteWizardProductOption;
  type PricingBasis = QuoteWizardPricingBasis;
  type RfqOption = QuoteWizardRfqOption;
  type QuoteRecord = QuoteWizardQuoteRecord;
  type QuoteVersionRecord = QuoteWizardQuoteVersionRecord;
  type DraftQuoteLine = QuoteWizardDraftQuoteLine;
  type StepId = QuoteWizardStepId;
  type ProgressionGuardSummary = QuoteWizardProgressionGuardSummary;
  type QuoteRiskTone = QuoteWizardQuoteRiskTone;
  type QuoteRiskFlag = QuoteWizardQuoteRiskFlag;
  type PricingLineIssue = QuoteWizardPricingLineIssue;
  type StepFieldId = QuoteWizardStepFieldId;
  type RecommendationKey = QuoteWizardRecommendationKey;
  type RemediationSourceStep = QuoteWizardRemediationSourceStep;
  type StepRecommendation = QuoteWizardStepRecommendation;
  type RemediationTarget = QuoteWizardRemediationTarget;
  type CheckpointDecisionState = QuoteWizardCheckpointDecisionState;
  type CheckpointDecision = QuoteWizardCheckpointDecision;
}

export {};
