-- Create table for tracking daily progress
create table public.daily_checkins (
  id uuid default gen_random_uuid() primary key,
  promise_id uuid references public.promises(id) not null,
  user_id uuid references auth.users(id) not null,
  date date default CURRENT_DATE not null,
  status text not null, -- 'done' or 'failed'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(promise_id, date) -- Ensure only one check-in per promise per day
);

-- Enable RLS
alter table public.daily_checkins enable row level security;

-- Policies
create policy "Users can check records own checkins"
  on public.daily_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert own checkins"
  on public.daily_checkins for insert
  with check (auth.uid() = user_id);
