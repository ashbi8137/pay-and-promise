-- Secure Helper to fetch names from auth.users (since we can't join directly)
create or replace function get_user_names(user_ids uuid[])
returns table (user_id uuid, full_name text) as $$
begin
  return query
  select id, (raw_user_meta_data->>'full_name')::text
  from auth.users
  where id = any(user_ids);
end;
$$ language plpgsql security definer;
