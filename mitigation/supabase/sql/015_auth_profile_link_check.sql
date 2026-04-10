-- Run this in Supabase SQL editor to verify username login wiring.
-- 1) Every username must be unique when normalized to lowercase.
-- 2) profiles.id must match auth.users.id.
-- 3) profiles.email should mirror the auth user's email.

-- Duplicate usernames (case-insensitive)
select lower(username) as normalized_username, count(*)
from public.profiles
where username is not null and btrim(username) <> ''
group by lower(username)
having count(*) > 1;

-- Profiles missing an auth user
select p.id, p.username, p.email
from public.profiles p
left join auth.users u on u.id = p.id
where u.id is null;

-- Profiles where email does not match the auth user
select p.id, p.username, p.email as profile_email, u.email as auth_email
from public.profiles p
join auth.users u on u.id = p.id
where coalesce(lower(p.email), '') <> coalesce(lower(u.email), '');

-- Optional hardening
create unique index if not exists profiles_username_lower_unique_idx
on public.profiles ((lower(username)))
where username is not null and btrim(username) <> '';
