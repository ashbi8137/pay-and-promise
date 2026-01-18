-- Create the promises table
create table public.promises (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  description text, -- keeping it as column, though removed from UI, for future flexibility
  duration_days integer not null,
  number_of_people integer not null,
  amount_per_person integer not null,
  total_amount integer not null,
  participants jsonb, -- Storing array of { name, number } objects
  status text default 'active',
  created_by uuid references auth.users(id) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.promises enable row level security;

-- Policy: Users can see their own promises
create policy "Users can view their own promises"
  on public.promises for select
  using (auth.uid() = created_by);

-- Policy: Users can insert their own promises
create policy "Users can insert their own promises"
  on public.promises for insert
  with check (auth.uid() = created_by);
