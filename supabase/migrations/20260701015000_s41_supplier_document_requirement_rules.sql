-- Sprint 41 PR43: supplier-native document requirement rules
-- Idempotent seed for every organization. Keeps existing Supplier Profile Pack and adds
-- factory/compliance/cost-request/sample/approval gates for supplier lead_type.

insert into public.document_requirement_rules (
  organization_id,
  market_id,
  product_id,
  lead_type,
  progression_scope,
  requirement_code,
  title,
  doc_type,
  applies_to_entity,
  is_mandatory,
  is_active
)
select
  org.id,
  null,
  null,
  'supplier',
  rule.progression_scope,
  rule.requirement_code,
  rule.title,
  rule.doc_type,
  'lead',
  rule.is_mandatory,
  true
from public.organizations org
cross join (
  values
    ('profile_verification', 'SUPPLIER_PROFILE', 'Supplier Profile Pack', 'supplier_profile_pack', true),
    ('profile_verification', 'BUSINESS_REGISTRATION', 'Business Registration / GST / IEC', 'business_registration', true),
    ('capability_mapping', 'FACTORY_PROFILE', 'Factory Profile and Capacity Declaration', 'factory_profile', true),
    ('compliance_review', 'QUALITY_CERTIFICATIONS', 'Quality / Compliance Certifications', 'quality_certifications', true),
    ('cost_request', 'PAYMENT_TERMS', 'Payment Terms Confirmation', 'payment_terms', true),
    ('cost_request', 'INCOTERMS_CAPABILITY', 'Incoterms and Export Capability', 'incoterms_capability', true),
    ('sample_review', 'SAMPLE_APPROVAL', 'Sample Approval / Lab Dip / PP Sample Evidence', 'sample_approval', false),
    ('approval', 'SUPPLIER_APPROVAL_NOTE', 'Supplier Approval Note', 'supplier_approval_note', true)
) as rule(progression_scope, requirement_code, title, doc_type, is_mandatory)
where not exists (
  select 1
  from public.document_requirement_rules existing
  where existing.organization_id = org.id
    and existing.lead_type = 'supplier'
    and existing.requirement_code = rule.requirement_code
);

update public.document_requirement_rules
   set is_active = true,
       applies_to_entity = 'lead',
       updated_at = now()
 where lead_type = 'supplier'
   and requirement_code in (
     'SUPPLIER_PROFILE',
     'BUSINESS_REGISTRATION',
     'FACTORY_PROFILE',
     'QUALITY_CERTIFICATIONS',
     'PAYMENT_TERMS',
     'INCOTERMS_CAPABILITY',
     'SAMPLE_APPROVAL',
     'SUPPLIER_APPROVAL_NOTE'
   );
