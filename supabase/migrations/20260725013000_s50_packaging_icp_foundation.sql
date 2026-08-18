alter table public.org_icp_profiles
  add column if not exists vertical_profile jsonb not null default '{}'::jsonb;

comment on column public.org_icp_profiles.vertical_profile is
  'Vertical-specific ICP dimensions. Packaging profiles store families, sectors, materials, print methods, quantity bands, services, regulated use, sustainability and lead-time preferences.';

insert into public.org_icp_profiles (
  org_id, name, owner_type, owner_user_id, campaign_key, version, is_active,
  products, target_countries, buyer_types, supplier_types, moq_rules,
  certifications, preferred_currency, outreach_style, available_documents,
  required_documents, outreach_channel, outreach_tone, vertical_profile
)
select
  cep.organization_id,
  'Packaging Growth ICP',
  'organization', null, null, 1, true,
  '["Stand-up pouches","Flat pouches","Three-side-seal pouches","Center-seal pouches","Roll stock","Sachets","Labels","Shrink sleeves","Flexible packaging","Prototype packaging","3D packshots","Artwork and pre-press","Variable data printing"]'::jsonb,
  '[]'::jsonb,
  '["Brand owner","Food manufacturer","Beverage manufacturer","Nutraceutical brand","Cosmetics brand","Personal-care brand","Pet-food manufacturer","Contract manufacturer","Private-label brand","D2C brand","Exporter","Importer","Packaging distributor"]'::jsonb,
  '["Flexible packaging converter","Digital printer","Flexographic printer","Rotogravure printer","Label converter","Lamination supplier","Film supplier","Cylinder or plate supplier","Pre-press agency","Packaging design studio","Contract packer","Freight and logistics provider"]'::jsonb,
  '{"note":"Match quantity, annual volume and number of designs to the configured production method and MOQ tiers before recommending a template."}'::jsonb,
  '{"packaging":["ISO 9001","BRCGS Packaging Materials","FSC where applicable"]}'::jsonb,
  coalesce(nullif(o.default_currency,''),'USD'),
  'Lead with the buyer use case, packaging format, run quantity, artwork status and launch timing.',
  '["Technical data sheet","Material structure declaration","Food-contact declaration","Migration test report","Certificate of analysis","Ink compliance declaration","Adhesive compliance declaration","Recyclability statement","Artwork approval","Color standard or Pantone reference","Dieline","Print proof","Packing specification"]'::jsonb,
  '["Technical data sheet","Material structure declaration","Food-contact declaration","Migration test report","Ink compliance declaration","Adhesive compliance declaration","Artwork approval","Dieline","Print proof"]'::jsonb,
  'email', 'professional',
  '{"vertical":"packaging","packaging_families":["stand-up-pouches","flat-pouches","three-side-seal-pouches","center-seal-pouches","roll-stock","sachets","digital-labels","digital-shrink-sleeves","digital-flexible-packaging","prototypes-mockups","3d-packshots","pre-press","variable-data-printing"],"end_use_sectors":["food","beverage","nutraceutical","cosmetics","personal-care","pet-food","household","industrial"],"materials":["PE","PET","BOPP","CPP","paper","foil","metallized film","recyclable mono-material"],"print_methods":["digital","flexographic","rotogravure"],"quantity_bands":["prototype","short run","medium run","high volume"],"services":["design","pre-press","proofing","3d packshot","variable data","printing","lamination","converting","finishing","packing"],"regulated_use":["food contact","cosmetics","nutraceutical","pharmaceutical"],"sustainability":["recyclable","recycled content","FSC paper","compostable claim review"],"artwork_states":["customer provided","design team required","pre-press required","approved"],"lead_time_priorities":["standard","rush","launch-date critical"]}'::jsonb
from public.client_entitlement_profiles cep
join public.organizations o on o.id = cep.organization_id
where (cep.vertical_key = 'packaging' or cep.trial_template_key = 'packaging_converter')
  and not exists (
    select 1 from public.org_icp_profiles p
    where p.org_id = cep.organization_id
      and p.owner_type = 'organization'
      and p.is_active = true
      and p.archived_at is null
  );

create index if not exists idx_org_icp_profiles_vertical
  on public.org_icp_profiles ((vertical_profile->>'vertical'))
  where archived_at is null;
