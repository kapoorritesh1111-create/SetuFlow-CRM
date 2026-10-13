begin;
create or replace function public.app_set_stark_frame_quote_unit_tx(p_organization_id uuid,p_quote_id uuid,p_lead_id uuid,p_line_id uuid,p_unit text,p_actor_user_id uuid)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
declare v_quote public.quotes%rowtype;v_line public.quote_line_items%rowtype;v_weight numeric;v_source text;
begin
 if p_organization_id <> 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'::uuid then raise exception 'Stark Packmate only';end if;
 if p_unit not in ('kg','pcs') then raise exception 'Invalid quotation basis';end if;
 if not public.is_org_member(p_organization_id) or auth.uid() is distinct from p_actor_user_id then raise exception 'Not authorized' using errcode='42501';end if;
 select * into v_quote from public.quotes where id=p_quote_id and organization_id=p_organization_id and lead_id=p_lead_id for update;
 if not found or lower(coalesce(v_quote.status,'')) in ('sent','accepted','rejected','expired','cancelled','declined','approval_pending','superseded') then raise exception 'Quote missing or locked';end if;
 select * into v_line from public.quote_line_items where id=p_line_id and quote_id=p_quote_id for update;
 if not found or coalesce(v_line.input_snapshot_json->>'calculation_engine_key','')<>'frame_formula_v5' then raise exception 'Frame family line not found';end if;
 v_weight:=nullif(v_line.pricing_breakdown_json#>>'{roll_weight,finished_weight_kg}','')::numeric;
 if p_unit='kg' and coalesce(v_weight,0)<=0 then raise exception 'Finished weight is required for per-kg quotation';end if;
 update public.quote_line_items set pricing_breakdown_json=coalesce(pricing_breakdown_json,'{}'::jsonb)||jsonb_build_object('customer_quote_unit',p_unit),updated_at=now() where id=p_line_id;
 update public.quote_version_line_items set
   calculation_meta=coalesce(calculation_meta,'{}'::jsonb)||jsonb_build_object('customer_quote_unit',p_unit)
 where quote_version_id=v_quote.current_version_id and calculation_meta->>'source_quote_line_id'=p_line_id::text;
end;$$;
revoke all on function public.app_set_stark_frame_quote_unit_tx(uuid,uuid,uuid,uuid,text,uuid) from public,anon;
grant execute on function public.app_set_stark_frame_quote_unit_tx(uuid,uuid,uuid,uuid,text,uuid) to authenticated;
commit;