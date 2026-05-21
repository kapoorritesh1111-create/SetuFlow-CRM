import {
  prepareMobileScanFile,
  MOBILE_SCAN_MAX_ORIGINAL_IMAGE_BYTES,
  MOBILE_SCAN_MAX_PDF_UPLOAD_BYTES,
} from "@/features/mobile/lib/mobile-card-image";
import type { WizardStepDefinition } from "@/components/ui/wizard-shell";
import type { CoverageSelection, QuickInterestMode, QuickScanDraft } from "./lead-drawer-local-types";

export function buildInterestNote(params: {
  leadType: "buyer" | "supplier";
  mode: QuickInterestMode;
  categoryName?: string;
  productNames: string[];
  request: string;
}) {
  const request = params.request.trim();
  if (params.mode === "product" && params.productNames.length) {
    return `${params.leadType === "supplier" ? "Can supply" : "Interested in"} products: ${params.productNames.join(", ")}`;
  }
  if (params.mode === "category" && params.categoryName) {
    return `${params.leadType === "supplier" ? "Can supply" : "Interested in"} category: ${params.categoryName}`;
  }
  if (params.mode === "new_request" && request) {
    return `${params.leadType === "supplier" ? "New supplier category" : "New buyer request"}: ${request}`;
  }
  return "";
}

export function mergeLeadNotesWithInterest(notes: string, interestNote: string) {
  const cleanNotes = String(notes ?? "").trim();
  const cleanInterest = String(interestNote ?? "").trim();
  if (!cleanInterest) return cleanNotes;
  if (cleanNotes.toLowerCase().includes(cleanInterest.toLowerCase()))
    return cleanNotes;
  return [cleanNotes, cleanInterest].filter(Boolean).join("\n\n");
}

export function hasQuickScanSignal(draft: QuickScanDraft) {
  return Boolean(
    String(draft.companyName ?? "").trim() ||
    String(draft.contactName ?? "").trim() ||
    String(draft.jobTitle ?? "").trim() ||
    String(draft.email ?? "").trim() ||
    String(draft.phone ?? "").trim() ||
    String(draft.phoneSecondary ?? "").trim() ||
    String(draft.website ?? "").trim(),
  );
}

export function buildQuickScanSummary(draft: QuickScanDraft) {
  const pieces = [
    draft.companyName ? `Company: ${draft.companyName}` : "",
    draft.contactName ? `Contact: ${draft.contactName}` : "",
    draft.jobTitle ? `Role: ${draft.jobTitle}` : "",
    draft.email ? `Email: ${draft.email}` : "",
    draft.phone ? `Phone: ${draft.phone}` : "",
  ].filter(Boolean);
  return pieces.length
    ? pieces.join(" · ")
    : "No structured lead fields were found.";
}

export async function tryQuickScanBrowserTextDetection(file: File): Promise<string> {
  if (typeof window === "undefined") return "";
  const Detector = (
    window as unknown as {
      TextDetector?: new () => {
        detect: (
          source: ImageBitmap,
        ) => Promise<Array<{ rawValue?: string; text?: string }>>;
      };
    }
  ).TextDetector;
  if (!Detector || !file.type.startsWith("image/")) return "";
  try {
    const bitmap = await createImageBitmap(file);
    const detector = new Detector();
    const blocks = await detector.detect(bitmap);
    bitmap.close?.();
    return blocks
      .map((block) => block.rawValue || block.text || "")
      .filter(Boolean)
      .join("\n")
      .trim();
  } catch {
    return "";
  }
}

export function createCoverageSelection(
  categoryId = "",
  productIds: string[] = [],
  seed = 0,
): CoverageSelection {
  return {
    key: buildCoverageSelectionKey(categoryId, seed),
    categoryId,
    productIds,
  };
}

export function toDatetimeLocalValue(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

export function getDefaultFollowUpLocalValue() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setSeconds(0, 0);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

export function inputClassName() {
  return "h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400";
}

export function formatLocalDateTimeValue(value?: string | null) {
  if (!value) return "Not set";
  const normalized = String(value).trim();
  if (!normalized) return "Not set";
  if (normalized.includes("T")) return normalized.replace("T", " ");
  return normalized;
}

export function buildCoverageSelectionKey(categoryId = "", seed = 0) {
  return `${categoryId || "coverage"}-${seed}`;
}

export function normalizeLeadFormValues(values: Record<string, unknown>) {
  return JSON.stringify(values);
}

const LEAD_WIZARD_STEPS: WizardStepDefinition[] = [
  {
    id: "basics",
    title: "Lead basics",
    shortLabel: "Basics",
    description:
      "Save the minimum valid lead first, then move into routing only after the entry is secure.",
  },
  {
    id: "workflow",
    title: "Workflow and ownership",
    shortLabel: "Workflow",
    description:
      "Set the follow-up rhythm, routing, and ownership details that keep the lead actionable.",
  },
  {
    id: "coverage",
    title: "Coverage and notes",
    shortLabel: "Coverage",
    description:
      "Capture market, product, and note context without changing the existing save behavior.",
  },
];

const LEAD_QUOTE_STEP: WizardStepDefinition = {
  id: "quotes",
  title: "Quote review",
  shortLabel: "Quotes",
  description:
    "Review customer-ready quotes, version history, and quote actions without leaving the lead drawer.",
};