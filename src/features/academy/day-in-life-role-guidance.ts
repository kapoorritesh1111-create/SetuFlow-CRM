import type { DayLesson, DayLessonKey } from './day-in-life-data';

export type DayStepKey = DayLessonKey | 'approval-send';

export const salesFlow: DayStepKey[] = ['start', 'add', 'edit', 'quote', 'approval-send', 'followup', 'order'];

export const ownerAttention: Array<{ key: DayLessonKey; title: string; prompt: string }> = [
  { key: 'add', title: 'New buyer came directly to me', prompt: 'Capture the buyer and make ownership clear.' },
  { key: 'edit', title: 'A buyer or salesperson needs review', prompt: 'Review the latest activity, need, stage, and next action.' },
  { key: 'approval', title: 'A quote needs my decision', prompt: 'Review the exception and approve or request changes.' },
  { key: 'catalog', title: 'A product or standard price changed', prompt: 'Keep Catalog accurate for future quotes.' },
  { key: 'track', title: 'Won business is blocked', prompt: 'Review the order and intervene where execution is at risk.' },
];

export const salesApprovalSendLesson: DayLesson = {
  key: 'approval',
  title: 'Get the Quote Approved and Send It',
  shortTitle: 'Approval & Send',
  roles: 'Sales',
  route: '/approval-send',
  description: 'Know whether you can send now, need owner approval, or need to revise the quote first.',
  businessContext: 'Sales should never wonder what happened after submitting a quote for approval. This step closes the gap between quote creation and buyer follow-up: confirm whether approval is required, track the owner decision, send only the approved version, and make sure the send is recorded.',
  scenario: {
    heading: 'Greenway needs a special discount',
    summary: 'Sofia asks for a better price for a larger trial order. Sales updates the quote, records the reason, submits it for approval, waits for the owner decision, then sends the approved version to Greenway.',
    facts: ['Buyer: Greenway Foods GmbH', 'Request: Special discount', 'Owner decision: Required', 'Sales responsibility: Send approved version'],
  },
  instructions: [
    'Open the quote and confirm the customer-facing version is ready.',
    'Check whether pricing or terms require owner approval.',
    'If approval is required, submit the quote with a clear reason for the exception.',
    'Open Approvals & Sending and review the current status.',
    'If the owner requests changes, update the quote and resubmit the corrected version.',
    'When approved, open the exact approved version.',
    'Confirm recipient, PDF preview, message, and commercial terms one final time.',
    'Send the quote using the approved channel.',
    'Confirm the send is recorded and schedule the next follow-up.',
  ],
  annotations: [
    { label: 'Approval status', meaning: 'Shows whether the quote is waiting, approved, or returned for changes.' },
    { label: 'Approval reason', meaning: 'Explains why the quote needed an owner decision.' },
    { label: 'Approved version', meaning: 'The exact commercial version sales is allowed to send.' },
    { label: 'Send history', meaning: 'Shows when the approved quote was sent and preserves the communication trail.' },
  ],
  confirms: ['Approval status is clear', 'Correct quote version selected', 'Recipient and message checked', 'Approved quote sent', 'Next follow-up scheduled'],
  bestPractices: [
    'Do not promise an exception to the buyer before it is approved.',
    'If the owner requests changes, fix the quote rather than explaining the rejection only in chat.',
    'Always send the approved version, not an older draft saved in another tab.',
    'Set the next follow-up immediately after sending.',
  ],
  exceptions: [
    { question: 'The quote does not require approval.', answer: 'Complete the final review and send it when the send gate is clear.' },
    { question: 'The owner approved only part of my request.', answer: 'Update the quote to the approved terms, review the new version, and send only after it reflects the decision.' },
    { question: 'The buyer changes the requirement while approval is pending.', answer: 'Update the quote first. Do not send an approval decision that no longer matches the buyer request.' },
  ],
  decisions: [
    { when: 'The quote is standard and send-ready', action: 'Send it and schedule follow-up.' },
    { when: 'The quote requires an exception', action: 'Submit for owner approval and wait for the decision.' },
    { when: 'The owner requests changes', action: 'Revise the quote, resubmit if needed, and send only the approved version.' },
  ],
  next: ['Approved quote is sent', 'Send history is recorded', 'Sales follows up from the existing buyer or quote record'],
};
