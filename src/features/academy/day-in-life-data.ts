export type DayRole = 'sales' | 'owner';
export type DayLessonKey = 'start' | 'add' | 'edit' | 'quote' | 'followup' | 'approval' | 'catalog' | 'order' | 'track';

export type LessonScenario = {
  heading: string;
  summary: string;
  facts: string[];
};

export type LessonAnnotation = {
  label: string;
  meaning: string;
};

export type LessonException = {
  question: string;
  answer: string;
};

export type LessonDecision = {
  when: string;
  action: string;
};

export type DayLesson = {
  key: DayLessonKey;
  title: string;
  shortTitle: string;
  roles: string;
  route: string;
  description: string;
  businessContext: string;
  scenario: LessonScenario;
  instructions: string[];
  annotations: LessonAnnotation[];
  confirms: string[];
  bestPractices: string[];
  exceptions: LessonException[];
  decisions: LessonDecision[];
  next: string[];
};

const greenway = {
  company: 'Greenway Foods GmbH',
  contact: 'Sofia Weber',
  market: 'Germany',
  source: 'Trade Show',
  products: 'Mango Puree and Banana Chips',
};

export const dayLessons: Record<DayLessonKey, DayLesson> = {
  start: {
    key: 'start', title: 'Start Your Day', shortTitle: 'Start Day', roles: 'Owner + Sales', route: '/dashboard',
    description: 'Begin with the work that needs attention so important buyers, quotes, and orders do not get lost in the day.',
    businessContext: 'The dashboard is your morning control point. Use it to decide what deserves attention before opening individual records. Sales should identify the buyers they must move today. Owners should identify stalled work, approvals, and execution risks.',
    scenario: { heading: 'Today at Greenway Foods', summary: 'Sofia Weber from Greenway Foods GmbH met your team at a trade show. She wants Mango Puree and Banana Chips for Germany. A follow-up is due today and her opportunity should not be buried under other work.', facts: [`Buyer: ${greenway.company}`, `Contact: ${greenway.contact}`, `Market: ${greenway.market}`, `Source: ${greenway.source}`] },
    instructions: ['Open Home from the left navigation.', 'Switch the workspace perspective to Buyers.', 'Review Needs Attention, overdue follow-ups, new leads, quote alerts, and order alerts.', 'Use date and owner filters when you need to focus on your own work or one salesperson.', 'Open the highest-priority buyer or commercial record.', 'Before leaving the dashboard, make sure every urgent item has an owner and a next action.'],
    annotations: [{ label: 'Needs Attention', meaning: 'Work Setu Flow believes requires action now, such as overdue follow-up or stalled commercial activity.' }, { label: 'Owner filter', meaning: 'Lets an owner review one salesperson without changing ownership of the records.' }, { label: 'Buyer perspective', meaning: 'Keeps the dashboard focused on revenue opportunities rather than supplier work.' }, { label: 'Next action', meaning: 'The concrete action that prevents a lead, quote, or order from becoming forgotten work.' }],
    confirms: ['Buyer perspective selected', 'Priority work visible', 'Filters are correct', 'Urgent records have a next action'],
    bestPractices: ['Do not start by opening random leads. Start from work that is due or blocked.', 'Every record needing action should have a named owner and next action.', 'Owners should use the dashboard for intervention, not to replace the salesperson who owns the relationship.'],
    exceptions: [{ question: 'I have no overdue work. What should I do?', answer: 'Review new leads, quotes awaiting response, and upcoming follow-ups. The goal is to identify the highest-value action, not manufacture work.' }, { question: 'Can an owner work a lead directly?', answer: 'Yes. Owners can add and work buyer leads. Ownership should still be clear so the team knows who is responsible.' }],
    decisions: [{ when: 'You have a brand-new inquiry', action: 'Add a Buyer Lead.' }, { when: 'You already have a buyer record', action: 'Open the existing lead and review or update it.' }, { when: 'A quote or order is blocked', action: 'Open that alert and resolve the blocker before creating new work.' }],
    next: ['Open an existing buyer lead', 'Add a new buyer lead', 'Review a quote or order alert'],
  },
  add: {
    key: 'add', title: 'Add a Buyer Lead', shortTitle: 'Add Buyer Lead', roles: 'Owner + Sales', route: '/leads?quickLead=1',
    description: 'Create a clean buyer record with enough information for the next person—or your future self—to continue the conversation.',
    businessContext: 'Add a lead as soon as a real buyer opportunity exists. Do not wait until every detail is known. The purpose of lead capture is to create a shared commercial record so the opportunity is no longer trapped in WhatsApp, email, a notebook, or someone’s memory.',
    scenario: { heading: 'New trade-show buyer', summary: `${greenway.contact} from ${greenway.company} asks about ${greenway.products} for ${greenway.market}. You know the company, contact, source, and product interest, but not the final volume yet. That is enough to create the lead.`, facts: [`Company: ${greenway.company}`, `Contact: ${greenway.contact}`, `Products: ${greenway.products}`, `Source: ${greenway.source}`] },
    instructions: ['Open Leads from the left navigation.', 'Click Quick Lead / Add Lead.', 'Choose Buyer before entering the commercial details.', `Enter the company name, for example ${greenway.company}.`, `Add the primary contact, for example ${greenway.contact}.`, 'Add at least one reliable contact method: phone, WhatsApp number, or email.', `Select the source, for example ${greenway.source}.`, `Add country or target market when known, for example ${greenway.market}.`, `Add products or categories the buyer is interested in, for example ${greenway.products}.`, 'Add a short note explaining what the buyer is trying to accomplish.', 'Assign the lead owner.', 'Set the next follow-up or next action.', 'Click Save and confirm the buyer appears in the Buyers queue.'],
    annotations: [{ label: 'Buyer / Supplier type', meaning: 'Controls which workflow this relationship enters. Choose Buyer for customer or demand-side opportunities.' }, { label: 'Lead source', meaning: 'Shows how the relationship entered Setu Flow and supports later source and event analysis.' }, { label: 'Products interested in', meaning: 'Connects the opportunity to what the buyer may actually purchase and later helps quote creation.' }, { label: 'Lead owner', meaning: 'The person accountable for moving the relationship forward.' }, { label: 'Next follow-up', meaning: 'The date or action that keeps the buyer from disappearing after capture.' }],
    confirms: ['Lead type is Buyer', 'Company and contact saved', 'Source recorded', 'Products or need captured', 'Owner assigned', 'Next follow-up exists'],
    bestPractices: ['Capture the lead now; enrich it later. Missing exact quantity is not a reason to delay capture.', 'Record what the buyer wants in plain business language, not just “interested”.', 'Avoid duplicate companies. Search before creating a second record for the same buyer.', 'Always leave the new lead with an owner and next action.'],
    exceptions: [{ question: 'The buyer does not know quantity yet. Should I wait?', answer: 'No. Create the lead and record what is known. Add quantity later during qualification.' }, { question: 'I only have a WhatsApp number.', answer: 'That is enough to start if the opportunity is real. Capture the number and complete the record as the conversation develops.' }, { question: 'The company already exists.', answer: 'Open the existing record instead of creating a duplicate. Add the new contact, need, note, or opportunity context there.' }],
    decisions: [{ when: 'The buyer is only a name with no real commercial intent', action: 'Do not overbuild the record. Capture only if there is a legitimate relationship to follow.' }, { when: 'You know the need but not all commercial details', action: 'Create the lead and move to qualification.' }, { when: 'The buyer is already ready for pricing', action: 'Create the lead, confirm the requirement, then begin a quote.' }],
    next: ['Lead appears in Buyers', 'Activity history starts', 'Lead can be edited or qualified', 'Lead can move toward a quote'],
  },
  edit: {
    key: 'edit', title: 'Edit and Qualify an Existing Buyer Lead', shortTitle: 'Edit Lead', roles: 'Owner + Sales', route: '/leads?mode=buyers',
    description: 'Keep the buyer command center current as the conversation becomes more specific.',
    businessContext: 'A lead is not static. Every meaningful conversation should improve the shared understanding of the buyer. Editing a lead should make the next action clearer—not erase history or turn the record into an unstructured note dump.',
    scenario: { heading: 'Greenway clarifies the requirement', summary: 'Sofia confirms Germany is the target market, Mango Puree is the first priority, and the first trial order is likely within six weeks. The salesperson updates the buyer record so pricing and follow-up can use the latest information.', facts: [`Buyer: ${greenway.company}`, 'Priority: Mango Puree', 'Timing: Trial order within six weeks', `Market: ${greenway.market}`] },
    instructions: ['Open Leads and choose Buyers.', `Search for ${greenway.company} and open the buyer.`, 'Review owner, stage, next touchpoint, activity, and commercial details before editing.', 'Click Edit or open the section you need to update.', 'Update contact details only if the buyer gave you new information.', 'Update buyer need, products, target market, timing, volume, budget, or commercial notes as you learn them.', 'Save the changes.', 'Confirm the activity timeline records the update.', 'Update the next action or follow-up date.', 'If responsibility changes, assign the correct salesperson instead of relying on a note.'],
    annotations: [{ label: 'Lead stage', meaning: 'Shows where this opportunity currently sits in the sales process.' }, { label: 'Activity timeline', meaning: 'Preserves what happened and when so edits do not remove the history of the relationship.' }, { label: 'Commercial details', meaning: 'The structured information sales and owners need to qualify, price, and forecast the opportunity.' }, { label: 'Next touchpoint', meaning: 'The next planned interaction with the buyer.' }],
    confirms: ['Latest buyer information visible', 'Activity timeline updated', 'Lead owner clear', 'Pipeline context preserved', 'Next action current'],
    bestPractices: ['Update structured fields when a fact changes; use notes for context and conversation detail.', 'Do not overwrite useful history with “latest only” notes.', 'After every meaningful edit, ask whether the next action also changed.', 'If the buyer changes direction, update the need before creating or revising a quote.'],
    exceptions: [{ question: 'The buyer changed products completely.', answer: 'Update the product interest and commercial need. Keep a note explaining the change so the team understands why the opportunity moved.' }, { question: 'I corrected a typo only.', answer: 'Save the correction, but do not create unnecessary follow-up work unless the commercial situation changed.' }, { question: 'The buyer stopped responding.', answer: 'Do not leave the lead endlessly active. Record the last outcome, set an appropriate next follow-up, or move it to the correct inactive/lost state when justified.' }],
    decisions: [{ when: 'The requirement is still unclear', action: 'Continue qualification and schedule the next discovery touchpoint.' }, { when: 'Products, quantity, market, and timing are clear enough to price', action: 'Create a quote.' }, { when: 'The buyer has gone quiet', action: 'Follow up from the existing record and record the outcome.' }],
    next: ['Continue follow-up', 'Complete qualification', 'Create a quote', 'Owner can review progress'],
  },
  quote: {
    key: 'quote', title: 'Create a Quote from a Buyer Lead', shortTitle: 'Create Quote', roles: 'Sales', route: '/leads?mode=buyers',
    description: 'Build the quote from the buyer record so products, governed pricing, approvals, and follow-up stay connected.',
    businessContext: 'A quote is a commercial commitment, not just a price sheet. Build it from the buyer lead so the buyer, product, terms, pricing source, approval status, and communication history stay connected. Sales should not recreate catalog information manually if Setu Flow already governs it.',
    scenario: { heading: 'Greenway asks for pricing', summary: 'Sofia is ready for a formal offer for Mango Puree and Banana Chips. Sales creates the quote directly from Greenway’s buyer record and selects the products from Catalog instead of typing them manually.', facts: [`Buyer: ${greenway.company}`, `Products: ${greenway.products}`, 'Currency: EUR or customer-approved currency', 'Commercial status: Ready to price'] },
    instructions: ['Open the qualified buyer lead.', 'Confirm the buyer need is ready to price.', 'Click Create Quote.', 'Add products and variants from Catalog.', 'Confirm quantity, MOQ, units per case, and base price for each line.', 'Continue to Terms and confirm customer currency, FX context, Incoterm, payment terms, validity, lead time, and delivery terms.', 'Continue to Pricing and review discounts, freight, commercial adjustments, and subtotal.', 'Enter an auditable reason for any manual override or discount.', 'Open Review and verify buyer identity, products, terms, totals, and validity.', 'Preview the customer-facing quote.', 'Save the draft, submit for approval when required, or send only when the send gate is clear.'],
    annotations: [{ label: 'Catalog product', meaning: 'The governed source for product identity and base commercial data used by the quote.' }, { label: 'MOQ / quantity', meaning: 'Confirms the commercial offer is operationally realistic before it reaches the buyer.' }, { label: 'Terms', meaning: 'Defines currency, Incoterm, payment, validity, lead time, and delivery expectations.' }, { label: 'Override reason', meaning: 'Creates an auditable explanation when sales departs from governed pricing.' }, { label: 'Send gate', meaning: 'Prevents an incomplete or unapproved quote from being sent.' }],
    confirms: ['Products came from Catalog', 'Every line has price and quantity', 'Terms complete', 'Overrides have reasons', 'Preview is correct', 'Approval gate handled'],
    bestPractices: ['Never reduce the catalog price simply because one buyer negotiated. Use the quote-level pricing process.', 'Preview the exact customer-facing version before sending.', 'Use clear validity and delivery terms so the quote does not create an open-ended commitment.', 'If an exception needs approval, submit it before promising the buyer the changed price.'],
    exceptions: [{ question: 'The buyer wants a lower price.', answer: 'Adjust the quote where permitted and enter the reason. If the change crosses approval rules, send it to the owner for approval. Do not change Catalog just for one negotiation.' }, { question: 'The product is missing from Catalog.', answer: 'Stop and have the owner add or correct the product in Catalog before using it in the governed quote.' }, { question: 'The quantity is not final.', answer: 'Confirm whether the buyer wants an indicative offer. Do not present an uncertain quantity as a final commercial commitment without context.' }],
    decisions: [{ when: 'All pricing and terms are standard', action: 'Review and send the quote when the send gate is clear.' }, { when: 'A discount, override, or term requires approval', action: 'Submit the quote for owner approval.' }, { when: 'The buyer is not ready for a formal quote', action: 'Return to the lead, capture the missing requirement, and schedule follow-up.' }],
    next: ['Quote appears in Quotes', 'Sales can follow up', 'Owner may receive approval request', 'Approved quote can be sent'],
  },
  followup: {
    key: 'followup', title: 'Follow Up on an Existing Lead or Quote', shortTitle: 'Follow Up', roles: 'Owner + Sales', route: '/leads?mode=buyers',
    description: 'Continue the conversation from the existing record so the team can see context, outcome, and what happens next.',
    businessContext: 'Follow-up is where most CRM discipline is won or lost. The goal is not simply to “make a call.” The goal is to preserve context, record the buyer’s response, and leave the opportunity with a specific next action.',
    scenario: { heading: 'Greenway has not replied to the quote', summary: 'The quote was sent three business days ago. Sales opens the existing Greenway record, reviews what was sent, contacts Sofia, records the response, and schedules the next action.', facts: [`Buyer: ${greenway.company}`, 'Current state: Quote sent', 'Reason for follow-up: Awaiting buyer response', 'Desired outcome: Clear next action'] },
    instructions: ['Open the buyer lead or related quote.', 'Read recent notes, messages, quote status, and the prior next action before contacting the buyer.', 'Choose the appropriate follow-up action: call, message, email, meeting, information send, or quote follow-up.', 'Contact the buyer.', 'Record the outcome in Setu Flow.', 'Save any new buyer information learned during the conversation.', 'If the buyer requests a quote change, revise the quote or submit the governed change for approval.', 'Set the next follow-up date and next action.', 'If the opportunity is inactive or lost, record that outcome instead of leaving overdue work open.'],
    annotations: [{ label: 'History / notes', meaning: 'Gives the person following up the context they need before contacting the buyer.' }, { label: 'Quote status', meaning: 'Shows whether the quote is draft, approved, sent, viewed, accepted, expired, or lost.' }, { label: 'Outcome', meaning: 'Records what actually happened during the follow-up, not merely that contact was attempted.' }, { label: 'Next action', meaning: 'Turns the buyer response into the next accountable piece of work.' }],
    confirms: ['Previous context reviewed', 'Outcome recorded', 'New information saved', 'Next action assigned', 'Follow-up date current'],
    bestPractices: ['Read history before contacting the buyer so they do not have to repeat themselves.', 'Record meaningful outcomes, not vague notes such as “followed up”.', 'If the buyer asks for a change, update the relevant structured field or quote—not only the notes.', 'Close dead work intentionally instead of allowing an overdue follow-up queue to become noise.'],
    exceptions: [{ question: 'The buyer says “call me next month”.', answer: 'Record the outcome and set the next follow-up for the requested timeframe. Do not leave the current follow-up overdue.' }, { question: 'The buyer requests a different price.', answer: 'Capture the request and update the quote using the governed quote-change path. Owner approval may be required.' }, { question: 'Someone else on the team spoke to the buyer.', answer: 'Update the shared record so the next person has the full context. Reassign ownership only if responsibility actually changed.' }],
    decisions: [{ when: 'The buyer is still evaluating', action: 'Set the next specific follow-up and keep the opportunity active.' }, { when: 'The buyer requests commercial changes', action: 'Revise the quote and use approval where required.' }, { when: 'The buyer accepts', action: 'Confirm acceptance and move toward Quote to Order.' }, { when: 'The buyer declines or is no longer viable', action: 'Record the outcome and reason instead of leaving the opportunity open.' }],
    next: ['Lead continues through pipeline', 'Quote may be revised', 'Owner sees latest interaction', 'Accepted quote can move to order'],
  },
  approval: {
    key: 'approval', title: 'Approve a Quote Change', shortTitle: 'Approve Quote', roles: 'Owner', route: '/approval-send',
    description: 'Review governed pricing or commercial exceptions before the changed quote reaches the buyer.',
    businessContext: 'Owner approval protects margin, consistency, and accountability without forcing owners to build every quote. The owner’s job is to review the exception—not to reperform the salesperson’s entire workflow.',
    scenario: { heading: 'Greenway requests a special discount', summary: 'Sofia asks for a lower price in exchange for a larger first order. Sales submits the changed quote with a reason. The owner compares the original and requested commercial terms before approving or sending it back.', facts: [`Buyer: ${greenway.company}`, 'Request: Special discount', 'Submitted by: Salesperson', 'Owner decision: Approve or request changes'] },
    instructions: ['Open Approvals & Sending.', 'Open the pending quote.', 'Confirm the buyer, salesperson, quote version, and approval reason.', 'Compare requested pricing and terms with the original or governed values.', 'Check discounts, manual overrides, freight, payment terms, validity, and special conditions.', 'Read the salesperson reason and internal notes.', 'Approve the change or reject / request further changes.', 'Add a clear internal approval note explaining the decision.', 'Save the approval decision.', 'Confirm the quote status updates and the salesperson can see the result.'],
    annotations: [{ label: 'Approval reason', meaning: 'Explains why the quote left the normal pricing or commercial rules.' }, { label: 'Quote version', meaning: 'Ensures the owner approves the exact version sales intends to send.' }, { label: 'Original vs requested', meaning: 'Shows the commercial impact of the requested exception.' }, { label: 'Approval note', meaning: 'Creates internal accountability and gives sales clear direction.' }],
    confirms: ['Correct version reviewed', 'Reason visible', 'Pricing and terms compared', 'Decision note added', 'Status changed'],
    bestPractices: ['Approve the exception, not the relationship. Sales remains responsible for the buyer conversation.', 'Always leave a decision note when approving or rejecting a non-standard change.', 'Review the total commercial effect, not just one discount percentage.', 'Do not approve a quote version you have not confirmed is the one sales will send.'],
    exceptions: [{ question: 'I approve the discount but not the payment terms.', answer: 'Request changes and state exactly what is acceptable. Do not approve a version that still contains terms you reject.' }, { question: 'The salesperson did not give a reason.', answer: 'Request clarification rather than guessing why the exception is needed.' }, { question: 'The buyer wants a permanent lower price.', answer: 'That may require a catalog or pricing-governance decision. A one-time quote approval should not silently become the new catalog truth.' }],
    decisions: [{ when: 'The exception is commercially acceptable', action: 'Approve with a clear internal note.' }, { when: 'The deal is viable but the requested terms are not', action: 'Request changes and state the acceptable boundary.' }, { when: 'The request should become a standard price or product change', action: 'Handle that separately through Catalog / pricing governance.' }],
    next: ['Approved quote becomes send-ready', 'Sales can send approved version', 'Rejected quote returns for correction', 'Approval history stays attached'],
  },
  catalog: {
    key: 'catalog', title: 'Add or Update a Catalog Product and Price', shortTitle: 'Update Catalog', roles: 'Owner', route: '/products',
    description: 'Maintain the product and pricing source sales relies on when creating quotes.',
    businessContext: 'Catalog is the product truth for selling. Owners should keep product identity, packaging, MOQ, status, and governed base pricing current so sales can quote consistently without maintaining shadow spreadsheets.',
    scenario: { heading: 'A new Mango Puree pack size is ready to sell', summary: 'Greenway asks for a pack size not currently quote-ready. The owner opens Catalog, adds or updates the product/variant, sets the governed commercial details, and saves it so sales can use it in future quotes.', facts: ['Product: Mango Puree', 'Change: Add or update pack size', 'Owner task: Maintain product truth', 'Sales result: Product becomes quote-ready'] },
    instructions: ['Open Catalog.', 'Choose Products, Pricing, or Spreadsheet view depending on the task.', 'Click Add Product or open the existing product.', 'Enter or update name, SKU, category, description, images, and active status.', 'Add or update variants and packaging where applicable.', 'Set MOQ, units per case, currency, and base price.', 'Review all quote-readiness fields.', 'Click Save.', 'Confirm the product is active and quote-ready.', 'For a price change, confirm the new governed value is visible in Catalog.', 'Verify the product can be selected in quote creation when needed.'],
    annotations: [{ label: 'SKU', meaning: 'The unique commercial identity used to distinguish products or variants.' }, { label: 'Variant / packaging', meaning: 'Defines the sellable form of the product so the quote represents what can actually be supplied.' }, { label: 'MOQ', meaning: 'Minimum quantity the team should respect when quoting.' }, { label: 'Base price', meaning: 'The governed starting price used by quote creation before permitted buyer-specific adjustments.' }, { label: 'Quote-ready', meaning: 'Signals that the required product and commercial information is complete enough for sales to quote.' }],
    confirms: ['Product identity complete', 'SKU and category correct', 'MOQ and packaging set', 'Currency and price saved', 'Product active', 'Quote-ready'],
    bestPractices: ['Change Catalog when the product truth changes—not because one buyer negotiated.', 'Use clear SKUs and variants so sales cannot accidentally quote the wrong pack size.', 'Deactivate products that should no longer be sold instead of leaving misleading active options.', 'After a price change, verify how it will affect new quotes before assuming it updated correctly.'],
    exceptions: [{ question: 'One buyer negotiated a lower price.', answer: 'Do not lower Catalog solely for that buyer. Use quote-level pricing and approval unless the business is intentionally changing the standard price.' }, { question: 'A product is temporarily unavailable.', answer: 'Update status or availability appropriately so sales does not unknowingly quote it as ready.' }, { question: 'I am replacing a product with a new SKU.', answer: 'Create or update the correct product identity and preserve the old record appropriately for historical quotes and orders.' }],
    decisions: [{ when: 'The underlying product, pack, MOQ, or standard price changed', action: 'Update Catalog.' }, { when: 'Only one buyer negotiated different commercial terms', action: 'Keep Catalog unchanged and handle the exception in the quote.' }, { when: 'The product should not be sold', action: 'Update status / availability rather than relying on tribal knowledge.' }],
    next: ['Sales can select product in Quote Builder', 'New quotes use current catalog data', 'Catalog remains product truth'],
  },
  order: {
    key: 'order', title: 'Convert an Accepted Quote to an Order', shortTitle: 'Quote to Order', roles: 'Sales + Owner', route: '/quotes',
    description: 'Turn accepted commercial terms into executable work without re-entering the deal from scratch.',
    businessContext: 'Conversion is the handoff from selling to execution. The accepted quote should remain the commercial source so the team does not retype buyer, product, price, and quantity information and accidentally create a different deal.',
    scenario: { heading: 'Greenway accepts the quote', summary: 'Sofia accepts the approved quote. Sales opens the accepted version and converts it into an order. The commercial details carry forward, and the operational team can begin execution from Orders.', facts: [`Buyer: ${greenway.company}`, 'Quote status: Accepted', `Products: ${greenway.products}`, 'Next system: Orders'] },
    instructions: ['Open Quotes.', 'Filter for Accepted or open the accepted quote.', 'Confirm the accepted version, buyer, products, quantities, pricing, and terms.', 'Click Convert to Order.', 'Review the information carried forward from the quote.', 'Confirm customer, products, quantities, pricing, and delivery details.', 'Add only the order details that are legitimately required for execution.', 'Save or confirm the conversion.', 'Open the new order.', 'Confirm the order references the accepted quote and shows its first execution stage.', 'Continue operational work from Orders rather than the old quote.'],
    annotations: [{ label: 'Accepted version', meaning: 'The exact quote the buyer agreed to and the version that should drive the order.' }, { label: 'Carried-forward lines', meaning: 'Products, quantities, pricing, and buyer details transferred from the quote to reduce re-entry risk.' }, { label: 'Order execution stage', meaning: 'Shows the operational work now required after the sale is won.' }, { label: 'Quote reference', meaning: 'Preserves traceability from the commercial agreement to fulfillment.' }],
    confirms: ['Quote is Accepted', 'Correct version converted', 'Buyer and commercial details carried forward', 'Order exists', 'Execution next action visible'],
    bestPractices: ['Never convert a draft or unaccepted commercial version just to “get the order started”.', 'Review what carried forward before saving the order.', 'Do not retype pricing that already came from the accepted quote unless a governed post-acceptance change is required.', 'After conversion, execute from Orders while preserving the quote as commercial history.'],
    exceptions: [{ question: 'The buyer accepted but changed quantity at the same time.', answer: 'Confirm whether the change requires a revised accepted quote or an approved order-line change. Do not silently convert different commercial terms.' }, { question: 'The buyer gave verbal acceptance only.', answer: 'Follow your organization’s acceptance policy. Setu Flow should reflect a legitimate accepted state before conversion.' }, { question: 'The order needs a different delivery date.', answer: 'Add or confirm the operational delivery detail without changing the accepted commercial record unnecessarily.' }],
    decisions: [{ when: 'The accepted quote exactly reflects the deal', action: 'Convert it to an order.' }, { when: 'Commercial terms changed before conversion', action: 'Correct or re-approve the quote first.' }, { when: 'Only execution details are being added', action: 'Convert and capture those details in the order workflow.' }],
    next: ['Order appears in Orders', 'Quote history remains', 'Operational execution begins'],
  },
  track: {
    key: 'track', title: 'Track Orders After Quote Conversion', shortTitle: 'Track Orders', roles: 'Owner', route: '/orders',
    description: 'Confirm won business is actually moving through execution and intervene when blockers threaten delivery or payment.',
    businessContext: 'Winning the quote is not the end of the customer experience. Owners should use Orders to see whether accepted business is moving through documents, packing, freight, delivery, invoicing, and payment without becoming the person who manually performs every operational step.',
    scenario: { heading: 'Greenway is now in execution', summary: 'The accepted quote has become an order. The owner checks whether documentation, packing, freight, delivery, and payment steps have clear ownership and whether any blocker could put the customer commitment at risk.', facts: [`Customer: ${greenway.company}`, 'Commercial state: Won', 'Operational state: In execution', 'Owner focus: Blockers and accountability'] },
    instructions: ['Open Orders.', 'Filter by execution stage, owner, market, or risk.', 'Open a recently converted order.', 'Review the accepted quote context, order value, current execution stage, blockers, and next action.', 'Confirm actual order lines if they changed after acceptance.', 'Review documents, packing, freight, delivery, invoice, and payment stages.', 'Open blockers or overdue actions that require intervention.', 'Confirm each blocker has a named owner and clear next action.', 'Close the order only after delivery and payment requirements are complete.'],
    annotations: [{ label: 'Execution stage', meaning: 'The current operational phase of the won order.' }, { label: 'Blocker', meaning: 'Anything preventing the order from safely moving to the next stage.' }, { label: 'Actual order lines', meaning: 'The operational quantities/products being fulfilled, compared with accepted commercial terms where needed.' }, { label: 'Closeout', meaning: 'The final state after required delivery, documentation, invoicing, and payment conditions are satisfied.' }],
    confirms: ['Correct execution stage', 'Blockers visible', 'Next action has owner', 'Quote context linked', 'Closeout not premature'],
    bestPractices: ['Manage by exception: intervene where work is blocked, not by taking over every task.', 'Keep accepted quote context visible when reviewing operational changes.', 'Do not mark an order complete because it shipped if invoicing or payment obligations remain.', 'Use ownership and next actions so operational problems are actionable, not merely visible.'],
    exceptions: [{ question: 'The order differs from the quote.', answer: 'Review why. Material product, quantity, or price changes should have a documented reason and approval where required.' }, { question: 'The shipment is delivered but unpaid.', answer: 'Do not close the order if payment is still part of the completion criteria.' }, { question: 'A blocker belongs to another team member.', answer: 'Assign or confirm ownership and intervene only as needed to keep the commitment moving.' }],
    decisions: [{ when: 'The order is moving normally', action: 'Monitor and let the assigned team execute.' }, { when: 'A blocker threatens timing, cost, or customer commitment', action: 'Intervene and make sure a named owner has the next action.' }, { when: 'Delivery and payment requirements are complete', action: 'Close the order using the normal closeout process.' }],
    next: ['Owner can intervene before work stalls', 'Sales can see post-sale progress', 'Order moves through fulfillment'],
  },
};

export const dayRoleFlow: Record<DayRole, DayLessonKey[]> = {
  sales: ['start', 'add', 'edit', 'quote', 'followup', 'order'],
  owner: ['start', 'add', 'edit', 'approval', 'catalog', 'track'],
};
