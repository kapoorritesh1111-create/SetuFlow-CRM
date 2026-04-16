import type { ApprovalState } from "@/lib/approvalRouting";
import type { QuoteStatus } from "@/lib/quoteWorkflow";

export type QuoteTrustState =
  | "draft_open"
  | "approval_gated"
  | "send_ready_controlled"
  | "sent_locked"
  | "outcome_locked";

export type QuoteAuditEventMapItem = {
  key: string;
  label: string;
  detail: string;
};

export type QuoteTrustContract = {
  trustState: QuoteTrustState;
  stateLabel: string;
  stateDetail: string;
  stateTone: "neutral" | "warning" | "success";
  approvalLabel: string;
  approvalDetail: string;
  approvalTone: "neutral" | "warning" | "success";
  editorModeLabel: string;
  editorModeDetail: string;
  sendActionLabel: string;
  sendActionDetail: string;
  auditMap: QuoteAuditEventMapItem[];
};

export function getQuoteTrustContract({
  status,
  approvalRequired,
  approvalState,
}: {
  status: QuoteStatus;
  approvalRequired: boolean;
  approvalState: ApprovalState;
}): QuoteTrustContract {
  const auditMap: QuoteAuditEventMapItem[] = [
    {
      key: "checkpoint_saved",
      label: "Checkpoint saved",
      detail:
        "Capture the current Product, Pricing, Terms, Review, and Send posture before the quote moves forward.",
    },
    {
      key: "approval_transition",
      label: "Approval transition",
      detail:
        "Record when approval is requested, approved, rejected, or cleared so trust decisions stay reviewable.",
    },
    {
      key: "quote_sent",
      label: "Quote sent",
      detail:
        "Record the moment the current quote version leaves the team and becomes customer-facing.",
    },
    {
      key: "lock_transition",
      label: "Lock transition",
      detail:
        "Track when the quote moves into a send-locked or outcome-locked state so later edits do not look silent.",
    },
  ];

  if (["accepted", "rejected", "expired"].includes(status)) {
    return {
      trustState: "outcome_locked",
      stateLabel: "Outcome locked",
      stateDetail:
        "The quote now has a terminal commercial outcome and should be treated as a closed trust state.",
      stateTone: "success",
      approvalLabel: approvalRequired ? `Approval ${approvalState}` : "No approval gate",
      approvalDetail:
        "Approval history still matters for audit, but it no longer gates customer progression on this quote.",
      approvalTone: "neutral",
      editorModeLabel: "Read-only lock expected",
      editorModeDetail:
        "Outcome-locked quotes should remain reviewable, but future trust enforcement should avoid silent commercial edits here.",
      sendActionLabel: "Send closed",
      sendActionDetail:
        "No new send action should reopen from this state without an explicit revision path.",
      auditMap,
    };
  }

  if (status === "sent") {
    return {
      trustState: "sent_locked",
      stateLabel: "Sent lock state",
      stateDetail:
        "The current version is already customer-facing and should be treated as send-locked unless a deliberate revision path reopens it.",
      stateTone: "success",
      approvalLabel: approvalRequired ? `Approval ${approvalState}` : "No approval gate",
      approvalDetail:
        "Approval is already behind the quote, so the trust focus now shifts from gating to preserving sent-version integrity.",
      approvalTone: approvalRequired ? "success" : "neutral",
      editorModeLabel: "Controlled edit only",
      editorModeDetail:
        "The guided builder can still explain the quote, but post-send edits should be treated as deliberate exceptions.",
      sendActionLabel: "Send complete",
      sendActionDetail:
        "The send checkpoint is complete for this version and should now feed revision, outcome, and audit handling instead.",
      auditMap,
    };
  }

  if (approvalRequired && approvalState === "pending") {
    return {
      trustState: "approval_gated",
      stateLabel: "Approval gated",
      stateDetail:
        "The quote remains inside the commercial team. Trust now depends on the approval gate being explicit before the quote can leave the team.",
      stateTone: "warning",
      approvalLabel: "Approval pending",
      approvalDetail:
        "Approval is the active trust gate. Send remains intentionally blocked until this gate is cleared.",
      approvalTone: "warning",
      editorModeLabel: "Builder stays open",
      editorModeDetail:
        "Operators can still revise through the guided builder, but they should treat approval as the current control point.",
      sendActionLabel: "Send blocked by approval",
      sendActionDetail:
        "The trust layer should treat this as an approval-first state, not a send-ready state.",
      auditMap,
    };
  }

  if (approvalRequired && approvalState === "approved") {
    return {
      trustState: "send_ready_controlled",
      stateLabel: "Send-ready controlled",
      stateDetail:
        "Approval is cleared and the quote is now in a controlled handoff state. The next trust move is send, not a hidden approval revisit.",
      stateTone: "success",
      approvalLabel: "Approval cleared",
      approvalDetail:
        "The approval gate is satisfied, so send readiness now depends on the quote's explicit send checkpoint and version posture.",
      approvalTone: "success",
      editorModeLabel: "Builder still available",
      editorModeDetail:
        "The builder remains available, but approved quotes should be treated as controlled rather than casually open.",
      sendActionLabel: "Ready for controlled send",
      sendActionDetail:
        "The next trust event should be a deliberate send or a deliberate revision, not an ambiguous middle state.",
      auditMap,
    };
  }

  return {
    trustState: "draft_open",
    stateLabel: "Draft open",
    stateDetail:
      "The quote is still inside the internal drafting lane. Trust depends on the guided builder and explicit checkpoint posture rather than lock enforcement yet.",
    stateTone: "neutral",
    approvalLabel: approvalRequired ? `Approval ${approvalState}` : "No approval gate",
    approvalDetail:
      "Approval is not the active gate yet, so the current focus remains on making review and send posture explicit.",
    approvalTone: approvalRequired ? "warning" : "neutral",
    editorModeLabel: "Builder open",
    editorModeDetail:
      "The guided builder is still the correct place to refine product, pricing, terms, review, and send posture.",
    sendActionLabel: "Send not yet trusted",
    sendActionDetail:
      "This state can still move through approval and send, but only after the explicit builder checkpoints are complete.",
    auditMap,
  };
}
