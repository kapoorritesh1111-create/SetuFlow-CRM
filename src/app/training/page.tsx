'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

// ─── HeyGen Video Plan (hidden from UI — ready for production) ────────────────
// OVERVIEW VIDEO (~90 sec) — heygen.com "Corporate Presenter" template
// Slides: ss-dashboard.jpg → ss-leads.jpg → ss-quotebuilder.jpg → operator-11-dispatch-tracking.png
// Script: "Setu Flow is built for one job: taking a buyer conversation all the way
//   to dispatch without anything falling through the cracks. Start every day at the
//   Dashboard — your queue health and priority actions are visible the moment you
//   log in. When a new lead arrives — from a trade show, a WhatsApp message, or a
//   website inquiry — capture it in under 60 seconds with all the buyer context your
//   team needs. Build a quote, run it through the approval gate, and send it with
//   confidence. When the buyer confirms, the system moves straight to order execution
//   — documents, packing, freight, and dispatch tracked in one place.
//   That is Setu Flow. Dashboard to dispatch, end to end."
// Output: public/training/videos/00-product-overview.mp4
//
// Per-module videos (3–6 min each, same template):
// 01-dashboard.mp4  02-lead-capture.mp4  03-trade-show.mp4  04-mobile-vcard.mp4
// 05-tasks.mp4  06-setu-guru.mp4  07-quote.mp4  08-documents.mp4  09-dispatch.mp4
// HeyGen plan: ~$29/mo — up to 10 videos/month at 1080p
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'sales' | 'operations' | 'dispatch' | 'manager';

type TrainingScreen = {
  title: string;
  file: string;
  alt: string;
  // Plain-language callout — explains exactly what button/element to look for
  callout: string;
  firstClick: string;
  check: string;
  doneWhen: string;
  tip: string;
};

type QuizQuestion = {
  q: string;
  options: string[];
  correct: number;
};

type TrainingModule = {
  id: string;
  number: string;
  title: string;
  shortTitle: string;
  icon: string;
  roles: Role[];
  outcome: string;
  screens: TrainingScreen[];
  quiz?: QuizQuestion;
};

// ─── Data ─────────────────────────────────────────────────────────────────────

const SS = '/internal/docs-screenshots';

const trainingModules: TrainingModule[] = [
  {
    id: 'dashboard',
    number: '01',
    title: 'Dashboard command view',
    shortTitle: 'Dashboard',
    icon: '▦',
    roles: ['sales', 'operations', 'dispatch', 'manager'],
    outcome: 'Start every day understanding queue health, overdue records, and where your attention is needed first.',
    screens: [
      {
        title: 'Main dashboard',
        file: 'operator-01-dashboard-nav.png',
        alt: 'Setu Flow main dashboard and navigation',
        callout: 'Look at the left sidebar — this is your main navigation. The icons and labels take you to every part of Setu Flow. "Dashboard" is always your home base.',
        firstClick: 'Click "Dashboard" in the left sidebar navigation to open this view.',
        check: "Scan the priority cards and queue counts at the top — these tell you what needs action today before you open anything.",
        doneWhen: 'You can identify which queue has the most overdue items and which team member owns them.',
        tip: 'Always start here before opening individual records. The dashboard prevents surprises.',
      },
      {
        title: 'Dashboard overview — KPIs and activity',
        file: 'ss-dashboard.jpg',
        alt: 'Setu Flow dashboard KPI cards and activity feed',
        callout: 'See the KPI cards across the top? Those numbers update in real time. Below them is the activity feed showing every recent action across your team.',
        firstClick: 'Scroll down on the dashboard to see the world market map and follow-up queue below the KPI strip.',
        check: "Review the follow-up queue — any record with a red or amber indicator needs action today.",
        doneWhen: 'You know which record or queue should be opened first and which owner is responsible.',
        tip: 'Use Dashboard as your daily starting point before opening individual leads, quotes, or orders.',
      },
      {
        title: 'Analytics view',
        file: 'ss-analytics.jpg',
        alt: 'Setu Flow analytics screen',
        callout: 'The wide bar at the top is your analytics strip — it shows pipeline conversion at a glance. Look for the coloured stage bars to spot where leads are getting stuck.',
        firstClick: 'Open Analytics from the left sidebar or the Reports link in the top navigation.',
        check: 'Look for bottlenecks — which stage has the most records sitting without movement?',
        doneWhen: 'You can explain what is healthy, what is stuck, and what needs manager attention.',
        tip: 'Use analytics for coaching and pipeline review, not for editing day-to-day records.',
      },
      {
        title: 'Reports view',
        file: 'ss-reports.jpg',
        alt: 'Setu Flow reports screen',
        callout: 'The filter bar at the top of Reports is important — always set your date range and owner filter before reading any number here.',
        firstClick: 'Open Reports from the left sidebar, then set filters before reading any result.',
        check: 'Confirm the selected date range, owner filter, and stage before sharing any report in a meeting.',
        doneWhen: 'The report tells you which workflow needs follow-up, cleanup, or handoff attention.',
        tip: 'Always confirm filters are correct before using reports in a meeting or training session.',
      },
    ],
    quiz: {
      q: 'What should you check first when you open Dashboard each morning?',
      options: [
        'Jump straight to creating a new lead',
        'Review queue health, overdue records, and who owns the next action',
        'Open Analytics and export a report',
      ],
      correct: 1,
    },
  },
  {
    id: 'lead-capture',
    number: '02',
    title: 'Lead capture and qualification',
    shortTitle: 'Lead Capture',
    icon: '👤',
    roles: ['sales', 'manager'],
    outcome: 'Create a clean lead with owner, source, product interest, notes, and a next action — so nothing falls through.',
    screens: [
      {
        title: 'Lead capture workspace',
        file: 'ss-capture.jpg',
        alt: 'Setu Flow lead capture workspace',
        callout: 'See the green "+ Add Lead" or "Capture" button — that is always in the top-right corner of this screen. Click it to start a new inquiry record.',
        firstClick: 'Click the green "Add Lead" or "Capture" button in the top-right of the leads workspace.',
        check: 'Enter company, contact name, country, source (trade show / WhatsApp / website / referral), and product interest.',
        doneWhen: 'The record is saved with source, owner, status, and at least one note or next follow-up.',
        tip: 'Do not leave a captured inquiry without a next action — a lead without follow-up goes cold fast.',
      },
      {
        title: 'Capture lead form',
        file: 'ss-capture-lead.jpg',
        alt: 'Setu Flow capture lead form',
        callout: 'This is the capture form. Red asterisks (*) mark required fields. Fill every required field before saving — especially the Source dropdown and Owner field.',
        firstClick: 'Start with Company Name, then work down the form: contact details → product interest → source → owner → notes.',
        check: 'Before saving: confirm email or phone is entered, product category is selected, and owner is assigned.',
        doneWhen: 'The saved lead is complete enough that another user could act on it without asking you for context.',
        tip: 'Write the exact buyer request in Notes — not a vague summary. Specifics matter later.',
      },
      {
        title: 'Leads list — your queue',
        file: 'ss-leads.jpg',
        alt: 'Setu Flow leads list',
        callout: 'This is the leads list. Each row is one lead. The coloured dot on the left is the status indicator — red means overdue or urgent, amber means needs attention, green means on track.',
        firstClick: 'Click any lead row to open the full detail view for that record.',
        check: 'Before opening a lead: look at the status dot, owner name, and "Last activity" column first.',
        doneWhen: 'You know whether the lead should be contacted, qualified, quoted, held, or closed.',
        tip: 'Read the most recent note before changing any status. Context prevents mistakes.',
      },
      {
        title: 'Lead command view — update and act',
        file: 'ss-leads-cmd.jpg',
        alt: 'Setu Flow lead command screen',
        callout: 'The right panel on this screen is the command area — it has the Status dropdown, Owner field, and the "Add Note" and "Create Task" buttons. These are the four most important controls on this page.',
        firstClick: 'Use the Status dropdown on the right panel to update the lead stage, then add a note explaining why.',
        check: 'Before saving a status change: confirm the reason, who owns next steps, and whether a follow-up task is needed.',
        doneWhen: 'Owner, status, notes, and next follow-up are all aligned with the real business situation.',
        tip: 'Every status movement needs a note. This is the single most important habit in Setu Flow.',
      },
      {
        title: 'Lead detail — create quote handoff',
        file: 'operator-03-lead-detail-create-quote.png',
        alt: 'Lead detail screen with create quote action',
        callout: 'When a lead is qualified and ready for commercial discussion, look for the "Create Quote" button — it is usually in the top action bar or in the lead detail right panel. This is the handoff point from sales to commercial.',
        firstClick: 'Click "Create Quote" from the qualified lead detail view to start the quote workflow for this buyer.',
        check: 'Before clicking Create Quote: confirm the lead is genuinely qualified — buyer interest, product category, and approximate quantity are all known.',
        doneWhen: 'A quote record is created and linked to this lead, and the lead status updates to "Quoted".',
        tip: 'Only create a quote from a real qualified conversation — do not use it as a placeholder.',
      },
    ],
    quiz: {
      q: 'What is the minimum a lead record must have before you move it to "Qualified"?',
      options: [
        'Company name only — you can fill in the rest later',
        'Source, owner, status, product interest, and at least one note with buyer context',
        'Email address and product interest',
      ],
      correct: 1,
    },
  },
  {
    id: 'trade-show',
    number: '03',
    title: 'Trade show and event capture',
    shortTitle: 'Trade Show',
    icon: '▣',
    roles: ['sales', 'manager'],
    outcome: 'Convert event conversations into clean, assigned, follow-up-ready CRM records before the context fades.',
    screens: [
      {
        title: 'Pipeline — event and stage view',
        file: 'ss-pipeline.jpg',
        alt: 'Setu Flow pipeline screen',
        callout: 'The pipeline view shows leads grouped by stage in columns. Each card is a lead. Look for the "Source" badge on each card — event leads will show the trade show name as their source.',
        firstClick: 'Open Pipeline from the left sidebar, then filter by source to show only leads from your event.',
        check: 'For each event lead: check that source, stage, owner, and a follow-up date are all set.',
        doneWhen: 'Every event lead has moved out of the "New" column and has a clear next action assigned.',
        tip: 'Clean up trade show leads within 48 hours — after that, context fades fast.',
      },
      {
        title: 'Product catalog — event reference',
        file: 'ss-catalog.jpg',
        alt: 'Setu Flow product catalog screen',
        callout: 'When a buyer at an event asks about a specific product, open the Catalog from the sidebar. Each product card shows the category, pack formats, and key specs — use this to capture the exact product interest, not just a vague category.',
        firstClick: 'Open Catalog from the sidebar, then search or browse to find the product the buyer mentioned.',
        check: 'Before closing the catalog: note the exact product name, pack size, and any special format the buyer asked about.',
        doneWhen: 'The lead record references the specific product, pack format, and quantity expectation — not just "interested in snacks".',
        tip: 'Vague product interest leads to vague quotes. Be specific while the conversation is fresh.',
      },
    ],
    quiz: {
      q: 'When is the best time to clean up and qualify trade show leads?',
      options: [
        'Within 48 hours while conversation context is still fresh',
        'At the end of the month during pipeline review',
        'Only when the buyer reaches out again',
      ],
      correct: 0,
    },
  },
  {
    id: 'mobile-vcard',
    number: '04',
    title: 'Mobile field capture and vCard',
    shortTitle: 'Mobile / vCard',
    icon: '📱',
    roles: ['sales'],
    outcome: 'Capture contact and buyer interest from your phone in under 60 seconds, then clean it up from desktop.',
    screens: [
      {
        title: 'Mobile quick capture',
        file: 'ss-mobile-capture.jpg',
        alt: 'Setu Flow mobile capture screen',
        callout: 'On mobile, look for the large floating "+" or "Quick Lead" button at the bottom of the screen. That is your fast-capture button — tap it to open the quick form.',
        firstClick: 'Tap the "+" or "Quick Lead" floating button at the bottom of the screen.',
        check: 'Capture name, company, phone or email, source, and product interest — even a few words is enough for now.',
        doneWhen: 'The record is saved and you can see it in your leads list on mobile.',
        tip: 'Mobile capture is for speed. Clean and qualify from desktop later — do not try to fill everything on your phone.',
      },
      {
        title: 'Mobile leads list',
        file: 'ss-mobile-leads.jpg',
        alt: 'Setu Flow mobile leads screen',
        callout: 'The mobile leads list shows your recent captures at the top. Each card has a coloured edge — this is the status indicator. Swipe left on a card to see quick actions.',
        firstClick: 'Tap any lead card to open the full detail view for that record.',
        check: 'Scroll through your recent captures and flag any that are incomplete or need cleanup.',
        doneWhen: 'You can see your newly captured lead in the list and the basic details are correct.',
        tip: 'Before leaving an event, quickly scroll your mobile leads list to confirm nothing was saved incorrectly.',
      },
      {
        title: 'vCard business card scan',
        file: 'ss-vcard.jpg',
        alt: 'Setu Flow vCard capture screen',
        callout: 'The vCard screen shows the extracted fields from the business card scan. Each field has a small edit icon next to it — always check every field before tapping "Save as Lead".',
        firstClick: 'Tap "Scan Card" or "Import vCard" from the capture menu, then point your camera at the business card.',
        check: 'After scanning: verify name spelling, company, phone format (include country code), email, and title.',
        doneWhen: 'The contact details are verified, a source is set, and the record is saved as a lead.',
        tip: 'Card scan OCR makes mistakes. The verification step is not optional — always check before saving.',
      },
    ],
    quiz: {
      q: 'After scanning a business card, what must you do before tapping "Save as Lead"?',
      options: [
        'Immediately mark the lead as qualified',
        'Verify every extracted field — name, company, phone, and email — are accurate',
        'Assign it to another team member to check',
      ],
      correct: 1,
    },
  },
  {
    id: 'tasks',
    number: '05',
    title: 'Tasks and follow-up discipline',
    shortTitle: 'Tasks',
    icon: '✓',
    roles: ['sales', 'operations', 'dispatch', 'manager'],
    outcome: 'Keep every lead, quote, order, and dispatch item from going cold by giving each action a clear owner and due date.',
    screens: [
      {
        title: 'Tasks workspace',
        file: 'ss-tasks.jpg',
        alt: 'Setu Flow tasks screen',
        callout: 'See the "+ New Task" button in the top-right? That is how you create a task. The coloured priority flags on each row (red = urgent, amber = soon, grey = low) tell you what to act on first.',
        firstClick: 'Click "+ New Task" in the top-right to create a task, or click any existing task row to open and update it.',
        check: 'For every task: confirm owner, due date, priority level, linked record (lead/quote/order), and a clear task description.',
        doneWhen: 'The task clearly explains what needs to happen next — a teammate could act on it without asking you anything.',
        tip: 'A good task is understandable even if someone else opens it tomorrow. Write for clarity, not brevity.',
      },
      {
        title: 'Mobile tasks — on the go',
        file: 'ss-tasks-mobile.jpg',
        alt: 'Setu Flow mobile tasks screen',
        callout: 'On mobile, tasks are shown as cards. The circle on the left of each card is the completion button — tap it to mark the task done. You will be prompted to add a completion note before it closes.',
        firstClick: 'Tap the circle on the left of a task card to mark it complete, then add a note about the outcome.',
        check: 'Before completing a task: confirm the action actually happened and the outcome is worth recording.',
        doneWhen: 'The task is closed with a clear outcome note, or converted into the next follow-up task.',
        tip: 'Never close a task without recording what happened. The note becomes the context for the next action.',
      },
    ],
    quiz: {
      q: 'What should always happen before you mark a task as complete?',
      options: [
        'Nothing — just tap complete and move on',
        'Add a completion note recording the outcome, or create the next follow-up task',
        'Delete the task to keep the list clean',
      ],
      correct: 1,
    },
  },
  {
    id: 'setu-guru',
    number: '06',
    title: 'Setu Guru AI guidance',
    shortTitle: 'Setu Guru',
    icon: '🧘',
    roles: ['sales', 'operations', 'dispatch', 'manager'],
    outcome: 'Use Setu Guru to resolve blockers, check pricing defaults, look up HS codes, understand compliance steps, and get clear next-step guidance on any page.',
    screens: [
      {
        title: 'Setu Guru panel',
        file: 'ss-setu_guru.jpg',
        alt: 'Setu Guru AI guidance panel',
        callout: 'Setu Guru is the AI assistant built into Setu Flow. Find it in the sidebar footer (desktop) or the header icon (mobile). Type your question in the input box — it reads the current page context automatically.',
        firstClick: 'Click the Setu Guru icon in the sidebar footer or mobile header to open the panel, then type your question.',
        check: 'After reading the response: use "Helpful" if it answered your question, or "Missing detail" if you need more. This improves the AI for everyone.',
        doneWhen: 'You understand the recommended next step — and if Guru suggests a price, send, or data change, a human reviews it before acting.',
        tip: 'Guru is a guide, not an executor. It reads context and suggests — humans still approve all commercial actions.',
      },
    ],
    quiz: {
      q: 'Setu Guru recommends a pricing default for a quote. What is the correct next step?',
      options: [
        'Accept it and send the quote immediately',
        'Have a human review and approve the price before any send or write-back',
        'Ignore Guru and set the price manually every time',
      ],
      correct: 1,
    },
  },
  {
    id: 'quote',
    number: '07',
    title: 'Quote workflow',
    shortTitle: 'Quote',
    icon: '₹',
    roles: ['sales', 'operations', 'manager'],
    outcome: 'Move from quote draft to approval, approved send, outcome update, and order creation — without losing any commercial assumptions.',
    screens: [
      {
        title: 'Quotes list — your commercial pipeline',
        file: 'ss-quotes.jpg',
        alt: 'Setu Flow quotes list screen',
        callout: 'The quotes list shows every active quote with its status badge — Draft, Pending Approval, Approved, Sent, Accepted, or Declined. The status badge is colour-coded: blue = draft, amber = pending, green = approved/accepted.',
        firstClick: 'Click any quote row to open the full quote detail. Filter by status to focus on quotes that need your action.',
        check: 'Before opening a quote: check the status badge, the approval state column, and when it was last updated.',
        doneWhen: 'You know which quotes need your action today — to edit, approve, send, follow up, or create an order from.',
        tip: 'Quote status must always reflect the real buyer conversation — not your internal wishful thinking.',
      },
      {
        title: 'Quote builder — build the draft',
        file: 'ss-quotebuilder.jpg',
        alt: 'Setu Flow quote builder screen',
        callout: 'The quote builder has three main sections: Product line items (left), Pricing and freight (centre), and Assumptions/Notes (right). All three must be complete before submitting for approval.',
        firstClick: 'Click "+ Add Product" in the line items section to add the first product, then set quantity, pack size, and unit price.',
        check: 'Before submitting: confirm product details, quantity, currency, incoterms, destination, freight estimate, and any pricing assumptions.',
        doneWhen: 'The quote draft has enough detail that an approver can review it without asking you for missing information.',
        tip: 'Write pricing assumptions in the notes section — "Price based on 20ft FCL, FOB Mumbai, valid 30 days." This protects you.',
      },
      {
        title: 'Quote builder draft — operator view',
        file: 'operator-04-quote-builder-draft.png',
        alt: 'Quote builder full draft view',
        callout: 'This is the full quote builder in draft mode. The "Submit for Approval" button is at the top right — do not click it until every section is complete. The amber "Draft" badge in the header tells you it has not been submitted yet.',
        firstClick: 'Review each section — line items, pricing, freight, and notes — before clicking "Submit for Approval".',
        check: 'Scroll to the bottom of the form and check for any red validation warnings before submitting.',
        doneWhen: 'All sections are complete, there are no validation warnings, and you have clicked "Submit for Approval".',
        tip: 'Draft is the safe correction stage. Once submitted, changes require the approver to return the quote.',
      },
      {
        title: 'Approval gate — review and approve',
        file: 'operator-05-quote-approval-gate.png',
        alt: 'Quote approval gate screen',
        callout: 'The approval gate panel slides in from the right when a quote is submitted. It shows the approval checklist — margin check, compliance check, freight check, and terms check. Each item must be confirmed before the "Approve" button becomes active.',
        firstClick: 'Review each checklist item in the approval panel, then click "Approve" or "Return with Notes" at the bottom.',
        check: 'Confirm: margin is acceptable, freight is realistic, incoterms match buyer expectation, and all compliance requirements are met.',
        doneWhen: 'The quote is either Approved (green badge), Returned with notes, or Held for missing inputs.',
        tip: 'The approval gate protects the team from sending commercially incomplete quotes. It is not a formality.',
      },
      {
        title: 'Approved quote — send to buyer',
        file: 'operator-06-approved-quote-send.png',
        alt: 'Approved quote send screen',
        callout: 'When a quote is approved, the "Send Quote" button becomes active — it is green and in the top action bar. Do not click it until you have reviewed the recipient email, subject line, and attached PDF.',
        firstClick: 'Open the approved quote, review the send panel, confirm the recipient and attachment, then click "Send Quote".',
        check: 'Before sending: confirm the recipient is correct, the PDF shows the right version, and the covering message reflects the buyer conversation.',
        doneWhen: 'The quote is sent and a follow-up task is automatically created or manually scheduled.',
        tip: 'Sending is a real commercial action. Take 60 seconds to review before clicking Send.',
      },
      {
        title: 'Quote outcome — create the order',
        file: 'operator-07-quote-outcome-create-order.png',
        alt: 'Quote outcome and create order screen',
        callout: 'When the buyer confirms, find the "Mark Accepted" button and then "Create Order" — both are in the quote action bar. The order will be pre-filled with the quote terms, so only create it from a real accepted outcome.',
        firstClick: 'Click "Mark Accepted" to update the quote status, then click "Create Order" to generate the linked order record.',
        check: 'Before creating the order: confirm the accepted quantity, price, incoterms, and any buyer-specific requirements.',
        doneWhen: 'The quote status shows "Accepted" and a linked order record has been created with the correct terms.',
        tip: 'Only create an order from a confirmed buyer acceptance — not from a hopeful follow-up or a verbal maybe.',
      },
    ],
    quiz: {
      q: 'When is it correct to click the "Send Quote" button?',
      options: [
        'When the draft looks complete enough',
        'As soon as the buyer asks for pricing',
        'Only after the approval gate is confirmed and the recipient and attachment are verified',
      ],
      correct: 2,
    },
  },
  {
    id: 'documents',
    number: '08',
    title: 'Documents and order readiness',
    shortTitle: 'Documents',
    icon: '▤',
    roles: ['operations', 'dispatch', 'manager'],
    outcome: 'Confirm all documents, packing, freight, and order stage details are complete before the dispatch handoff.',
    screens: [
      {
        title: 'Documents workspace',
        file: 'ss-documents.jpg',
        alt: 'Setu Flow documents screen',
        callout: 'The documents workspace shows a checklist on the left — each item has a status: Attached (green), Pending (amber), or Missing (red). Click any row to upload or request the document.',
        firstClick: 'Open Documents from the sidebar, then filter to the order you are preparing for dispatch.',
        check: 'Work through the checklist: contract, commercial invoice, packing list, product certificates, and any compliance documents.',
        doneWhen: 'Every required document is attached (green), or has a clearly assigned owner and expected date for pending items.',
        tip: 'Document readiness should live in the system — not in WhatsApp messages or email threads nobody else can see.',
      },
      {
        title: 'Orders workspace',
        file: 'ss-orders.jpg',
        alt: 'Setu Flow orders screen',
        callout: 'The orders list shows every active order with a stage badge and readiness indicator. The readiness indicator (the small coloured circle next to the order) tells you at a glance if the order is fully ready for dispatch.',
        firstClick: 'Click an order row to open the full order detail with stage panel, documents, and readiness checklist.',
        check: 'Review order status, buyer, product, quantity, confirmed terms, document readiness, and who owns the next action.',
        doneWhen: 'The order clearly shows what is ready, what is pending, and who owns every outstanding item.',
        tip: 'Order status must reflect real readiness — not expected readiness. Do not advance the stage prematurely.',
      },
      {
        title: 'Order execution stage panel',
        file: 'operator-08-order-execution-stage-panel.png',
        alt: 'Order execution stage panel',
        callout: 'The execution stage panel is on the right side of the order detail screen. It shows your current stage and the progression path. The "Advance Stage" button is at the bottom of this panel — only use it when the real-world status matches.',
        firstClick: 'Open the stage panel on the right, review the current stage requirements, then click "Advance Stage" when all requirements are met.',
        check: 'Before advancing: confirm current stage requirements are complete, blockers are noted, and the next owner is assigned.',
        doneWhen: 'The stage badge on the order reflects the real operational position — not where you wish it was.',
        tip: 'Stage changes should always include a note with enough context for whoever picks this up next.',
      },
      {
        title: 'Packing and freight details',
        file: 'operator-10-packing-freight.png',
        alt: 'Packing and freight details screen',
        callout: 'The packing and freight section is accessed from the order detail — look for the "Packing / Freight" tab in the order header. This must be fully completed before you can mark an order as dispatch-ready.',
        firstClick: 'Click the "Packing / Freight" tab within the order detail to open this section.',
        check: 'Confirm: pack count, gross weight, dimensions, freight mode (sea/air/road), carrier, pickup date, and any special handling notes.',
        doneWhen: 'All packing and freight fields are complete — the dispatch team can act on this information without calling you.',
        tip: 'Incomplete packing and freight data creates delays at origin. Fill this section completely before handoff.',
      },
    ],
    quiz: {
      q: 'An order is almost ready but one compliance document is still missing. What do you do?',
      options: [
        'Mark the order dispatch-ready and sort the document later',
        'Record the missing document as Pending with a named owner and expected date, then wait',
        'Skip the document if the buyer has not specifically asked for it',
      ],
      correct: 1,
    },
  },
  {
    id: 'dispatch',
    number: '09',
    title: 'Dispatch tracking',
    shortTitle: 'Dispatch',
    icon: '▸',
    roles: ['operations', 'dispatch', 'manager'],
    outcome: 'Complete the handoff from order readiness to shipment movement, with tracking, carrier details, and post-dispatch follow-up all recorded.',
    screens: [
      {
        title: 'Dispatch tracking and update',
        file: 'operator-11-dispatch-tracking.png',
        alt: 'Dispatch tracking screen',
        callout: 'The dispatch tracking screen has three key areas: Shipment status (top left), Tracking number and carrier fields (centre), and Buyer follow-up task (bottom right). All three must be updated when shipment moves.',
        firstClick: 'Click "Update Dispatch" or "Add Tracking" in the action bar when you have confirmed the shipment has physically moved.',
        check: 'Confirm: dispatch status is accurate, tracking number is entered, carrier and dispatch date are set, and buyer follow-up task is created.',
        doneWhen: 'The dispatch record shows the real-world shipment status and the post-dispatch follow-up is visible to the sales owner.',
        tip: 'Do not mark dispatch as complete until the shipment has actually moved. Premature updates break buyer trust.',
      },
    ],
    quiz: {
      q: 'When is it correct to mark a dispatch as complete in Setu Flow?',
      options: [
        'When the packing list is finalised',
        'When the order is internally approved for dispatch',
        'Only after the shipment has physically moved and tracking number is confirmed',
      ],
      correct: 2,
    },
  },
];

const ROLE_LABELS: Record<Role, string> = {
  sales: 'Sales owner',
  operations: 'Operations owner',
  dispatch: 'Dispatch owner',
  manager: 'Manager / Admin',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  sales: 'Captures leads, manages buyer context, prepares quotes, keeps follow-up from going cold.',
  operations: 'Checks product, quote, document, order, approval, packing, and freight readiness.',
  dispatch: 'Confirms shipment handoff, updates dispatch status, records movement details.',
  manager: 'Reviews queue health, bottlenecks, overdue tasks, and handoff quality across the full workflow.',
};

const ROLE_MODULES: Record<Role, string[]> = {
  sales: ['dashboard', 'lead-capture', 'trade-show', 'mobile-vcard', 'tasks', 'setu-guru', 'quote'],
  operations: ['dashboard', 'tasks', 'setu-guru', 'quote', 'documents', 'dispatch'],
  dispatch: ['dashboard', 'tasks', 'documents', 'dispatch'],
  manager: ['dashboard', 'lead-capture', 'trade-show', 'tasks', 'setu-guru', 'quote', 'documents', 'dispatch'],
};

const STORAGE_KEY = 'setuflow-training-v1';

type StoredProgress = {
  role: Role | null;
  completed: string[];
  quizAnswers: Record<string, number>;
};

function loadProgress(): StoredProgress {
  if (typeof window === 'undefined') return { role: null, completed: [], quizAnswers: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { role: null, completed: [], quizAnswers: {} };
    return JSON.parse(raw);
  } catch { return { role: null, completed: [], quizAnswers: {} }; }
}
function saveProgress(p: StoredProgress) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close zoom view"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
      <div
        className="relative mx-4 max-h-[90vh] max-w-6xl overflow-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          className="h-auto w-full rounded-2xl"
          priority
        />
        <p className="mt-2 text-center text-xs text-white/50">Press Esc or click outside to close</p>
      </div>
    </div>
  );
}

// ─── Screen Card ──────────────────────────────────────────────────────────────

function ScreenCard({ screen, index, total }: { screen: TrainingScreen; index: number; total: number }) {
  const [zoomed, setZoomed] = useState(false);

  return (
    <>
      {zoomed && (
        <Lightbox
          src={`${SS}/${screen.file}`}
          alt={screen.alt}
          onClose={() => setZoomed(false)}
        />
      )}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Screen counter */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-teal-700">
            Screen {index + 1} of {total}
          </p>
          <button
            onClick={() => setZoomed(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35M11 8v6M8 11h6" />
            </svg>
            Zoom screenshot
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Screenshot — click to zoom */}
          <div className="group relative cursor-zoom-in bg-slate-100 p-2" onClick={() => setZoomed(true)}>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <Image
                src={`${SS}/${screen.file}`}
                alt={screen.alt}
                width={1600}
                height={1000}
                className="h-[260px] w-full object-contain object-top transition duration-200 group-hover:scale-[1.01]"
              />
            </div>
            {/* Hover overlay hint */}
            <div className="pointer-events-none absolute inset-2 flex items-end justify-center rounded-xl pb-3 opacity-0 transition group-hover:opacity-100">
              <span className="rounded-full bg-black/60 px-3 py-1 text-[11px] font-semibold text-white">
                Click to zoom
              </span>
            </div>
          </div>

          {/* Info panel */}
          <div className="flex flex-col p-5">
            <h4 className="text-lg font-semibold tracking-tight text-slate-950">{screen.title}</h4>

            {/* Callout — what are you looking at */}
            <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
                👁 What you&apos;re looking at
              </p>
              <p className="mt-1.5 text-xs leading-5 text-blue-900">{screen.callout}</p>
            </div>

            <div className="mt-3 space-y-2">
              <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  ▶ Click / tap this first
                </p>
                <p className="mt-1.5 text-xs leading-5 text-slate-700">{screen.firstClick}</p>
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">
                  ✓ Check before saving
                </p>
                <p className="mt-1.5 text-xs leading-5 text-amber-900">{screen.check}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-600">
                  ✅ Done when
                </p>
                <p className="mt-1.5 text-xs leading-5 text-emerald-800">{screen.doneWhen}</p>
              </div>
            </div>

            <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-[11px] leading-5 text-slate-500 italic">
              💡 {screen.tip}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

function QuizBlock({
  quiz, moduleId, savedAnswer, onAnswer,
}: {
  quiz: QuizQuestion; moduleId: string; savedAnswer?: number;
  onAnswer: (moduleId: string, idx: number) => void;
}) {
  const answered = savedAnswer !== undefined;
  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
        🧠 Quick knowledge check
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{quiz.q}</p>
      <div className="mt-3 space-y-2">
        {quiz.options.map((opt, idx) => {
          let cls = 'w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-xs font-medium transition ';
          if (!answered) cls += 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 hover:bg-teal-50';
          else if (idx === quiz.correct) cls += 'border-emerald-300 bg-emerald-50 text-emerald-800';
          else if (idx === savedAnswer) cls += 'border-red-200 bg-red-50 text-red-700';
          else cls += 'border-slate-100 bg-slate-50 text-slate-400';
          return (
            <button key={idx} className={cls} onClick={() => !answered && onAnswer(moduleId, idx)}>
              <span className="mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>
              {opt}
              {answered && idx === quiz.correct && <span className="ml-2">✓</span>}
              {answered && idx === savedAnswer && idx !== quiz.correct && <span className="ml-2">✗</span>}
            </button>
          );
        })}
      </div>
      {answered && (
        <p className={`mt-3 text-xs font-semibold ${savedAnswer === quiz.correct ? 'text-emerald-600' : 'text-slate-500'}`}>
          {savedAnswer === quiz.correct
            ? '✓ Correct — well done.'
            : `The correct answer is: ${quiz.options[quiz.correct]}`}
        </p>
      )}
    </div>
  );
}

// ─── Role Tag ─────────────────────────────────────────────────────────────────

function RoleTag({ role }: { role: Role }) {
  const colors: Record<Role, string> = {
    sales: 'bg-emerald-50 text-emerald-700',
    operations: 'bg-violet-50 text-violet-700',
    dispatch: 'bg-orange-50 text-orange-700',
    manager: 'bg-blue-50 text-blue-700',
  };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${colors[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

// ─── Tab: Start Here ──────────────────────────────────────────────────────────

function TabStartHere({ role, onRoleSelect }: { role: Role | null; onRoleSelect: (r: Role) => void }) {
  const roles: Role[] = ['sales', 'operations', 'dispatch', 'manager'];
  const roleIcons: Record<Role, string> = { sales: '🎯', operations: '⚙️', dispatch: '🚚', manager: '📊' };
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Step 1 — start here</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
        Learn Setu Flow from dashboard to dispatch.
      </h2>
      <p className="mt-3 max-w-2xl text-base leading-7 text-slate-500">
        Pick your role below to get a personalised training path — only the screens that matter to your job. You can change it any time.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {roles.map((r) => (
          <button
            key={r}
            onClick={() => onRoleSelect(r)}
            className={`group rounded-2xl border p-5 text-left transition hover:-translate-y-0.5 ${
              role === r ? 'border-teal-400 bg-teal-50 shadow-md' : 'border-slate-200 bg-white hover:border-teal-200 hover:bg-teal-50/40'
            }`}
          >
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl text-lg ${role === r ? 'bg-teal-100' : 'bg-slate-100'}`}>
              {roleIcons[r]}
            </div>
            <p className="text-sm font-semibold text-slate-950">{ROLE_LABELS[r]}</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">{ROLE_DESCRIPTIONS[r]}</p>
            <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
              {ROLE_MODULES[r].length} modules
            </p>
            {role === r && <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-teal-600">✓ Selected</p>}
          </button>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">End-to-end workflow — 9 stages</p>
        <p className="mt-2 text-sm text-slate-500">
          Every Setu Flow user operates along this path. Highlighted stages are part of your role.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {trainingModules.slice(0, 5).map((m) => (
            <div key={m.id} className={`rounded-xl border p-3 ${role && ROLE_MODULES[role].includes(m.id) ? 'border-teal-200 bg-teal-50' : 'border-slate-100 bg-slate-50'}`}>
              <p className="text-base">{m.icon}</p>
              <p className="mt-1.5 text-xs font-semibold text-slate-800">{m.shortTitle}</p>
              <p className="text-[10px] font-bold text-slate-400">{m.number}</p>
            </div>
          ))}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {trainingModules.slice(5).map((m) => (
            <div key={m.id} className={`rounded-xl border p-3 ${role && ROLE_MODULES[role].includes(m.id) ? 'border-teal-200 bg-teal-50' : 'border-slate-100 bg-slate-50'}`}>
              <p className="text-base">{m.icon}</p>
              <p className="mt-1.5 text-xs font-semibold text-slate-800">{m.shortTitle}</p>
              <p className="text-[10px] font-bold text-slate-400">{m.number}</p>
            </div>
          ))}
        </div>
        {role && (
          <p className="mt-4 text-xs font-semibold text-teal-700">
            Your path: {ROLE_LABELS[role]} — {ROLE_MODULES[role].length} modules highlighted above.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Tab: Workflow Lessons ────────────────────────────────────────────────────

function TabLessons({
  role, completed, quizAnswers, onComplete, onQuizAnswer, onGoToStart,
}: {
  role: Role | null; completed: string[]; quizAnswers: Record<string, number>;
  onComplete: (id: string) => void; onQuizAnswer: (id: string, idx: number) => void;
  onGoToStart: () => void;
}) {
  const [activeId, setActiveId] = useState<string>('');

  const modules = role ? trainingModules.filter((m) => ROLE_MODULES[role].includes(m.id)) : trainingModules;

  useEffect(() => {
    if (modules.length && !activeId) setActiveId(modules[0].id);
  }, [role]);

  const activeIdx = modules.findIndex((m) => m.id === activeId);
  const active = modules[activeIdx] ?? modules[0];
  const prevModule = activeIdx > 0 ? modules[activeIdx - 1] : null;
  const nextModule = activeIdx < modules.length - 1 ? modules[activeIdx + 1] : null;
  const doneCount = modules.filter((m) => completed.includes(m.id)).length;

  const goNext = useCallback(() => {
    if (!completed.includes(active.id)) onComplete(active.id);
    if (nextModule) setActiveId(nextModule.id);
  }, [active.id, completed, nextModule, onComplete]);

  if (!active) return (
    <div className="flex flex-col items-center gap-4 px-4 py-20 text-center">
      <p className="text-slate-500">Select your role first to get your personalised lesson path.</p>
      <button onClick={onGoToStart} className="rounded-full bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white">
        ← Go to Start Here
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — desktop */}
      <aside className="hidden w-52 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-[113px] p-4">
          {role && (
            <div className="mb-4 rounded-xl bg-teal-50 px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-teal-700">{ROLE_LABELS[role]}</p>
              <p className="mt-0.5 text-xs text-teal-600">{doneCount} / {modules.length} done</p>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-teal-100">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${modules.length ? Math.round((doneCount / modules.length) * 100) : 0}%` }} />
              </div>
            </div>
          )}
          <nav className="space-y-0.5">
            {modules.map((m) => {
              const done = completed.includes(m.id);
              const isActive = m.id === activeId;
              return (
                <button
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${
                    isActive ? 'bg-teal-50 font-semibold text-teal-800'
                    : done ? 'text-slate-400 hover:bg-slate-50'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                    done ? 'bg-emerald-100 text-emerald-600' : isActive ? 'bg-teal-200 text-teal-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    {done ? '✓' : m.number}
                  </span>
                  <span className="flex-1 leading-4">{m.shortTitle}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Mobile picker */}
      <div className="block w-full lg:hidden">
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          <select value={activeId} onChange={(e) => setActiveId(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700">
            {modules.map((m) => (
              <option key={m.id} value={m.id}>{m.number} — {m.shortTitle} {completed.includes(m.id) ? '✓' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 bg-slate-50">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {/* Module header */}
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">
                {active.number}
              </span>
              {active.roles.map((r) => <RoleTag key={r} role={r} />)}
              <span className="ml-auto text-[11px] text-slate-400">{active.screens.length} screens</span>
            </div>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{active.title}</h3>
            <p className="mt-1.5 text-sm leading-6 text-slate-500">{active.outcome}</p>
          </div>

          {/* Screen cards */}
          <div className="space-y-5">
            {active.screens.map((screen, i) => (
              <ScreenCard key={`${active.id}-${i}`} screen={screen} index={i} total={active.screens.length} />
            ))}
          </div>

          {/* Quiz */}
          {active.quiz && (
            <QuizBlock
              quiz={active.quiz}
              moduleId={active.id}
              savedAnswer={quizAnswers[active.id]}
              onAnswer={onQuizAnswer}
            />
          )}
        </div>

        {/* ── Sticky prev/next nav bar ── */}
        <div className="sticky bottom-0 z-20 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,.08)] sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            {/* Prev */}
            <button
              onClick={() => prevModule && setActiveId(prevModule.id)}
              disabled={!prevModule}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M15 18l-6-6 6-6" /></svg>
              <span className="hidden sm:inline">{prevModule?.shortTitle ?? 'Previous'}</span>
              <span className="sm:hidden">Prev</span>
            </button>

            {/* Module progress dots */}
            <div className="flex flex-1 items-center justify-center gap-1.5">
              {modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setActiveId(m.id)}
                  title={m.shortTitle}
                  className={`rounded-full transition ${
                    m.id === activeId ? 'h-2.5 w-2.5 bg-teal-600'
                    : completed.includes(m.id) ? 'h-2 w-2 bg-emerald-400'
                    : 'h-2 w-2 bg-slate-200 hover:bg-slate-400'
                  }`}
                />
              ))}
            </div>

            {/* Mark complete + Next */}
            {nextModule ? (
              <button
                onClick={goNext}
                className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white shadow transition hover:-translate-y-0.5 hover:bg-teal-700"
              >
                {completed.includes(active.id) ? '' : '✓ '}
                <span className="hidden sm:inline">
                  {completed.includes(active.id) ? `Next: ${nextModule.shortTitle}` : `Done — next: ${nextModule.shortTitle}`}
                </span>
                <span className="sm:hidden">Next</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4"><path d="M9 18l6-6-6-6" /></svg>
              </button>
            ) : (
              <button
                onClick={() => !completed.includes(active.id) && onComplete(active.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow transition hover:-translate-y-0.5 ${
                  completed.includes(active.id)
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                {completed.includes(active.id) ? '✓ All done!' : '✓ Complete training'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Video Walkthroughs ──────────────────────────────────────────────────

function TabVideos() {
  const slots = [
    { title: 'Product overview', duration: '90 sec', desc: 'Dashboard to dispatch — the complete Setu Flow journey.' },
    { title: 'Dashboard and queue health', duration: '3–5 min', desc: 'How to start every day, read priorities, and act on what matters.' },
    { title: 'Lead capture and qualification', duration: '4–6 min', desc: 'Capture a clean inquiry from any source and keep it moving.' },
    { title: 'Trade show and event intake', duration: '3–4 min', desc: 'Turn booth conversations into follow-up-ready records fast.' },
    { title: 'Mobile capture and vCard', duration: '3–4 min', desc: 'Quick capture from the field and business card scanning.' },
    { title: 'Quote approval workflow', duration: '5–7 min', desc: 'Build, approve, send, and follow up on winning quotes.' },
    { title: 'Documents and order readiness', duration: '5–7 min', desc: 'Confirm everything is in order before dispatch handoff.' },
    { title: 'Dispatch tracking', duration: '4–5 min', desc: 'Shipment movement, tracking, and post-dispatch follow-up.' },
  ];
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Video walkthroughs</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Watch before you work.</h2>
      <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">
        Short guided videos for every stage of the workflow. Coming soon — check back as each module is released.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {slots.map((v, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex h-28 items-center justify-center bg-slate-100">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-slate-300">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 8l6 4-6 4V8z" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{String(i + 1).padStart(2, '0')}</span>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{v.duration}</span>
                <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold text-teal-700">Coming soon</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-950">{v.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{v.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: My Progress ─────────────────────────────────────────────────────────

function TabProgress({
  role, completed, quizAnswers, onReset, onRoleSelect,
}: {
  role: Role | null; completed: string[]; quizAnswers: Record<string, number>;
  onReset: () => void; onRoleSelect: (r: Role) => void;
}) {
  const modules = role ? trainingModules.filter((m) => ROLE_MODULES[role].includes(m.id)) : trainingModules;
  const doneCount = modules.filter((m) => completed.includes(m.id)).length;
  const pct = modules.length ? Math.round((doneCount / modules.length) * 100) : 0;
  const quizTaken = Object.keys(quizAnswers).length;
  const quizCorrect = Object.entries(quizAnswers).filter(([id, ans]) => {
    const mod = trainingModules.find((m) => m.id === id);
    return mod?.quiz && mod.quiz.correct === ans;
  }).length;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">My progress</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Your training status</h2>

      {!role ? (
        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-500">Select your role on the <strong>Start Here</strong> tab to see your progress.</p>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Modules done</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{doneCount}<span className="text-xl text-slate-300">/{modules.length}</span></p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-teal-500 transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1.5 text-xs text-slate-400">{pct}% complete</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Quiz score</p>
              <p className="mt-2 text-3xl font-semibold text-slate-950">{quizCorrect}<span className="text-xl text-slate-300">/{quizTaken}</span></p>
              <p className="mt-2 text-xs text-slate-500">{quizTaken > 0 ? `${Math.round((quizCorrect / quizTaken) * 100)}% correct` : 'No quizzes taken yet'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Your role</p>
              <p className="mt-2 text-base font-semibold text-slate-950">{ROLE_LABELS[role]}</p>
              <p className="mt-1 text-xs text-slate-400">{modules.length} modules in your path</p>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-950">Module checklist</p>
            </div>
            <div className="divide-y divide-slate-100">
              {modules.map((m) => {
                const done = completed.includes(m.id);
                const quizAns = quizAnswers[m.id];
                const quizOk = m.quiz && quizAns === m.quiz.correct;
                return (
                  <div key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                      {done ? '✓' : m.number}
                    </span>
                    <p className={`flex-1 text-sm font-medium ${done ? 'text-slate-950' : 'text-slate-400'}`}>{m.title}</p>
                    {m.quiz && (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        quizAns !== undefined ? (quizOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600') : 'bg-slate-50 text-slate-400'
                      }`}>
                        {quizAns !== undefined ? (quizOk ? '✓ Quiz' : '✗ Quiz') : 'Quiz pending'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4">
              <p className="mb-3 text-xs font-semibold text-slate-600">Switch role</p>
              <div className="flex flex-wrap gap-2">
                {(['sales', 'operations', 'dispatch', 'manager'] as Role[]).map((r) => (
                  <button key={r} onClick={() => onRoleSelect(r)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      role === r ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-teal-200 hover:text-teal-700'
                    }`}>
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={onReset}
              className="self-end rounded-2xl border border-red-100 bg-white px-5 py-3 text-xs font-semibold text-red-400 transition hover:border-red-200 hover:bg-red-50">
              Reset all progress
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = 'start' | 'lessons' | 'videos' | 'progress';

export default function TrainingWorkspacePage() {
  const [tab, setTab] = useState<Tab>('start');
  const [progress, setProgress] = useState<StoredProgress>({ role: null, completed: [], quizAnswers: {} });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { setProgress(loadProgress()); setHydrated(true); }, []);

  const update = (next: StoredProgress) => { setProgress(next); saveProgress(next); };
  const handleRoleSelect = (r: Role) => update({ ...progress, role: r });
  const handleComplete = (id: string) => {
    if (progress.completed.includes(id)) return;
    update({ ...progress, completed: [...progress.completed, id] });
  };
  const handleQuizAnswer = (moduleId: string, idx: number) => {
    if (progress.quizAnswers[moduleId] !== undefined) return;
    update({ ...progress, quizAnswers: { ...progress.quizAnswers, [moduleId]: idx } });
  };
  const handleReset = () => update({ role: progress.role, completed: [], quizAnswers: {} });

  const modules = progress.role ? trainingModules.filter((m) => ROLE_MODULES[progress.role!].includes(m.id)) : trainingModules;
  const doneCount = modules.filter((m) => progress.completed.includes(m.id)).length;

  const tabs: { id: Tab; label: string }[] = [
    { id: 'start', label: 'Start Here' },
    { id: 'lessons', label: 'Workflow Lessons' },
    { id: 'videos', label: 'Video Walkthroughs' },
    { id: 'progress', label: 'My Progress' },
  ];

  return (
    <SiteShell>
      <main className="min-h-screen bg-white text-slate-950">
        {/* Page header */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-white to-teal-50 px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Product overview</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Setu Flow — learn the system
            </h1>
            {hydrated && progress.role && (
              <p className="mt-1 text-sm text-slate-500">
                {ROLE_LABELS[progress.role]} · {doneCount}/{modules.length} modules complete
              </p>
            )}
          </div>
        </div>

        {/* Sticky tab bar */}
        <div className="sticky top-[65px] z-30 border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div className="flex gap-0 overflow-x-auto">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`relative shrink-0 px-5 py-3.5 text-sm font-semibold transition ${tab === t.id ? 'text-teal-700' : 'text-slate-500 hover:text-slate-800'}`}>
                  {t.label}
                  {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-teal-600" />}
                  {t.id === 'progress' && hydrated && doneCount > 0 && (
                    <span className="ml-1.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-600 text-[9px] font-bold text-white">
                      {doneCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab content */}
        {tab === 'start' && (
          <TabStartHere role={progress.role} onRoleSelect={(r) => { handleRoleSelect(r); setTab('lessons'); }} />
        )}
        {tab === 'lessons' && (
          <TabLessons
            role={progress.role}
            completed={progress.completed}
            quizAnswers={progress.quizAnswers}
            onComplete={handleComplete}
            onQuizAnswer={handleQuizAnswer}
            onGoToStart={() => setTab('start')}
          />
        )}
        {tab === 'videos' && <TabVideos />}
        {tab === 'progress' && (
          <TabProgress
            role={progress.role}
            completed={progress.completed}
            quizAnswers={progress.quizAnswers}
            onReset={handleReset}
            onRoleSelect={handleRoleSelect}
          />
        )}
      </main>
    </SiteShell>
  );
}
