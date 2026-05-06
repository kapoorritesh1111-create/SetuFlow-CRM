begin;
update storage.buckets set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'] where id = 'avatars';
drop policy if exists "avatars_select_public" on storage.objects;
drop policy if exists "avatars_select_own" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_select_public" on storage.objects for select to public using (bucket_id = 'avatars');
create policy "avatars_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_update_own" on storage.objects for update to authenticated using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]) with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "avatars_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
drop policy if exists "profiles_select_same_org" on public.profiles;
create policy "profiles_select_same_org" on public.profiles for select to authenticated using (exists (select 1 from public.organization_members viewer join public.organization_members target on target.organization_id = viewer.organization_id where viewer.user_id = auth.uid() and viewer.is_active = true and target.user_id = profiles.id));
drop policy if exists "profiles_update_org_admin" on public.profiles;
create policy "profiles_update_org_admin" on public.profiles for update to authenticated using (exists (select 1 from public.organization_members target where target.user_id = profiles.id and public.is_org_admin(target.organization_id))) with check (exists (select 1 from public.organization_members target where target.user_id = profiles.id and public.is_org_admin(target.organization_id)));
insert into public.profiles (id, email, full_name, avatar_url, username, created_at, updated_at)
select au.id, au.email, nullif(trim(coalesce(au.raw_user_meta_data ->> 'full_name', au.raw_user_meta_data ->> 'name', concat_ws(' ', nullif(au.raw_user_meta_data ->> 'first_name', ''), nullif(au.raw_user_meta_data ->> 'last_name', '')))), ''), nullif(au.raw_user_meta_data ->> 'avatar_url', ''), nullif(au.raw_user_meta_data ->> 'username', ''), coalesce(au.created_at, now()), now()
from auth.users au where exists (select 1 from public.organization_members om where om.user_id = au.id)
on conflict (id) do update set email = coalesce(nullif(public.profiles.email, ''), excluded.email), full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name), avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url), username = coalesce(nullif(public.profiles.username, ''), excluded.username), updated_at = now();
create or replace function public.sync_profile_from_auth_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles (id, email, full_name, avatar_url, username, created_at, updated_at) values (new.id, new.email, nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', concat_ws(' ', nullif(new.raw_user_meta_data ->> 'first_name', ''), nullif(new.raw_user_meta_data ->> 'last_name', '')))), ''), nullif(new.raw_user_meta_data ->> 'avatar_url', ''), nullif(new.raw_user_meta_data ->> 'username', ''), coalesce(new.created_at, now()), now()) on conflict (id) do update set email = coalesce(nullif(public.profiles.email, ''), excluded.email), full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name), avatar_url = coalesce(nullif(public.profiles.avatar_url, ''), excluded.avatar_url), username = coalesce(nullif(public.profiles.username, ''), excluded.username), updated_at = now(); return new; end; $$;
drop trigger if exists sync_profile_from_auth_user_on_insert on auth.users;
drop trigger if exists sync_profile_from_auth_user_on_update on auth.users;
create trigger sync_profile_from_auth_user_on_insert after insert on auth.users for each row execute function public.sync_profile_from_auth_user();
create trigger sync_profile_from_auth_user_on_update after update of email, raw_user_meta_data on auth.users for each row execute function public.sync_profile_from_auth_user();
commit;
