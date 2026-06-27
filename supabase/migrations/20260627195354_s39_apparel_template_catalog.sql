insert into public.provisioning_templates (template_key, industry_key, template_type, applies_to_subtypes, applies_to_channels, applies_to_capabilities, payload, is_active)
values
  ('apparel_product_model_v1', 'apparel_textiles', 'product_field', array['activewear_athleisure','fashion_lifestyle','kidswear','denim','uniform_workwear','innerwear_essentials','accessories'], '{}', '{}', '{"fields":["fabric_technology","fit_type","size_range","colorway","wash_type","logo_placement","mrp","wholesale_price","distributor_price"],"resolver":"apparel_subtype_product_fields"}'::jsonb, true),
  ('apparel_buyer_pipeline_v1', 'apparel_textiles', 'pipeline', '{}', array['domestic_retailers','export_distributors','international_buyers','bulk_orders','institutional_buyers','corporate_buyers','trade_shows','d2c_online','marketplaces_resellers'], '{}', '{"stages":["New Inquiry","Qualified Buyer","Catalog Shared","Sample / Tech Pack","Quote Sent","Negotiation","Closed Won","Closed Lost"],"resolver":"apparel_channel_pipeline"}'::jsonb, true),
  ('apparel_quote_templates_v1', 'apparel_textiles', 'quote', '{}', array['export_distributors','international_buyers','bulk_orders','institutional_buyers'], array['private_label','distributor_pricing','bulk_personalization','export_documentation'], '{"templates":["Distributor opening order","Retailer price list","Bulk personalization","Private-label FOB/CIF","Uniform institutional quote"],"pricing_basis":["EXW","FOB","CIF","DDP"]}'::jsonb, true),
  ('apparel_sample_approval_v1', 'apparel_textiles', 'workflow', '{}', '{}', array['sample_management','artwork_approval','size_set_management'], '{"sample_statuses":["Requested","Prepared","Dispatched","Received","Feedback","Revision","Approved"],"approval_statuses":["Pending","Approved","Changes Requested"]}'::jsonb, true),
  ('apparel_documents_compliance_v1', 'apparel_textiles', 'document', '{}', array['export_distributors','international_buyers'], array['tech_packs','compliance_tracking','export_documentation','private_label'], '{"folders":["Catalogs","Line Sheets","Size Charts","Price Lists","Tech Packs","Artwork Approvals","Compliance Documents","Export Documents","Quote PDFs","Shipment Checklists"]}'::jsonb, true),
  ('apparel_dashboard_guru_v1', 'apparel_textiles', 'dashboard', '{}', '{}', array['sample_management','private_label','bulk_personalization','export_documentation'], '{"widgets":["Buyer Pipeline","Sample Approvals","Quote Value","Document Readiness","Replenishment Watch"],"guru_context":["industry_profile","subtypes","channels","capabilities","demo_scripts"]}'::jsonb, true)
on conflict (template_key) do update set
  industry_key = excluded.industry_key,
  template_type = excluded.template_type,
  applies_to_subtypes = excluded.applies_to_subtypes,
  applies_to_channels = excluded.applies_to_channels,
  applies_to_capabilities = excluded.applies_to_capabilities,
  payload = excluded.payload,
  is_active = excluded.is_active,
  updated_at = now();
