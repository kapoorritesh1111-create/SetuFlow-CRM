/**
 * Stark Packmate Client Order, Delivery & Rejection Policy.
 * Source: customer-provided Stark_Packmate_Client_Order_Delivery_Rejection_Policy.pdf (October 2026).
 * Scope: Stark Packmate only. Do not apply to other Setu Flow organizations.
 */
export const STARK_PACKMATE_POLICY_TITLE = 'Client Order, Delivery & Rejection Policy';
export const STARK_PACKMATE_POLICY_INTRO =
  'To ensure clarity and smooth execution of every packaging order, the following commercial, artwork, production, delivery and quality terms will apply to confirmed orders.';

export const STARK_PACKMATE_POLICY = [
  { title: '1. Payment Terms', points: [
    '50% advance payment is required to confirm the order and initiate production.',
    'The balance 50% payment is due before dispatch/delivery.',
    'Production timelines will be considered from the date of receipt of the advance payment, final artwork approval and all required technical inputs.',
  ] },
  { title: '2. Artwork, Size & KLD Approval', points: [
    'The client is responsible for thoroughly checking and approving the final artwork, size, dimensions and KLDs (Key Line Drawings) before production.',
    'Once the artwork, size and KLDs are approved, they will be treated as the final production specifications.',
    'Stark Packmate will not be responsible for errors relating to text, dimensions, logos, barcodes, ingredients, statutory declarations, colours or other information that was present in the approved artwork/KLD.',
    'Any change requested after approval of artwork, size or KLDs may result in additional cost and/or a revised delivery timeline.',
    'Final production will be executed strictly as per the approved specifications.',
  ] },
  { title: '3. Production Quantity Variation – ±20%', points: [
    'Due to the nature of flexible packaging manufacturing, actual production quantities may vary by up to ±20% from the ordered quantity.',
    'The customer agrees to accept the actual quantity produced within this tolerance, with billing adjusted accordingly.',
    'For example, where the order is 5 variants × 2,000 pieces = 10,000 pieces, an actual production quantity between 8,000 and 12,000 pieces will fall within the agreed production tolerance.',
    'The same principle will apply to individual SKUs/variants, as applicable, and the final billing will be based on the actual accepted quantity produced.',
  ] },
  { title: '4. Colour & Printing Variation', points: [
    'Minor variations in colour, shade, density and appearance may occur due to substrate, artwork, machine conditions and production batches.',
    'Approved digital proofs, samples or references are considered production references and are not an absolute colour guarantee unless a specific colour standard/tolerance has been agreed in writing.',
  ] },
  { title: '5. Material & Dimensional Variation', points: [
    'Minor variations in material thickness, GSM, dimensions, finish and other technical parameters may occur within standard manufacturing tolerances.',
    'Such normal industry variations will not constitute grounds for rejection unless they fall outside the specifications agreed in writing.',
  ] },
  { title: '6. Delivery & Production Timeline', points: [
    'The general production timeline is 15 working days from receipt of the advance payment, final artwork approval and all required technical inputs.',
    'The 15-working-day timeline is a standard indicative timeline and may vary during peak/seasonal periods, heavy production periods or due to other unavoidable circumstances.',
    'Delays arising from artwork changes, delayed approvals, payment delays or other client-side dependencies will correspondingly affect the delivery schedule.',
    'Delivery dates may also be subject to circumstances beyond reasonable control, including material availability, logistics disruptions and other force majeure events.',
  ] },
  { title: '7. Rejection & Quality Claims', points: [
    'Any quality/rejection claim must be communicated to Stark Packmate within 3 days of receipt of the material.',
    'The client should provide details of the issue along with photographs/videos and the quantity affected to enable evaluation.',
    'Minor variations that fall within agreed or standard manufacturing tolerances will not be considered grounds for rejection.',
    'Rejection will be considered only after inspection and confirmation of a genuine manufacturing defect by Stark Packmate.',
  ] },
  { title: '8. Damaged / Defective Quantity', points: [
    'Where a genuine manufacturing defect is established, Stark Packmate will evaluate the affected quantity and, where applicable, provide replacement, credit adjustment or another mutually agreed resolution.',
    'Claims relating to quantities or defects must be raised within the 3-day claim period.',
  ] },
  { title: '9. Storage & Handling', points: [
    'After delivery, the client is responsible for appropriate storage and handling of packaging material.',
    'Damage or deterioration caused by improper storage, moisture, excessive heat, handling, transportation after delivery or subsequent processing will not be considered a manufacturing rejection.',
  ] },
  { title: '10. Order Cancellation', points: [
    'Once production has commenced, cancellation of the order will generally not be permitted.',
    'Any material, printing, processing or production costs already incurred will be recoverable from the client.',
  ] },
  { title: '11. Client Responsibility for Packaging Content', points: [
    'The client is responsible for ensuring that all statutory, regulatory, product and commercial information appearing on the packaging is accurate and legally compliant.',
    'Stark Packmate may assist with technical/pre-press checks; however, final content approval and responsibility remain with the client.',
  ] },
  { title: '12. Samples & Subsequent Changes', points: [
    'Where a physical sample, digital proof or mock-up is approved, production will be carried out based on the approved specifications.',
    'Any subsequent change in size, structure, artwork, finish, material or other specification may be treated as a revised requirement and may affect cost and delivery.',
  ] },
] as const;
export const STARK_PACKMATE_POLICY_ACKNOWLEDGEMENT =
  'Client Acknowledgement: Placement/confirmation of an order with Stark Packmate shall be deemed as acceptance of the above terms unless otherwise agreed in writing.';

export function isStarkPackmateOrganization(org: { name?: string | null; legal_name?: string | null } | null | undefined): boolean {
  return /stark\s*packmate/i.test([org?.name, org?.legal_name].filter(Boolean).join(' '));
}
