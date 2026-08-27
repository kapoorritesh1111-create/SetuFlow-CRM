export type DayRole = 'sales' | 'owner';
export type DayLessonKey = 'start' | 'add' | 'edit' | 'quote' | 'followup' | 'approval' | 'catalog' | 'order' | 'track';

export type DayLesson = {
  key: DayLessonKey;
  title: string;
  shortTitle: string;
  roles: string;
  route: string;
  description: string;
  instructions: string[];
  confirms: string[];
  next: string[];
};

export const dayLessons: Record<DayLessonKey, DayLesson> = {
  start: {
    key: 'start', title: 'Start Your Day', shortTitle: 'Start Day', roles: 'Owner + Sales', route: '/dashboard',
    description: 'Begin with work needing attention before opening individual records.',
    instructions: ['Open Home from the left navigation.', 'Switch the workspace perspective to Buyers.', 'Review Needs Attention, overdue follow-ups, new leads, quote alerts, and order alerts.', 'Use date and owner filters when you need to focus on your work or one salesperson.', 'Open the highest-priority record.', 'Make sure each urgent item has an owner and next action.'],
    confirms: ['Buyer perspective selected', 'Priority work visible', 'Filters are correct', 'Urgent records have a next action'],
    next: ['Open an existing buyer lead', 'Add a new buyer lead', 'Review a quote or order alert'],
  },
  add: {
    key: 'add', title: 'Add a Buyer Lead', shortTitle: 'Add Buyer Lead', roles: 'Owner + Sales', route: '/leads?quickLead=1',
    description: 'Owners and salespeople can both create buyer leads. Capture enough information to make the next action possible.',
    instructions: ['Open Leads.', 'Click Quick Lead / Add Lead.', 'Choose Buyer.', 'Enter company and primary contact.', 'Add phone, WhatsApp number, or email.', 'Select the lead source.', 'Add country or target market when known.', 'Add products or categories the buyer is interested in.', 'Add a short note about the buyer need.', 'Assign the owner.', 'Set the next follow-up or next action.', 'Click Save and confirm the buyer appears in the queue.'],
    confirms: ['Lead type is Buyer', 'Company and contact saved', 'Source recorded', 'Products or need captured', 'Owner assigned', 'Next follow-up exists'],
    next: ['Lead appears in Buyers', 'Activity history starts', 'Lead can be edited or qualified', 'Lead can move toward a quote'],
  },
  edit: {
    key: 'edit', title: 'Edit and Qualify an Existing Buyer Lead', shortTitle: 'Edit Lead', roles: 'Owner + Sales', route: '/leads?mode=buyers',
    description: 'Keep the buyer command center current as you learn more about the opportunity.',
    instructions: ['Open Leads and choose Buyers.', 'Search for and open the buyer.', 'Review owner, stage, next touchpoint, activity, and commercial details.', 'Click Edit or open the section to update.', 'Update contact details, need, products, market, timing, volume, budget, or notes.', 'Save the changes.', 'Confirm the activity timeline records the update.', 'Update the next action or follow-up date.', 'If ownership changes, assign the correct salesperson.'],
    confirms: ['Latest buyer information visible', 'Activity timeline updated', 'Lead owner clear', 'Pipeline context preserved', 'Next action current'],
    next: ['Continue follow-up', 'Complete qualification', 'Create a quote', 'Owner can review progress'],
  },
  quote: {
    key: 'quote', title: 'Create a Quote from a Buyer Lead', shortTitle: 'Create Quote', roles: 'Sales', route: '/leads?mode=buyers',
    description: 'Build the quote from the buyer record so products, pricing, approvals, and follow-up stay connected.',
    instructions: ['Open the qualified buyer lead.', 'Confirm the buyer need is ready to price.', 'Click Create Quote.', 'Add products and variants from Catalog.', 'Confirm quantity, MOQ, units per case, and base price.', 'Continue to Terms and confirm currency, FX, Incoterm, payment terms, validity, lead time, and delivery terms.', 'Continue to Pricing and review discounts, freight, adjustments, and subtotal.', 'Enter a reason for any manual override or discount.', 'Open Review and verify buyer, products, terms, totals, and validity.', 'Preview the quote.', 'Save the draft or submit for approval when required.'],
    confirms: ['Products came from Catalog', 'Every line has price and quantity', 'Terms complete', 'Overrides have reasons', 'Preview is correct', 'Approval gate handled'],
    next: ['Quote appears in Quotes', 'Sales can follow up', 'Owner may receive approval request', 'Approved quote can be sent'],
  },
  followup: {
    key: 'followup', title: 'Follow Up on an Existing Lead or Quote', shortTitle: 'Follow Up', roles: 'Owner + Sales', route: '/leads?mode=buyers',
    description: 'Follow up from the existing record so the whole team can see context, outcome, and the next touchpoint.',
    instructions: ['Open the buyer lead or related quote.', 'Read recent notes, messages, quote status, and prior next action.', 'Choose call, message, email, meeting, information send, or quote follow-up.', 'Complete the buyer contact.', 'Record the outcome.', 'Save any new buyer information learned.', 'If the buyer requests a quote change, update or submit it for approval.', 'Set the next follow-up date and next action.', 'Record inactive or lost outcomes instead of leaving overdue work open.'],
    confirms: ['Previous context reviewed', 'Outcome recorded', 'New information saved', 'Next action assigned', 'Follow-up date current'],
    next: ['Lead continues through pipeline', 'Quote may be revised', 'Owner sees latest interaction', 'Accepted quote can move to order'],
  },
  approval: {
    key: 'approval', title: 'Approve a Quote Change', shortTitle: 'Approve Quote', roles: 'Owner', route: '/approval-send',
    description: 'Owners review governed pricing or commercial changes before the updated quote is sent.',
    instructions: ['Open Approvals & Sending.', 'Open the pending quote.', 'Review buyer, salesperson, quote version, and approval reason.', 'Compare requested pricing and terms with standard values.', 'Check discounts, overrides, freight, payment terms, validity, and special conditions.', 'Read the salesperson reason and notes.', 'Approve or reject / request changes.', 'Add a clear internal approval note.', 'Save the decision.', 'Confirm quote status updates and sales can see the result.'],
    confirms: ['Correct version reviewed', 'Reason visible', 'Pricing and terms compared', 'Decision note added', 'Status changed'],
    next: ['Approved quote becomes send-ready', 'Sales can send approved version', 'Rejected quote returns for correction', 'Approval history stays attached'],
  },
  catalog: {
    key: 'catalog', title: 'Add or Update a Catalog Product and Price', shortTitle: 'Update Catalog', roles: 'Owner', route: '/products',
    description: 'Maintain the product and pricing source sales uses when creating quotes.',
    instructions: ['Open Catalog.', 'Choose Products, Pricing, or Spreadsheet view.', 'Click Add Product or open an existing product.', 'Enter or update name, SKU, category, description, images, and status.', 'Add or update variants and packaging where applicable.', 'Set MOQ, units per case, currency, and base price.', 'Review quote-readiness fields.', 'Click Save.', 'Confirm the product is active and quote-ready.', 'For a price change, confirm the new value is visible in Catalog.', 'Verify the product can be selected in quote creation when needed.'],
    confirms: ['Product identity complete', 'SKU and category correct', 'MOQ and packaging set', 'Currency and price saved', 'Product active', 'Quote-ready'],
    next: ['Sales can select product in Quote Builder', 'New quotes use current catalog data', 'Catalog remains product truth'],
  },
  order: {
    key: 'order', title: 'Convert an Accepted Quote to an Order', shortTitle: 'Quote to Order', roles: 'Sales + Owner', route: '/quotes',
    description: 'Convert accepted commercial data into the order workflow instead of re-entering it.',
    instructions: ['Open Quotes.', 'Filter for Accepted or open the accepted quote.', 'Confirm accepted version, buyer, products, quantities, pricing, and terms.', 'Click Convert to Order.', 'Review information carried forward.', 'Confirm customer, products, quantities, pricing, and delivery details.', 'Save or confirm the conversion.', 'Open the new order.', 'Confirm the order references the accepted quote and shows its first execution stage.', 'Continue work from Orders.'],
    confirms: ['Quote is Accepted', 'Correct version converted', 'Buyer and commercial details carried forward', 'Order exists', 'Execution next action visible'],
    next: ['Order appears in Orders', 'Quote history remains', 'Operational execution begins'],
  },
  track: {
    key: 'track', title: 'Track Orders After Quote Conversion', shortTitle: 'Track Orders', roles: 'Owner', route: '/orders',
    description: 'Use Orders to confirm accepted business is moving through execution and identify blockers.',
    instructions: ['Open Orders.', 'Filter by stage, owner, market, or risk.', 'Open a recently converted order.', 'Review accepted quote context, order value, execution stage, blockers, and next action.', 'Confirm actual order lines if they changed.', 'Review documents, packing, freight, delivery, invoice, and payment stages.', 'Open blockers or overdue actions needing intervention.', 'Close only after delivery and payment requirements are complete.'],
    confirms: ['Correct execution stage', 'Blockers visible', 'Next action has owner', 'Quote context linked', 'Closeout not premature'],
    next: ['Owner can intervene before work stalls', 'Sales can see post-sale progress', 'Order moves through fulfillment'],
  },
};

export const dayRoleFlow: Record<DayRole, DayLessonKey[]> = {
  sales: ['start', 'add', 'edit', 'quote', 'followup', 'order'],
  owner: ['start', 'add', 'edit', 'approval', 'catalog', 'track'],
};
