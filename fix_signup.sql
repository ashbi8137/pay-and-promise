-- 1. CLEANUP: Drop existing objects to start fresh
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- 2. TABLE: Ensure Profiles table exists
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- 3. PERMISSIONS: Grant access to the table
alter table public.profiles enable row level security;

-- (Re)create policies safely
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Grant permissions explicitly (Fixes permission denied errors)
grant all on table public.profiles to postgres;
grant all on table public.profiles to service_role;
grant usage on schema public to anon, authenticated, service_role;
grant all on table public.profiles to authenticated;
grant all on table public.profiles to anon;

-- 4. FUNCTION: Create robust function with error handling & search_path
create or replace function public.handle_new_user()
returns trigger 
security definer 
set search_path = public -- Secure the search path
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
exception
  when others then
    -- If error occurs, log it but don't block signup
    raise warning 'Profile creation failed for user %: %', new.id, SQLERRM;
    return new; 
end;
$$ language plpgsql;

-- 5. TRIGGER: Re-attach the trigger
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
