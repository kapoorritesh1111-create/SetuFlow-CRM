-- Transactional clone/revision of an existing customer quotation.
-- Sent/accepted source is immutable. Copied prices are cleared so current Pricing V5
-- must be recalculated before the new offer can be sent.
begin;
create or replace function public.app_create_stark_quote_revision_tx(
 p_organization_id uuid, p_lead_id uuid, p_source_quote_id uuid,
 p_actor_user_id uuid, p_request_key text
)
returns table(quote_id uuid, quote_version_id uuid, copied_lines integer)
language plpgsql security definer set search_path=public,pg_temp as $$
declare
 v_source public.quotes%rowtype;
 v_result record;
 v_line record;
 v_new_line uuid;
 v_count integer:=0;
begin
 if p_organization_id is distinct from 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid then raise exception 'Revision cloning enabled for Stark Packmate only' using errcode='42501'; end if;
 if not public.is_org_member(p_organization_id) then raise exception 'Not authorized for organization' using errcode='42501'; end if;
 if auth.uid() is distinct from p_actor_user_id then raise exception 'Actor mismatch' using errcode='42501'; end if;
 select * into v_source from public.quotes
  where id=p_source_quote_id and organization_id=p_organization_id and lead_id=p_lead_id for share;
 if not found then raise exception 'Source quote not found for this lead'; end if;
 if nullif(trim(coalesce(p_request_key,'')),'') is null then raise exception 'Revision key is required'; end if;
 select * into v_result from public.app_create_lead_quote_draft_tx(
   p_organization_id,p_lead_id,p_actor_user_id,p_request_key
 );
 if v_result.quote_id is null then raise exception 'Draft creation failed'; end if;
 if not v_result.created then
   quote_id:=v_result.quote_id; quote_version_id:=v_result.quote_version_id;
   select count(*)::integer into copied_lines from public.quote_line_items where quote_line_items.quote_id=v_result.quote_id;
   return next;return;
 end if;
 -- Replace initial lead-interest seed atomically; revision starts from selected quote.
 delete from public.quote_version_line_items where quote_version_line_items.quote_version_id=v_result.quote_version_id;
 delete from public.quote_line_items where quote_line_items.quote_id=v_result.quote_id;

 for v_line in select * from public.quote_line_items
  where quote_line_items.quote_id=p_source_quote_id order by created_at,id
 loop
   insert into public.quote_line_items(
     quote_id,product_id,product_variant_id,line_type,packaging_family_id,
     packaging_template_id,packaging_product_variation_id,packaging_size_profile_v5_id,
     packaging_kld_file_id,input_snapshot_json,pricing_breakdown_json,calculation_version,
     quantity,unit_price,currency,catalog_price_amount,catalog_price_currency,notes,is_price_overridden
   ) values(
     v_result.quote_id,v_line.product_id,v_line.product_variant_id,v_line.line_type,v_line.packaging_family_id,
     v_line.packaging_template_id,v_line.packaging_product_variation_id,v_line.packaging_size_profile_v5_id,
     v_line.packaging_kld_file_id,
     coalesce(v_line.input_snapshot_json,'{}'::jsonb)||jsonb_build_object('revised_from_quote_id',p_source_quote_id,'revised_from_line_id',v_line.id),
     '{}'::jsonb,v_line.calculation_version,
     v_line.quantity,0,v_line.currency,null,v_line.currency,
     coalesce(v_line.notes,'')||' - REPRICE BEFORE SENDING',false
   ) returning id into v_new_line;
   insert into public.quote_version_line_items(
     quote_version_id,product_id,product_variant_id,sku_code,product_name,category_type,
     pack_label,basis_applied,pricing_mode,moq,final_unit_price,final_case_price,
     display_currency,is_overridden,line_notes,sort_order,calculation_meta,catalog_price_snapshot,line_type
   ) values (
     v_result.quote_version_id,v_line.product_id,v_line.product_variant_id,
     'REV-'||upper(substr(v_new_line::text,1,8)),coalesce(v_line.notes,'Packaging item'),
     'packaging',null,'unit','unit',v_line.quantity,0,0,
     v_line.currency,false,'Recalculation required for revised quote',v_count,
     jsonb_build_object('source','quote_revision','source_quote_id',p_source_quote_id,'source_quote_line_id',v_new_line),
     '{}'::jsonb,coalesce(v_line.line_type,'packaging')
   );
   v_count:=v_count+1;
 end loop;
 update public.quote_versions set total_line_count=v_count,
  internal_notes='Revision copied from quote '||coalesce(v_source.quote_number,p_source_quote_id::text)||'. Reprice and approve all lines.'
 where id=v_result.quote_version_id;
 update public.quotes set notes='Revision of '||coalesce(v_source.quote_number,p_source_quote_id::text)||'; reprice before sending.',
  industry_metadata=coalesce(industry_metadata,'{}'::jsonb)||jsonb_build_object('revision_source_quote_id',p_source_quote_id,'revision_source_version_id',coalesce(v_source.sent_version_id,v_source.accepted_version_id,v_source.current_version_id),'revision_reprice_required',true)
 where id=v_result.quote_id and organization_id=p_organization_id;
 insert into public.audit_logs(organization_id,actor_user_id,entity_type,entity_id,action,payload)
 values(p_organization_id,p_actor_user_id,'quote',v_result.quote_id,'quote_revision_created',
 jsonb_build_object('source_quote_id',p_source_quote_id,'copied_lines',v_count,'source_version_id',
 coalesce(v_source.sent_version_id,v_source.accepted_version_id,v_source.current_version_id)));
 quote_id:=v_result.quote_id;quote_version_id:=v_result.quote_version_id;copied_lines:=v_count;
 return next;
end;$$;
revoke all on function public.app_create_stark_quote_revision_tx(uuid,uuid,uuid,uuid,text) from public,anon;
grant execute on function public.app_create_stark_quote_revision_tx(uuid,uuid,uuid,uuid,text) to authenticated,service_role;
commit;
