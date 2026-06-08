# Setu Flow New User Training Guide

## Purpose

This guide helps a new Setu Flow user understand the full operating path from first inquiry capture through dispatch handoff. It is written for business users and trainers, not developers.

The companion training workspace is available at:

```txt
/training
```

Use the workspace for live walkthroughs, onboarding sessions, and future video training.

## Learning outcome

After completing this guide, a new user should be able to:

- Understand where to begin in Setu Flow.
- Capture a clean inquiry or field lead.
- Review and qualify a lead before moving it forward.
- Prepare quote-ready and order-ready information.
- Confirm document and execution readiness.
- Complete the dispatch handoff with clear status and follow-up.

## Training language standards

Use customer-safe and user-safe language:

- Use: training workspace, product walkthrough, representative workflow, practice scenario, workflow example.
- Avoid: dev, dummy, mockup, placeholder, sample data, internal tooling, SMC.

Do not expose main organization private records in user training screenshots, videos, or written guides.

## Capture-to-dispatch journey

```txt
Capture inquiry -> Review lead -> Qualify request -> Prepare quote -> Confirm documents -> Ready for dispatch -> Complete handoff
```

## Module 1: Understand the workspace

### Who should complete this

Every new user.

### Goal

Learn where the workday begins and how to identify which records need attention.

### Walkthrough

1. Open Setu Flow and begin from the main workspace view.
2. Review visible queues, recent activity, and priority cards.
3. Identify whether each record belongs to sales, operations, or dispatch.
4. Open only the record you are responsible for or have been assigned.
5. Read existing notes before making updates.

### Before moving forward

- You know which records need action today.
- You can identify the responsible team.
- You understand the current status before changing it.

## Module 2: Capture a new inquiry

### Who should complete this

Sales users, field users, trade-show users, and anyone recording new buyer or supplier interest.

### Goal

Create a clean starting record from a buyer inquiry, trade event conversation, business card scan, WhatsApp message, product request, or meeting.

### Walkthrough

1. Create or open the capture flow for the inquiry source.
2. Enter company name, contact name, email or phone, country, and source.
3. Add product interest, quantity expectation, buyer requirement, and urgency if known.
4. Add notes while the conversation is still fresh.
5. Assign an owner.
6. Set the next follow-up action and date.

### Before moving forward

- Company and contact details are usable.
- Product interest is specific enough for follow-up.
- Source and owner are set.
- Notes explain what the buyer or contact actually asked for.

## Module 3: Review and qualify the lead

### Who should complete this

Sales owners and managers.

### Goal

Move from raw inquiry to qualified opportunity by confirming fit, urgency, next action, and ownership.

### Walkthrough

1. Open the lead record.
2. Read the latest notes and source context before changing status.
3. Confirm buyer requirement, destination, product category, expected quantity, and timeline.
4. Confirm whether the person is a decision-maker, influencer, or early contact.
5. Update status only when the next action is clear.
6. Add a concise note explaining the qualification decision.

### Before moving forward

- Status reflects the real business stage.
- The next action has an owner.
- The next action has a realistic date.
- Notes explain why the lead is moving forward or stopping.

## Module 4: Prepare quote and commercial details

### Who should complete this

Sales and operations.

### Goal

Translate a qualified request into quote-ready information.

### Walkthrough

1. Confirm product, pack size, quantity, shipment terms, destination, and currency.
2. Use the Quote Launcher (from the Lead Command Center) to choose the right action: new quote, continuation of existing draft, governed revision of a sent quote, or clone of an accepted quote.
3. Check whether pricing, freight, documentation, and approval inputs are complete.
4. Record commercial assumptions clearly.
5. Mark any approval or missing input before the quote is shared.
6. After sending, log the outcome explicitly: Mark accepted, Mark rejected, Revision requested, No response, or Expire quote. Do not leave a sent quote without a logged outcome.
7. When marked accepted, confirm the order handoff is created — the quote exits the Quote workspace and execution moves to Orders.

### Before moving forward

- Products and quantities are not vague.
- Commercial assumptions are visible.
- Any approval dependency is marked.
- The record explains what was quoted and what still needs confirmation.
- A sent quote has an explicit outcome logged (accepted, rejected, revision, no response, or expired).

## Module 5: Confirm documents and order readiness

### Who should complete this

Operations and order coordinators.

### Goal

Make sure the record is ready for execution before dispatch work begins.

### Walkthrough

1. Open the order or execution record.
2. Verify buyer, seller, product, quantity, commercial terms, and document requirements.
3. Check contract, invoice, packing, product, shipment, and compliance inputs.
4. Attach, track, or request missing documents.
5. Flag missing information before dispatch work starts.

### Before moving forward

- Required fields are complete.
- Documents are attached, tracked, or clearly requested.
- The record shows what is pending and who owns it.

## Module 6: Move from ready state to dispatch

### Who should complete this

Dispatch and operations.

### Goal

Complete the operational handoff from order readiness to shipment action with clear status, tracking, and follow-up ownership.

### Walkthrough

1. Confirm order approval.
2. Confirm documentation readiness.
3. Confirm product details and dispatch timing.
4. Update dispatch status only when the real-world shipment action is ready or completed.
5. Add tracking, shipment note, or follow-up instruction.
6. Confirm post-dispatch owner and next action.

### Before moving forward

- No missing commercial or document requirement remains hidden.
- Dispatch status matches the real-world movement.
- The next follow-up after dispatch is visible to the right owner.

## Module 7: Use mobile capture in the field

### Who should complete this

Field users, event teams, and users capturing leads away from the desk.

### Goal

Capture buyer interest quickly while keeping enough structure for office teams to qualify and follow up.

### Walkthrough

1. Use the field mobile flow for quick lead capture.
2. Prioritize accurate contact details, product interest, notes, and follow-up timing.
3. Save the record while the conversation context is fresh.
4. After the event or meeting, review mobile-captured records from the desktop workspace.
5. Clean up, qualify, and assign records before they become stale.

### Before moving forward

- Contact details are good enough to reach the person again.
- Source is clear.
- Raw mobile captures are reviewed after the field activity.

## Common mistakes to avoid

| Mistake | Why it causes issues | Better practice |
|---|---|---|
| Changing status without reading notes | The record can move to the wrong stage | Read latest notes first |
| Leaving owner blank | No one is accountable for the next action | Assign owner before saving |
| Vague product interest | Operations cannot quote or validate | Add product, pack, quantity, and destination where known |
| Missing follow-up date | Leads go stale | Always set the next action date |
| Dispatch update before readiness | Creates confusion between system status and real shipment status | Update dispatch only when real-world status matches |
| Private records in training | Exposes sensitive information | Use representative workflow examples only |
| Editing a sent quote directly | Overwrites immutable buyer-facing data and breaks version lineage | Use the Quote Launcher → Revision requested to create a governed new version |
| Leaving a sent quote without logging an outcome | Quote stays in Needs Review indefinitely; no order or archive is created | Always log: accepted, rejected, revision requested, no response, or expire |
| Adding Proposed and Accepted values together | Overstates the customer's pipeline value | Proposed and Accepted are separate buckets; Exposure = the max of the two, not the sum |

## Trainer checklist

Before running a live training session:

- Open `/training` and walk through the module sequence.
- Use clean representative records only.
- Avoid private main organization data.
- Explain role ownership before showing record updates.
- Keep each module short enough to become a future video.
- End with a capture-to-dispatch recap.

## Future video plan

Recommended recording sequence:

1. Workspace orientation and daily queues.
2. Capture a new inquiry from event or field source.
3. Qualify, assign, and set follow-up.
4. Prepare quote and order readiness.
5. Confirm documents.
6. Complete dispatch handoff and follow-up.

Each video should map directly to one module in `/training`.
