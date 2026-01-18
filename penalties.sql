-- Create penalties table
create table public.penalties (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone not null default now(),
  user_id uuid not null default auth.uid (),
  promise_id uuid not null references public.promises (id),
  amount numeric not null,
  date date not null default current_date,
  status text not null default 'pending', -- 'pending', 'paid'
  constraint penalties_pkey primary key (id),
  constraint penalties_user_id_fkey foreign key (user_id) references auth.users (id)
) tablespace pg_default;

-- Enable RLS
alter table public.penalties enable row level security;

-- Policies
create policy "Enable insert for users based on user_id" on public.penalties
  for insert with check (auth.uid() = user_id);

create policy "Enable select for users based on user_id" on public.penalties
  for select using (auth.uid() = user_id);

create policy "Enable update for users based on user_id" on public.penalties
  for update using (auth.uid() = user_id);
