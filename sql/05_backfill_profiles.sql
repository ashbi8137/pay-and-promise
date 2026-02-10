-- Backfill profiles from existing auth.users
insert into public.profiles (id, email, full_name)
select 
  id, 
  email, 
  raw_user_meta_data->>'full_name'
from auth.users
on conflict (id) do nothing;
