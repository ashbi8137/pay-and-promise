-- 1. Fix Schema: Add missing columns if they don't exist
alter table public.profiles 
add column if not exists full_name text;

alter table public.profiles 
add column if not exists avatar_url text;

-- 2. Backfill Data
insert into public.profiles (id, email, full_name)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do update 
set full_name = excluded.full_name, 
    email = excluded.email;

-- 3. Verify Trigger Function (Update it to ensure it uses the column)
create or replace function public.handle_new_user()
returns trigger 
security definer 
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql;
