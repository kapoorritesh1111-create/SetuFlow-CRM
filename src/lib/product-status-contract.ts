import { LOCKED_PRODUCT_FLOW } from "@/lib/product-contract";

export type ChecklistStatus = "done" | "current" | "planned" | "locked";
export type ReadinessArea = { title: string; summary: string; status: ChecklistStatus };
export type ChecklistItem = { id: string; area: string; label: string; note: string; status: ChecklistStatus };
export type RoadmapMilestone = { sprint: string; summary: string; badgeLabel: string; status: ChecklistStatus; objective: string; outcomes: string[] };
export type BacklogItem = { title: string; note: string; stateLabel: string; status: ChecklistStatus };
export type BacklogSection = { title: string; heading: string; sprint: string; badgeLabel: string; summary: string; description: string; status: ChecklistStatus; items: BacklogItem[] };
export type PlanningSurface = { id: string; title: string; href: string; summary: string; status: ChecklistStatus; focus: string };
export type ProductTrack = { id: string; title: string; summary: string; status: ChecklistStatus; scope: string[] };
export type ArchitectureLane = { id: string; title: string; summary: string; status: ChecklistStatus; target: string };
export type UxRule = { id: string; title: string; rule: string; status: ChecklistStatus };
export type ScreenLayoutSection = { title: string; purpose: string; blocks: string[] };
export type BuyerReadyItem = { label: string; note: string; status: ChecklistStatus };
export type BuyerReadySection = { title: string; summary: string; status: ChecklistStatus; items: BuyerReadyItem[] };
export type ScreenPlan = { id: string; title: string; route: string; summary: string; status: ChecklistStatus; primaryGoal: string; layout: ScreenLayoutSection[]; actions: string[]; dataContracts: string[] };

export const lockedProductFlow = LOCKED_PRODUCT_FLOW;
export const sprintProgress = { sprint: "Current product baseline", percent: 93, percentLabel: "Canonical routes only, buyer-facing language cleaned, build proof pending." };
export const sprintFocus = { sprint: "Current product baseline", title: "The product is focused on the locked commercial flow and credible outward sharing.", nextAction: "Complete fresh production build proof before any further cleanup begins.", flow: LOCKED_PRODUCT_FLOW.join(" → ") };
export const readinessSummary = { status: "Build proof pending", buildStatus: "Run install, typecheck, tests, and a production build on the current baseline.", driftRisk: "Low — canonical routes and outward surfaces are aligned.", blockers: "A fresh production build proof is still required." };
export const planningSurfaces: PlanningSurface[] = [];
export const readinessAreas: ReadinessArea[] = [
  { title: "Canonical routes", summary: "Only canonical product routes remain in the shipped app.", status: "done" },
  { title: "Buyer-facing language", summary: "Internal sprint and preview language has been removed from key shipped surfaces.", status: "done" },
  { title: "Build proof", summary: "A fresh production build proof is still required.", status: "current" },
];
export const checklistItems: ChecklistItem[] = [
  { id: "routes", area: "Product", label: "Canonical routes only", note: "Development and workspace mirror routes are removed from the shipped app.", status: "done" },
  { id: "trust", area: "Product", label: "Trusted card sharing", note: "My Card, public card, and scan trust strings are cleaned.", status: "done" },
  { id: "build", area: "Verification", label: "Fresh production build", note: "Build proof is still required on the current baseline.", status: "current" },
];
export const roadmapMilestones: RoadmapMilestone[] = [];
export const backlogSections: BacklogSection[] = [];
export const productTracks: ProductTrack[] = [];
export const architectureLanes: ArchitectureLane[] = [];
export const uxRules: UxRule[] = [];
export const buyerReadySections: BuyerReadySection[] = [];
export const screenPlans: ScreenPlan[] = [];
export const planningArtifacts = { roadmapMilestones, backlogSections, planningSurfaces };
export const masterPlan = roadmapMilestones;
